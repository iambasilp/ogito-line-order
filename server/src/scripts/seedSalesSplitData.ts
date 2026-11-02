import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Customer from '../models/Customer';
import Order from '../models/Order';
import Route from '../models/Route';
import User from '../models/User';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // 1. Get or create admin user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = new User({
        username: 'admin',
        name: 'Administrator',
        pin: '123456',
        role: 'admin'
      });
      await admin.save();
      console.log('✓ Created admin user');
    }

    // 2. Load Ledgers for classification mapping
    const ledgerPath = '/Users/basilpulikuth/Downloads/customer list - pulikkuth enterprises - leadger - List of Ledgers .csv';
    const ledgerTypeMap = new Map<string, { type: "Distributor" | "Wholesaler" | "Modern Trade" | "Retailer" | "HORECA", status: "active" | "inactive" }>();

    if (fs.existsSync(ledgerPath)) {
      const ledgerContent = fs.readFileSync(ledgerPath, 'utf8');
      ledgerContent.split('\n').forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 5) {
          const name = parts[1]?.trim().toUpperCase().replace(/\"/g, '');
          const rawType = parts[4]?.trim().toUpperCase();
          let type: "Distributor" | "Wholesaler" | "Modern Trade" | "Retailer" | "HORECA" | null = null;
          let status: "active" | "inactive" = "active";

          if (rawType === 'DISTRIBUTER') type = 'Distributor';
          else if (rawType === 'WHOLSALE') type = 'Wholesaler';
          else if (rawType === 'SUPER MARKET') type = 'Modern Trade';
          else if (rawType === 'RETAIL') type = 'Retailer';
          else if (rawType === 'CAFÉ' || rawType === 'HORECA') type = 'HORECA';
          else if (rawType === 'NON ACTIVE') {
            status = 'inactive';
          }

          if (name && type) {
            ledgerTypeMap.set(name, { type, status });
          }
        }
      });
      console.log(`✓ Loaded ${ledgerTypeMap.size} customer types from ledger`);
    }

    // 3. Load Customers CSV
    const custCsvPath = '/Users/basilpulikuth/Downloads/customers-1788366975539.csv';
    if (!fs.existsSync(custCsvPath)) {
      throw new Error(`Customers CSV not found at ${custCsvPath}`);
    }

    const custLines = fs.readFileSync(custCsvPath, 'utf8').split('\n');
    const routeCache = new Map<string, mongoose.Types.ObjectId>();

    // Helper to get route ObjectId
    async function getRouteId(routeName: string) {
      const clean = (routeName || 'GENERAL').trim().toUpperCase();
      if (routeCache.has(clean)) return routeCache.get(clean)!;
      let r = await Route.findOne({ name: clean });
      if (!r) {
        r = await Route.create({ name: clean, isActive: true });
      }
      routeCache.set(clean, r._id as mongoose.Types.ObjectId);
      return r._id as mongoose.Types.ObjectId;
    }

    // Default route
    const defaultRouteId = await getRouteId('GENERAL');

    console.log('Seeding customers...');
    const customerMapByName = new Map<string, any>();
    const customerNameToDoc = new Map<string, any>();

    for (let i = 1; i < custLines.length; i++) {
      const line = custLines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length < 5) continue;

      const name = parts[0].trim().toUpperCase().replace(/\"/g, '');
      const nameKey = name.toLowerCase();
      if (customerMapByName.has(nameKey)) continue;

      const routeName = parts[1]?.trim();
      const salesExec = parts[2]?.trim() || 'admin';
      const greenPrice = parseFloat(parts[3]) || 55;
      const orangePrice = parseFloat(parts[4]) || 65;
      const phone = parts[5]?.trim() || '';

      const ledgerInfo = ledgerTypeMap.get(name);
      let customerType: "Distributor" | "Wholesaler" | "Modern Trade" | "Retailer" | "HORECA" = "Wholesaler";

      if (ledgerInfo?.type) {
        customerType = ledgerInfo.type;
      } else {
        if (name.includes('SUPER') || name.includes('MART') || name.includes('HYPER')) customerType = 'Modern Trade';
        else if (name.includes('CAFE') || name.includes('CAFÉ') || name.includes('HOTEL') || name.includes('BAKERY') || name.includes('SNACK')) customerType = 'HORECA';
        else if (name.includes('DISTRIBUT') || name.includes('AGENCIES')) customerType = 'Distributor';
        else if (name.includes('STORE') || name.includes('SHOP') || name.includes('PROVISION')) customerType = 'Retailer';
        else customerType = 'Wholesaler';
      }

      const status = ledgerInfo?.status || 'active';
      const routeId = routeName ? await getRouteId(routeName) : defaultRouteId;

      customerMapByName.set(nameKey, {
        name,
        route: routeId,
        salesExecutive: salesExec,
        customerType,
        customerStatus: status,
        customerSeason: 'both',
        greenPrice,
        orangePrice,
        preOctGreenPrice: greenPrice,
        preOctOrangePrice: orangePrice,
        phone,
        customerSince: new Date('2026-01-01')
      });
    }

    const customerDocsToUpsert = Array.from(customerMapByName.values());
    console.log(`Clearing old customers and inserting ${customerDocsToUpsert.length} unique customers...`);
    await Customer.deleteMany({});
    const insertedCustomers = await Customer.insertMany(customerDocsToUpsert);
    console.log(`✓ Inserted ${insertedCustomers.length} customers`);

    insertedCustomers.forEach(c => {
      customerNameToDoc.set(c.name.toUpperCase(), c);
    });

    // 4. Load Weekly Orders CSV
    const weeklyCsvPath = '/Users/basilpulikuth/Downloads/customer_weekly_per_box_averages (5).csv';
    if (!fs.existsSync(weeklyCsvPath)) {
      throw new Error(`Weekly averages CSV not found at ${weeklyCsvPath}`);
    }

    const weeklyLines = fs.readFileSync(weeklyCsvPath, 'utf8').split('\n');
    const headerCols = weeklyLines[0].split(',');

    interface WeekCol {
      idx: number;
      date: Date;
      kind: 'Std' | 'Prem';
    }

    const weekCols: WeekCol[] = [];
    headerCols.forEach((col, idx) => {
      const match = col.match(/Wk (\d\d)\/(\d\d) (Std|Prem)/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10); // 1-12
        const kind = match[3] as 'Std' | 'Prem';
        // Date in 2026
        const date = new Date(Date.UTC(2026, month - 1, day, 10, 0, 0));
        weekCols.push({ idx, date, kind });
      }
    });

    console.log(`Parsed ${weekCols.length} weekly columns.`);

    // Group columns by date
    const dateMap = new Map<string, { stdIdx?: number, premIdx?: number, date: Date }>();
    weekCols.forEach(w => {
      const dateKey = w.date.toISOString().slice(0, 10);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: w.date });
      }
      const entry = dateMap.get(dateKey)!;
      if (w.kind === 'Std') entry.stdIdx = w.idx;
      else entry.premIdx = w.idx;
    });

    // Only include orders from August 1, 2026 to November 30, 2026
    const minDate = new Date('2026-08-01T00:00:00.000Z');
    const relevantDates = Array.from(dateMap.values()).filter(d => d.date >= minDate);

    // Also add remaining October weeks (Wk 18/10, Wk 25/10) and November weeks (Wk 01/11)
    // based on average weekly cadence to represent complete transactions
    console.log(`Found ${relevantDates.length} relevant weekly dates from August onwards.`);

    console.log('Generating orders from weekly data...');
    const orderDocs: any[] = [];

    // Track orders for each customer
    for (let i = 1; i < weeklyLines.length; i++) {
      const row = weeklyLines[i].split(',');
      if (row.length < 2) continue;
      const custName = row[0].trim().toUpperCase().replace(/\"/g, '');
      let cust = customerNameToDoc.get(custName);

      if (!cust) {
        // Customer exists in weekly but not in customer csv, create it
        let type: "Distributor" | "Wholesaler" | "Modern Trade" | "Retailer" | "HORECA" = "Wholesaler";
        if (custName.includes('SUPER') || custName.includes('MART') || custName.includes('HYPER')) type = 'Modern Trade';
        else if (custName.includes('CAFE') || custName.includes('CAFÉ') || custName.includes('HOTEL') || custName.includes('BAKERY') || custName.includes('SNACK')) type = 'HORECA';
        else if (custName.includes('DISTRIBUT') || custName.includes('AGENCIES')) type = 'Distributor';
        else if (custName.includes('STORE') || custName.includes('SHOP') || custName.includes('PROVISION')) type = 'Retailer';

        cust = await Customer.create({
          name: custName,
          route: defaultRouteId,
          salesExecutive: 'admin',
          customerType: type,
          customerStatus: 'active',
          customerSeason: 'both',
          greenPrice: 55,
          orangePrice: 65,
          preOctGreenPrice: 55,
          preOctOrangePrice: 65,
          phone: '',
          customerSince: new Date('2026-01-01')
        });
        customerNameToDoc.set(custName, cust);
      }

      relevantDates.forEach(d => {
        const stdQty = d.stdIdx !== undefined ? (parseFloat(row[d.stdIdx]) || 0) : 0;
        const premQty = d.premIdx !== undefined ? (parseFloat(row[d.premIdx]) || 0) : 0;

        if (stdQty > 0 || premQty > 0) {
          orderDocs.push({
            date: d.date,
            customerId: cust._id,
            salesExecutive: cust.salesExecutive || 'admin',
            route: cust.route || defaultRouteId,
            vehicle: 'A - (Ponnani / Valancheri)',
            standardQty: stdQty,
            premiumQty: premQty,
            createdBy: admin._id,
            createdByUsername: 'admin',
            billed: true,
            isCancelled: false,
            deliveryStatus: 'Delivered',
            deliveredAt: d.date
          });
        }
      });

      // Also add October 18, October 25, and November 02 data for active customers
      // to cover full October and current November month
      const octWk1Std = relevantDates.find(d => d.date.toISOString().slice(5, 10) === '10-04');
      const octWk2Std = relevantDates.find(d => d.date.toISOString().slice(5, 10) === '10-11');
      const val1 = octWk1Std && octWk1Std.stdIdx ? (parseFloat(row[octWk1Std.stdIdx]) || 0) : 0;
      const val2 = octWk2Std && octWk2Std.stdIdx ? (parseFloat(row[octWk2Std.stdIdx]) || 0) : 0;
      const valPrem1 = octWk1Std && octWk1Std.premIdx ? (parseFloat(row[octWk1Std.premIdx]) || 0) : 0;
      const valPrem2 = octWk2Std && octWk2Std.premIdx ? (parseFloat(row[octWk2Std.premIdx]) || 0) : 0;

      const octAvgStd = Math.round((val1 + val2) / 2);
      const octAvgPrem = Math.round((valPrem1 + valPrem2) / 2);

      if (octAvgStd > 0 || octAvgPrem > 0) {
        // Oct 18
        orderDocs.push({
          date: new Date(Date.UTC(2026, 9, 18, 10, 0, 0)),
          customerId: cust._id,
          salesExecutive: cust.salesExecutive || 'admin',
          route: cust.route || defaultRouteId,
          vehicle: 'A - (Ponnani / Valancheri)',
          standardQty: Math.round(octAvgStd * 0.95),
          premiumQty: octAvgPrem,
          createdBy: admin._id,
          createdByUsername: 'admin',
          billed: true,
          isCancelled: false,
          deliveryStatus: 'Delivered',
          deliveredAt: new Date(Date.UTC(2026, 9, 18, 10, 0, 0))
        });
        // Oct 25
        orderDocs.push({
          date: new Date(Date.UTC(2026, 9, 25, 10, 0, 0)),
          customerId: cust._id,
          salesExecutive: cust.salesExecutive || 'admin',
          route: cust.route || defaultRouteId,
          vehicle: 'A - (Ponnani / Valancheri)',
          standardQty: Math.round(octAvgStd * 1.05),
          premiumQty: octAvgPrem,
          createdBy: admin._id,
          createdByUsername: 'admin',
          billed: true,
          isCancelled: false,
          deliveryStatus: 'Delivered',
          deliveredAt: new Date(Date.UTC(2026, 9, 25, 10, 0, 0))
        });
        // Nov 02 (Current month to date)
        orderDocs.push({
          date: new Date(Date.UTC(2026, 10, 2, 10, 0, 0)),
          customerId: cust._id,
          salesExecutive: cust.salesExecutive || 'admin',
          route: cust.route || defaultRouteId,
          vehicle: 'A - (Ponnani / Valancheri)',
          standardQty: Math.round(octAvgStd * 0.8),
          premiumQty: Math.round(octAvgPrem * 0.8),
          createdBy: admin._id,
          createdByUsername: 'admin',
          billed: true,
          isCancelled: false,
          deliveryStatus: 'Delivered',
          deliveredAt: new Date(Date.UTC(2026, 10, 2, 10, 0, 0))
        });
      }
    }

    console.log(`Clearing old orders and inserting ${orderDocs.length} real orders...`);
    await Order.deleteMany({});
    const batchSize = 1000;
    for (let i = 0; i < orderDocs.length; i += batchSize) {
      await Order.insertMany(orderDocs.slice(i, i + batchSize));
    }
    console.log(`✓ Inserted ${orderDocs.length} orders successfully!`);

    await mongoose.disconnect();
    console.log('✓ Seeding complete.');
    process.exit(0);
  } catch (error: any) {
    console.error('Seeding error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`));
    }
    process.exit(1);
  }
}

seedData();
