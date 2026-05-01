import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrdersContext';
import api, { updateOrderBillingStatus, updateOrderDeliveryStatus } from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import type { Customer, Order, ReceiptRecord, PaymentType } from '@/types';
import { VEHICLES } from '@/types';
import {
  Plus,
  Download,
  Filter,
  ShoppingCart,
  Package,
  Star,
  IndianRupee,
  Calendar,
  User,
  Truck,
  MapPin,
  Search,
  LayoutDashboard,
  Banknote,
  Smartphone,
  MoreHorizontal,
  Phone,
  Copy,
  Check,
  Receipt,
  X,
  Trash2
} from 'lucide-react';
import { OrderMessageIcon } from '@/components/OrderMessageIcon';
import { receiptApi } from '@/lib/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const RECEIPTS_STORAGE_KEY = 'ogito_receipts';
const PAYMENT_TYPES: PaymentType[] = ['Cash', 'UPI / PhonePe / GPay', 'Check', 'Other'];

const paymentTypeIcon = (type: PaymentType) => {
  switch (type) {
    case 'Cash': return <Banknote className="h-4 w-4" />;
    case 'UPI / PhonePe / GPay': return <Smartphone className="h-4 w-4" />;
    case 'Check': return <LayoutDashboard className="h-4 w-4" />;
    default: return <Receipt className="h-4 w-4" />;
  }
};
// ───────────────────────────────────────────────────────────────────────────────

interface SalesUser {
  _id: string;
  username: string;
  name: string;
}

interface Route {
  _id: string;
  name: string;
}

// Sales Targets Configuration (Historical)
// Format: username -> array of { month: 'YYYY-MM', target: number }
// If a specific month is not found, it falls back to the default (first entry or logic below)
const USER_TARGET_HISTORY: Record<string, { month: string, target: number }[]> = {
  'naseef': [
    { month: '2026-02', target: 10000000 }, // Feb 2026 (1 Crore)
    { month: '2026-03', target: 4000000 }, // Mar 2026 (1.2 Crore) - Example
    { month: '2026-04', target: 1900000 }
  ],
  'shibin': [
    { month: '2026-02', target: 5000000 },
    { month: '2026-03', target: 4000000 },
    { month: '2026-04', target: 1600000 }
  ],
  'dileep': [
    { month: '2026-02', target: 2600000 },
    { month: '2026-03', target: 1000000 },
    { month: '2026-04', target: 500000 }
  ]
};

const getCurrentTarget = (username: string, dateStr: string | null): number => {
  if (!username || !USER_TARGET_HISTORY[username]) return 0;

  const history = USER_TARGET_HISTORY[username];

  // Determine the month to look for
  let targetMonth = '';
  if (dateStr) {
    // If a filter date is provided, use that month
    targetMonth = dateStr.substring(0, 7); // YYYY-MM
  } else {
    // Default to current month
    targetMonth = new Date().toISOString().substring(0, 7);
  }

  // Find the exact month target
  const exactMatch = history.find(h => h.month === targetMonth);
  if (exactMatch) return exactMatch.target;

  // Fallback: Use the specific Feb 2026 targets as "default" basic targets if current month not found
  // This ensures existing logic holds true until new targets are added
  // In a real scenario, you might want to find the latest valid target
  const defaultTarget = history.find(h => h.month === '2026-02');
  return defaultTarget ? defaultTarget.target : 0;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

type ViewMode = 'daily' | 'monthly' | 'custom';

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const getDateRange = (dateStr: string, mode: ViewMode, dateToStr?: string): { start: Date, end: Date } => {
  const date = new Date(dateStr);
  const start = new Date(date);
  const end = new Date(date);

  if (mode === 'daily') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (mode === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1);
    end.setDate(0); // Last day of the month
    end.setHours(23, 59, 59, 999);
  } else if (mode === 'custom') {
    start.setHours(0, 0, 0, 0);
    if (dateToStr) {
      const dateTo = new Date(dateToStr);
      dateTo.setHours(23, 59, 59, 999);
      return { start, end: dateTo };
    }
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

const ORDER_COLUMNS = [
  { id: 'sno', label: 'S.No' },
  { id: 'date', label: 'Date' },
  { id: 'status', label: 'Status' },
  { id: 'messages', label: 'Messages' },
  { id: 'customer', label: 'Customer' },
  { id: 'standardQty', label: 'Std Qty' },
  { id: 'standardPrice', label: 'Std Price' },
  { id: 'premiumQty', label: 'Prem Qty' },
  { id: 'premiumPrice', label: 'Prem Price' },
  { id: 'route', label: 'Route' },
  { id: 'salesExecutive', label: 'Executive' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'phone', label: 'Phone' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'total', label: 'Total' },
  { id: 'actions', label: 'Actions' }
];

interface ColumnState {
  [key: string]: boolean;
}

const ExpandableText = ({ text, className = "" }: { text: string; className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className={`cursor-pointer select-none transition-all duration-200 ${isExpanded ? '' : 'line-clamp-1 overflow-hidden text-ellipsis'} ${className}`}
      title={isExpanded ? '' : text}
    >
      {text}
    </div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/20"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
      )}
    </button>
  );
};

