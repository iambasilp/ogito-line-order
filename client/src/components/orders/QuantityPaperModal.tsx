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
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  Calendar,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Edit3,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { VEHICLES, formatVehicleName } from '@/types';
import type { Order, IOrderMessage } from '@/types';

// WhatsApp SVG Icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.888 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

interface ExtraProductItem {
  id: string;
  product: string;
  qty: string;
  customerName?: string;
}

interface LoadConfig {
  time: string;
  staff: string;
  route: string;
  vehicleNumber: string;
  greenNote?: string;
  orangeNote?: string;
  greenBoxesOverride?: string;
  orangeBoxesOverride?: string;
  includeOrange?: boolean;
}

interface QuantityPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultVehicle?: string;
  routes?: Array<{ _id: string; name: string }>;
  salesUsers?: Array<{ _id?: string; id?: string; username: string; name?: string }>;
}

const DEFAULT_VEHICLE_NUMBERS: Record<string, string> = {
  'B - (Thirur / Cheruppalasery)': 'BH5905',
  'A - (Ponnani / Valancheri)': 'BH0713',
  'C - (Nilambur / Areekod)': 'BJ6569',
  'D - (Karuvarakundu / Calicut)': 'KL10-D',
  'E - (Pandikad+Mannarkad / Malappuram+Chelary)': 'KL10-E',
};

const DEFAULT_LOAD_TIMES = ['7.00am', '7.30am', '8.30am', '9.00am', '9.30am'];

const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Formats 2026-10-12 -> "12 Oct Monday 2026"
const formatDispatchDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const year = dateObj.getFullYear();
    return `${day} ${month} ${weekday} ${year}`;
  } catch {
    return dateStr;
  }
};

const getDefaultRouteFromVehicle = (v: string): string => {
  if (v.includes('Thirur') || v.includes('Tirur')) return 'Tirur';
  if (v.includes('Ponnani')) return 'Ponnani';
  if (v.includes('Nilambur')) return 'Nilambur';
  if (v.includes('Karuvarakundu')) return 'Karuvarakundu';
  if (v.includes('Pandikad') || v.includes('Malappuram')) return 'Malappuram';
  return 'Godown';
};

