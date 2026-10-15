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
  X,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import api from '@/lib/api';
import { VEHICLES, formatVehicleName } from '@/types';
import type { Order, IOrderMessage } from '@/types';

// Clean WhatsApp Icon
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
  isCustomTime?: boolean;
  staff: string;
  route: string;
  vehicleNumber: string;
  isManualVehicle?: boolean;
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

  // Per-vehicle extra products
  const [extraItemsByVehicle, setExtraItemsByVehicle] = useState<Record<string, ExtraProductItem[]>>({});

  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDate(defaultDate);
      if (defaultVehicle) setSelectedVehicle(defaultVehicle);
      setManualTextMode(false);
    }
  }, [isOpen, defaultDate, defaultVehicle]);

  // Name resolver
  const resolveStaffName = useCallback((username: string): string => {
    if (!username) return '';
    const match = salesUsers.find(u => u.username?.toLowerCase() === username.toLowerCase());
    return match?.name || username.charAt(0).toUpperCase() + username.slice(1);
  }, [salesUsers]);

  // Robust parser for message lines (ignores cash notes and bare numbers)
  const parseMessageItem = (text: string): { product: string; qty: string; isValid: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { product: '', qty: '', isValid: false };

    // Filter out payment/cash notes (e.g., "₹53.5", "53.5 paid", "cash 200")
    const isPaymentNote = /^([₹$]|rs\.?|inr|gpay|phonepe|paytm|cash|balance|paid|credit)/i.test(trimmed) ||
      /^[₹$]?\s*\d+(?:\.\d+)?\s*(?:rs|rupees|paid|balance|\/-)?$/i.test(trimmed);
    if (isPaymentNote) {
      return { product: '', qty: '', isValid: false };
    }

    // Filter out bare numbers with no letters (e.g., "56")
    if (/^\d+$/.test(trimmed)) {
      return { product: '', qty: '', isValid: false };
    }

    // Matches "Scrap: 150 kg, 150 kg" or "9x26: 75kg"
    const colonMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      return {
        product: colonMatch[1].trim(),
        qty: colonMatch[2].trim(),
        isValid: true,
      };
    }

    // Matches "150 kg Scrap"
    const leadingMatch = trimmed.match(/^(\d+(?:\.\d+)?\s*(?:box|boxes|pkt|pkts|kg|ltr|pcs|nos|bundle)?)\s+(.+)$/i);
    if (leadingMatch) {
      return {
        qty: leadingMatch[1].trim(),
        product: leadingMatch[2].trim(),
        isValid: true,
      };
    }

    // Matches "Scrap 150 kg"
    const trailingMatch = trimmed.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*(?:box|boxes|pkt|pkts|kg|ltr|pcs|nos|bundle))$/i);
    if (trailingMatch) {
      return {
        product: trailingMatch[1].trim(),
        qty: trailingMatch[2].trim(),
        isValid: true,
      };
    }

    return { product: trimmed, qty: '', isValid: true };
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
              const { product, qty, isValid } = parseMessageItem(msg.text);
              if (!isValid) return;
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

      // Set intelligent defaults for loadConfigs
      setLoadConfigs(prev => {
        const next = { ...prev };
        VEHICLES.forEach((v, i) => {
          const existing = next[v] || ({} as LoadConfig);
          const staffSet = staffByVeh[v];
          const autoStaff = staffSet && staffSet.size > 0
            ? Array.from(staffSet).map(s => resolveStaffName(s)).join('&')
            : existing.staff || (i === 0 ? 'Aflah&Babu' : i === 1 ? 'Fasal&ajmal' : 'Shafi');

          const defaultVehNum = DEFAULT_VEHICLE_NUMBERS[v] || '';
          const resolvedVehNum = existing.vehicleNumber !== undefined
            ? existing.vehicleNumber
            : defaultVehNum;

          next[v] = {
            time: existing.time || DEFAULT_LOAD_TIMES[i] || `${7 + i}.00am`,
            staff: existing.staff || autoStaff,
            route: existing.route || getDefaultRouteFromVehicle(v),
            vehicleNumber: resolvedVehNum,
            isManualVehicle: existing.isManualVehicle ?? (existing.vehicleNumber !== undefined && existing.vehicleNumber !== defaultVehNum),
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

    map.forEach(item => {
      item.standardBoxes = Math.round(item.standardQty / 30);
      item.premiumBoxes = Math.round(item.premiumQty / 30);
    });

    return map;
  }, [orders, routes]);

  // Active vehicles on this date
  const activeVehicles = useMemo(() => {
    const list: string[] = [];
    VEHICLES.forEach(v => {
      if ((vehicleStatsMap.get(v)?.ordersCount || 0) > 0) {
        list.push(v);
      }
    });
    vehicleStatsMap.forEach((data, key) => {
      if (data.ordersCount > 0 && !list.includes(key)) {
        list.push(key);
      }
    });
    return list;
  }, [vehicleStatsMap]);

  const fallbackVehicles = useMemo(() => VEHICLES.map(v => v as string), []);

  // User custom order of vehicles
  const [vehicleOrder, setVehicleOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load saved vehicle order when date changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`qty_paper_load_order_${date}`);
      if (saved) {
        setVehicleOrder(JSON.parse(saved));
      } else {
        setVehicleOrder([]);
      }
    } catch {
      setVehicleOrder([]);
    }
  }, [date]);

  const baseVehicles = useMemo(() => {
    return activeVehicles.length > 0 ? activeVehicles : fallbackVehicles;
  }, [activeVehicles, fallbackVehicles]);

  const displayVehicles = useMemo(() => {
    if (vehicleOrder.length > 0) {
      // Reconcile: keep items that exist in baseVehicles, append missing
      const valid = vehicleOrder.filter(v => baseVehicles.includes(v));
      const missing = baseVehicles.filter(v => !valid.includes(v));
      return [...valid, ...missing];
    }
    return baseVehicles;
  }, [vehicleOrder, baseVehicles]);

  // Reorder vehicle function
  const handleReorderVehicle = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= displayVehicles.length ||
      toIndex >= displayVehicles.length
    ) {
      return;
    }

    const updated = [...displayVehicles];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    setVehicleOrder(updated);

    try {
      localStorage.setItem(`qty_paper_load_order_${date}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save vehicle load order', err);
    }
  };

  // Drag and drop handlers for sliding/re-ordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      handleReorderVehicle(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Auto-select first active vehicle
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
        isManualVehicle: false,
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

  // Add extra product
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

  // Update extra product
  const handleUpdateExtraItem = (vehicle: string, itemId: string, field: 'product' | 'qty', value: string) => {
    setExtraItemsByVehicle(prev => {
      const items = prev[vehicle] || [];
      return {
        ...prev,
        [vehicle]: items.map(item => item.id === itemId ? { ...item, [field]: value } : item),
      };
    });
  };

  // Delete extra product
  const handleDeleteExtraItem = (vehicle: string, itemId: string) => {
    setExtraItemsByVehicle(prev => ({
      ...prev,
      [vehicle]: (prev[vehicle] || []).filter(item => item.id !== itemId),
    }));
  };

  // Target vehicles in scope
  const targetVehicles = useMemo(() => {
    if (selectedVehicle !== 'all') {
      return [selectedVehicle];
    }
    return displayVehicles;
  }, [selectedVehicle, displayVehicles]);

  // Overall totals
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

  // EXACT WHATSAPP REPORT TEXT
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
        isManualVehicle: false,
      };

      const ordinal = getOrdinal(index + 1);
      const timePart = cfg.isCustomTime && cfg.time
        ? cfg.time
        : (DEFAULT_LOAD_TIMES[index] || `${7 + index}.00am`);
      const staffPart = cfg.staff || (index === 0 ? 'Aflah&Babu' : index === 1 ? 'Fasal&ajmal' : 'Shafi');
      const routePart = cfg.route || getDefaultRouteFromVehicle(veh);
      const vehNumber = cfg.vehicleNumber !== undefined && cfg.vehicleNumber !== ''
        ? cfg.vehicleNumber
        : (DEFAULT_VEHICLE_NUMBERS[veh] || 'Vehicle');

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

      // Orange Premium (omitted if 0 boxes and not included)
      const orangeBoxesCount = stats.premiumBoxes || 0;
      const shouldIncludeOrange = cfg.includeOrange ?? (orangeBoxesCount > 0 || Boolean(cfg.orangeNote) || Boolean(cfg.orangeBoxesOverride));

      if (shouldIncludeOrange) {
        const orangeBoxes = cfg.orangeBoxesOverride !== undefined && cfg.orangeBoxesOverride !== ''
          ? cfg.orangeBoxesOverride
          : `${orangeBoxesCount} Box${orangeBoxesCount === 1 ? '' : 'es'}`;
        const orangeNote = cfg.orangeNote ? ` – ${cfg.orangeNote}` : '';
        output += `* Orange Premium: ${orangeBoxes}${orangeNote}\n`;
      }

      // Other products from messages and manual entries
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

      output += `\n`;
    });

    return output.trim();
  }, [date, targetVehicles, vehicleStatsMap, loadConfigs, extraItemsByVehicle]);

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

  // Open in WhatsApp
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

  const activeLoadIndex = displayVehicles.indexOf(activeTabVehicle);
  const activeOrdinal = activeLoadIndex >= 0 ? getOrdinal(activeLoadIndex + 1) : '1st';

  const activeCfg = loadConfigs[activeTabVehicle] || {
    time: DEFAULT_LOAD_TIMES[activeLoadIndex >= 0 ? activeLoadIndex : 0] || '7.00am',
    isCustomTime: false,
    staff: '',
    route: getDefaultRouteFromVehicle(activeTabVehicle),
    vehicleNumber: DEFAULT_VEHICLE_NUMBERS[activeTabVehicle] || '',
    isManualVehicle: false,
    greenNote: '',
    orangeNote: '',
  };

  const activeExtras = extraItemsByVehicle[activeTabVehicle] || [];

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[98vw] sm:w-[98vw] sm:max-w-[1620px] 2xl:max-w-[1760px] h-[94vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl border bg-background shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="px-6 py-4 border-b bg-card flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                WhatsApp Dispatch Report
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate clean vehicle dispatch loads for drivers & warehouse WhatsApp groups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-2.5 py-1 font-medium bg-muted/40">
              {targetVehicles.length} {targetVehicles.length === 1 ? 'Load' : 'Loads'} • {grandTotals.greenBoxes + grandTotals.orangeBoxes} Total Boxes
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5 shadow-xs">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-foreground"
              />
            </div>

            {/* Scope / Vehicle Filter */}
            <div className="w-72">
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="h-9 text-xs bg-background shadow-xs">
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
              className="h-9 px-3 gap-1.5 text-xs bg-background shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <Badge variant="secondary" className="font-semibold text-xs py-1 px-3">
            📅 {formatDispatchDate(date)}
          </Badge>
        </div>

        {/* Load Switcher Pill Tabs with Sliding / Drag Re-ordering */}
        {selectedVehicle === 'all' && (
          <div className="flex flex-wrap items-center justify-between border-b bg-card/60 px-6 py-2 gap-2 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden py-0.5 max-w-full">
              {displayVehicles.map((veh, idx) => {
                const stats = vehicleStatsMap.get(veh);
                const orderCount = stats?.ordersCount || 0;
                const isActive = activeTabVehicle === veh;
                const cfg = loadConfigs[veh];
                const vehNum = cfg?.vehicleNumber !== undefined ? cfg.vehicleNumber : (DEFAULT_VEHICLE_NUMBERS[veh] || '');
                const isManual = cfg?.isManualVehicle;
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={veh}
                    draggable={displayVehicles.length > 1}
                    onDragStart={e => handleDragStart(e, idx)}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={e => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex items-center rounded-lg border transition-all duration-150 select-none ${
                      isDragging
                        ? 'opacity-40 border-dashed border-primary scale-95 shadow-inner'
                        : isDragOver
                        ? 'border-primary ring-2 ring-primary/40 scale-[1.02]'
                        : ''
                    } ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {/* Drag Handle */}
                    {displayVehicles.length > 1 && (
                      <div
                        className={`pl-2 pr-1 py-1.5 flex items-center cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                        title="Drag to re-order load sequence"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Main Tab Clickable Area */}
                    <button
                      type="button"
                      onClick={() => setActiveTabVehicle(veh)}
                      className={`py-1.5 ${displayVehicles.length > 1 ? 'pr-2 pl-0.5' : 'px-3.5'} text-xs font-medium flex items-center gap-2 whitespace-nowrap`}
                    >
                      <span className="font-semibold">{getOrdinal(idx + 1)} Load:</span>
                      <span className="font-bold">{getDefaultRouteFromVehicle(veh)}</span>
                      {vehNum && (
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.2 rounded flex items-center gap-1 ${
                            isActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {isManual && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
                              title="Manually entered plate"
                            />
                          )}
                          {vehNum}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {orderCount}
                      </span>
                    </button>

                    {/* Quick Move Left / Right Arrows (Slide Controls) */}
                    {displayVehicles.length > 1 && (
                      <div className={`flex items-center gap-0.5 pr-1.5 opacity-60 group-hover:opacity-100 transition-opacity ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleReorderVehicle(idx, idx - 1);
                            }}
                            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                            title="Slide load earlier"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        )}
                        {idx < displayVehicles.length - 1 && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleReorderVehicle(idx, idx + 1);
                            }}
                            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                            title="Slide load later"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reorder Hint & Reset Button */}
            {displayVehicles.length > 1 && (
              <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground hidden sm:flex">
                <span className="flex items-center gap-1 text-muted-foreground/80">
                  <ArrowLeftRight className="w-3 h-3" /> Slide / drag to re-order loads
                </span>
                {vehicleOrder.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleOrder([]);
                      try {
                        localStorage.removeItem(`qty_paper_load_order_${date}`);
                      } catch {}
                    }}
                    className="text-[10px] text-primary hover:underline font-medium"
                    title="Reset to default route order"
                  >
                    Reset Order
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Balanced 2-Column Main Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left Column: Clean Load Editor (7 cols / 58%) */}
          <div className="lg:col-span-7 p-6 space-y-5 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Loading vehicle orders & messages...</p>
              </div>
            ) : (
              <>
                {/* Active Vehicle Info Header */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {activeOrdinal} Load — {formatVehicleName(activeTabVehicle)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeStats.ordersCount} active customer drops on this route
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeCfg.isManualVehicle && (
                      <Badge variant="secondary" className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                        Manual Plate
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 font-bold">
                      {activeCfg.vehicleNumber || 'No Plate'}
                    </Badge>
                  </div>
                </div>

                {/* Section 1: Dispatch Information */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Dispatch Header Details
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" /> Departure Time
                      </Label>
                      <Input
                        value={activeCfg.isCustomTime && activeCfg.time !== undefined
                          ? activeCfg.time
                          : (activeCfg.time || DEFAULT_LOAD_TIMES[activeLoadIndex >= 0 ? activeLoadIndex : 0] || '7.00am')}
                        onChange={e => {
                          handleConfigChange(activeTabVehicle, 'time', e.target.value);
                          handleConfigChange(activeTabVehicle, 'isCustomTime', true);
                        }}
                        placeholder="e.g. 7.00am"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" /> Staff / Salesmen
                      </Label>
                      <Input
                        value={activeCfg.staff || ''}
                        onChange={e => handleConfigChange(activeTabVehicle, 'staff', e.target.value)}
                        placeholder="e.g. Aflah&Babu"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" /> Route / Area
                      </Label>
                      <Input
                        value={activeCfg.route || ''}
                        onChange={e => handleConfigChange(activeTabVehicle, 'route', e.target.value)}
                        placeholder="e.g. Tirur"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                          <Truck className="w-3 h-3 text-muted-foreground" /> Vehicle Number
                        </Label>
                        <label className="flex items-center gap-1 text-[11px] cursor-pointer text-muted-foreground hover:text-foreground select-none font-medium">
                          <input
                            type="checkbox"
                            checked={activeCfg.isManualVehicle ?? false}
                            onChange={e => {
                              const isManual = e.target.checked;
                              handleConfigChange(activeTabVehicle, 'isManualVehicle', isManual);
                              if (!isManual) {
                                handleConfigChange(activeTabVehicle, 'vehicleNumber', DEFAULT_VEHICLE_NUMBERS[activeTabVehicle] || '');
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary w-3 h-3"
                          />
                          <span>Write Manually</span>
                        </label>
                      </div>
                      <Input
                        value={activeCfg.vehicleNumber !== undefined ? activeCfg.vehicleNumber : (DEFAULT_VEHICLE_NUMBERS[activeTabVehicle] || '')}
                        onChange={e => {
                          handleConfigChange(activeTabVehicle, 'vehicleNumber', e.target.value);
                          if (!activeCfg.isManualVehicle) {
                            handleConfigChange(activeTabVehicle, 'isManualVehicle', true);
                          }
                        }}
                        placeholder="Type manual vehicle plate e.g. BH5905, KL10-AV-1234"
                        className="h-9 text-xs font-mono font-bold bg-background text-primary"
                      />
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Presets:</span>
                        {['BH5905', 'BH0713', 'BJ6569', 'KL10-D', 'KL10-E'].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              handleConfigChange(activeTabVehicle, 'vehicleNumber', num);
                              handleConfigChange(activeTabVehicle, 'isManualVehicle', true);
                            }}
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono border transition-all ${
                              activeCfg.vehicleNumber === num
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            handleConfigChange(activeTabVehicle, 'vehicleNumber', '');
                            handleConfigChange(activeTabVehicle, 'isManualVehicle', true);
                          }}
                          className="text-[10px] px-1.5 py-0.2 rounded text-muted-foreground hover:text-destructive border border-dashed border-border"
                          title="Clear number to write manually"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Core Quantities (Green & Orange) */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" /> Core Box Quantities
                  </div>

                  <div className="space-y-3">
                    {/* Green Row */}
                    <div className="p-3.5 rounded-lg border bg-card/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Green (Standard)
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          Raw: {activeStats.standardQty} Pkt ({activeStats.standardBoxes} Boxes)
                        </span>
                      </div>
                      <div className="grid grid-cols-12 gap-2.5">
                        <div className="col-span-4">
                          <Input
                            value={activeCfg.greenBoxesOverride !== undefined ? activeCfg.greenBoxesOverride : `${activeStats.standardBoxes} Box`}
                            onChange={e => handleConfigChange(activeTabVehicle, 'greenBoxesOverride', e.target.value)}
                            placeholder="e.g. 86 Box"
                            className="h-9 text-xs font-bold bg-background"
                          />
                        </div>
                        <div className="col-span-8">
                          <Input
                            value={activeCfg.greenNote || ''}
                            onChange={e => handleConfigChange(activeTabVehicle, 'greenNote', e.target.value)}
                            placeholder="Optional note (e.g. New Production)"
                            className="h-9 text-xs bg-background"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Orange Premium Row */}
                    <div className="p-3.5 rounded-lg border bg-card/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Orange Premium
                        </span>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground select-none">
                          <input
                            type="checkbox"
                            checked={activeCfg.includeOrange ?? (activeStats.premiumBoxes > 0 || Boolean(activeCfg.orangeNote))}
                            onChange={e => handleConfigChange(activeTabVehicle, 'includeOrange', e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          <span>Include in message</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-12 gap-2.5">
                        <div className="col-span-4">
                          <Input
                            value={activeCfg.orangeBoxesOverride !== undefined ? activeCfg.orangeBoxesOverride : `${activeStats.premiumBoxes} Box${activeStats.premiumBoxes === 1 ? '' : 'es'}`}
                            onChange={e => handleConfigChange(activeTabVehicle, 'orangeBoxesOverride', e.target.value)}
                            placeholder="e.g. 25 Boxes"
                            className="h-9 text-xs font-bold bg-background"
                          />
                        </div>
                        <div className="col-span-8">
                          <Input
                            value={activeCfg.orangeNote || ''}
                            onChange={e => handleConfigChange(activeTabVehicle, 'orangeNote', e.target.value)}
                            placeholder="e.g. New Production (10/10/26)"
                            className="h-9 text-xs bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Other Products (Read Messages & Additions) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Other Products & Special Requests
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Items from customer messages or manual additions (Scrap, 9x26, 8x8, etc.)
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, 'Scrap', '150 kg, 150 kg')}
                        className="h-7 text-xs px-2.5 font-medium"
                      >
                        + Scrap
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '9x26', '75kg')}
                        className="h-7 text-xs px-2.5 font-medium"
                      >
                        + 9x26
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '8x8', '20kg')}
                        className="h-7 text-xs px-2.5 font-medium"
                      >
                        + 8x8
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '', '')}
                        className="h-7 text-xs px-2.5 border-dashed gap-1"
                      >
                        <Plus className="w-3 h-3" /> Item
                      </Button>
                    </div>
                  </div>

                  {activeExtras.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed bg-muted/10 text-center text-xs text-muted-foreground">
                      No extra product change requests for this load.
                      <button
                        type="button"
                        onClick={() => handleAddExtraItem(activeTabVehicle, '', '')}
                        className="text-primary font-semibold underline ml-1 hover:text-primary/80"
                      >
                        Click to add product
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeExtras.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                          <span className="text-xs font-semibold text-muted-foreground w-5 text-center shrink-0">
                            {idx + 1}.
                          </span>
                          <Input
                            value={item.product}
                            onChange={e => handleUpdateExtraItem(activeTabVehicle, item.id, 'product', e.target.value)}
                            placeholder="Product Name (e.g. Scrap)"
                            className="h-8 text-xs font-medium bg-background flex-1 min-w-[120px]"
                          />
                          <Input
                            value={item.qty}
                            onChange={e => handleUpdateExtraItem(activeTabVehicle, item.id, 'qty', e.target.value)}
                            placeholder="Quantity (e.g. 150 kg, 150 kg)"
                            className="h-8 text-xs font-semibold bg-background w-48 sm:w-60 shrink-0"
                          />
                          {item.customerName && (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 truncate max-w-[120px] shrink-0" title={item.customerName}>
                              {item.customerName}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExtraItem(activeTabVehicle, item.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
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

          {/* Right Column: Clean, High-Contrast WhatsApp Output (5 cols / 42%) */}
          <div className="lg:col-span-5 p-6 flex flex-col bg-muted/10 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div className="flex items-center gap-2">
                <WhatsAppIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  WhatsApp Message Output
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">
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
                className="h-7 text-xs gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
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

            {/* Clean Monospaced Message Box */}
            <div className="flex-1 min-h-[340px] flex flex-col rounded-xl border border-border bg-[#0c1317] text-[#e9edef] overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-[#1f2c34] text-xs font-semibold text-[#8696a0] border-b border-[#2a3942] flex items-center justify-between">
                <span>WhatsApp Text Output</span>
                <span className="text-[11px] font-mono">{formatDispatchDate(date)}</span>
              </div>

              <div className="flex-1 p-5 overflow-y-auto">
                {manualTextMode ? (
                  <textarea
                    value={customReportText}
                    onChange={e => setCustomReportText(e.target.value)}
                    className="w-full h-80 bg-transparent border-none outline-none resize-none font-mono text-[13px] leading-relaxed text-[#e9edef] select-text"
                    placeholder="Type WhatsApp message here..."
                  />
                ) : (
                  <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap select-text font-normal text-[#e9edef]">
                    {generatedWhatsAppText}
                  </pre>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4 shrink-0">
              <Button
                type="button"
                onClick={handleCopy}
                className="h-11 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
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
                className="h-11 text-xs font-semibold gap-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <ExternalLink className="w-4 h-4" /> Open in WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