const Orders: React.FC = () => {
  const { isAdmin, user } = useAuth();
  
  // Single source of truth for orders and stock
  const { state: ordersState, dispatch } = useOrders();
  const orders = ordersState.orders;
  const standardStock = ordersState.standardStock;
  const premiumStock = ordersState.premiumStock;
  
  // Helper to maintain compatibility with existing optimistic updates
  const setOrders = (newOrdersOrUpdater: Order[] | ((prev: Order[]) => Order[])) => {
    if (typeof newOrdersOrUpdater === 'function') {
      dispatch({ type: 'SET_ORDERS', payload: { orders: newOrdersOrUpdater(orders) } });
    } else {
      dispatch({ type: 'SET_ORDERS', payload: { orders: newOrdersOrUpdater } });
    }
  };

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerPage, setCustomerPage] = useState(1);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showSummary, setShowSummary] = useState(() => {
    const saved = localStorage.getItem('orders_showSummary');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('orders_showSummary', JSON.stringify(showSummary));
  }, [showSummary]);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Drivers can only use daily or custom — never monthly
    if (user?.role === 'driver') return 'daily';
    return 'daily';
  });

  const [showMobileActions, setShowMobileActions] = useState(false);

  // ─── Receipt State (Full Stack Migration) ──────────────────────────────────
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const isDriverOrAdmin = isAdmin || user?.role === 'driver';

  // 1. Initial Load & Migration Sync
  useEffect(() => {
    let isMounted = true;
    const fetchAndSyncReceipts = async () => {
      if (!isDriverOrAdmin || !isMounted) return;

      try {
        // Fetch from server
        const { data: serverReceipts } = await receiptApi.list();
        if (!isMounted) return;

        // Check for local "orphan" receipts to sync
        const localSaved = localStorage.getItem(RECEIPTS_STORAGE_KEY);
        if (localSaved) {
          const localReceipts: ReceiptRecord[] = JSON.parse(localSaved);
          if (localReceipts.length > 0) {
            // To be ultra-safe, we'll sync and then clear
            for (const rcpt of localReceipts) {
              const { id, ...cleanData } = rcpt as any;
              try {
                await receiptApi.create(cleanData);
              } catch (e) {
                console.error('Failed to sync individual receipt:', rcpt, e);
              }
            }
            // Clear local storage after sync attempt
            localStorage.removeItem(RECEIPTS_STORAGE_KEY);
            // Re-fetch clean state
            const { data: refreshedReceipts } = await receiptApi.list();
            if (isMounted) setReceipts(refreshedReceipts);
            return;
          }
        }
        setReceipts(serverReceipts);
      } catch (err) {
        console.error('Failed to sync/fetch receipts:', err);
      }
    };

    fetchAndSyncReceipts();
    return () => { isMounted = false; };
  }, [isDriverOrAdmin]);

  const [activeTab, setActiveTab] = useState<'orders' | 'receipts'>('orders');
  const [receiptTargetOrder, setReceiptTargetOrder] = useState<Order | null>(null);
  const [showReceiptDrawer, setShowReceiptDrawer] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [isCustomReceipt, setIsCustomReceipt] = useState(false);
  const [customReceiptCustomer, setCustomReceiptCustomer] = useState<Customer | null>(null);
  const [customCustomerSearch, setCustomCustomerSearch] = useState('');
  const [showCustomCustomerDropdown, setShowCustomCustomerDropdown] = useState(false);
  const [customReceiptDate, setCustomReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [receiptForm, setReceiptForm] = useState({
    amount: '',
    paymentType: 'Cash' as PaymentType,
    transactionRef: ''
  });
  const [receiptError, setReceiptError] = useState('');

  const openReceiptDrawer = (order: Order) => {
    setIsCustomReceipt(false);
    setReceiptTargetOrder(order);
    setEditingReceiptId(null);
    setReceiptForm({ amount: '', paymentType: 'Cash', transactionRef: '' });
    setReceiptError('');
    setShowReceiptDrawer(true);
  };

  const openCustomReceiptDrawer = () => {
    setIsCustomReceipt(true);
    setReceiptTargetOrder(null);
    setCustomReceiptCustomer(null);
    setCustomCustomerSearch('');
    setEditingReceiptId(null);
    setShowCustomCustomerDropdown(false);
    setCustomReceiptDate(new Date().toISOString().split('T')[0]);
    setReceiptForm({ amount: '', paymentType: 'Cash', transactionRef: '' });
    setReceiptError('');
    setShowReceiptDrawer(true);
  };

  const openEditReceiptDrawer = (receipt: ReceiptRecord) => {
    setEditingReceiptId(receipt._id || receipt.id || null);
    setIsCustomReceipt(receipt.isCustom || false);

    if (receipt.isCustom) {
      setCustomReceiptCustomer({
        _id: receipt.customerId || '',
        name: receipt.orderCustomer,
        route: receipt.orderRoute,
        salesExecutive: '', greenPrice: 0, orangePrice: 0, phone: ''
      });
      setCustomReceiptDate(new Date(receipt.collectedAt).toISOString().split('T')[0]);
      setReceiptTargetOrder(null);
    } else {
      setReceiptTargetOrder({
        _id: receipt.orderId!,
        customerName: receipt.orderCustomer,
        route: receipt.orderRoute,
        total: receipt.orderTotal || 0,
        customerId: '', customerPhone: '', date: '', vehicle: '', salesExecutive: '',
        standardQty: 0, premiumQty: 0, greenPrice: 0, orangePrice: 0, standardTotal: 0, premiumTotal: 0, createdBy: '', createdByUsername: '', createdAt: '', updatedAt: '', isCancelled: false
      } as Order);
      setCustomReceiptCustomer(null);
    }

    setReceiptForm({
      amount: receipt.amount.toString(),
      paymentType: receipt.paymentType,
      transactionRef: receipt.transactionRef || ''
    });
    setReceiptError('');
    setShowReceiptDrawer(true);
  };

  const closeReceiptDrawer = () => {
    setShowReceiptDrawer(false);
    setReceiptTargetOrder(null);
    setIsCustomReceipt(false);
    setReceiptError('');
    setCustomCustomerSearch('');
    setCustomReceiptCustomer(null);
    setShowCustomCustomerDropdown(false);
    setEditingReceiptId(null);
  };

  const handleSaveReceipt = async () => {
    if (!isCustomReceipt && !receiptTargetOrder) return;
    if (isCustomReceipt && !customReceiptCustomer) {
      setReceiptError('Please select a customer for this custom receipt.');
      return;
    }

    const amt = parseFloat(receiptForm.amount);
    if (!receiptForm.amount || isNaN(amt) || amt <= 0) {
      setReceiptError('Please enter a valid amount.');
      return;
    }
    const needsRefCheck = receiptForm.paymentType !== 'Cash';
    if (needsRefCheck && !receiptForm.transactionRef.trim()) {
      setReceiptError('Please enter the Transaction Ref / Last 5 Digits.');
      return;
    }

    if (!isCustomReceipt && receiptTargetOrder?.isCancelled) {
      setReceiptError('This order is CANCELLED. Payments cannot be recorded.');
      return;
    }

    try {
      const payload: any = {
        amount: amt,
        paymentType: receiptForm.paymentType,
        transactionRef: receiptForm.transactionRef.trim(),
        collectedBy: user?.username || 'unknown',
      };

      if (isCustomReceipt && customReceiptCustomer) {
        payload.isCustom = true;
        payload.customerId = customReceiptCustomer._id;
        payload.orderCustomer = customReceiptCustomer.name;
        // Handle route which could be string or object
        payload.orderRoute = typeof customReceiptCustomer.route === 'object' 
          ? (customReceiptCustomer.route as any).name 
          : customReceiptCustomer.route;
        
        // Ensure custom receipts have a valid collectedAt from the date picker
        const selectedDate = new Date(customReceiptDate);
        // Add current time to the selected date to maintain exact chronology for same-day receipts
        const now = new Date();
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        payload.collectedAt = selectedDate;
      } else if (receiptTargetOrder) {
        payload.isCustom = false;
        payload.orderId = receiptTargetOrder._id;
        payload.orderCustomer = receiptTargetOrder.customerName;
        payload.orderRoute = receiptTargetOrder.route;
        payload.orderTotal = receiptTargetOrder.total;
        payload.collectedAt = new Date();
      }

      if (editingReceiptId) {
        const { data: updatedReceipt } = await receiptApi.update(editingReceiptId, payload);
        setReceipts(prev => prev.map(r => (r._id === editingReceiptId || r.id === editingReceiptId) ? updatedReceipt : r));
        
        // Refetch orders to sync billed status safely since logic is complex
        if (!isCustomReceipt) {
          fetchOrders();
        }
      } else {
        const { data: savedReceipt } = await receiptApi.create(payload);

        setReceipts(prev => [savedReceipt, ...prev]);

        // UI / Backend Sync: Check if fully paid (only for non-custom receipts)
        if (!isCustomReceipt && receiptTargetOrder) {
          const currentCollected = receipts
            .filter(r => r.orderId === receiptTargetOrder._id)
            .reduce((s, r) => s + r.amount, 0) + amt;

          if (currentCollected >= receiptTargetOrder.total && !(receiptTargetOrder.billed ?? false)) {
            setOrders(prev => prev.map(o => o._id === receiptTargetOrder._id ? { ...o, billed: true, isUpdated: false } : o));
          }
        }
      }

      closeReceiptDrawer();
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save receipt to server');
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    const rcpt = receipts.find(r => (r._id || r.id) === receiptId);
    if (!rcpt || !window.confirm('Delete this receipt? This cannot be undone.')) return;

    try {
      await receiptApi.delete(receiptId);

      // Update local orders state if no longer fully paid (Backend handles the DB sync automatically)
      const targetOrder = orders.find(o => o._id === rcpt.orderId);
      if (targetOrder && targetOrder.billed) {
        const remainingCollected = receipts
          .filter(r => r.orderId === rcpt.orderId && (r._id || r.id) !== receiptId)
          .reduce((s, r) => s + r.amount, 0);

        if (remainingCollected < targetOrder.total) {
          setOrders(prev => prev.map(o => o._id === targetOrder._id ? { ...o, billed: false } : o));
        }
      }

      setReceipts(prev => prev.filter(r => (r._id || r.id) !== receiptId));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete receipt from server');
    }
  };

  const needsRef = (pt: PaymentType) => pt !== 'Cash';

  // Filtered Receipts
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptFilterType, setReceiptFilterType] = useState<'all' | PaymentType>('all');

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch =
      r.orderCustomer.toLowerCase().includes(receiptSearch.toLowerCase()) ||
      r.orderRoute.toLowerCase().includes(receiptSearch.toLowerCase()) ||
      (r.transactionRef && r.transactionRef.toLowerCase().includes(receiptSearch.toLowerCase()));

    const matchesType = receiptFilterType === 'all' || r.paymentType === receiptFilterType;

    return matchesSearch && matchesType;
  });

  const filteredReceiptsTotal = filteredReceipts.reduce((s, r) => s + r.amount, 0);

  const handleExportReceiptsCSV = () => {
    if (!window.confirm("Export the current filtered receipt log as CSV?")) return;

    try {
      const headers = ['Date', 'Time', 'Customer', 'Route', 'Order Total', 'Amount Paid', 'Type', 'Reference', 'Collected By'];
      const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

      const rows = [headers.join(',')];
      filteredReceipts.forEach(r => {
        const row = [
          escapeCSV(new Date(r.collectedAt).toLocaleDateString('en-IN')),
          escapeCSV(new Date(r.collectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })),
          escapeCSV(r.orderCustomer),
          escapeCSV(r.orderRoute),
          r.orderTotal,
          r.amount,
          escapeCSV(r.paymentType),
          escapeCSV(r.transactionRef || '-'),
          escapeCSV(r.collectedBy)
        ];
        rows.push(row.join(','));
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipts_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export receipts');
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  // Filters
  // Filters - Persisted
  const [filterDate, setFilterDate] = useState(() => localStorage.getItem('orders_filterDate') || '');
  const [filterDateTo, setFilterDateTo] = useState(() => localStorage.getItem('orders_filterDateTo') || '');
  const [filterRoute, setFilterRoute] = useState(() => localStorage.getItem('orders_filterRoute') || 'all');
  const [filterExecutive, setFilterExecutive] = useState(() => localStorage.getItem('orders_filterExecutive') || 'all');
  const [filterVehicle, setFilterVehicle] = useState(() => localStorage.getItem('orders_filterVehicle') || 'all');


  const [filterSearch, setFilterSearch] = useState(() => localStorage.getItem('orders_filterSearch') || '');

  const [debouncedSearch, setDebouncedSearch] = useState(() => localStorage.getItem('orders_filterSearch') || '');
  const [orderSearchDebounce, setOrderSearchDebounce] = useState<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Column Visibility
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnState>(() => {
    // 1. Define Defaults
    const defaults: ColumnState = { sno: true };
    ORDER_COLUMNS.forEach(col => { defaults[col.id] = true; });

    // 2. Load Saved (with merge for new columns)
    const saved = localStorage.getItem('orders_visibleColumns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge defaults with saved to capture new columns automatically
        return { ...defaults, ...parsed };
      } catch (e) {
        console.error('Failed to parse saved columns', e);
      }
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('orders_visibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  // Persist filters
  useEffect(() => {
    localStorage.setItem('orders_filterDate', filterDate);
    localStorage.setItem('orders_filterDateTo', filterDateTo);
    localStorage.setItem('orders_filterRoute', filterRoute);
    localStorage.setItem('orders_filterExecutive', filterExecutive);
    localStorage.setItem('orders_filterVehicle', filterVehicle);
    localStorage.setItem('orders_filterSearch', filterSearch);
  }, [filterDate, filterDateTo, filterRoute, filterExecutive, filterVehicle, filterSearch]);

  // Pagination
  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit] = useState(50);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Summary totals from server
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalStandardQty: 0,
    totalPremiumQty: 0,
    totalDeliveredStandardQty: 0,
    totalDeliveredPremiumQty: 0,
    totalRevenue: 0
  });

  // Driver Summary — derives delivered/pending from context stock totals (initial - delivered)
  const driverSummary = useMemo(() => {
    const activeDriver = user?.role === 'driver' ? user.username : (filterExecutive !== 'all' ? filterExecutive : null);
    if (!activeDriver) return null;

    // Source of truth for delivered/pending comes from the context stock state
    const stdAssigned = standardStock.initial;
    const premAssigned = premiumStock.initial;
    const stdDelivered = standardStock.delivered;
    const premDelivered = premiumStock.delivered;

    return {
      driverName: activeDriver,
      stdAssigned,
      premAssigned,
      stdDelivered,
      premDelivered,
      stdPending: standardStock.initial - standardStock.delivered,
      premPending: premiumStock.initial - premiumStock.delivered
    };
  }, [standardStock, premiumStock, user, filterExecutive]);

  // Remembers the last delivery date — stays sticky across new orders until changed
  const stickyDeliveryDate = useRef(getTomorrowDate());

  // Form state
  const [formData, setFormData] = useState({
    date: getTomorrowDate(),
    route: '',
    customerId: '',
    vehicle: '',
    standardQty: 0,
    premiumQty: 0,
    salesExecutive: user?.username || ''
  });

  // Name Resolver to prevent flickering (babu -> BABU)
  const resolveName = (username: string) => {
    if (!username) return 'N/A';
    return salesUsers.find(u => u.username === username)?.name || username;
  };

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Total collected (Date Filtered to match orders)
  const currentFilteredReceipts = receipts.filter(r => {
    if (!filterDate) return true;
    const { start, end } = getDateRange(filterDate, viewMode, filterDateTo);
    const rDate = new Date(r.collectedAt);
    return rDate >= start && rDate <= end;
  });

  const totalReceiptsAmount = currentFilteredReceipts.reduce((s, r) => s + r.amount, 0);
  const todayReceiptsAmount = receipts
    .filter(r => new Date(r.collectedAt).toDateString() === new Date().toDateString())
    .reduce((s, r) => s + r.amount, 0);

  useEffect(() => {
    fetchOrders();
    fetchSalesUsers();
    fetchRoutes();
  }, [filterDate, filterDateTo, filterRoute, filterExecutive, filterVehicle, debouncedSearch, orderPage, viewMode]);

  // Debounce search input
  useEffect(() => {
    if (orderSearchDebounce) {
      clearTimeout(orderSearchDebounce);
    }

    const timeout = setTimeout(() => {
      setDebouncedSearch(filterSearch);
      setOrderPage(1); // Reset to page 1 on new search
    }, 300);

    setOrderSearchDebounce(timeout as unknown as number);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [filterSearch]);

  //  Smart polling
  useEffect(() => {
    // Initial fetch is already handled by the dependency array effect below

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders(); // This uses the closure's fetchOrders which reads current state
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [filterDate, filterDateTo, filterRoute, filterExecutive, filterVehicle, debouncedSearch, orderPage, viewMode]); // Re-create interval if deps change to capture new state in closure


  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();

      // For Daily, we use backend filtering. For Monthly/Custom, we fetch all (limit 3000) and filter client-side
      if (viewMode === 'daily') {
        if (filterDate) params.append('date', filterDate);
        params.append('page', orderPage.toString());
        params.append('limit', orderLimit.toString());
      } else {
        // Fetch larger set for client-side filtering
        params.append('limit', '3000'); // Increase limit to fetch enough data
      }

      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);

      if (debouncedSearch) params.append('search', debouncedSearch);

      const response = await api.get(`/orders?${params.toString()}`);

      const { orders: initialOrders, pagination, summary: initialSummary } = response.data;
      let fetchedOrders = initialOrders;
      let summaryData = initialSummary;

      // CLIENT-SIDE FILTERING FOR MONTHLY/CUSTOM
      if (viewMode !== 'daily' && filterDate) {
        const { start, end } = getDateRange(filterDate, viewMode, filterDateTo);

        fetchedOrders = fetchedOrders.filter((o: Order) => {
          const d = new Date(o.date);
          return d >= start && d <= end;
        });

        // Recalculate Summary Client-Side (Skipping Cancelled) — includes delivered counts
        const newSummary = fetchedOrders
          .filter((o: Order) => !(o.isCancelled ?? false))
          .reduce((acc: any, order: Order) => {
            const isDelivered = order.deliveryStatus === 'Delivered';
            return {
              totalOrders: acc.totalOrders + 1,
              totalStandardQty: acc.totalStandardQty + (order.standardQty || 0),
              totalPremiumQty: acc.totalPremiumQty + (order.premiumQty || 0),
              totalDeliveredStandardQty: acc.totalDeliveredStandardQty + (isDelivered ? (order.standardQty || 0) : 0),
              totalDeliveredPremiumQty: acc.totalDeliveredPremiumQty + (isDelivered ? (order.premiumQty || 0) : 0),
              totalRevenue: acc.totalRevenue + (order.total || 0)
            };
          }, {
            totalOrders: 0,
            totalStandardQty: 0,
            totalPremiumQty: 0,
            totalDeliveredStandardQty: 0,
            totalDeliveredPremiumQty: 0,
            totalRevenue: 0
          });

        summaryData = newSummary;

        setTotalOrders(fetchedOrders.length);
        setTotalPages(1);
      } else {
        setTotalOrders(pagination?.total || 0);
        setTotalPages(pagination?.totalPages || 1);
      }

      dispatch({ 
        type: 'SET_ORDERS', 
        payload: { 
          orders: fetchedOrders || [], 
          totalStandardQty: summaryData?.totalStandardQty,
          totalPremiumQty: summaryData?.totalPremiumQty,
          totalDeliveredStandardQty: summaryData?.totalDeliveredStandardQty,
          totalDeliveredPremiumQty: summaryData?.totalDeliveredPremiumQty
        } 
      });
      setSummary(summaryData || {
        totalOrders: 0,
        totalStandardQty: 0,
        totalPremiumQty: 0,
        totalDeliveredStandardQty: 0,
        totalDeliveredPremiumQty: 0,
        totalRevenue: 0
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchCustomers = async (searchTerm: string = '', routeName: string = '', page: number = 1) => {
    setLoadingCustomers(true);

    try {
      const params = new URLSearchParams();
      if (routeName) params.append('route', routeName);
      params.append('page', page.toString());
      params.append('limit', '50');
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/customers?${params.toString()}`);
      const { customers: fetchedCustomers, pagination } = response.data;

      if (page === 1) {
        setCustomers(fetchedCustomers);
      } else {
        setCustomers(prev => [...prev, ...fetchedCustomers]);
      }

      setHasMoreCustomers(pagination.page < pagination.totalPages);
      setCustomerPage(page);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);

    // Clear selection when search is modified
    if (selectedCustomer) {
      if (value.length === 0) {
        setSelectedCustomer(null);
        setFormData(prev => ({ ...prev, customerId: '', route: '' }));
      } else if (value !== selectedCustomer.name &&
        !selectedCustomer.name.toLowerCase().startsWith(value.toLowerCase()) &&
        !value.toLowerCase().includes(selectedCustomer.name.toLowerCase().slice(0, 3))) {
        setSelectedCustomer(null);
        setFormData(prev => ({ ...prev, customerId: '', route: '' }));
      }
    }

    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      if (value.length >= 2) {
        setShowCustomerDropdown(true);
        fetchCustomers(value, formData.route, 1);
      } else if (value.length === 0) {
        setCustomers([]);
        setShowCustomerDropdown(false);
      }
    }, 400);

    setSearchDebounce(timeout);
  };

  const handleCustomCustomerSearch = (value: string) => {
    setCustomCustomerSearch(value);

    // Clear selection when search is modified
    if (customReceiptCustomer) {
      if (value.length === 0 || (value !== customReceiptCustomer.name &&
        !customReceiptCustomer.name.toLowerCase().startsWith(value.toLowerCase()))) {
        setCustomReceiptCustomer(null);
      }
    }

    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      if (value.length >= 2) {
        setShowCustomCustomerDropdown(true);
        // Use 'all' or empty to search across all routes
        fetchCustomers(value, 'all', 1);
      } else if (value.length === 0) {
        setCustomers([]);
        setShowCustomCustomerDropdown(false);
      }
    }, 400);

    setSearchDebounce(timeout);
  };

  const fetchSalesUsers = async () => {
    try {
      const response = await api.get('/users/sales');
      setSalesUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch sales users:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);

    // Extract route name and executive from customer
    const routeName = customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : '';

    setFormData({
      ...formData,
      customerId: customer._id,
      route: routeName,
      salesExecutive: customer.salesExecutive || formData.salesExecutive
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#customer') && !target.closest('.customer-dropdown')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateTotals = () => {
    if (!selectedCustomer) return { standardTotal: 0, premiumTotal: 0, total: 0 };

    const standardTotal = formData.standardQty * selectedCustomer.greenPrice;
    const premiumTotal = formData.premiumQty * selectedCustomer.orangePrice;
    const total = standardTotal + premiumTotal;

    return { standardTotal, premiumTotal, total };
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/orders/${orderId}`);
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete order');
    }
  };

  const handleDeleteLast30Days = async () => {
    if (deleteConfirmText !== 'I AM AWARE') {
      return;
    }

    try {
      const response = await api.delete('/orders/bulk/old-data');
      alert(response.data.message);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete orders');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerId || !formData.vehicle || !formData.route) {
      setErrorMessage('Please fill in all required fields (Route, Customer and Vehicle)');
      return;
    }

    try {
      setErrorMessage('');
      if (editingOrder) {
        await api.put(`/orders/${editingOrder._id}`, formData);
      } else {
        await api.post('/orders', formData);
      }

      // Psychological Reward!
      triggerReward();

      // Save this delivery date as the new default for the next order
      stickyDeliveryDate.current = formData.date;

      setShowCreateForm(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to save order');
    }
  };

  const handleEditOrder = async (order: Order) => {
    setEditingOrder(order);

    // Clear any previous error messages
    setErrorMessage('');

    // Set form data from the order
    setFormData({
      date: new Date(order.date).toISOString().split('T')[0],
      route: order.route,
      customerId: order.customerId,
      vehicle: order.vehicle,
      standardQty: order.standardQty,
      premiumQty: order.premiumQty,
      salesExecutive: order.salesExecutive || ''
    });

    // Create customer object from order data
    const customerFromOrder: Customer = {
      _id: order.customerId,
      name: order.customerName,
      phone: order.customerPhone,
      route: order.route,
      salesExecutive: order.salesExecutive,
      greenPrice: order.greenPrice,
      orangePrice: order.orangePrice
    };

    // Set selected customer and search field
    setSelectedCustomer(customerFromOrder);
    setCustomerSearch(order.customerName);

    // Fetch customers for the route (for dropdown if user wants to change)
    try {
      const params = new URLSearchParams();
      params.append('route', order.route);
      params.append('page', '1');
      params.append('limit', '50');

      const response = await api.get(`/customers?${params.toString()}`);
      const { customers: fetchedCustomers } = response.data;
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error('Failed to fetch customers for route:', error);
    }

    // Open dialog
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: stickyDeliveryDate.current,
      route: '',
      customerId: '',
      vehicle: '',
      standardQty: 0,
      premiumQty: 0,
      salesExecutive: user?.username || ''
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setErrorMessage('');
    setCustomers([]);
    setCustomerPage(1);
    setHasMoreCustomers(false);
  };

  const handleToggleBillingStatus = async (order: Order) => {
    if (!isAdmin) return;

    // Strict null check as per requirements
    const isBilled = order.billed ?? false;
    const newStatus = !isBilled;

    // Optimistic up
    setOrders(orders.map(o => {
      if (o._id === order._id) {
        return {
          ...o,
          billed: newStatus,
          // If marking as billed, also hide the updated label
          isUpdated: newStatus ? false : o.isUpdated
        };
      }
      return o;
    }));

    try {
      const response = await updateOrderBillingStatus(order._id, newStatus);

      // Handle new response format { success: true, order: ... }
      if (response.data.success && response.data.order) {
        // Success - state already updated optimistically
        triggerReward();
      }
    } catch (error) {
      console.error('Failed to update billing status:', error);
      // Revert both billed and isUpdated on error
      setOrders(orders.map(o =>
        o._id === order._id ? { ...o, billed: isBilled, isUpdated: order.isUpdated } : o
      ));
      alert('Failed to update billing status');
    }
  };

  const handleToggleCancelled = async (orderId: string) => {
    if (!isDriverOrAdmin) return;

    const order = orders.find(o => o._id === orderId);
    if (!order) return;

    const isCurrentlyCancelled = order.isCancelled ?? false;
    const newStatus = !isCurrentlyCancelled;
    const confirmMessage = isCurrentlyCancelled
      ? 'Do you want to undo the cancellation?'
      : 'Are you sure you want to cancel this order?';

    if (window.confirm(confirmMessage)) {
      // Optimistic update
      dispatch({ type: 'CANCEL_ORDER', payload: { orderId, isCancelled: newStatus } });

      try {
        await api.patch(`/orders/${orderId}/cancel-status`, { isCancelled: newStatus });
      } catch (error: any) {
        console.error('Failed to update cancellation status:', error.response?.data || error.message);
        console.log('Status Code:', error.response?.status);
        // Revert on error
        dispatch({ type: 'CANCEL_ORDER', payload: { orderId, isCancelled: isCurrentlyCancelled } });
        alert('Failed to update cancellation status');
      }
    }
  };

  const handleToggleDeliveryStatus = async (order: Order) => {
    if (!isDriverOrAdmin) return;

    const currentStatus = order.deliveryStatus || 'Pending';
    const newStatus = currentStatus === 'Pending' ? 'Delivered' : 'Pending';
    const stdQty = order.standardQty || 0;
    const premQty = order.premiumQty || 0;

    // Prevent delivering cancelled orders
    if (order.isCancelled && newStatus === 'Delivered') {
      alert('Cannot deliver a cancelled order. Please restore it first.');
      return;
    }

    // Strict stock check for both types
    if (newStatus === 'Delivered') {
      const stdAvailable = standardStock.initial - standardStock.delivered;
      const premAvailable = premiumStock.initial - premiumStock.delivered;

      if (stdAvailable < stdQty) {
        alert(`Insufficient Standard stock! Available: ${stdAvailable}, Required: ${stdQty}`);
        return;
      }
      if (premAvailable < premQty) {
        alert(`Insufficient Premium stock! Available: ${premAvailable}, Required: ${premQty}`);
        return;
      }
    }

    // Optimistic atomic update using Context
    dispatch({ 
      type: 'MARK_ORDER_DELIVERED', 
      payload: { orderId: order._id, newStatus } 
    });

    try {
      await updateOrderDeliveryStatus(order._id, newStatus);
      if (newStatus === 'Delivered') {
        triggerReward();
      }
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      // Revert on error
      dispatch({ 
        type: 'REVERT_ORDER_DELIVERED', 
        payload: { 
          orderId: order._id, 
          currentStatus, 
          standardQty: stdQty,
          premiumQty: premQty 
        } 
      });
      alert('Failed to update delivery status');
    }
  };

  const handleExportCSV = async () => {
    if (!window.confirm("Are you sure you want to export orders as CSV?")) {
      return;
    }

    try {
      const params = new URLSearchParams();
      // Use limits to get all orders for the period
      params.append('limit', '3000');

      if (viewMode === 'daily' && filterDate) {
        params.append('date', filterDate);
      }

      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);
      if (filterSearch) params.append('search', filterSearch);

      const response = await api.get(`/orders?${params.toString()}`);
      let exportOrders = response.data.orders || [];

      // CLIENT-SIDE FILTERING FOR MONTHLY/CUSTOM
      if (viewMode !== 'daily' && filterDate) {
        const { start, end } = getDateRange(filterDate, viewMode, filterDateTo);
        exportOrders = exportOrders.filter((o: Order) => {
          const d = new Date(o.date);
          return d >= start && d <= end;
        });
      }

      const headers = ['Date', 'Customer', 'Route', 'Sales Executive', 'Vehicle', 'Phone', 'Standard Qty', 'Premium Qty', 'Total'];
      if (isAdmin) {
        headers.push('Created By');
      }

      const escapeCSV = (value: any) => {
        if (value == null) return '""';
        return `"${String(value).replace(/"/g, '""')}"`;
      };

      const rows = [headers.join(',')];

      exportOrders.forEach((order: any) => {
        const rowData = [
          escapeCSV(new Date(order.date).toLocaleDateString("en-IN")),
          escapeCSV(order.customerName),
          escapeCSV(order.route),
          escapeCSV(order.salesExecutive),
          escapeCSV(order.vehicle),
          escapeCSV(order.customerPhone),
          order.standardQty || 0,
          order.premiumQty || 0,
          Number(order.total || 0).toFixed(2)
        ];

        if (isAdmin) {
          rowData.push(escapeCSV(order.createdByUsername));
        }

        rows.push(rowData.join(','));
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export orders');
    }
  };

  const totals = calculateTotals();

  const uniqueExecutives = [...new Set(orders.map(o => o.salesExecutive).filter(Boolean))];

  // Filter customers based on search (already filtered by route from API)
  const filteredCustomers = customers
    .filter(c => {
      // For non-admin users, only show their own customers (Drivers see all)
      if (!isDriverOrAdmin && user) {
        if (c.salesExecutive !== user.username) {
          return false;
        }
      }
      // Search filter is already applied from API, this is just for additional client-side filtering
      return customerSearch === '' ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
    });

  // Calculate Sales Target Progress
  const currentTargetUser = isDriverOrAdmin
    ? (filterExecutive && filterExecutive !== 'all' ? filterExecutive : null)
    : (user ? user.username : null);

  const salesTarget = currentTargetUser ? getCurrentTarget(currentTargetUser.toLowerCase(), filterDate) : 0;
  const targetAchieved = summary.totalRevenue;
  const targetRemaining = Math.max(0, salesTarget - targetAchieved);
  const targetPercentage = salesTarget > 0 ? Math.min(100, (targetAchieved / salesTarget) * 100) : 0;

  // Backend handles all filtering, no need for client-side filtering
  const filteredOrders = orders;

  return (
    <Layout fullWidth>
      {/* ── Receipt Drawer (Bottom Sheet / Modal) ──────────────────────────── */}
      {showReceiptDrawer && (receiptTargetOrder || isCustomReceipt) && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeReceiptDrawer}
          />
          {/* Sheet */}
          <div
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 pb-8 sm:pb-6"
            style={{ animation: 'slideUpDrawer 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            <style>{`
              @keyframes slideUpDrawer {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
              }
              @media (min-width: 640px) {
                @keyframes slideUpDrawer {
                  from { transform: translateY(20px) scale(0.97); opacity: 0; }
                  to   { transform: translateY(0)    scale(1);    opacity: 1; }
                }
              }
            `}</style>
            {/* Drag handle */}
            <div className="sm:hidden absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full" />
            {/* Header */}
            <div className="flex items-start justify-between mb-5 mt-2">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <Receipt className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingReceiptId 
                      ? (isCustomReceipt ? 'Edit Custom Receipt' : 'Edit Receipt')
                      : (isCustomReceipt ? 'Add Custom Receipt' : 'Add Receipt')}
                  </h2>
                </div>
                {!isCustomReceipt && receiptTargetOrder && (
                  <p className="text-sm text-gray-500 mt-1 ml-11">
                    {receiptTargetOrder.customerName}
                    <span className="ml-1.5 text-emerald-600 font-semibold">
                      (Order ₹{receiptTargetOrder.total.toFixed(2)})
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={closeReceiptDrawer}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {isCustomReceipt && (
                <>
                  <div className="space-y-1.5 relative z-50">
                    <Label className="text-sm font-semibold text-gray-700">Customer</Label>
                    {customReceiptCustomer ? (
                      <div className="flex items-center justify-between p-3 border-2 border-emerald-500 rounded-lg bg-emerald-50/50">
                        <div>
                          <p className="font-bold text-gray-900">{customReceiptCustomer.name}</p>
                          <p className="text-xs text-gray-500">{typeof customReceiptCustomer.route === 'object' ? (customReceiptCustomer.route as any).name : customReceiptCustomer.route}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomReceiptCustomer(null);
                            setCustomCustomerSearch('');
                          }}
                          className="h-8 px-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search customer by name or phone..."
                          value={customCustomerSearch}
                          onChange={(e) => handleCustomCustomerSearch(e.target.value)}
                          onFocus={() => {
                            if (customCustomerSearch.length >= 2) setShowCustomCustomerDropdown(true);
                          }}
                          className="pl-9"
                        />
                        {showCustomCustomerDropdown && customCustomerSearch && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {customers
                              .filter(c => 
                                c.name.toLowerCase().includes(customCustomerSearch.toLowerCase()) || 
                                c.phone.includes(customCustomerSearch)
                              )
                              .map(customer => (
                                <div
                                  key={customer._id}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                  onClick={() => {
                                    setCustomReceiptCustomer(customer);
                                    setShowCustomCustomerDropdown(false);
                                  }}
                                >
                                  <div className="font-semibold">{customer.name}</div>
                                  <div className="text-xs text-gray-500">{customer.phone} • {typeof customer.route === 'object' ? (customer.route as any).name : customer.route}</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Date</Label>
                    <Input
                      type="date"
                      value={customReceiptDate}
                      onChange={(e) => setCustomReceiptDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="receipt-amount" className="text-sm font-semibold text-gray-700">Amount (₹ Rupees)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">₹</span>
                  <Input
                    id="receipt-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={receiptForm.amount}
                    onChange={e => setReceiptForm(f => ({ ...f, amount: e.target.value }))}
                    className="pl-7 text-lg font-bold h-12 border-2 focus-visible:ring-emerald-400 focus-visible:border-emerald-400"
                    onFocus={e => e.target.select()}
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Payment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_TYPES.map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setReceiptForm(f => ({ ...f, paymentType: pt, transactionRef: '' }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${receiptForm.paymentType === pt
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <span className={receiptForm.paymentType === pt ? 'opacity-100' : 'opacity-60'}>{paymentTypeIcon(pt)}</span>
                      <span className="truncate">{pt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trans Ref — only for non-cash */}
              {needsRef(receiptForm.paymentType) && (
                <div className="space-y-1.5">
                  <Label htmlFor="receipt-ref" className="text-sm font-semibold text-gray-700">
                    {receiptForm.paymentType === 'UPI / PhonePe / GPay' ? 'Last 5 Digits / UPI Ref' : 'Transaction / Cheque Ref'}
                  </Label>
                  <Input
                    id="receipt-ref"
                    type="text"
                    placeholder={receiptForm.paymentType === 'UPI / PhonePe / GPay' ? 'e.g. 12345' : 'e.g. CHQ-001'}
                    value={receiptForm.transactionRef}
                    onChange={e => setReceiptForm(f => ({ ...f, transactionRef: e.target.value }))}
                    className="h-11 border-2 focus-visible:ring-emerald-400 focus-visible:border-emerald-400 font-mono"
                    maxLength={30}
                  />
                </div>
              )}

              {receiptError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {receiptError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReceiptDrawer}
                  className="flex-1 h-12 text-sm border-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveReceipt}
                  className="flex-1 h-12 text-sm bg-gray-900 hover:bg-gray-800 shadow-none"
                >
                  {editingReceiptId ? 'Update Receipt' : 'Save Receipt'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* ──────────────────────────────────────────────────────────────────── */}

      <div className="space-y-6 w-full max-w-[1600px] px-2 mx-auto">
        {/* ── Master Tab Toggle ──────────────────────────────────────────────── */}
        {isDriverOrAdmin && (
          <div className="flex items-center justify-center">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'orders'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Orders
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'receipts'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Receipt className="h-4 w-4" />
                Receipts
                {receipts.length > 0 && (
                  <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold ${activeTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-gray-900 text-white border border-white/20'
                    }`}>
                    {receipts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
        {/* ──────────────────────────────────────────────────────────────────── */}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* RECEIPTS TAB                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'receipts' && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {!user || user.role !== 'driver' ? (
                <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: '#10B981' }}>
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Collected</p>
                    <p className="text-2xl font-bold text-emerald-600">₹{totalReceiptsAmount.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              ) : null}
              <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: '#3B82F6' }}>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Today's Collection</p>
                  <p className="text-2xl font-bold text-blue-600">₹{todayReceiptsAmount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {receipts.filter(r => new Date(r.collectedAt).toDateString() === new Date().toDateString()).length} today
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 shadow-sm col-span-2 md:col-span-1" style={{ borderLeftColor: '#F59E0B' }}>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cash Collected</p>
                  <p className="text-2xl font-bold text-amber-600">
                    ₹{receipts.filter(r => r.paymentType === 'Cash').reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {receipts.filter(r => r.paymentType === 'Cash').length} cash payments
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Navigation & Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex flex-1 w-full gap-2 overflow-hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customer or route..."
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    className="pl-9 h-10 border-gray-200"
                  />
                </div>
                <Select value={receiptFilterType} onValueChange={(val: any) => setReceiptFilterType(val)}>
                  <SelectTrigger className="w-[140px] h-10 border-gray-200">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {PAYMENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  onClick={openCustomReceiptDrawer}
                  className="flex-1 md:w-auto h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  <span className="whitespace-nowrap">Custom Receipt</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportReceiptsCSV}
                  className="flex-1 md:w-auto h-10 border-gray-200 text-gray-600 font-semibold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {receipts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <div className="inline-flex p-5 bg-gray-50 rounded-full mb-4">
                  <Receipt className="h-12 w-12 text-gray-300" />
                </div>
                <p className="text-lg font-semibold text-gray-400">No receipts collected yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "➕ Add Receipt" on any order to record payment.</p>
              </div>
            ) : (
              <>
                {/* Mobile: Card list */}
                <div className="md:hidden space-y-3">
                  {filteredReceipts.length > 0 ? (
                    filteredReceipts.map(r => (
                      <Card key={r._id || r.id} className="shadow-sm border-gray-100 rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">{paymentTypeIcon(r.paymentType)}</span>
                                <span className="font-bold text-gray-900 text-base">{r.orderCustomer}</span>
                              </div>
                              <span className="text-xs text-gray-500 ml-6">
                                {r.orderRoute}
                                {r.isCustom && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">Custom</span>}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900">₹{r.amount.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-gray-400 uppercase">
                                {new Date(r.collectedAt).toLocaleDateString('en-IN')} {new Date(r.collectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">{r.paymentType}</span>
                            {r.transactionRef && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-gray-50 text-gray-500 border border-gray-100">Ref: {r.transactionRef}</span>
                            )}
                            {isAdmin && (
                              <div className="ml-auto flex gap-1">
                                <button
                                  onClick={() => openEditReceiptDrawer(r)}
                                  className="p-1.5 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteReceipt((r._id || r.id)!)}
                                  className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="py-12 bg-white text-center rounded-xl border border-dashed text-gray-400">
                      No results matching your filters
                    </div>
                  )}
                </div>

                {/* Desktop: Table */}
                <Card className="hidden md:block shadow-sm">
                  <CardHeader className="py-4 border-b bg-gray-50/40">
                    <CardTitle className="text-lg">Receipt Log <span className="text-sm font-normal text-muted-foreground ml-2">({filteredReceipts.length} shown)</span></CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200 [&_th]:border [&_th]:border-gray-200 [&_td]:border [&_td]:border-gray-200">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                          <tr>
                            <th className="text-center px-4 py-3 w-12">S.No</th>
                            <th className="text-left px-4 py-3">Date & Time</th>
                            <th className="text-left px-4 py-3">Customer</th>
                            <th className="text-left px-4 py-3">Route</th>
                            <th className="text-right px-4 py-3">Order Total</th>
                            <th className="text-right px-4 py-3">Amount Paid</th>
                            <th className="text-left px-4 py-3">Payment Type</th>
                            <th className="text-left px-4 py-3">Ref / Digits</th>
                            <th className="text-left px-4 py-3">Collected By</th>
                            <th className="px-4 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredReceipts.length > 0 ? (
                            filteredReceipts.map((r, idx) => (
                              <tr key={r._id || r.id} className="hover:bg-gray-50/80 transition-colors text-sm">
                                <td className="px-4 py-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span>{new Date(r.collectedAt).toLocaleDateString('en-IN')}</span>
                                    <span className="text-xs text-gray-400">{new Date(r.collectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900">{r.orderCustomer}</td>
                                <td className="px-4 py-3 text-gray-600">{r.orderRoute}</td>
                                <td className="px-4 py-3 text-right text-gray-500">
                                  {r.isCustom ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">Custom</span>
                                  ) : (
                                    `₹${(r.orderTotal || 0).toLocaleString('en-IN')}`
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">₹{r.amount.toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-gray-400">{paymentTypeIcon(r.paymentType)}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">{r.paymentType}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-600 text-xs">{r.transactionRef || '—'}</td>
                                <td className="px-4 py-3 text-gray-500">
                                  {resolveName(r.collectedBy)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isAdmin && (
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditReceiptDrawer(r)}
                                        className="h-8 w-8 p-0 hover:bg-blue-50 rounded-full"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteReceipt((r._id || r.id)!)}
                                        className="h-8 w-8 p-0 hover:bg-red-50 rounded-full"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10} className="px-4 py-12 text-center text-gray-400 border-b">
                                No receipts found matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-emerald-50 font-semibold text-emerald-800">
                            <td colSpan={5} className="px-4 py-3 text-right text-sm uppercase tracking-wide">Filtered Total</td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-emerald-700">₹{filteredReceiptsTotal.toLocaleString('en-IN')}</td>
                            <td colSpan={4} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

          </div>
        )}
        {/* ════════════════════════════════════════════════════════════════════ */}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ORDERS TAB                                                          */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (<>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col w-full md:w-auto gap-3">
              {/* Mobile Actions Toggle */}
              <div className="flex md:hidden">
                <Button
                  variant="outline"
                  onClick={() => setShowMobileActions(!showMobileActions)}
                  className="w-full shadow-sm h-11 text-base font-medium"
                >
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {showMobileActions ? 'Hide Actions' : 'Show Actions'}
                </Button>
              </div>

              {/* Desktop: All buttons in one row. Mobile: Secondary buttons hidden by default */}
              <div className={`flex flex-col md:flex-row gap-3 ${showMobileActions ? 'flex' : 'hidden md:flex'}`}>
                <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSummary(!showSummary)}
                  className={`w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium ${!showSummary ? 'bg-gray-100 text-gray-600' : ''}`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {showSummary ? 'Hide Summary' : 'Show Summary'}
                </Button>
                <Button variant="outline" onClick={() => setShowColumnDialog(true)} className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-2 mr-2"><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
                  Columns
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                    Delete Old Data
                  </Button>
                )}
                {/* Desktop New Order Button (Hidden on Mobile as it's in the top row) */}
                <Button onClick={() => setShowCreateForm(!showCreateForm)} className="hidden md:flex w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </div>
            </div>
          </div>
          {/* end header row */}

          {/* Summary Cards - All Users */}
          {showSummary && (
            <div className={`grid grid-cols-2 gap-3 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>

              {/* Orders Count */}
              <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#9E1216' }}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Orders</p>
                      <div className="text-2xl font-bold">
                        <AnimatedNumber value={summary.totalOrders} />
                      </div>
                      {driverSummary && (
                        <div className="mt-1.5 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">DELIVERED: {driverSummary.stdDelivered + driverSummary.premDelivered}</span>
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">PENDING: {driverSummary.stdPending + driverSummary.premPending}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-red-50 rounded-full">
                      <ShoppingCart className="h-4 w-4 text-[#9E1216]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Standard — ordered + stock remaining in one card */}
              <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: 'darkgreen' }}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Standard Stock</p>
                      <div className="text-2xl font-bold" style={{ color: 'darkgreen' }}>
                        <AnimatedNumber value={standardStock.initial} />
                      </div>
                      {standardStock.initial > 0 && (
                        <p className="text-[10px] opacity-75 font-semibold" style={{ color: 'darkgreen' }}>
                          {Math.floor(standardStock.initial / 30)}Box {standardStock.initial % 30}Pcs
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
                          REMAINING: {standardStock.initial - standardStock.delivered} ({Math.floor((standardStock.initial - standardStock.delivered) / 30)}B { (standardStock.initial - standardStock.delivered) % 30}P)
                        </span>
                        {driverSummary && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            DELIVERED: {driverSummary.stdDelivered}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-green-50 rounded-full">
                      <Package className="h-4 w-4" style={{ color: 'darkgreen' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Premium — ordered + stock remaining in one card */}
              <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: 'darkorange' }}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Premium Stock</p>
                      <div className="text-2xl font-bold" style={{ color: 'darkorange' }}>
                        <AnimatedNumber value={premiumStock.initial} />
                      </div>
                      {premiumStock.initial > 0 && (
                        <p className="text-[10px] opacity-75 font-semibold" style={{ color: 'darkorange' }}>
                          {Math.floor(premiumStock.initial / 30)}Box {premiumStock.initial % 30}Pcs
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                          REMAINING: {premiumStock.initial - premiumStock.delivered} ({Math.floor((premiumStock.initial - premiumStock.delivered) / 30)}B { (premiumStock.initial - premiumStock.delivered) % 30}P)
                        </span>
                        {driverSummary && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            DELIVERED: {driverSummary.premDelivered}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-full">
                      <Star className="h-4 w-4" style={{ color: 'darkorange' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue (non-driver only) */}
              {user?.role !== 'driver' && (
                <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#10B981' }}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revenue</p>
                        <div className="text-2xl font-bold text-[#10B981]">
                          <AnimatedNumber
                            value={summary.totalRevenue}
                            formatValue={(v) => `₹${v.toLocaleString('en-IN')}`}
                          />
                        </div>
                        {/* Collected inline for admin */}
                        {isAdmin && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              ₹{totalReceiptsAmount.toLocaleString('en-IN')} collected
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-full">
                        <IndianRupee className="h-4 w-4 text-[#10B981]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          )}

          {/* Sales Target Progress Section */}
          {salesTarget > 0 && showSummary && user?.role !== 'driver' && (
            <Card className="shadow-sm border-blue-100 bg-blue-50/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Monthly Target Progress</p>
                        <h3 className="text-2xl font-bold text-blue-700 mt-1">
                          {formatCurrency(targetAchieved)}
                          <span className="text-sm font-medium text-blue-400 ml-2">
                            / {formatCurrency(salesTarget)}
                          </span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600 font-medium mb-1">Remaining</p>
                        <p className="text-lg font-bold text-blue-800">{formatCurrency(targetRemaining)}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-4 w-full bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${targetPercentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-medium text-blue-600">
                      <span>0%</span>
                      <span>{targetPercentage.toFixed(1)}% Achieved</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center justify-center p-4 bg-white rounded-full shadow-sm ring-4 ring-blue-100">
                    <div className="text-center">
                      <p className="text-[10px] uppercase text-gray-400 font-bold">Target</p>
                      <p className="text-xl font-bold text-blue-600">{salesTarget >= 10000000 ? '1 Cr' : (salesTarget / 100000).toFixed(0) + ' L'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
              <CardTitle className="text-base font-medium flex items-center">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                Filter Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {/* Search - Always visible & First on mobile */}
                <div className="space-y-1 md:col-span-2 lg:col-span-4 xl:col-span-1 order-1">
                  <Label htmlFor="search" className="text-xs text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Input
                      id="search"
                      type="text"
                      value={filterSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterSearch(e.target.value)}
                      placeholder="Customer or Phone..."
                      className="pl-9 h-11"
                    />
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Mobile Toggle Button */}
                <div className="md:hidden order-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="w-full flex justify-between items-center"
                  >
                    <span className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter Options
                    </span>
                    {showMobileFilters ? (
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded">Hide</span>
                    ) : (
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded">Show</span>
                    )}
                  </Button>
                </div>

                {/* View Mode Toggle */}
                <div className={`space-y-1 order-3 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                  <Label className="text-xs text-muted-foreground">View Mode</Label>
                  <div className="flex rounded-md shadow-sm h-11">
                    <button
                      onClick={() => setViewMode('daily')}
                      className={`flex-1 text-sm font-medium border rounded-l-md transition-colors ${viewMode === 'daily'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 z-10'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      Daily
                    </button>
                    {user?.role !== 'driver' && (
                      <button
                        onClick={() => setViewMode('monthly')}
                        className={`flex-1 text-sm font-medium border-t border-b border-r transition-colors ${viewMode === 'monthly'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 z-10'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      >
                        Monthly
                      </button>
                    )}
                    <button
                      onClick={() => setViewMode('custom')}
                      className={`flex-1 text-sm font-medium border-t border-b border-r rounded-r-md transition-colors ${viewMode === 'custom'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 z-10'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Date Filter — single for Daily/Monthly, From/To for Custom */}
                {viewMode !== 'custom' ? (
                  <div className={`space-y-1 order-3 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                    <Label htmlFor="filter-date" className="text-xs text-muted-foreground">
                      {viewMode === 'daily' ? 'Delivery Date' : 'Select Month (Any Date)'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="filter-date"
                        type="date"
                        value={filterDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                        className="pl-9 h-11"
                      />
                      <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`space-y-1 order-3 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                      <Label htmlFor="filter-date-from" className="text-xs text-muted-foreground">From Date</Label>
                      <div className="relative">
                        <Input
                          id="filter-date-from"
                          type="date"
                          value={filterDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                          className="pl-9 h-11"
                        />
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div className={`space-y-1 order-3 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                      <Label htmlFor="filter-date-to" className="text-xs text-muted-foreground">To Date</Label>
                      <div className="relative">
                        <Input
                          id="filter-date-to"
                          type="date"
                          value={filterDateTo}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDateTo(e.target.value)}
                          className="pl-9 h-11"
                        />
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}

                <div className={`space-y-1 order-4 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                  <Label className="text-xs text-muted-foreground">Route</Label>
                  <Select value={filterRoute} onValueChange={setFilterRoute}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Routes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Routes</SelectItem>
                      {routes.map((route) => (
                        <SelectItem key={route._id} value={route._id}>{route.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={`space-y-1 order-5 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                  <Label className="text-xs text-muted-foreground">Executive</Label>
                  <Select value={filterExecutive} onValueChange={setFilterExecutive}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Executives" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Executives</SelectItem>
                      {uniqueExecutives.map(exec => (
                        <SelectItem key={exec} value={exec}>{resolveName(exec)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={`space-y-1 order-6 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                  <Label className="text-xs text-muted-foreground">Vehicle</Label>
                  <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      {VEHICLES.map((vehicle: string) => (
                        <SelectItem key={vehicle} value={vehicle}>{vehicle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Order Dialog */}
          < Dialog open={showCreateForm} onOpenChange={(open) => {
            setShowCreateForm(open);
            if (!open) {
              setEditingOrder(null);
              resetForm();
            }
          }} >
            <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 gap-6">
              <DialogHeader>
                <DialogTitle>{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
                <DialogClose onClose={() => {
                  setShowCreateForm(false);
                  setEditingOrder(null);
                  resetForm();
                }} />
              </DialogHeader>
              <div className="">
                <form onSubmit={handleSubmitOrder} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Delivery Date</Label>
                        <div className="relative">
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                            required
                            className="pl-9"
                          />
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      {/* Customer Search - NOW FIRST */}
                      <div className="space-y-2 relative">
                        <Label htmlFor="customer">Customer Search *</Label>
                        <div className="relative">
                          <Input
                            id="customer"
                            type="text"
                            placeholder="Search customer by name or phone..."
                            value={customerSearch}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomerSearch(e.target.value)}
                            onFocus={() => {
                              if (customerSearch.length >= 2) {
                                setShowCustomerDropdown(true);
                                fetchCustomers(customerSearch, formData.route, 1);
                              }
                            }}
                            className={`pl-9 ${selectedCustomer ? 'pr-10 border-green-500 bg-green-50/50' : ''}`}
                            required
                            autoComplete="off"
                          />
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />

                          {selectedCustomer && (
                            <div className="absolute right-3 top-2.5 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          )}
                        </div>
                        {customerSearch.length > 0 && customerSearch.length < 2 && (
                          <p className="text-xs text-amber-600">
                            Type at least 2 characters to search
                          </p>
                        )}
                        {selectedCustomer && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            ✓ Customer selected: <span className="font-medium">{selectedCustomer.name}</span>
                          </p>
                        )}

                        {/* Customer Dropdown */}
                        {showCustomerDropdown && customerSearch.length >= 2 && (
                          <div className="customer-dropdown absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-auto">
                            {loadingCustomers ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                Searching customers...
                              </div>
                            ) : filteredCustomers.length > 0 ? (
                              <>
                                {filteredCustomers.map(customer => (
                                  <button
                                    key={customer._id}
                                    type="button"
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b last:border-0 transition-colors"
                                    onClick={() => handleCustomerSelect(customer)}
                                  >
                                    <div className="font-medium text-gray-900">{customer.name}</div>
                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                      <Phone className="h-3 w-3 mr-1" /> {customer.phone}
                                      <span className="ml-2 flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : 'No route'}
                                      </span>
                                      <span className="ml-auto">₹{customer.greenPrice} / ₹{customer.orangePrice}</span>
                                    </div>
                                  </button>
                                ))}
                                {hasMoreCustomers && (
                                  <button
                                    type="button"
                                    onClick={() => fetchCustomers(customerSearch, formData.route, customerPage + 1)}
                                    className="w-full p-2 text-sm text-primary hover:bg-accent border-t"
                                    disabled={loadingCustomers}
                                  >
                                    Load More...
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="p-4 text-sm text-muted-foreground text-center">
                                No customers found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Route - Auto-filled from customer */}
                      {/* {selectedCustomer && (
                      <div className="space-y-2">
                        <Label htmlFor="route">Route (Auto-filled)</Label>
                        <div className="relative">
                          <Input
                            id="route"
                            type="text"
                            value={formData.route}
                            readOnly
                            className="pl-9 bg-gray-50 cursor-not-allowed"
                          />
                          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    )} */}

                      {selectedCustomer && (
                        <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                          <div className="flex items-center text-sm text-gray-600">
                            {/* inline animation */}
                            <style>{`
    @keyframes callShake {
      0% { transform: rotate(0deg); }
      20% { transform: rotate(-10deg); }
      40% { transform: rotate(10deg); }
      60% { transform: rotate(-10deg); }
      80% { transform: rotate(10deg); }
      100% { transform: rotate(0deg); }
    }
  `}</style>

                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-2">Contact:</span>

                            <a
                              href={`tel:${selectedCustomer.phone}`}
                              className="flex items-center gap-1 text-blue-600"
                            >
                              {selectedCustomer.phone}
                              <Phone
                                className="h-3 w-3"
                                style={{ animation: "callShake 1s infinite" }}
                              />
                            </a>
                          </div>

                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-2">Route:</span> {selectedCustomer.route ? (typeof selectedCustomer.route === 'string' ? selectedCustomer.route : selectedCustomer.route.name) : 'N/A'}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="font-medium mr-2">Executive:</span> {selectedCustomer.salesExecutive}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {selectedCustomer ? (
                        <>
                          {/* Sales Executive (Admin/Driver only) */}
                          {isDriverOrAdmin && (
                            <div className="space-y-2 mb-4">
                              <Label htmlFor="salesExecutive">Sales Executive</Label>
                              <Select
                                value={formData.salesExecutive}
                                onValueChange={(val: string) => setFormData({ ...formData, salesExecutive: val })}
                              >
                                <SelectTrigger id="salesExecutive">
                                  <SelectValue placeholder="Select Executive" />
                                </SelectTrigger>
                                <SelectContent>
                                  {salesUsers.map((u) => (
                                    <SelectItem key={u.username} value={u.username}>
                                      <div className="flex items-center">
                                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                        {u.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="vehicle">Delivery Vehicle</Label>
                            <Select value={formData.vehicle} onValueChange={(value: string) => setFormData({ ...formData, vehicle: value })} required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                {VEHICLES.map((vehicle: string) => (
                                  <SelectItem key={vehicle} value={vehicle}>
                                    <div className="flex items-center">
                                      <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                                      {vehicle}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="standardQty" style={{ color: 'darkgreen' }}>Standard Qty</Label>
                              <div className="relative">
                                <Input
                                  id="standardQty"
                                  type="number"
                                  min="0"
                                  className="focus-visible:ring-1"
                                  style={{ borderColor: 'darkgreen', color: 'darkgreen' }}
                                  value={formData.standardQty === 0 ? '' : formData.standardQty}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, standardQty: parseFloat(e.target.value) || 0 })}
                                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                                  placeholder="0"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">₹{selectedCustomer.greenPrice}/unit • Total: ₹{totals.standardTotal.toFixed(2)}</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="premiumQty" style={{ color: 'darkorange' }}>Premium Qty</Label>
                              <div className="relative">
                                <Input
                                  id="premiumQty"
                                  type="number"
                                  min="0"
                                  className="focus-visible:ring-1"
                                  style={{ borderColor: 'darkorange', color: 'darkorange' }}
                                  value={formData.premiumQty === 0 ? '' : formData.premiumQty}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, premiumQty: parseFloat(e.target.value) || 0 })}
                                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                                  placeholder="0"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">₹{selectedCustomer.orangePrice}/unit • Total: ₹{totals.premiumTotal.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">Grand Total</span>
                              <span className="text-2xl font-bold text-primary">₹{totals.total.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-right text-muted-foreground mt-1">Including all taxes</p>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                          <User className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">Select a customer first</p>
                          <p className="text-sm text-gray-400 mt-1">Pricing details will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Error Message */}
                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                      {errorMessage}
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingOrder(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!selectedCustomer} className="min-w-[120px]">
                      {editingOrder ? 'Update Order' : 'Submit Order'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog >

          {/* Mobile: Card View */}
          {/* Mobile: Card View */}
          <div className="md:hidden space-y-4 pb-20">
            <div className="text-sm text-muted-foreground font-medium px-1">
              Showing {filteredOrders.length} of {totalOrders} orders
            </div>
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <Card key={order._id} className="overflow-hidden shadow-lg border-gray-100 rounded-xl active:scale-[0.99] transition-transform">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-start justify-between gap-2 w-full mb-1">
                          <div className="font-bold text-lg leading-tight text-gray-900">{order.customerName}</div>
                          {visibleColumns['messages'] && (
                            <div className="mt-0.5 shrink-0">
                              <OrderMessageIcon
                                orderId={order._id}
                                orderCustomer={order.customerName}
                                messages={order.orderMessages || []}
                                onUpdate={fetchOrders}
                              />
                            </div>
                          )}
                        </div>
                        {visibleColumns['date'] && (
                          <div className="flex items-center text-xs text-muted-foreground font-medium">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                            {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                        )}
                        {(visibleColumns['status'] || visibleColumns['delivery']) && (
                          <div className="mt-2 flex items-center gap-2 ">
                            {visibleColumns['status'] && (
                              <>
                                {/* Status Badge for Mobile */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleBillingStatus(order);
                                  }}
                                  disabled={!isAdmin}
                                  className={`
                                px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border transition-all
                                ${(order.billed ?? false)
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}
                                ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                                >
                                  {(order.billed ?? false) ? 'BILLED' : 'PENDING'}
                                </button>
                                {(order.isUpdated && !(order.billed ?? false) && !(order.isCancelled ?? false)) && (
                                  <button className=" px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border transition-all bg-blue-50 text-blue-700 border border-blue-200">
                                    Updated
                                  </button>
                                )}
                                {order.deliveryStatus !== 'Delivered' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleCancelled(order._id);
                                    }}
                                    disabled={!isDriverOrAdmin}
                                    className={`
                                  px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border transition-all
                                  ${(order.isCancelled ?? false)
                                        ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                  ${!isDriverOrAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                  >
                                    {(order.isCancelled ?? false) ? 'CANCELLED' : 'CANCEL'}
                                  </button>
                                )}
                              </>
                            )}
                            {visibleColumns['delivery'] && order.deliveryStatus === 'Delivered' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDeliveryStatus(order);
                                }}
                                className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm cursor-pointer active:scale-95 transition-all"
                              >
                                DELIVERED
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {visibleColumns['total'] && (() => {
                        const collected = receipts
                          .filter(r => r.orderId === order._id)
                          .reduce((s, r) => s + r.amount, 0);
                        const balance = order.total - collected;
                        return (
                          <div className="text-right">
                            <span className="block font-bold text-xl text-emerald-600 tracking-tight">₹{order.total.toFixed(2)}</span>
                            {isDriverOrAdmin && (() => {
                              return (
                                <div className="mt-1 space-y-0.5">
                                  {collected > 0 && (
                                    <div className="flex flex-col gap-1 items-end mt-1.5">
                                      {balance > 0 ? (
                                        <div className="flex flex-col items-end">
                                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Balance</span>
                                          <span className="text-sm font-bold text-red-500">₹{balance.toLocaleString('en-IN')}</span>
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100 shadow-sm">
                                          <Check className="h-3 w-3" /> PAID
                                        </span>
                                      )}
                                      <div className="text-[9px] text-gray-400">
                                        Collected: ₹{collected.toLocaleString('en-IN')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3.5 rounded-lg mb-4 border">
                      <div className="space-y-1.5">
                        {visibleColumns['route'] && (
                          <>
                            <div className="text-xs text-gray-500 flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5" /> Route</div>
                            <div className="font-medium text-base mb-2">{order.route}</div>
                          </>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {visibleColumns['vehicle'] && (
                          <>
                            <div className="text-xs text-gray-500 flex items-center"><Truck className="h-3.5 w-3.5 mr-1.5" /> Vehicle</div>
                            <ExpandableText text={order.vehicle} className="font-medium text-base" />
                          </>
                        )}
                      </div>
                      <div className="col-span-2 pt-2.5 border-t mt-1 grid grid-cols-2 gap-3">
                        <div>
                          {visibleColumns['salesExecutive'] && (
                            <>
                              <div className="text-xs text-gray-500 flex items-center"><User className="h-3.5 w-3.5 mr-1.5" /> Sales Executive</div>
                              <div className="font-medium text-base">
                                {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive || 'N/A'}
                              </div>
                            </>
                          )}
                        </div>
                        <div>
                          {visibleColumns['phone'] && (
                            <>
                              <div className="text-xs text-gray-500 flex items-center"><Phone className="h-3.5 w-3.5 mr-1.5" /> Phone</div>
                              <div className="font-medium text-base">
                                {order.customerPhone ? (
                                  <div className="flex items-center gap-2">
                                    <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline">
                                      {order.customerPhone}
                                    </a>
                                    <CopyButton text={order.customerPhone} />
                                  </div>
                                ) : 'N/A'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm px-1">
                      <div className="flex gap-6">
                        {visibleColumns['standardQty'] && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Standard</span>
                            <div className="flex items-baseline gap-1">
                              <p className="font-bold text-lg" style={{ color: 'darkgreen' }}>{order.standardQty}</p>
                              {visibleColumns['standardPrice'] && <span className="text-xs text-muted-foreground" style={{ color: 'darkgreen' }}>(₹{order.greenPrice})</span>}
                            </div>
                          </div>
                        )}
                        {visibleColumns['premiumQty'] && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Premium</span>
                            <div className="flex items-baseline gap-1">
                              <p className="font-bold text-lg" style={{ color: 'darkorange' }}>{order.premiumQty}</p>
                              {visibleColumns['premiumPrice'] && <span className="text-xs text-muted-foreground" style={{ color: 'darkorange' }}>(₹{order.orangePrice})</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      {isDriverOrAdmin && visibleColumns['actions'] && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)} className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full">
                            <div className="sr-only">Edit</div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil text-gray-600"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                          </Button>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order._id)} className="h-10 w-10 p-0 hover:bg-red-50 rounded-full">
                              <div className="sr-only">Delete</div>
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 text-red-600"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Add Receipt / Mark Delivered (Admin/Driver only) */}
                    {isDriverOrAdmin && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                        {visibleColumns['delivery'] && order.deliveryStatus !== 'Delivered' && !(order.isCancelled ?? false) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleDeliveryStatus(order); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 active:scale-[0.98] shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                            Mark Delivered
                          </button>
                        )}
                        <button
                          disabled={order.isCancelled ?? false}
                          onClick={(e) => { e.stopPropagation(); openReceiptDrawer(order); }}
                          className={`
                            flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all
                            ${(order.isCancelled ?? false)
                              ? 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed opacity-60'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 active:scale-[0.98]'}
                          `}
                        >
                          <Receipt className={`h-4 w-4 ${(order.isCancelled ?? false) ? 'text-gray-300' : 'text-gray-400'}`} />
                          {(order.isCancelled ?? false) ? 'Cancelled' : 'Add Receipt'}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <p className="text-muted-foreground">No orders found matching your filters</p>
              </div>
            )}
          </div>

          {/* Desktop: Table View */}
          <Card className="hidden md:block shadow-sm">
            <CardHeader className="py-4 border-b bg-gray-50/40">
              <CardTitle className="text-lg">Order List <span className="text-sm font-normal text-muted-foreground ml-2">({totalOrders} total)</span></CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 [&_th]:border [&_th]:border-gray-200 [&_td]:border [&_td]:border-gray-200">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-medium">
                    <tr>
                      {visibleColumns['sno'] && <th className="text-center px-1.5 py-2.5 w-[45px]">S.No</th>}
                      {visibleColumns['date'] && <th className="text-left px-2 py-2.5 w-[85px]">Date</th>}
                      {visibleColumns['status'] && <th className="text-center px-1 py-2.5 w-[75px]">Status</th>}
                      {visibleColumns['messages'] && <th className="px-1 py-2.5 w-[40px] text-center"></th>}
                      {visibleColumns['customer'] && <th className="text-left px-2 py-2.5 min-w-[140px]">Customer</th>}
                      {visibleColumns['standardQty'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkgreen' }}>Std Qty</th>}
                      {visibleColumns['standardPrice'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkgray' }}>Std ₹</th>}
                      {visibleColumns['premiumQty'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkorange' }}>Prem Qty</th>}
                      {visibleColumns['premiumPrice'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkgray' }}>Prem ₹</th>}
                      {visibleColumns['route'] && <th className="text-left px-2 py-2.5 w-[100px]">Route</th>}
                      {visibleColumns['salesExecutive'] && <th className="text-left px-2 py-2.5 w-[100px]">Exec</th>}
                      {visibleColumns['vehicle'] && <th className="text-left px-2 py-2.5 w-[90px]">Vehicle</th>}
                      {visibleColumns['phone'] && <th className="text-left px-2 py-2.5 w-[100px]">Phone</th>}
                      {visibleColumns['delivery'] && <th className="text-center px-2 py-2.5 w-[85px]">Delivery</th>}
                      {visibleColumns['total'] && <th className="text-right px-2 py-2.5 w-[90px]">Total</th>}

                      {isDriverOrAdmin && <th className="text-center px-1 py-2.5 w-[75px]">Receipt</th>}

                      {isDriverOrAdmin && visibleColumns['actions'] && <th className="text-right px-2 py-2.5 w-[70px]">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order, index) => (
                        <tr key={order._id} className="hover:bg-gray-50/80 transition-colors text-[13px] tracking-tight">
                          {visibleColumns['sno'] && (
                            <td className="px-1.5 py-2 text-center text-gray-500 font-medium">
                              {(orderPage - 1) * orderLimit + index + 1}
                            </td>
                          )}
                          {visibleColumns['date'] && (
                            <td className="px-2 py-2 whitespace-nowrap text-gray-600">
                              <div className="flex flex-col leading-none">
                                <span className="font-semibold text-[12px]">
                                  {new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                </span>
                              </div>
                            </td>
                          )}
                          {visibleColumns['status'] && (
                            <td className="px-1 py-2 text-center">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleBillingStatus(order);
                                  }}
                                  disabled={!isAdmin}
                                  className={`
                                flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors uppercase tracking-tight
                                ${(order.billed ?? false)
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                      : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}
                                ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                                >
                                  {(order.billed ?? false) ? 'Billed' : 'Pending'}
                                </button>
                                {order.deliveryStatus !== 'Delivered' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleCancelled(order._id);
                                    }}
                                    disabled={!isDriverOrAdmin}
                                    className={`
                                  flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-colors uppercase tracking-tight
                                  ${(order.isCancelled ?? false)
                                        ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                  ${!isDriverOrAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                  >
                                    {(order.isCancelled ?? false) ? 'Cancelled' : 'Cancel'}
                                  </button>
                                )}
                                {(order.isUpdated && !(order.billed ?? false) && !(order.isCancelled ?? false)) && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                    Updated
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns['messages'] && (
                            <td className="px-1 py-2 text-center">
                              <OrderMessageIcon
                                orderId={order._id}
                                orderCustomer={order.customerName}
                                messages={order.orderMessages || []}
                                onUpdate={fetchOrders}
                              />
                            </td>
                          )}
                          {visibleColumns['customer'] && (
                            <td className="px-2 py-2 font-medium text-gray-900 w-[140px] max-w-[140px] whitespace-normal break-words leading-tight text-[12px]">
                              {order.customerName}
                            </td>
                          )}
                          {visibleColumns['standardQty'] && <td className="px-2 py-2 text-right font-bold text-[15px]" style={{ color: 'darkgreen' }}>{order.standardQty}</td>}
                          {visibleColumns['standardPrice'] && <td className="px-2 py-2 text-right text-gray-500" style={{ color: 'darkgray' }}>₹{order.greenPrice}</td>}
                          {visibleColumns['premiumQty'] && <td className="px-2 py-2 text-right font-bold text-[15px]" style={{ color: 'darkorange' }}>{order.premiumQty}</td>}
                          {visibleColumns['premiumPrice'] && <td className="px-2 py-2 text-right text-gray-500" style={{ color: 'darkgray' }}>₹{order.orangePrice}</td>}
                          {visibleColumns['route'] && <td className="px-2 py-2 text-gray-600 truncate max-w-[100px]" title={order.route}>{order.route}</td>}
                          {visibleColumns['salesExecutive'] && (
                            <td className="px-2 py-2 text-gray-600 w-[100px] truncate">
                              <div className="flex items-center gap-1">
                                <div className="h-4 w-4 rounded-full bg-gray-50 flex items-center justify-center text-[8px] text-gray-400 font-bold border">
                                  {order.salesExecutive ? order.salesExecutive.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="truncate max-w-[80px] text-[12px]" title={resolveName(order.salesExecutive)}>
                                  {resolveName(order.salesExecutive)}
                                </span>
                              </div>
                            </td>
                          )}
                          {visibleColumns['vehicle'] && (
                            <td className="px-2 py-2 text-gray-600 w-[90px] max-w-[90px] text-[12px]">
                              <ExpandableText text={order.vehicle} />
                            </td>
                          )}
                          {visibleColumns['phone'] && (
                            <td className="px-2 py-2 text-gray-600 text-[12px]">
                              {order.customerPhone ? (
                                <div className="flex items-center gap-1">
                                  <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600">
                                    {order.customerPhone}
                                  </a>
                                  <CopyButton text={order.customerPhone} />
                                </div>
                              ) : '-'}
                            </td>
                          )}

                          {visibleColumns['delivery'] && (
                            <td className="px-1.5 py-2 text-center">
                              {order.deliveryStatus === 'Delivered' ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleDeliveryStatus(order); }}
                                  className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-tight border bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm cursor-pointer active:scale-95 transition-all"
                                >
                                  DELIVERED
                                </button>
                              ) : isDriverOrAdmin ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleDeliveryStatus(order); }}
                                  disabled={order.isCancelled}
                                  className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-tight border shadow-sm transition-all
                                    ${order.isCancelled 
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer active:scale-95'
                                    }`}
                                >
                                  {(order.isCancelled ?? false) ? 'Blocked' : 'Mark Del'}
                                </button>
                              ) : null}
                            </td>
                          )}

                          {visibleColumns['total'] && (
                            <td className="px-2 py-2 text-right">
                              <div className="flex flex-col items-end leading-tight">
                                <span className="font-bold text-gray-900 text-[14px]">₹{order.total.toFixed(0)}</span>
                                {isDriverOrAdmin && (() => {
                                  const collected = receipts
                                    .filter(r => r.orderId === order._id)
                                    .reduce((s, r) => s + r.amount, 0);
                                  const balance = order.total - collected;
                                  return balance > 0 ? (
                                    <span className="text-[9px] font-medium text-red-500">Bal: ₹{balance.toFixed(0)}</span>
                                  ) : collected > 0 ? (
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Paid</span>
                                  ) : null;
                                })()}
                              </div>
                            </td>
                          )}

                          {/* Receipt button (Admin/Driver only) */}
                          {isDriverOrAdmin && (
                            <td className="px-1 py-2 text-center">
                              <button
                                disabled={order.isCancelled ?? false}
                                onClick={(e) => { e.stopPropagation(); openReceiptDrawer(order); }}
                                title={(order.isCancelled ?? false) ? "Cannot add receipt to cancelled order" : "Add Receipt"}
                                className={`
                                  inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-bold border transition-all whitespace-nowrap
                                  ${(order.isCancelled ?? false)
                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-60'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}
                                `}
                              >
                                <Receipt className={`h-3 w-3 ${(order.isCancelled ?? false) ? 'text-gray-200' : 'text-gray-400'}`} />
                                {(order.isCancelled ?? false) ? 'N/A' : 'RCPT'}
                              </button>
                            </td>
                          )}

                          {isDriverOrAdmin && visibleColumns['actions'] && (
                            <td className="px-2 py-2 text-right">
                              <div className="flex justify-end gap-0.5">
                                <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} className="flex items-center gap-1 h-7 px-1.5 bg-white hover:bg-gray-50 border-gray-200 rounded shadow-sm">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil text-gray-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Edit</span>
                                </Button>
                                {isAdmin && (
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order._id)} className="h-7 w-7 p-0 hover:bg-red-50 rounded-full">
                                    <div className="sr-only">Delete</div>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 h-4 w-4 text-red-500"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Object.entries(visibleColumns).filter(([id, visible]) => visible && (id !== 'actions' || isDriverOrAdmin)).length + (isDriverOrAdmin ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                          No orders found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{((orderPage - 1) * orderLimit) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(orderPage * orderLimit, totalOrders)}</span> of{' '}
                    <span className="font-medium">{totalOrders}</span> orders
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrderPage(1)}
                      disabled={orderPage === 1}
                      className="h-9"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrderPage(prev => Math.max(1, prev - 1))}
                      disabled={orderPage === 1}
                      className="h-9"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">{orderPage}</span>
                      <span className="text-sm text-muted-foreground">of {totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrderPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={orderPage === totalPages}
                      className="h-9"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrderPage(totalPages)}
                      disabled={orderPage === totalPages}
                      className="h-9"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Close ORDERS tab conditional block ─────────────────────────── */}
        </>)}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* Delete Old Data Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-lg p-6">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <span className="text-red-600 text-lg">Delete Old Data</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-semibold mb-2">
                  This action will permanently delete all orders older than the current and previous month!
                </p>
                <p className="text-sm text-red-700">
                  Orders from the current month and previous month will be kept safe. This cannot be undone. Please make sure you have exported any necessary data before proceeding.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono font-bold text-red-600">I AM AWARE</span> to confirm
                </p>
                <Input
                  id="confirm-text"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type here..."
                  className="font-mono"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleDeleteLast30Days}
                  disabled={deleteConfirmText !== 'I AM AWARE'}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  Delete Orders
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Column Configuration Dialog */}
        <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
          <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Column Visibility</DialogTitle>
            </DialogHeader>
            <div className="py-4 px-4 flex-1 overflow-y-auto px-1">
              <p className="text-sm text-muted-foreground mb-4">
                Select which columns to display in the orders table.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {ORDER_COLUMNS.map((col) => {
                  if (col.id === 'actions' && !isDriverOrAdmin) return null;
                  return (
                    <div key={col.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`col-${col.id}`}
                        checked={visibleColumns[col.id]}
                        onChange={() => toggleColumn(col.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`col-${col.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {col.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end p-4 border-t mt-auto">
              <Button onClick={() => setShowColumnDialog(false)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Smartphone UX: Floating Action Button (FAB) */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button
            onClick={() => { setActiveTab('orders'); setShowCreateForm(true); }}
            className="h-14 w-14 rounded-full shadow-[0_8px_30px_rgba(234,88,12,0.4)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
            aria-label="Create New Order"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Orders;