export const QuantityPaperModal: React.FC<QuantityPaperModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  defaultVehicle = 'all',
  routes = [],
  salesUsers = [],
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(defaultDate || getTodayStr());
  const [selectedVehicle, setSelectedVehicle] = useState<string>(defaultVehicle || 'all');
  const [activeTabVehicle, setActiveTabVehicle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [copied, setCopied] = useState(false);
  const [manualTextMode, setManualTextMode] = useState(false);
  const [customReportText, setCustomReportText] = useState('');

  // Per-vehicle load configuration
  const [loadConfigs, setLoadConfigs] = useState<Record<string, LoadConfig>>(() => {
    try {
      const saved = localStorage.getItem('qty_paper_load_configs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Per-vehicle extra products (from read messages + manual additions)
  const [extraItemsByVehicle, setExtraItemsByVehicle] = useState<Record<string, ExtraProductItem[]>>({});

  // Sync date/vehicle on open
  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDate(defaultDate);
      if (defaultVehicle) setSelectedVehicle(defaultVehicle);
      setManualTextMode(false);
    }
  }, [isOpen, defaultDate, defaultVehicle]);

  // Name resolver: maps 'babu' -> 'Babu', 'aflah' -> 'Aflah'
  const resolveStaffName = useCallback((username: string): string => {
    if (!username) return '';
    const match = salesUsers.find(u => u.username?.toLowerCase() === username.toLowerCase());
    return match?.name || username.charAt(0).toUpperCase() + username.slice(1);
  }, [salesUsers]);

  // Intelligent parser for message lines (filters out pure payment/cash notes like "₹53.5")
  const parseMessageItem = (text: string): { product: string; qty: string; isPayment?: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { product: '', qty: '' };

    // Filter out payment notes: e.g. "₹53.5", "53.5 paid", "Gpay 1200", "cash", "balance 200"
    const isPaymentNote = /^([₹$]|rs\.?|inr|gpay|phonepe|paytm|cash|balance|paid|credit)/i.test(trimmed) ||
      /^([₹$]?\s*\d+(?:\.\d+)?\s*(?:rs|rupees|paid|balance|\/-)?)$/i.test(trimmed);
    
    if (isPaymentNote) {
      return { product: '', qty: '', isPayment: true };
    }

    // Matches "Scrap: 150 kg, 150 kg" or "9x26: 75kg"
    const colonMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      return {
        product: colonMatch[1].trim(),
        qty: colonMatch[2].trim(),
      };
    }

    // Matches "150 kg Scrap" or "86 Box Green"
    const leadingMatch = trimmed.match(/^(\d+(?:\.\d+)?\s*(?:box|boxes|pkt|pkts|kg|ltr|pcs|nos|bundle)?)\s+(.+)$/i);
    if (leadingMatch) {
      return {
        qty: leadingMatch[1].trim(),
        product: leadingMatch[2].trim(),
      };
    }

    // Matches "Scrap 150 kg"
    const trailingMatch = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*(?:box|boxes|pkt|pkts|kg|ltr|pcs|nos|bundle))$/i);
    if (trailingMatch) {
      return {
        product: trailingMatch[1].trim(),
        qty: trailingMatch[2].trim(),
      };
    }

    return { product: trimmed, qty: '' };
  };

  // Fetch orders for target date
  const fetchOrders = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date', targetDate);
      params.append('limit', '10000');

      const res = await api.get(`/orders?${params.toString()}`);
      const fetchedOrders: Order[] = res.data?.orders || [];
      setOrders(fetchedOrders);

      // Extract read/approved messages per vehicle
      const extrasMap: Record<string, ExtraProductItem[]> = {};
      const staffByVeh: Record<string, Set<string>> = {};

      fetchedOrders.forEach(order => {
        if (order.isCancelled) return;
        const v = order.vehicle || 'Unassigned';

        if (!extrasMap[v]) extrasMap[v] = [];
        if (!staffByVeh[v]) staffByVeh[v] = new Set<string>();

        if (order.salesExecutive) {
          staffByVeh[v].add(order.salesExecutive);
        }

        if (order.orderMessages && order.orderMessages.length > 0) {
          order.orderMessages.forEach((msg: IOrderMessage, idx: number) => {
            const isApproved = msg.status === 'approved' || (
              order.orderMessages &&
              !order.orderMessages.some(m => m.status === 'pending') &&
              msg.status !== 'rejected'
            );

            if (isApproved && msg.text && msg.text.trim()) {
              const { product, qty, isPayment } = parseMessageItem(msg.text);
              if (isPayment) return; // Skip payment/cash receipts
              if (product || qty) {
                extrasMap[v].push({
                  id: msg._id || `${order._id}-${idx}`,
                  product,
                  qty,
                  customerName: order.customerName || (order as any).customer?.name,
                });
              }
            }
          });
        }
      });

      setExtraItemsByVehicle(extrasMap);

      // Set intelligent defaults for loadConfigs if not already saved
      setLoadConfigs(prev => {
        const next = { ...prev };
        VEHICLES.forEach((v, i) => {
          const existing = next[v] || ({} as LoadConfig);
          const staffSet = staffByVeh[v];
          const autoStaff = staffSet && staffSet.size > 0
            ? Array.from(staffSet).map(s => resolveStaffName(s)).join('&')
            : existing.staff || (i === 0 ? 'Aflah&Babu' : i === 1 ? 'Fasal&ajmal' : 'Shafi');

          next[v] = {
            time: existing.time || DEFAULT_LOAD_TIMES[i] || `${7 + i}.00am`,
            staff: existing.staff || autoStaff,
            route: existing.route || getDefaultRouteFromVehicle(v),
            vehicleNumber: existing.vehicleNumber || DEFAULT_VEHICLE_NUMBERS[v] || '',
            greenNote: existing.greenNote || '',
            orangeNote: existing.orangeNote || '',
            greenBoxesOverride: existing.greenBoxesOverride,
            orangeBoxesOverride: existing.orangeBoxesOverride,
            includeOrange: existing.includeOrange,
          };
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to load orders for quantity paper:', err);
    } finally {
      setLoading(false);
    }
  }, [resolveStaffName]);

  useEffect(() => {
    if (isOpen) {
      fetchOrders(date);
    }
  }, [isOpen, date, fetchOrders]);

  // Aggregate orders by vehicle
  const vehicleStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        vehicle: string;
        ordersCount: number;
        standardQty: number;
        premiumQty: number;
        standardBoxes: number;
        premiumBoxes: number;
        routes: Set<string>;
      }
    >();

    orders.forEach(order => {
      if (order.isCancelled) return;
      const v = order.vehicle || 'Unassigned';

      if (!map.has(v)) {
        map.set(v, {
          vehicle: v,
          ordersCount: 0,
          standardQty: 0,
          premiumQty: 0,
          standardBoxes: 0,
          premiumBoxes: 0,
          routes: new Set<string>(),
        });
      }

      const item = map.get(v)!;
      item.ordersCount += 1;
      item.standardQty += order.standardQty || 0;
      item.premiumQty += order.premiumQty || 0;
      if (order.route) {
        const matched = routes.find(r => r._id === order.route);
        item.routes.add(matched ? matched.name : order.route);
      }
    });

    // Compute standard boxes (30 pkt per box)
    map.forEach(item => {
      item.standardBoxes = Math.round(item.standardQty / 30);
      item.premiumBoxes = Math.round(item.premiumQty / 30);
    });

    return map;
  }, [orders, routes]);

  // List of active vehicles (having orders on this date)
  const activeVehicles = useMemo(() => {
    const list: string[] = [];
    VEHICLES.forEach(v => {
      if ((vehicleStatsMap.get(v)?.ordersCount || 0) > 0) {
        list.push(v);
      }
    });
    // Add any non-standard vehicle that has orders
    vehicleStatsMap.forEach((data, key) => {
      if (data.ordersCount > 0 && !list.includes(key)) {
        list.push(key);
      }
    });
    return list;
  }, [vehicleStatsMap]);

  // Fallback list of vehicles if no active orders exist yet
  const fallbackVehicles = useMemo(() => {
    return VEHICLES.map(v => v as string);
  }, []);

  // Display vehicles to show in tabs: prioritize active vehicles
  const displayVehicles = useMemo(() => {
    return activeVehicles.length > 0 ? activeVehicles : fallbackVehicles;
  }, [activeVehicles, fallbackVehicles]);

  // Set active tab vehicle automatically to the first active vehicle
  useEffect(() => {
    if (selectedVehicle !== 'all') {
      setActiveTabVehicle(selectedVehicle);
    } else if (displayVehicles.length > 0) {
      if (!displayVehicles.includes(activeTabVehicle)) {
        setActiveTabVehicle(displayVehicles[0]);
      }
    }
  }, [selectedVehicle, displayVehicles, activeTabVehicle]);

  // Update load configuration
  const handleConfigChange = (vehicle: string, field: keyof LoadConfig, value: any) => {
    setLoadConfigs(prev => {
      const current = prev[vehicle] || {
        time: '7.00am',
        staff: '',
        route: getDefaultRouteFromVehicle(vehicle),
        vehicleNumber: DEFAULT_VEHICLE_NUMBERS[vehicle] || '',
      };
      const updated = {
        ...prev,
        [vehicle]: { ...current, [field]: value },
      };
      try {
        localStorage.setItem('qty_paper_load_configs', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }
      return updated;
    });
  };

  // Add extra product item to vehicle
  const handleAddExtraItem = (vehicle: string, defaultName = '', defaultQty = '') => {
    const newItem: ExtraProductItem = {
      id: 'manual-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      product: defaultName,
      qty: defaultQty,
    };
    setExtraItemsByVehicle(prev => ({
      ...prev,
      [vehicle]: [...(prev[vehicle] || []), newItem],
    }));
  };

  // Update extra product item
  const handleUpdateExtraItem = (vehicle: string, itemId: string, field: 'product' | 'qty', value: string) => {
    setExtraItemsByVehicle(prev => {
      const items = prev[vehicle] || [];
      return {
        ...prev,
        [vehicle]: items.map(item => item.id === itemId ? { ...item, [field]: value } : item),
      };
    });
  };

  // Delete extra product item
  const handleDeleteExtraItem = (vehicle: string, itemId: string) => {
    setExtraItemsByVehicle(prev => ({
      ...prev,
      [vehicle]: (prev[vehicle] || []).filter(item => item.id !== itemId),
    }));
  };

  // Target vehicles in scope for report generation
  const targetVehicles = useMemo(() => {
    if (selectedVehicle !== 'all') {
      return [selectedVehicle];
    }
    return activeVehicles.length > 0 ? activeVehicles : fallbackVehicles.slice(0, 3);
  }, [selectedVehicle, activeVehicles, fallbackVehicles]);

  // Total boxes across active loads
  const grandTotals = useMemo(() => {
    let greenBoxes = 0;
    let orangeBoxes = 0;
    let totalOrders = 0;

    targetVehicles.forEach(v => {
      const stats = vehicleStatsMap.get(v);
      if (stats) {
        greenBoxes += stats.standardBoxes;
        orangeBoxes += stats.premiumBoxes;
        totalOrders += stats.ordersCount;
      }
    });

    return { greenBoxes, orangeBoxes, totalOrders };
  }, [targetVehicles, vehicleStatsMap]);

  // GENERATE THE EXACT WHATSAPP REPORT TEXT
  const generatedWhatsAppText = useMemo(() => {
    const headerDate = formatDispatchDate(date);
    let output = `🚚 DISPATCH REPORT ${headerDate}\n`;
    output += `━━━━━━━━━━━━━━\n`;

    targetVehicles.forEach((veh, index) => {
      const stats = vehicleStatsMap.get(veh) || {
        standardBoxes: 0,
        premiumBoxes: 0,
        standardQty: 0,
        premiumQty: 0,
        ordersCount: 0,
        routes: new Set<string>(),
      };

      const cfg = loadConfigs[veh] || {
        time: DEFAULT_LOAD_TIMES[index] || `${7 + index}.00am`,
        staff: index === 0 ? 'Aflah&Babu' : index === 1 ? 'Fasal&ajmal' : 'Shafi',
        route: getDefaultRouteFromVehicle(veh),
        vehicleNumber: DEFAULT_VEHICLE_NUMBERS[veh] || 'BH5905',
      };

      const ordinal = getOrdinal(index + 1);
      const timePart = cfg.time || DEFAULT_LOAD_TIMES[index] || `${7 + index}.00am`;
      const staffPart = cfg.staff || (index === 0 ? 'Aflah&Babu' : index === 1 ? 'Fasal&ajmal' : 'Shafi');
      const routePart = cfg.route || getDefaultRouteFromVehicle(veh);
      const vehNumber = cfg.vehicleNumber || DEFAULT_VEHICLE_NUMBERS[veh] || 'Vehicle';

      // Load header: 🕓 1st  Load – 7.00am - Aflah&Babu - Tirur
      output += `🕓 ${ordinal}  Load – ${timePart} - ${staffPart} - ${routePart}\n`;

      // Vehicle line: * Vehicle: *BH5905*
      output += `* Vehicle: *${vehNumber}*\n`;

      // Green: 86 Box
      const greenBoxes = cfg.greenBoxesOverride !== undefined && cfg.greenBoxesOverride !== ''
        ? cfg.greenBoxesOverride
        : `${stats.standardBoxes || 0} Box`;
      const greenNote = cfg.greenNote ? ` – ${cfg.greenNote}` : '';
      output += `* Green: ${greenBoxes}${greenNote}\n`;

      // Orange Premium:
      // In the user's example: If 0 Boxes and no note, omit it!
      const orangeBoxesCount = stats.premiumBoxes || 0;
      const shouldIncludeOrange = cfg.includeOrange ?? (orangeBoxesCount > 0 || Boolean(cfg.orangeNote) || Boolean(cfg.orangeBoxesOverride));

      if (shouldIncludeOrange) {
        const orangeBoxes = cfg.orangeBoxesOverride !== undefined && cfg.orangeBoxesOverride !== ''
          ? cfg.orangeBoxesOverride
          : `${orangeBoxesCount} Box${orangeBoxesCount === 1 ? '' : 'es'}`;
        const orangeNote = cfg.orangeNote ? ` – ${cfg.orangeNote}` : '';
        output += `* Orange Premium: ${orangeBoxes}${orangeNote}\n`;
      }

      // Other products from read messages and manual additions
      const extras = extraItemsByVehicle[veh] || [];
      extras.forEach(item => {
        if (!item.product && !item.qty) return;
        if (item.product && item.qty) {
          output += `* ${item.product}: ${item.qty}\n`;
        } else if (item.product) {
          output += `* ${item.product}\n`;
        } else if (item.qty) {
          output += `* ${item.qty}\n`;
        }
      });

      // Space between loads
      output += `\n`;
    });

    return output.trim();
  }, [date, targetVehicles, vehicleStatsMap, loadConfigs, extraItemsByVehicle]);

  // Keep manual text synced unless user is directly typing in it
  useEffect(() => {
    if (!manualTextMode) {
      setCustomReportText(generatedWhatsAppText);
    }
  }, [generatedWhatsAppText, manualTextMode]);

  // Copy to clipboard
  const handleCopy = () => {
    const textToCopy = manualTextMode ? customReportText : generatedWhatsAppText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Open directly in WhatsApp Web / App
  const handleOpenWhatsApp = () => {
    const textToSend = manualTextMode ? customReportText : generatedWhatsAppText;
    const url = `https://wa.me/?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank');
  };

  const activeStats = vehicleStatsMap.get(activeTabVehicle) || {
    standardBoxes: 0,
    premiumBoxes: 0,
    standardQty: 0,
    premiumQty: 0,
    ordersCount: 0,
    routes: new Set<string>(),
  };

  const activeCfg = loadConfigs[activeTabVehicle] || {
    time: '7.00am',
    staff: '',
    route: getDefaultRouteFromVehicle(activeTabVehicle),
    vehicleNumber: DEFAULT_VEHICLE_NUMBERS[activeTabVehicle] || '',
    greenNote: '',
    orangeNote: '',
  };

  const activeExtras = extraItemsByVehicle[activeTabVehicle] || [];
  const activeLoadIndex = displayVehicles.indexOf(activeTabVehicle);
  const activeOrdinal = activeLoadIndex >= 0 ? getOrdinal(activeLoadIndex + 1) : '1st';

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[98vw] max-w-6xl h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-border bg-card">
        {/* Header Bar */}
        <DialogHeader className="px-5 py-4 border-b bg-card flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  WhatsApp Dispatch Report
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Quantity Paper
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clean vehicle-wise WhatsApp loads with Green, Orange & Read Message extra products
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {targetVehicles.length} {targetVehicles.length === 1 ? 'Load' : 'Loads'} • {grandTotals.greenBoxes + grandTotals.orangeBoxes} Total Boxes
            </span>
          </div>
        </DialogHeader>

        {/* Top Controls Bar */}
        <div className="px-5 py-3 bg-muted/30 border-b flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-background border rounded-lg px-2.5 py-1 shadow-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer"
              />
            </div>

            {/* Scope / Vehicle Filter */}
            <div className="w-64 sm:w-80">
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="h-9 text-xs bg-background shadow-sm">
                  <SelectValue placeholder="Scope: All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    🚚 All Vehicles (Consolidated Report)
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
              onClick={() => fetchOrders(date)}
              disabled={loading}
              className="h-9 px-3 gap-1.5 text-xs shadow-sm bg-background"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold text-xs py-1 px-2.5">
              📅 {formatDispatchDate(date)}
            </Badge>
          </div>
        </div>

        {/* Load Navigation Tabs (when All Vehicles is selected) */}
        {selectedVehicle === 'all' && (
          <div className="flex overflow-x-auto border-b bg-card/90 px-4 pt-2.5 gap-2 shrink-0 [&::-webkit-scrollbar]:hidden">
            {displayVehicles.map((veh, idx) => {
              const stats = vehicleStatsMap.get(veh);
              const orderCount = stats?.ordersCount || 0;
              const hasExtras = (extraItemsByVehicle[veh] || []).length > 0;
              const isActive = activeTabVehicle === veh;
              const cfg = loadConfigs[veh];
              const vehNum = cfg?.vehicleNumber || DEFAULT_VEHICLE_NUMBERS[veh] || '';

              return (
                <button
                  key={veh}
                  onClick={() => setActiveTabVehicle(veh)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shadow-sm ${
                    isActive
                      ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-sm'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="font-bold">{getOrdinal(idx + 1)} Load:</span>
                  <span>{getDefaultRouteFromVehicle(veh)}</span>
                  {vehNum && (
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted/80 text-foreground border border-border/50">
                      {vehNum}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      orderCount > 0 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {orderCount} {orderCount === 1 ? 'order' : 'orders'}
                  </span>
                  {hasExtras && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Has other products" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 2-Column Balanced Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left Column: Interactive Load Details Editor (6 cols / 50%) */}
          <div className="lg:col-span-6 p-5 space-y-4 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Loading vehicle orders & messages...</p>
              </div>
            ) : (
              <>
                {/* Active Load Banner */}
                <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50/80 via-background to-background dark:from-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm">
                      {activeOrdinal}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {formatVehicleName(activeTabVehicle)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {activeStats.ordersCount} drops / active customer orders
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono font-bold text-xs bg-background px-2.5 py-1">
                    {activeCfg.vehicleNumber || 'No Plate'}
                  </Badge>
                </div>

                {/* Load Dispatch Details Grid */}
                <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Dispatch Info
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Load Time
                      </Label>
                      <Input
                        value={activeCfg.time || ''}
                        onChange={e => handleConfigChange(activeTabVehicle, 'time', e.target.value)}
                        placeholder="e.g. 7.00am"
                        className="h-9 text-xs font-medium bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> Salesmen / Staff
                      </Label>
                      <Input
                        value={activeCfg.staff || ''}
                        onChange={e => handleConfigChange(activeTabVehicle, 'staff', e.target.value)}
                        placeholder="e.g. Aflah&Babu"
                        className="h-9 text-xs font-medium bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Route / Area
                      </Label>
                      <Input
                        value={activeCfg.route || ''}
                        onChange={e => handleConfigChange(activeTabVehicle, 'route', e.target.value)}
                        placeholder="e.g. Tirur"
                        className="h-9 text-xs font-medium bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Vehicle Registration No
                      </Label>
                      <Input
                        value={activeCfg.vehicleNumber || ''}
                        onChange={e => handleConfigChange(activeTabVehicle, 'vehicleNumber', e.target.value)}
                        placeholder="e.g. BH5905"
                        className="h-9 text-xs font-mono font-bold bg-background text-emerald-700 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Core Stock Products: Green & Orange Premium */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Green Box */}
                  <div className="p-3.5 rounded-xl border border-emerald-300/70 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Green (Standard)
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {activeStats.standardQty} Pkt
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={activeCfg.greenBoxesOverride !== undefined ? activeCfg.greenBoxesOverride : `${activeStats.standardBoxes} Box`}
                          onChange={e => handleConfigChange(activeTabVehicle, 'greenBoxesOverride', e.target.value)}
                          placeholder="e.g. 86 Box"
                          className="h-8 text-xs font-bold bg-background w-28 text-emerald-700 dark:text-emerald-400"
                        />
                        <Input
                          value={activeCfg.greenNote || ''}
                          onChange={e => handleConfigChange(activeTabVehicle, 'greenNote', e.target.value)}
                          placeholder="Production note..."
                          className="h-8 text-xs bg-background flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Orange Premium Box */}
                  <div className="p-3.5 rounded-xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        Orange Premium
                      </span>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer text-muted-foreground select-none">
                        <input
                          type="checkbox"
                          checked={activeCfg.includeOrange ?? (activeStats.premiumBoxes > 0 || Boolean(activeCfg.orangeNote))}
                          onChange={e => handleConfigChange(activeTabVehicle, 'includeOrange', e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        <span>Include</span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={activeCfg.orangeBoxesOverride !== undefined ? activeCfg.orangeBoxesOverride : `${activeStats.premiumBoxes} Box${activeStats.premiumBoxes === 1 ? '' : 'es'}`}
                          onChange={e => handleConfigChange(activeTabVehicle, 'orangeBoxesOverride', e.target.value)}
                          placeholder="e.g. 25 Boxes"
                          className="h-8 text-xs font-bold bg-background w-28 text-amber-700 dark:text-amber-400"
                        />
                        <Input
                          value={activeCfg.orangeNote || ''}
                          onChange={e => handleConfigChange(activeTabVehicle, 'orangeNote', e.target.value)}
                          placeholder="e.g. New Production (10/10/26)"
                          className="h-8 text-xs bg-background flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other Products Section */}
                <div className="p-4 rounded-xl border bg-card/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Other Products & Special Requests
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Items from read messages (Scrap, 9x26, 8x8, etc.)
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, 'Scrap', '150 kg, 150 kg')}
                        className="h-7 text-xs font-semibold px-2 bg-muted hover:bg-muted/80"
                      >
                        + Scrap
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '9x26', '75kg')}
                        className="h-7 text-xs font-semibold px-2 bg-muted hover:bg-muted/80"
                      >
                        + 9x26
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '8x8', '20kg')}
                        className="h-7 text-xs font-semibold px-2 bg-muted hover:bg-muted/80"
                      >
                        + 8x8
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '', '')}
                        className="h-7 text-xs font-semibold px-2 border-dashed gap-1"
                      >
                        <Plus className="w-3 h-3" /> Item
                      </Button>
                    </div>
                  </div>

                  {activeExtras.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed bg-muted/10 text-center text-xs text-muted-foreground">
                      No extra products detected from messages.
                      <button
                        type="button"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '', '')}
                        className="text-emerald-600 font-semibold underline ml-1 hover:text-emerald-500"
                      >
                        Click to add manually
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeExtras.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border shadow-xs">
                          <span className="text-[11px] font-bold text-muted-foreground w-4 text-center">
                            {idx + 1}.
                          </span>
                          <Input
                            value={item.product}
                            onChange={e => handleUpdateExtraItem(activeTabVehicle, item.id, 'product', e.target.value)}
                            placeholder="Product Name (e.g. Scrap)"
                            className="h-8 text-xs font-semibold bg-background flex-1"
                          />
                          <Input
                            value={item.qty}
                            onChange={e => handleUpdateExtraItem(activeTabVehicle, item.id, 'qty', e.target.value)}
                            placeholder="Quantity (e.g. 150 kg, 150 kg)"
                            className="h-8 text-xs font-bold bg-background w-36 text-primary"
                          />
                          {item.customerName && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[90px] font-medium" title={item.customerName}>
                              {item.customerName}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExtraItem(activeTabVehicle, item.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: WhatsApp Live Preview & One-Click Actions (6 cols / 50%) */}
          <div className="lg:col-span-6 p-5 flex flex-col bg-muted/20 overflow-hidden">
            {/* WhatsApp Phone Mockup Header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white">
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  WhatsApp Preview
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                  {selectedVehicle === 'all' ? `${targetVehicles.length} Loads` : '1 Load'}
                </Badge>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (manualTextMode) {
                    setCustomReportText(generatedWhatsAppText);
                  }
                  setManualTextMode(!manualTextMode);
                }}
                className="h-7 text-xs gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              >
                {manualTextMode ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> Auto Preview
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" /> Edit Raw Text
                  </>
                )}
              </Button>
            </div>

            {/* WhatsApp Chat Card Container */}
            <div className="flex-1 min-h-[360px] flex flex-col rounded-2xl border border-emerald-600/30 overflow-hidden shadow-lg bg-[#efeae2] dark:bg-[#0b141a]">
              {/* WhatsApp Chat Top Header Bar */}
              <div className="px-4 py-2.5 bg-[#008069] dark:bg-[#1f2c34] text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    🚚
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Daily Dispatch Group</div>
                    <div className="text-[10px] text-white/80 leading-tight">tap to copy or share message</div>
                  </div>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  {formatDispatchDate(date)}
                </span>
              </div>

              {/* Message Bubble Body */}
              <div className="flex-1 p-3.5 overflow-y-auto">
                <div className="bg-white dark:bg-[#1f2c34] text-gray-900 dark:text-gray-100 rounded-xl p-4 shadow-sm border border-emerald-200/50 dark:border-emerald-950/60 max-w-full">
                  {manualTextMode ? (
                    <textarea
                      value={customReportText}
                      onChange={e => setCustomReportText(e.target.value)}
                      className="w-full h-80 bg-transparent border-none outline-none resize-none font-mono text-xs leading-relaxed text-foreground select-text"
                      placeholder="Type WhatsApp message here..."
                    />
                  ) : (
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap select-text font-normal">
                      {generatedWhatsAppText}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="grid grid-cols-2 gap-3 mt-3.5 shrink-0">
              <Button
                type="button"
                onClick={handleCopy}
                className="h-11 text-xs font-bold gap-2 bg-[#00a884] hover:bg-[#008f6f] text-white shadow-md transition-all hover:scale-[1.01]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" /> Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy WhatsApp Text
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleOpenWhatsApp}
                className="h-11 text-xs font-semibold gap-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <ExternalLink className="w-4 h-4" /> Send on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
