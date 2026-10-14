import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  Truck,
  Calendar,
  Plus,
  Trash2,
  Copy,
  Check,
  Package,
  Layers,
  FileText,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { VEHICLES, formatVehicleName } from '@/types';
import type { Order, IOrderMessage } from '@/types';
import { formatBoxPcs } from '@/utils/formatters';

interface ExtraProductItem {
  id: string;
  customerName: string;
  product: string;
  qty: string;
  note?: string;
  orderId?: string;
  isManual?: boolean;
}

interface QuantityPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultVehicle?: string;
  routes?: Array<{ _id: string; name: string }>;
}

export const QuantityPaperModal: React.FC<QuantityPaperModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  defaultVehicle = 'all',
  routes = [],
}) => {
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(defaultDate || getTodayStr());
  const [selectedVehicle, setSelectedVehicle] = useState<string>(defaultVehicle || 'all');
  const [activeTabVehicle, setActiveTabVehicle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedVehicle, setCopiedVehicle] = useState<string | null>(null);
  const [includeBlankRows, setIncludeBlankRows] = useState(true);

  // Per-vehicle driver name state (saved in localStorage for convenience)
  const [driverNames, setDriverNames] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('qty_paper_drivers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Per-vehicle editable extra products
  const [extraItemsByVehicle, setExtraItemsByVehicle] = useState<Record<string, ExtraProductItem[]>>({});

  // Sync date/vehicle on modal open
  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDate(defaultDate);
      if (defaultVehicle) setSelectedVehicle(defaultVehicle);
    }
  }, [isOpen, defaultDate, defaultVehicle]);

  // Save driver names to localStorage
  const handleDriverChange = (vehicle: string, name: string) => {
    setDriverNames(prev => {
      const updated = { ...prev, [vehicle]: name };
      try {
        localStorage.setItem('qty_paper_drivers', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save drivers to localStorage', e);
      }
      return updated;
    });
  };

  // Helper to intelligently split message text into product & quantity
  const parseMessageText = (text: string): { product: string; qty: string } => {
    const trimmed = text.trim();
    if (!trimmed) return { product: '', qty: '' };

    // Regex to match "5 Box Mango" or "10 Pkt Orange" or "2 Cassata"
    const leadingQtyMatch = trimmed.match(/^(\d+(?:\.\d+)?\s*(?:box|boxes|pkt|pkts|packet|packets|pcs|cup|cups|cone|cones|ltr|kg)?)\s+(.+)$/i);
    if (leadingQtyMatch) {
      return {
        qty: leadingQtyMatch[1].trim(),
        product: leadingQtyMatch[2].trim(),
      };
    }

    // Regex to match "Mango Bar 5 Box" or "Cassata - 2"
    const trailingQtyMatch = trimmed.match(/^(.+?)(?:\s*[-:]\s*|\s+)(\d+(?:\.\d+)?\s*(?:box|boxes|pkt|pkts|packet|packets|pcs|cup|cups|cone|cones|ltr|kg)?)$/i);
    if (trailingQtyMatch) {
      return {
        product: trailingQtyMatch[1].trim(),
        qty: trailingQtyMatch[2].trim(),
      };
    }

    return { product: trimmed, qty: '' };
  };

  // Fetch orders for the selected date
  const fetchOrdersForDate = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date', targetDate);
      params.append('limit', '10000'); // Fetch all orders for comprehensive vehicle grouping

      const res = await api.get(`/orders?${params.toString()}`);
      const fetchedOrders: Order[] = res.data?.orders || [];
      setOrders(fetchedOrders);

      // Extract read/approved messages and initialize extra products per vehicle
      const initialExtras: Record<string, ExtraProductItem[]> = {};

      fetchedOrders.forEach(order => {
        if (order.isCancelled) return;
        const v = order.vehicle || 'Unassigned';

        if (!initialExtras[v]) {
          initialExtras[v] = [];
        }

        if (order.orderMessages && order.orderMessages.length > 0) {
          order.orderMessages.forEach((msg: IOrderMessage, index: number) => {
            // Strictly include messages that are approved or marked read (not pending & not rejected)
            const isApprovedOrRead = msg.status === 'approved' || (
              order.orderMessages &&
              !order.orderMessages.some(m => m.status === 'pending') &&
              msg.status !== 'rejected'
            );

            if (isApprovedOrRead && msg.text && msg.text.trim()) {
              const { product, qty } = parseMessageText(msg.text);
              initialExtras[v].push({
                id: msg._id || `${order._id}-msg-${index}`,
                customerName: order.customerName || (order as any).customer?.name || 'Customer',
                product: product || msg.text,
                qty: qty || '',
                note: msg.text !== product ? msg.text : undefined,
                orderId: order._id,
                isManual: false,
              });
            }
          });
        }
      });

      setExtraItemsByVehicle(initialExtras);
    } catch (error) {
      console.error('Failed to fetch orders for quantity paper:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchOrdersForDate(date);
    }
  }, [isOpen, date, fetchOrdersForDate]);

  // Group active orders by vehicle
  const vehicleDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        vehicle: string;
        orders: Order[];
        totalStandardQty: number;
        totalPremiumQty: number;
        routes: Set<string>;
      }
    >();

    orders.forEach(order => {
      if (order.isCancelled) return;
      const v = order.vehicle || 'Unassigned';

      if (!map.has(v)) {
        map.set(v, {
          vehicle: v,
          orders: [],
          totalStandardQty: 0,
          totalPremiumQty: 0,
          routes: new Set<string>(),
        });
      }

      const item = map.get(v)!;
      item.orders.push(order);
      item.totalStandardQty += order.standardQty || 0;
      item.totalPremiumQty += order.premiumQty || 0;
      if (order.route) {
        const matchedRoute = routes.find(r => r._id === order.route);
        item.routes.add(matchedRoute ? matchedRoute.name : order.route);
      }
    });

    return map;
  }, [orders, routes]);

  // List of active vehicle keys that actually have orders or standard vehicles
  const availableVehicles = useMemo(() => {
    const list: string[] = [];
    // Prioritize standard VEHICLES
    VEHICLES.forEach(v => {
      list.push(v);
    });
    // Add any non-standard or unassigned that have orders
    vehicleDataMap.forEach((_, key) => {
      if (!list.includes(key)) {
        list.push(key);
      }
    });
    return list;
  }, [vehicleDataMap]);

  // Set default active tab
  useEffect(() => {
    if (selectedVehicle !== 'all') {
      setActiveTabVehicle(selectedVehicle);
    } else if (availableVehicles.length > 0) {
      // Find the first vehicle with active orders, or the first vehicle
      const firstWithOrders = availableVehicles.find(v => (vehicleDataMap.get(v)?.orders.length || 0) > 0);
      setActiveTabVehicle(firstWithOrders || availableVehicles[0]);
    }
  }, [selectedVehicle, availableVehicles, vehicleDataMap]);

  // Extra item edit handlers
  const handleUpdateItem = (vehicle: string, itemId: string, field: 'product' | 'qty' | 'customerName', value: string) => {
    setExtraItemsByVehicle(prev => {
      const list = prev[vehicle] || [];
      const updated = list.map(item => item.id === itemId ? { ...item, [field]: value } : item);
      return { ...prev, [vehicle]: updated };
    });
  };

  const handleAddItem = (vehicle: string) => {
    const newItem: ExtraProductItem = {
      id: 'manual-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      customerName: '',
      product: '',
      qty: '',
      isManual: true,
    };
    setExtraItemsByVehicle(prev => ({
      ...prev,
      [vehicle]: [...(prev[vehicle] || []), newItem],
    }));
  };

  const handleDeleteItem = (vehicle: string, itemId: string) => {
    setExtraItemsByVehicle(prev => ({
      ...prev,
      [vehicle]: (prev[vehicle] || []).filter(item => item.id !== itemId),
    }));
  };

  // Vehicles that will be printed
  const targetVehiclesToPrint = useMemo(() => {
    if (selectedVehicle !== 'all') {
      return [selectedVehicle];
    }
    // For 'all', only print vehicles that have active orders or extra items
    const withContent = availableVehicles.filter(v => {
      const data = vehicleDataMap.get(v);
      const extras = extraItemsByVehicle[v] || [];
      return (data && data.orders.length > 0) || extras.length > 0;
    });
    return withContent.length > 0 ? withContent : availableVehicles.slice(0, 5);
  }, [selectedVehicle, availableVehicles, vehicleDataMap, extraItemsByVehicle]);

  // Formatted date for display
  const displayDate = useMemo(() => {
    try {
      const [y, m, d] = date.split('-');
      return `${d}-${m}-${y}`;
    } catch {
      return date;
    }
  }, [date]);

  // Copy WhatsApp summary for the active vehicle
  const handleCopyWhatsApp = (vehicle: string) => {
    const data = vehicleDataMap.get(vehicle) || {
      orders: [],
      totalStandardQty: 0,
      totalPremiumQty: 0,
      routes: new Set<string>(),
    };
    const extras = extraItemsByVehicle[vehicle] || [];
    const driver = driverNames[vehicle] || 'Driver';

    let text = `📋 *QUANTITY PAPER (LOADING SHEET)*\n`;
    text += `🚛 *Vehicle:* ${formatVehicleName(vehicle)}\n`;
    text += `📅 *Date:* ${displayDate}\n`;
    if (driver && driver !== 'Driver') text += `👤 *Driver:* ${driver}\n`;
    text += `📦 *Active Orders:* ${data.orders.length} Outlets\n`;
    if (data.routes.size > 0) {
      text += `📍 *Routes:* ${Array.from(data.routes).join(', ')}\n`;
    }
    text += `\n*━━━━━━━━━━━━━━━━━━━━━*\n`;
    text += `🧊 *CORE DISPATCH LOAD:*\n`;
    text += `• *Standard:* ${formatBoxPcs(data.totalStandardQty)} (${data.totalStandardQty} Pkt)\n`;
    text += `• *Premium:*  ${formatBoxPcs(data.totalPremiumQty)} (${data.totalPremiumQty} Pkt)\n`;
    const totalBox = Math.floor((data.totalStandardQty + data.totalPremiumQty) / 30);
    const totalRemPkt = (data.totalStandardQty + data.totalPremiumQty) % 30;
    text += `• *Total Load:* ${totalBox} Box • ${totalRemPkt} Pkt (${data.totalStandardQty + data.totalPremiumQty} Pkt)\n`;
    text += `*━━━━━━━━━━━━━━━━━━━━━*\n\n`;

    if (extras.length > 0) {
      text += `📝 *OTHER PRODUCTS (Change Requests):*\n`;
      extras.forEach((item, idx) => {
        const custPart = item.customerName ? ` _(${item.customerName})_` : '';
        const qtyPart = item.qty ? ` — *${item.qty}*` : '';
        text += `${idx + 1}. ${item.product}${qtyPart}${custPart}\n`;
      });
      text += `\n`;
    }

    text += `✅ *Verified & Ready for Dispatch*`;

    navigator.clipboard.writeText(text);
    setCopiedVehicle(vehicle);
    setTimeout(() => setCopiedVehicle(null), 2500);
  };

  // Dedicated Print Function
  const handlePrintQuantityPaper = () => {
    if (targetVehiclesToPrint.length === 0) {
      alert('No vehicles with active orders to print.');
      return;
    }

    setIsPrinting(true);

    try {
      // Clean up previous print elements if any
      const existingContainer = document.getElementById('print-container');
      if (existingContainer) document.body.removeChild(existingContainer);
      const existingStyle = document.getElementById('print-style');
      if (existingStyle) document.head.removeChild(existingStyle);

      const printContainer = document.createElement('div');
      printContainer.id = 'print-container';
      printContainer.style.display = 'none';

      const style = document.createElement('style');
      style.id = 'print-style';
      style.innerHTML = `
        @media print {
          body > *:not(#print-container) { display: none !important; }
          #print-container { 
            display: block !important; 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            background: #fff; 
            color: #000;
          }
          
          @page { 
            size: A4 portrait; 
            margin: 10mm 12mm; 
          }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #000; 
            margin: 0; 
            padding: 0; 
            line-height: 1.25; 
            background: #fff; 
            font-size: 12px; 
          }

          .qty-sheet {
            page-break-after: always;
            break-after: page;
            min-height: 98vh;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            padding-bottom: 10px;
          }

          .qty-sheet:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          .header-title { 
            text-align: center; 
            font-weight: 900; 
            font-size: 21px; 
            letter-spacing: 1.5px; 
            margin-bottom: 2px;
          }

          .sub-title { 
            text-align: center; 
            font-weight: 700; 
            font-size: 14px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px; 
            padding-bottom: 4px;
            border-bottom: 2px solid #000;
          }

          .meta-box { 
            border: 1.5px solid #000; 
            padding: 8px 12px; 
            margin-bottom: 14px; 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 6px 16px; 
            font-size: 12px; 
            background-color: #fafafa;
          }

          .meta-item { 
            display: flex; 
            align-items: baseline; 
          }

          .meta-label { 
            font-weight: 800; 
            min-width: 80px; 
            text-transform: uppercase;
            font-size: 11px;
          }

          .meta-value { 
            flex-grow: 1; 
            font-weight: 700; 
            font-size: 13px;
          }

          .section-title {
            font-weight: 800;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 10px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            page-break-inside: avoid;
            margin-bottom: 12px;
          }

          th, td { 
            border: 1px solid #000; 
            padding: 5px 7px; 
            text-align: left; 
            font-size: 12px; 
          }

          th { 
            font-weight: 800; 
            background-color: #f0f0f0; 
            text-transform: uppercase;
            font-size: 11px;
          }

          .core-table td {
            padding: 8px 10px;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 800; }
          .check-box { width: 50px; text-align: center; font-size: 14px; font-weight: bold; }

          .extra-table th:first-child { width: 35px; text-align: center; }
          .extra-table th:nth-child(2) { width: 45%; }
          .extra-table th:nth-child(3) { width: 15%; text-align: center; }
          .extra-table th:nth-child(4) { width: 30%; }

          .sign-container {
            margin-top: auto;
            display: grid;
            grid-template-columns: 1fr 1fr 1.2fr;
            gap: 15px;
            padding-top: 14px;
            border-top: 1px dashed #666;
            page-break-inside: avoid;
          }

          .sign-box {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .sign-line {
            border-bottom: 1px solid #000;
            height: 28px;
            margin-bottom: 4px;
          }

          .sign-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #333;
          }
        }
      `;

      // Render HTML for all requested vehicles
      const sheetsHtml = targetVehiclesToPrint.map(vehicleKey => {
        const vData = vehicleDataMap.get(vehicleKey) || {
          orders: [],
          totalStandardQty: 0,
          totalPremiumQty: 0,
          routes: new Set<string>(),
        };

        const extraItems = extraItemsByVehicle[vehicleKey] || [];
        const driverName = driverNames[vehicleKey] || '';

        const stdBox = Math.floor(vData.totalStandardQty / 30);
        const stdPkt = vData.totalStandardQty % 30;

        const premBox = Math.floor(vData.totalPremiumQty / 30);
        const premPkt = vData.totalPremiumQty % 30;

        const totalQty = vData.totalStandardQty + vData.totalPremiumQty;
        const totalBox = Math.floor(totalQty / 30);
        const totalRemPkt = totalQty % 30;

        const routesText = vData.routes.size > 0 
          ? Array.from(vData.routes).join(', ') 
          : 'Standard Route';

        // Additional blank rows for warehouse notes
        const blankRowsCount = includeBlankRows ? Math.max(3, 7 - extraItems.length) : 0;
        const blankRows = Array(blankRowsCount).fill(null);

        return `
          <div class="qty-sheet">
            <div class="header-title">PULIKKUTH ENTERPRISES</div>
            <div class="sub-title">Vehicle Loading Sheet (Quantity Paper)</div>

            <div class="meta-box">
              <div class="meta-item">
                <span class="meta-label">Date</span><span>:</span>&nbsp;
                <span class="meta-value">${displayDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Vehicle</span><span>:</span>&nbsp;
                <span class="meta-value">${formatVehicleName(vehicleKey)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Driver</span><span>:</span>&nbsp;
                <span class="meta-value">${driverName || '_______________________'}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Total Outlets</span><span>:</span>&nbsp;
                <span class="meta-value">${vData.orders.length} Drops / Orders</span>
              </div>
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-label">Routes</span><span>:</span>&nbsp;
                <span class="meta-value">${routesText}</span>
              </div>
            </div>

            <!-- CORE STOCK TABLE -->
            <div class="section-title">
              <span>1. Core Products Dispatch Load</span>
              <span style="font-size: 11px; font-weight: normal;">(Standard Box Pack: 30 Pkt)</span>
            </div>
            <table class="core-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="text-center">Boxes</th>
                  <th class="text-center">Loose Packets</th>
                  <th class="text-center">Total Packets</th>
                  <th class="check-box">Loaded</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-bold">Standard</td>
                  <td class="text-center font-bold" style="font-size: 14px;">${stdBox > 0 ? `${stdBox} Box` : '-'}</td>
                  <td class="text-center font-bold" style="font-size: 14px;">${stdPkt > 0 ? `${stdPkt} Pkt` : '-'}</td>
                  <td class="text-center font-bold" style="font-size: 14px;">${vData.totalStandardQty} Pkt</td>
                  <td class="check-box">[ &nbsp; ]</td>
                </tr>
                <tr>
                  <td class="font-bold">Premium</td>
                  <td class="text-center font-bold" style="font-size: 14px;">${premBox > 0 ? `${premBox} Box` : '-'}</td>
                  <td class="text-center font-bold" style="font-size: 14px;">${premPkt > 0 ? `${premPkt} Pkt` : '-'}</td>
                  <td class="text-center font-bold" style="font-size: 14px;">${vData.totalPremiumQty} Pkt</td>
                  <td class="check-box">[ &nbsp; ]</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                  <td class="font-bold" style="text-transform: uppercase;">Total Core Stock</td>
                  <td class="text-center font-bold" colspan="2" style="font-size: 13px;">${totalBox} Box • ${totalRemPkt} Pkt</td>
                  <td class="text-center font-bold" style="font-size: 13px;">${totalQty} Pkt</td>
                  <td class="check-box">[ &nbsp; ]</td>
                </tr>
              </tbody>
            </table>

            <!-- OTHER PRODUCTS & READ MESSAGES -->
            <div class="section-title">
              <span>2. Other Products & Special Requests (Read Messages & Additions)</span>
              <span style="font-size: 11px; font-weight: normal;">${extraItems.length} items recorded</span>
            </div>
            <table class="extra-table">
              <thead>
                <tr>
                  <th class="text-center">S.No</th>
                  <th>Product Description</th>
                  <th class="text-center">Quantity</th>
                  <th>Customer / Outlet</th>
                  <th class="check-box">Loaded</th>
                </tr>
              </thead>
              <tbody>
                ${extraItems.length > 0 ? extraItems.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="font-bold">${item.product || '-'}</td>
                    <td class="text-center font-bold">${item.qty || '-'}</td>
                    <td>${item.customerName || '-'}</td>
                    <td class="check-box">[ &nbsp; ]</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="5" class="text-center" style="padding: 10px; color: #555; font-style: italic;">
                      No extra product change requests from messages. Use empty lines below for manual warehouse entries.
                    </td>
                  </tr>
                `}

                ${blankRows.map((_, i) => `
                  <tr style="height: 24px;">
                    <td class="text-center">${extraItems.length + i + 1}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="check-box">[ &nbsp; ]</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- DISPATCH VERIFICATION FOOTER -->
            <div class="sign-container">
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-label">Loaded By (Store / Godown)</div>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <div class="sign-label">Received By (Driver / Associate)</div>
              </div>
              <div class="sign-box">
                <div class="sign-line" style="display: flex; align-items: flex-end; font-size: 11px; font-weight: bold; padding-bottom: 2px;">
                  Time: _______:_______ &nbsp; ODO: ________
                </div>
                <div class="sign-label">Gate Dispatch Departure</div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      printContainer.innerHTML = sheetsHtml;

      document.head.appendChild(style);
      document.body.appendChild(printContainer);

      const originalTitle = document.title;
      document.title = `Quantity-Paper-${displayDate}-${selectedVehicle === 'all' ? 'All-Vehicles' : formatVehicleName(selectedVehicle).replace(/\s+/g, '-')}`;

      setTimeout(() => {
        window.print();
        document.title = originalTitle;
        setIsPrinting(false);
      }, 400);

    } catch (err) {
      console.error('Failed to print quantity paper:', err);
      alert('Failed to generate printable quantity paper');
      setIsPrinting(false);
    }
  };

  const activeVehicleData = vehicleDataMap.get(activeTabVehicle) || {
    orders: [],
    totalStandardQty: 0,
    totalPremiumQty: 0,
    routes: new Set<string>(),
  };

  const activeExtras = extraItemsByVehicle[activeTabVehicle] || [];

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-xl border-border">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-card flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                Vehicle Quantity Paper
                <Badge variant="outline" className="text-xs font-normal">
                  Loading Sheet
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-consolidates Standard, Premium & Other Products from read messages
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Configuration Bar */}
        <div className="p-3 sm:p-4 bg-muted/40 border-b flex flex-wrap items-end gap-3">
          {/* Date Picker */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9 w-36 text-xs bg-background"
            />
          </div>

          {/* Vehicle Filter */}
          <div className="space-y-1 min-w-[200px] flex-1">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Vehicle Scope
            </Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Vehicles (Separate Sheet Per Vehicle)
                </SelectItem>
                {VEHICLES.map(v => (
                  <SelectItem key={v} value={v}>
                    {formatVehicleName(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrdersForDate(date)}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Vehicle Tabs when "All Vehicles" is selected */}
        {selectedVehicle === 'all' && (
          <div className="flex overflow-x-auto border-b bg-card px-3 pt-2 gap-1.5 [&::-webkit-scrollbar]:hidden">
            {availableVehicles.map(veh => {
              const data = vehicleDataMap.get(veh);
              const orderCount = data?.orders.length || 0;
              const hasExtras = (extraItemsByVehicle[veh] || []).length > 0;
              const isActive = activeTabVehicle === veh;

              return (
                <button
                  key={veh}
                  onClick={() => setActiveTabVehicle(veh)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>{formatVehicleName(veh)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      orderCount > 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {orderCount}
                  </span>
                  {hasExtras && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Has other products" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm">Loading vehicle orders & messages...</p>
            </div>
          ) : activeVehicleData.orders.length === 0 && activeExtras.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
              <h3 className="font-semibold text-sm">No Active Orders for {formatVehicleName(activeTabVehicle)}</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No orders found for this vehicle on {displayDate}. You can still add manual products below if you need to print a loading sheet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddItem(activeTabVehicle)}
                className="mt-3 gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Manual Product
              </Button>
            </div>
          ) : (
            <>
              {/* Vehicle Meta & Driver Input */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border">
                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Vehicle
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {formatVehicleName(activeTabVehicle)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                    Driver Name (Printed on Sheet)
                  </div>
                  <Input
                    type="text"
                    value={driverNames[activeTabVehicle] || ''}
                    onChange={e => handleDriverChange(activeTabVehicle, e.target.value)}
                    placeholder="e.g. Shihab (or leave blank)"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Coverage & Outlets
                  </div>
                  <div className="text-xs text-foreground mt-1 flex flex-wrap gap-1">
                    <span className="font-bold text-primary">
                      {activeVehicleData.orders.length} Outlets
                    </span>
                    {activeVehicleData.routes.size > 0 && (
                      <span className="text-muted-foreground">
                        • {Array.from(activeVehicleData.routes).slice(0, 3).join(', ')}
                        {activeVehicleData.routes.size > 3 ? '...' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Core Stock Cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Core Dispatch Quantities
                  </h4>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Box = 30 Pkt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Standard */}
                  <Card className="border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 shadow-none">
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                          Standard Stock
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {activeVehicleData.totalStandardQty} Pkt Total
                        </Badge>
                      </div>
                      <div className="mt-2 text-xl font-extrabold text-foreground tracking-tight">
                        {formatBoxPcs(activeVehicleData.totalStandardQty)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Premium */}
                  <Card className="border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-900/40 shadow-none">
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                          Premium Stock
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {activeVehicleData.totalPremiumQty} Pkt Total
                        </Badge>
                      </div>
                      <div className="mt-2 text-xl font-extrabold text-foreground tracking-tight">
                        {formatBoxPcs(activeVehicleData.totalPremiumQty)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Other Products Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" /> Other Products & Special Requests
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-extracted from approved read messages of this vehicle. You can edit, add, or delete rows.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem(activeTabVehicle)}
                    className="h-7 text-xs gap-1 border-dashed"
                  >
                    <Plus className="w-3 h-3" /> Add Product
                  </Button>
                </div>

                {activeExtras.length === 0 ? (
                  <div className="p-4 border rounded-md bg-muted/10 text-center text-xs text-muted-foreground">
                    No extra products recorded in messages for this vehicle.
                    <button
                      type="button"
                      onClick={() => handleAddItem(activeTabVehicle)}
                      className="text-primary font-semibold underline ml-1 hover:text-primary/80"
                    >
                      Click here to add one manually
                    </button>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden bg-background">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 border-b text-muted-foreground font-semibold">
                        <tr>
                          <th className="py-2 px-3 text-left w-1/3">Product Description</th>
                          <th className="py-2 px-3 text-left w-24">Quantity</th>
                          <th className="py-2 px-3 text-left">Customer / Outlet</th>
                          <th className="py-2 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeExtras.map(item => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-1.5 px-3">
                              <Input
                                value={item.product}
                                onChange={e => handleUpdateItem(activeTabVehicle, item.id, 'product', e.target.value)}
                                placeholder="Product name (e.g. Mango Bar)"
                                className="h-7 text-xs bg-background"
                              />
                            </td>
                            <td className="p-1.5 px-3">
                              <Input
                                value={item.qty}
                                onChange={e => handleUpdateItem(activeTabVehicle, item.id, 'qty', e.target.value)}
                                placeholder="e.g. 5 Box"
                                className="h-7 text-xs bg-background"
                              />
                            </td>
                            <td className="p-1.5 px-3">
                              <Input
                                value={item.customerName}
                                onChange={e => handleUpdateItem(activeTabVehicle, item.id, 'customerName', e.target.value)}
                                placeholder="Customer / Outlet name"
                                className="h-7 text-xs bg-background"
                              />
                            </td>
                            <td className="p-1.5 px-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(activeTabVehicle, item.id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t bg-card flex flex-wrap items-center justify-between gap-2.5">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeBlankRows}
              onChange={e => setIncludeBlankRows(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4"
            />
            <span>Include blank lines on print for manual warehouse notes</span>
          </label>

          <div className="flex items-center gap-2 ml-auto">
            {/* WhatsApp Share Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopyWhatsApp(activeTabVehicle)}
              className="h-9 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200"
            >
              {copiedVehicle === activeTabVehicle ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> WhatsApp Text
                </>
              )}
            </Button>

            {/* Print Button */}
            <Button
              type="button"
              onClick={handlePrintQuantityPaper}
              disabled={isPrinting || loading}
              className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              {isPrinting ? 'Preparing Print...' : selectedVehicle === 'all' ? `Print All (${targetVehiclesToPrint.length} Vehicles)` : 'Print Quantity Paper'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
