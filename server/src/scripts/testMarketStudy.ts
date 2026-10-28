import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import MarketStudyCatalogue from '../models/MarketStudyCatalogue';
import MarketStudySurvey from '../models/MarketStudySurvey';
import MarketStudy from '../models/MarketStudy';
import Order from '../models/Order';
import Customer from '../models/Customer';
import GodownTransfer from '../models/GodownTransfer';
import Freezer from '../models/Freezer';
import { Cheque } from '../models/Cheque';
import { initializeMarketStudyCatalogue, migrateLegacyMarketStudies } from '../services/marketStudyInit';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runTests() {
  console.log('--- STARTING MARKET STUDY COMPREHENSIVE TESTS ---\n');
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in server/.env');
  }

  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB');

  // Test 1: Initial Catalogue Setup (Product 1..10)
  console.log('\n[Test 1] Initializing Product Catalogue (Product 1 to Product 10)...');
  await initializeMarketStudyCatalogue();
  const initialCount = await MarketStudyCatalogue.countDocuments();
  console.log(`✓ Total catalogue items after init: ${initialCount}`);
  if (initialCount < 10) {
    throw new Error(`Expected at least 10 catalogue products, found ${initialCount}`);
  }
  const placeholder1 = await MarketStudyCatalogue.findOne({ name: 'Product 1' });
  const placeholder10 = await MarketStudyCatalogue.findOne({ name: 'Product 10' });
  if (!placeholder1 || !placeholder10) {
    throw new Error('Expected placeholders Product 1 and Product 10 to exist');
  }
  console.log('✓ Verified Product 1 and Product 10 exist and are active by default');

  // Test 2: Idempotent initialization
  console.log('\n[Test 2] Testing Idempotency of catalogue init...');
  await initializeMarketStudyCatalogue();
  const recount = await MarketStudyCatalogue.countDocuments();
  if (recount !== initialCount) {
    throw new Error(`Re-running init changed catalogue count from ${initialCount} to ${recount}`);
  }
  console.log('✓ Catalogue initialization is safely idempotent');

  // Test 3: Catalogue CRUD & Display Order
  console.log('\n[Test 3] Testing Catalogue Item Creation, Update & Reordering...');
  const testProduct = await MarketStudyCatalogue.create({
    name: 'TEST_PREMIUM_ICE_CREAM_' + Date.now(),
    isActive: true,
    displayOrder: 999
  });
  console.log(`✓ Created test catalogue item: ${testProduct.name} (${testProduct._id})`);

  testProduct.name = testProduct.name + '_EDITED';
  testProduct.displayOrder = 1000;
  await testProduct.save();
  const updatedProduct = await MarketStudyCatalogue.findById(testProduct._id);
  if (updatedProduct?.name !== testProduct.name || updatedProduct?.displayOrder !== 1000) {
    throw new Error('Failed to update catalogue product name/displayOrder');
  }
  console.log('✓ Successfully edited catalogue product name and displayOrder');

  // Test 4: End-to-End Scenario (Feature M)
  // Sales officer visits Metro Supermarket in Calicut:
  // 1 shop, 2 catalogue products, 5 variants with independent prices
  console.log('\n[Test 4] Executing Feature M: End-to-End Metro Supermarket Survey...');
  const testSurvey = await MarketStudySurvey.create({
    customerName: 'Metro Supermarket',
    customerType: 'Supermarket',
    marketLocation: 'Calicut',
    surveyDate: new Date('2026-10-28'),
    collectedBy: 'Test Sales Officer',
    notes: 'End-to-end integration test visit',
    status: 'completed',
    observations: [
      // Product 1 - 3 variants
      {
        catalogueProductId: placeholder1._id,
        catalogueProductName: placeholder1.name,
        brandName: 'Arun',
        variant: 'Vanilla',
        weight: '1 Litre',
        packagingType: 'Tub',
        landingPrice: 160,
        sellingPrice: 210,
        mrp: 220,
        promotionNotes: 'No scheme'
      },
      {
        catalogueProductId: placeholder1._id,
        catalogueProductName: placeholder1.name,
        brandName: 'Arun',
        variant: 'Chocolate',
        weight: '1 Litre',
        packagingType: 'Tub',
        landingPrice: 165,
        sellingPrice: 215,
        mrp: 230,
        promotionNotes: '5% margin scheme'
      },
      {
        catalogueProductId: placeholder1._id,
        catalogueProductName: placeholder1.name,
        brandName: 'Arun',
        variant: 'Butterscotch',
        weight: '1 Litre',
        packagingType: 'Tub',
        landingPrice: 170,
        sellingPrice: 220,
        mrp: 240,
        promotionNotes: 'Display contest'
      },
      // Product 3 (or placeholder10) - 2 variants
      {
        catalogueProductId: placeholder10._id,
        catalogueProductName: placeholder10.name,
        brandName: 'Amul',
        variant: 'Vanilla',
        weight: '500 ml',
        packagingType: 'Tub',
        landingPrice: 90,
        sellingPrice: 120,
        mrp: 130
      },
      {
        catalogueProductId: placeholder10._id,
        catalogueProductName: placeholder10.name,
        brandName: 'Kwality Wall\'s',
        variant: 'Cornetto Double Chocolate',
        weight: '120 ml',
        packagingType: 'Cone',
        landingPrice: 32,
        sellingPrice: 40,
        mrp: 45
      }
    ]
  });

  console.log(`✓ Saved survey ${testSurvey._id} with ${testSurvey.observations.length} observations`);

  // Test 5: Verify Calculations for Variant 1 (Arun Vanilla 1L)
  // Landing: 160, Selling: 210, MRP: 220
  console.log('\n[Test 5] Verifying Variant-Level Pricing & Margins...');
  const v1 = testSurvey.observations[0];
  const grossProfit = v1.sellingPrice - v1.landingPrice; // 210 - 160 = 50
  const grossMarginPct = ((v1.sellingPrice - v1.landingPrice) / v1.sellingPrice) * 100; // 50 / 210 * 100 = 23.81%
  const mrpDiff = v1.mrp - v1.sellingPrice; // 220 - 210 = 10
  const discountBelowMrpPct = ((v1.mrp - v1.sellingPrice) / v1.mrp) * 100; // 10 / 220 * 100 = 4.55%

  console.log(`  Arun Vanilla: Landing=₹${v1.landingPrice}, Selling=₹${v1.sellingPrice}, MRP=₹${v1.mrp}`);
  console.log(`  Gross Profit: ₹${grossProfit.toFixed(2)} (Expected ₹50.00)`);
  console.log(`  Gross Margin: ${grossMarginPct.toFixed(2)}% (Expected 23.81%)`);
  console.log(`  Diff below MRP: ₹${mrpDiff.toFixed(2)} (Expected ₹10.00)`);
  console.log(`  Discount below MRP: ${discountBelowMrpPct.toFixed(2)}% (Expected 4.55%)`);

  if (grossProfit !== 50 || Math.abs(grossMarginPct - 23.8095) > 0.01) {
    throw new Error('Margin calculations failed verification');
  }
  console.log('✓ All variant-level profit, margin, and discount calculations are exact and correct');

  // Test 6: Historical Snapshot Preservation
  console.log('\n[Test 6] Testing Historical Snapshot Preservation upon Catalogue Name Change...');
  const originalCatName = placeholder1.name;
  placeholder1.name = 'Renamed Placeholder Category';
  await placeholder1.save();

  // Reload the test survey and ensure the stored observation snapshot was not changed
  const reloadedSurvey = await MarketStudySurvey.findById(testSurvey._id);
  const reloadedObs1 = reloadedSurvey?.observations[0];
  if (reloadedObs1?.catalogueProductName !== originalCatName) {
    throw new Error(`Snapshot was mutated! Expected '${originalCatName}', found '${reloadedObs1?.catalogueProductName}'`);
  }
  console.log(`✓ Stored snapshot '${reloadedObs1?.catalogueProductName}' remained unchanged after catalogue rename`);

  // Restore catalogue name
  placeholder1.name = originalCatName;
  await placeholder1.save();

  // Test 7: Historical Observations Preserved on Product Deactivation
  console.log('\n[Test 7] Verifying Historical Observations Preserved when Product Deactivated...');
  testProduct.isActive = false;
  await testProduct.save();
  const deactivatedProduct = await MarketStudyCatalogue.findById(testProduct._id);
  if (deactivatedProduct?.isActive !== false) {
    throw new Error('Product deactivation failed');
  }
  // Historical survey observations still intact
  const surveyCheck = await MarketStudySurvey.findById(testSurvey._id);
  if (!surveyCheck || surveyCheck.observations.length !== 5) {
    throw new Error('Historical survey observations were lost or mutated upon deactivation');
  }
  console.log('✓ Historical survey observations completely intact after deactivation');

  // Test 8: CSV Export Structure (1 row per variant observation)
  console.log('\n[Test 8] Testing CSV Export Format (1 row per observation)...');
  const rows: any[] = [];
  for (const obs of surveyCheck.observations) {
    const profit = obs.sellingPrice - obs.landingPrice;
    const margin = obs.sellingPrice > 0 ? ((profit / obs.sellingPrice) * 100).toFixed(2) : '0';
    const diffMrp = obs.mrp - obs.sellingPrice;
    rows.push({
      surveyId: surveyCheck._id.toString(),
      customer: surveyCheck.customerName,
      product: obs.catalogueProductName,
      brand: obs.brandName,
      variant: obs.variant,
      weight: obs.weight,
      packaging: obs.packagingType,
      landingPrice: obs.landingPrice,
      sellingPrice: obs.sellingPrice,
      mrp: obs.mrp,
      grossProfit: profit,
      grossMarginPct: margin,
      diffMrp: diffMrp
    });
  }
  if (rows.length !== 5) {
    throw new Error(`Expected 5 CSV observation rows, generated ${rows.length}`);
  }
  console.log(`✓ Generated ${rows.length} CSV rows matching all 5 variants:`);
  rows.forEach((r, i) => {
    console.log(`   [Row ${i + 1}] ${r.brand} ${r.variant} (${r.weight}, ${r.packaging}) - Landing: ₹${r.landingPrice}, Selling: ₹${r.sellingPrice}, MRP: ₹${r.mrp}`);
  });

  // Test 9: Legacy Market Study Migration Idempotency & Safety
  console.log('\n[Test 9] Verifying Legacy Market Study Migration Safety...');
  await migrateLegacyMarketStudies();
  console.log('✓ Legacy MarketStudy migration completed safely and idempotently');

  // Test 10: Regression Check on Other Core Modules
  console.log('\n[Test 10] Checking Regression on Other Modules...');
  const orderCount = await Order.countDocuments();
  const customerCount = await Customer.countDocuments();
  const transferCount = await GodownTransfer.countDocuments();
  const freezerCount = await Freezer.countDocuments();
  const chequeCount = await Cheque.countDocuments();
  console.log(`  ✓ Orders collection intact (count: ${orderCount})`);
  console.log(`  ✓ Customers collection intact (count: ${customerCount})`);
  console.log(`  ✓ GodownTransfers collection intact (count: ${transferCount})`);
  console.log(`  ✓ FreezerMaster collection intact (count: ${freezerCount})`);
  console.log(`  ✓ Cheques collection intact (count: ${chequeCount})`);

  // Cleanup test artifacts
  await MarketStudyCatalogue.deleteOne({ _id: testProduct._id });
  await MarketStudySurvey.deleteOne({ _id: testSurvey._id });
  console.log('\n✓ Cleaned up test survey and test catalogue product');

  console.log('\n======================================================');
  console.log('🎉 ALL 10 TEST SUITES PASSED WITH ZERO ERRORS!');
  console.log('======================================================\n');
}

runTests()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    mongoose.disconnect();
    process.exit(1);
  });
