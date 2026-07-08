import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrdersContext';
import api, { updateOrderBillingStatus, updateOrderDeliveryStatus, updateDeliverySequences } from '@/lib/api';
import { triggerReward, triggerDeliveryReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Order } from '@/types';
import { VEHICLES } from '@/types';
import {
  Plus,
  Download,
  Filter,
  User,
  Truck,
  MapPin,
  Search,
  LayoutDashboard,
  Calendar,
  MoreHorizontal,
  Printer,
  Loader2,
  Phone,
  Copy,
  Check,
  X
} from 'lucide-react';
import { OrderMessageIcon } from '@/components/OrderMessageIcon';
import OrderSummaryCards from '@/components/orders/OrderSummaryCards';
import OrderTable from '@/components/orders/OrderTable';
import OrderFormModal from '@/components/orders/OrderFormModal';
import { formatBoxPcs } from '@/utils/formatters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import QRCode from 'qrcode';

// ─── Constants ───────────────────────────────────────────────────────────────

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

// Removed target config to utils/targets.ts

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

type ViewMode = 'daily' | 'monthly' | 'custom';

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
  { id: 'sequence', label: 'Seq' },
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

export const ExpandableText = ({ text, className = "" }: { text: string; className?: string }) => {
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

export const CopyButton = ({ text }: { text: string }) => {
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
      className="p-1 hover:bg-muted/50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/20"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-muted-foreground" />
      )}
    </button>
  );
};

const Orders: React.FC = () => {
  const { isAdmin, isCeo, user } = useAuth();
  const isDriver = user?.role === 'driver';
  const isDriverOrAdmin = isAdmin || isDriver;

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

  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingRegister, setIsPrintingRegister] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLocationFormat, setPrintLocationFormat] = useState<'none' | 'link' | 'qr' | 'both'>('none');
  const [showSummary, setShowSummary] = useState(() => {
    const saved = localStorage.getItem('orders_showSummary');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('orders_showSummary', JSON.stringify(showSummary));
  }, [showSummary]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setShowPrintModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!showPrintModal) return;
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target as HTMLElement).getAttribute('role') === 'combobox') return;
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setShowPrintModal(false);
        handleTodaySalesRegisterPrint(true, printLocationFormat);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowPrintModal(false);
        handleTodaySalesRegisterPrint(false, printLocationFormat);
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [showPrintModal]);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Drivers can only use daily or custom — never monthly
    if (user?.role === 'driver') return 'daily';
    return 'daily';
  });

  const [showMobileActions, setShowMobileActions] = useState(false);


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


  // Remembers the last delivery date — stays sticky across new orders until changed
  const stickyDeliveryDate = useRef(getTomorrowDate());

  // Form state

  // Name Resolver to prevent flickering (babu -> BABU)
  const resolveName = (username: string) => {
    if (!username) return 'N/A';
    return salesUsers.find(u => u.username === username)?.name || username;
  };






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



  const fetchOrders = useCallback(async () => {
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
  }, [viewMode, filterDate, orderPage, orderLimit, filterRoute, filterExecutive, filterVehicle, debouncedSearch, filterDateTo, dispatch]);




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

  useEffect(() => {
    fetchOrders();
    fetchSalesUsers();
    fetchRoutes();
  }, [filterDate, filterDateTo, filterRoute, filterExecutive, filterVehicle, debouncedSearch, orderPage, viewMode, fetchOrders]);

  //  Smart polling
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchOrders]);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#customer') && !target.closest('.customer-dropdown')) {
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleDeleteOrder = async (orderId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Order',
      description: 'Are you sure you want to delete this order? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/orders/${orderId}`);
          fetchOrders();
        } catch (error: any) {
          alert(error.response?.data?.error || 'Failed to delete order');
        }
      }
    });
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


  const handleEditOrder = async (order: Order) => {
    setEditingOrder(order);
    setShowCreateForm(true);
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
    // Only drivers can toggle delivery status
    if (!isDriver) {
      alert('Only drivers can update delivery status.');
      return;
    }

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

    // Optimistic update — show status change immediately
    dispatch({
      type: 'MARK_ORDER_DELIVERED',
      payload: {
        orderId: order._id,
        newStatus,
        deliveredAt: newStatus === 'Delivered' ? new Date().toISOString() : undefined
      }
    });

    try {
      const response = await updateOrderDeliveryStatus(order._id, newStatus);

      // ✅ Use server-confirmed deliveredAt — this persists across all polls
      const serverDeliveredAt = response.data?.order?.deliveredAt;
      if (serverDeliveredAt !== undefined) {
        dispatch({
          type: 'MARK_ORDER_DELIVERED',
          payload: {
            orderId: order._id,
            newStatus,
            deliveredAt: serverDeliveredAt ? String(serverDeliveredAt) : undefined
          }
        });
      }

      if (newStatus === 'Delivered') {
        triggerDeliveryReward();
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
    setConfirmConfig({
      isOpen: true,
      title: 'Export Orders',
      description: 'Are you sure you want to export the currently visible orders as CSV?',
      confirmText: 'Export',
      variant: 'default',
      onConfirm: async () => {
        try {
          const params = new URLSearchParams();
          if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
          if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
          if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);
          if (debouncedSearch) params.append('search', debouncedSearch);
          
          if (viewMode === 'daily') {
            if (filterDate) params.append('date', filterDate);
          } else if (filterDate) {
            const { start, end } = getDateRange(filterDate, viewMode, filterDateTo);
            params.append('startDate', start.toISOString());
            params.append('endDate', end.toISOString());
          }
          
          params.append('limit', '10000'); // Export up to 10k orders

          const response = await api.get(`/orders?${params.toString()}`);
          const ordersToExport = response.data.orders;

          if (!ordersToExport || ordersToExport.length === 0) {
            alert('No orders found to export');
            return;
          }

          // Generate proper filename
          let filenameParts = ['orders'];
          if (viewMode === 'daily' && filterDate) {
            filenameParts.push(filterDate);
          } else if (viewMode === 'monthly' && filterDate) {
            filenameParts.push(new Date(filterDate).toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-'));
          } else if (viewMode === 'custom') {
            filenameParts.push('custom-range');
          }
          
          if (filterRoute !== 'all') {
            const r = routes.find((r: any) => r._id === filterRoute);
            if (r) filenameParts.push(r.name.replace(/\s+/g, '-'));
          }
          if (filterExecutive !== 'all') {
            filenameParts.push(resolveName(filterExecutive).replace(/\s+/g, '-'));
          }
          if (filterVehicle !== 'all') {
            filenameParts.push(filterVehicle.replace(/\s+/g, '-'));
          }

          const filename = `${filenameParts.join('_').toLowerCase()}.csv`;

          // CSV Headers
          const headers = ['Date', 'Customer', 'Route', 'Vehicle', 'Sales Executive', 'Standard Qty', 'Premium Qty', 'Billed'];
          
          const csvRows = [];
          csvRows.push(headers.join(','));

          ordersToExport.forEach((order: Order) => {
            const row = [
              new Date(order.date).toLocaleDateString(),
              `"${order.customerName}"`,
              `"${order.route}"`,
              order.vehicle || '-',
              order.salesExecutive || '-',
              order.standardQty,
              order.premiumQty,
              order.billed ? 'Yes' : 'No'
            ];
            csvRows.push(row.join(','));
          });

          // Create and download file
          const csvContent = csvRows.join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error('Failed to export CSV:', error);
          alert('Failed to export orders');
        }
      }
    });
  };


  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const params = new URLSearchParams();
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      if (viewMode === 'daily') {
        if (filterDate) params.append('date', filterDate);
      } else if (filterDate) {
        const { start, end } = getDateRange(filterDate, viewMode, filterDateTo);
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
      }
      
      params.append('limit', '10000'); // Fetch up to 10k orders for printing

      const response = await api.get(`/orders?${params.toString()}`);
      const ordersToPrint = response.data.orders;

      if (!ordersToPrint || ordersToPrint.length === 0) {
        alert('No orders found to print');
        return;
      }

      // Generate proper title (same logic as CSV export)
      let titleParts = ['Orders'];
      if (viewMode === 'daily' && filterDate) {
        titleParts.push(filterDate);
      } else if (viewMode === 'monthly' && filterDate) {
        titleParts.push(new Date(filterDate).toLocaleString('default', { month: 'long', year: 'numeric' }));
      } else if (viewMode === 'custom') {
        titleParts.push('Custom Range');
      }
      
      if (filterRoute !== 'all') {
        const r = routes.find((r: any) => r._id === filterRoute);
        if (r) titleParts.push(r.name);
      }
      if (filterExecutive !== 'all') {
        titleParts.push(resolveName(filterExecutive));
      }
      if (filterVehicle !== 'all') {
        titleParts.push(filterVehicle);
      }

      const printTitle = titleParts.join(' - ');

      let totalStandardQty = 0;
      let totalPremiumQty = 0;
      ordersToPrint.forEach((order: any) => {
        if (!order.isCancelled) {
          totalStandardQty += (order.standardQty || 0);
          totalPremiumQty += (order.premiumQty || 0);
        }
      });

      // Cleanup any existing print containers
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
          #print-container { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: #fff; }
          
          @page { size: A4 landscape; margin: 8mm; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #000; margin: 0; padding: 0; line-height: 1.2; background: #fff; }
          #print-container h2 { text-align: center; margin-bottom: 12px; font-size: 18px; margin-top: 0; }
          #print-container table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          #print-container tr { page-break-inside: avoid; page-break-after: auto; }
          #print-container thead { display: table-header-group; }
          #print-container tfoot { display: table-footer-group; }
          #print-container th, #print-container td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 11px; }
          #print-container th { background-color: #f3f4f6; font-weight: 600; color: #111; }
          #print-container tr.cancelled-row td { color: #dc2626 !important; background-color: #fef2f2 !important; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        }
      `;

      printContainer.innerHTML = `
        <h2>${printTitle}</h2>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Vehicle</th>
              <th>Sales Exec</th>
              <th class="text-right">Standard Qty</th>
              <th class="text-right">Premium Qty</th>
              <th class="text-center">Status</th>
              <th class="text-center">Delivery</th>
            </tr>
          </thead>
          <tbody>
            ${ordersToPrint.map((order: any, index: number) => `
              <tr class="${order.isCancelled ? 'cancelled-row' : ''}">
                <td>${index + 1}</td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
                <td>${order.customerName || order.customer?.name || '-'}</td>
                <td>${order.route || '-'}</td>
                <td>${order.vehicle || '-'}</td>
                <td>${order.salesExecutive || '-'}</td>
                <td class="text-right">${order.standardQty || 0}</td>
                <td class="text-right">${order.premiumQty || 0}</td>
                <td class="text-center font-semibold uppercase text-[10px]">${order.isCancelled ? 'Cancelled' : (order.billed ? 'Billed' : 'Pending')}</td>
                <td class="text-center font-semibold uppercase text-[10px]">${order.isCancelled ? 'Blocked' : (order.deliveryStatus === 'Delivered' ? 'Delivered' : 'Pending')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f3f4f6; font-weight: 700; color: #111;">
              <td colspan="6" class="text-right" style="padding: 6px 8px; font-size: 12px; border-top: 2px solid #aaa;">TOTAL (Active Orders):</td>
              <td class="text-right" style="padding: 6px 8px; font-size: 11px; border-top: 2px solid #aaa; color: #047857; white-space: nowrap;">${formatBoxPcs(totalStandardQty)}</td>
              <td class="text-right" style="padding: 6px 8px; font-size: 11px; border-top: 2px solid #aaa; color: #b45309; white-space: nowrap;">${formatBoxPcs(totalPremiumQty)}</td>
              <td colspan="2" style="border-top: 2px solid #aaa;"></td>
            </tr>
          </tfoot>
        </table>
      `;

      document.head.appendChild(style);
      document.body.appendChild(printContainer);

      // Temporarily set document title for PDF saving
      const originalTitle = document.title;
      document.title = printTitle;

      // Print after a short delay to allow DOM to settle
      setTimeout(() => {
        window.print();
        // Restore original title
        document.title = originalTitle;
        // Intentionally leaving print-container in DOM for mobile dialog stability.
        // It will be cleaned up on next print.
      }, 500);
    } catch (error) {
      console.error('Failed to print orders', error);
      alert('Failed to print orders');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleTodaySalesRegisterPrint = async (includeTotals: boolean = false, locFormat: string = 'none') => {
    if (isPrintingRegister) return;
    setIsPrintingRegister(true);
    try {
      const params = new URLSearchParams();
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      let displayDate = '';
      if (viewMode === 'daily') {
        if (filterDate) {
          params.append('date', filterDate);
          displayDate = new Date(filterDate).toLocaleDateString('en-GB').replace(/\//g, '-');
        } else {
          displayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        }
      } else if (filterDate) {
        const { start, end } = getDateRange(filterDate, viewMode, filterDateTo);
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
        displayDate = 'Date Range Selected';
      } else {
        displayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      }
      
      params.append('limit', '10000');

      const response = await api.get(`/orders?${params.toString()}`);
      const fetchedOrders = response.data.orders;

      if (!fetchedOrders || fetchedOrders.length === 0) {
        alert('No sales found for the selected date.');
        setIsPrintingRegister(false);
        return;
      }

      // Group and aggregate data
      const customersMap = new Map();
      let grandTotalStandard = 0;
      let grandTotalPremium = 0;
      fetchedOrders.forEach((order: any) => {
        if (order.isCancelled) return;
        const customerName = order.customerName || order.customer?.name || 'Unknown';
        if (!customersMap.has(customerName)) {
          customersMap.set(customerName, {
            name: customerName,
            locationUrl: order.locationUrl || '',
            standardQty: 0,
            premiumQty: 0
          });
        }
        const cust = customersMap.get(customerName);
        const sq = order.standardQty || 0;
        const pq = order.premiumQty || 0;
        cust.standardQty += sq;
        cust.premiumQty += pq;
        grandTotalStandard += sq;
        grandTotalPremium += pq;
      });

      const aggregatedData = Array.from(customersMap.values());
      
      if (aggregatedData.length === 0) {
        alert('No valid sales found for the selected date.');
        setIsPrintingRegister(false);
        return;
      }

      // Generate QR codes if needed
      if (locFormat === 'qr' || locFormat === 'both') {
        for (const row of aggregatedData) {
          if (row.locationUrl) {
            try {
              row.qrCode = await QRCode.toDataURL(row.locationUrl, { width: 45, margin: 1 });
            } catch (e) {
              console.warn('Failed to generate QR code', e);
            }
          }
        }
      }

      // Cleanup any existing print containers
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
          #print-container { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: #fff; }
          
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 0; line-height: 1.2; background: #fff; font-size: 12px; }
          
          .header-title { text-align: center; font-weight: bold; font-size: 20px; margin-bottom: 15px; margin-top: 5px; letter-spacing: 1px; }
          .header-box { border: 2px solid #000; padding: 12px 15px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 13px; }
          .header-col { width: 48%; display: flex; flex-direction: column; gap: 12px; }
          .header-row { display: flex; align-items: flex-end; }
          .header-label { width: 85px; font-weight: bold; }
          .header-value { flex-grow: 1; border-bottom: 1px dashed #666; height: 16px; margin-left: 5px; }
          .header-value.filled { border-bottom: none; font-weight: bold; font-size: 14px; margin-bottom: -2px; }
          
          table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; height: 22px; }
          .page-break { page-break-after: always; break-after: page; }
          th, td { border: 1px solid #000; padding: 4px; text-align: left; font-size: 12px; }
          th { font-weight: bold; background-color: transparent; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .w-seq { width: 40px; }
          .w-cust { white-space: nowrap; }
          .w-loc { width: 55px; text-align: center; }
          .w-blank { width: 35%; }
          .w-qty { width: 80px; }
          
          .summary-footer { margin-top: 30px; border: 2px solid #000; padding: 15px; width: 350px; margin-left: auto; page-break-inside: avoid; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; font-weight: bold; align-items: flex-end; }
          .summary-label { width: 160px; }
          .summary-value { flex-grow: 1; border-bottom: 1px dashed #000; height: 18px; margin-left: 10px; }
        }
      `;

      printContainer.innerHTML = `
        <div class="header-title">PULIKKUTH ENTERPRISES</div>
        <div class="header-box">
          <div class="header-col">
            <div class="header-row"><div class="header-label">Date</div><span>:</span><div class="header-value filled">${displayDate}</div></div>
            <div class="header-row"><div class="header-label">Vehicle</div><span>:</span><div class="header-value"></div></div>
            <div class="header-row"><div class="header-label">Route</div><span>:</span><div class="header-value"></div></div>
          </div>
          <div class="header-col">
            <div class="header-row"><div class="header-label">Driver</div><span>:</span><div class="header-value"></div></div>
            <div class="header-row"><div class="header-label">Associate</div><span>:</span><div class="header-value"></div></div>
            <div class="header-row"><div class="header-label">Batch No.</div><span>:</span><div class="header-value"></div></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="w-seq text-center">S.No</th>
              <th class="w-cust">Customer Name</th>
              ${locFormat !== 'none' ? `<th class="w-loc">Location</th>` : ''}
              <th class="w-blank">Amount Received</th>
              <th class="w-blank">Adjustment</th>
              <th class="w-qty text-right">Standard Qty</th>
              <th class="w-qty text-right">Premium Qty</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              const allRows = [
                ...aggregatedData,
                ...Array(7).fill(null).map(() => ({ isExtra: true }))
              ];
              return allRows.map((row, i) => {
                if (row.isExtra) {
                  return `
                    <tr>
                      <td class="text-center">${i + 1}</td>
                      <td class="w-cust"></td>
                      ${locFormat !== 'none' ? `<td></td>` : ''}
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  `;
                }

                let locHtml = '';
                if (locFormat !== 'none') {
                  locHtml = '<td></td>'; // default empty
                  if (row.locationUrl) {
                    if (locFormat === 'link') {
                      locHtml = `<td class="text-center"><a href="${row.locationUrl}" target="_blank" style="color: blue; text-decoration: none; font-size: 10px;">[📍 Map]</a></td>`;
                    } else if (locFormat === 'qr' && row.qrCode) {
                      locHtml = `<td class="text-center"><img src="${row.qrCode}" alt="QR" style="width: 45px; height: 45px; display: block; margin: 0 auto;"/></td>`;
                    } else if (locFormat === 'both' && row.qrCode) {
                      locHtml = `<td class="text-center"><img src="${row.qrCode}" alt="QR" style="width: 40px; height: 40px; display: block; margin: 0 auto;"/><a href="${row.locationUrl}" target="_blank" style="color: blue; text-decoration: none; font-size: 9px; display: block;">Link</a></td>`;
                    }
                  }
                }

                return `
                  <tr>
                    <td class="text-center">${i + 1}</td>
                    <td class="w-cust">${row.name}</td>
                    ${locHtml}
                    <td></td>
                    <td></td>
                    <td class="text-right">${row.standardQty}</td>
                    <td class="text-right">${row.premiumQty}</td>
                  </tr>
                `;
              }).join('');
            })()}
          </tbody>
          ${includeTotals ? `
          <tfoot>
            <tr>
              <td colspan="${locFormat !== 'none' ? 5 : 4}" class="text-right" style="font-weight: bold;">TOTAL (Active Orders):</td>
              <td class="text-right" style="font-weight: bold;">${formatBoxPcs(grandTotalStandard)}</td>
              <td class="text-right" style="font-weight: bold;">${formatBoxPcs(grandTotalPremium)}</td>
            </tr>
          </tfoot>
          ` : ''}
        </table>
        
        <div class="summary-footer">
          <div class="summary-row">
            <div class="summary-label">Total Cash Received</div><span>:</span>
            <div class="summary-value"></div>
          </div>
          <div class="summary-row">
            <div class="summary-label">Total Expenses</div><span>:</span>
            <div class="summary-value"></div>
          </div>
          <div class="summary-row" style="margin-bottom: 0;">
            <div class="summary-label">Net Cash Balance</div><span>:</span>
            <div class="summary-value"></div>
          </div>
        </div>
      `;

      document.head.appendChild(style);
      document.body.appendChild(printContainer);

      const originalTitle = document.title;
      document.title = 'Today Sales Register - ' + displayDate;

      setTimeout(() => {
        window.print();
        document.title = originalTitle;
      }, 500);
    } catch (error) {
      console.error('Failed to print register', error);
      alert('Failed to generate sales register');
    } finally {
      setIsPrintingRegister(false);
    }
  };

  const uniqueExecutives = useMemo(() => [...new Set(orders.map(o => o.salesExecutive).filter(Boolean))], [orders]);


  // Backend handles all filtering, no need for client-side filtering
  const filteredOrders = orders;

  const [editedSequences, setEditedSequences] = useState<Record<string, number | ''>>({});

  const handleManualSequenceChange = (orderId: string, newSequence: number | '') => {
    setEditedSequences(prev => ({ ...prev, [orderId]: newSequence }));
  };

  const handleSaveSequences = async () => {
    const payload = Object.entries(editedSequences).map(([id, seq]) => ({
      _id: id,
      deliverySequence: seq === '' ? null : seq
    }));

    if (payload.length === 0) return;

    try {
      await updateDeliverySequences(payload);
      setEditedSequences({});
      fetchOrders();
    } catch (error) {
      console.error('Failed to save sequences', error);
      alert('Failed to save sequences.');
    }
  };


  return (
    <Layout fullWidth>

      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* ──────────────────────────────────────────────────────────────────── */}

      <div className="space-y-6 w-full max-w-[1600px] px-2 mx-auto">
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ORDERS TAB                                                          */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <>

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
                <Button variant="outline" onClick={handlePrint} disabled={isPrinting} className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
                  {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  {isPrinting ? 'Preparing...' : 'Print'}
                </Button>
                <Button variant="outline" onClick={() => setShowPrintModal(true)} disabled={isPrintingRegister} className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
                  {isPrintingRegister ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  {isPrintingRegister ? 'Preparing...' : 'Today Sales Register'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSummary(!showSummary)}
                  className={`w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium ${!showSummary ? 'bg-muted/50 text-muted-foreground' : ''}`}
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
                {!isCeo && (
                  <Button onClick={() => setShowCreateForm(!showCreateForm)} className="hidden md:flex w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    New Order
                  </Button>
                )}
              </div>
            </div>
          </div>
          {/* end header row */}

          {/* Summary Cards */}
          <OrderSummaryCards 
            showSummary={showSummary}
            standardStock={standardStock}
            premiumStock={premiumStock}
            user={user}
            summary={summary}
          />



          {/* Filters */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/50">
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
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1 rounded">Hide</span>
                    ) : (
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1 rounded">Show</span>
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
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 z-10'
                        : 'bg-card text-card-foreground text-foreground border-border hover:bg-muted'}`}
                    >
                      Daily
                    </button>
                    {user?.role !== 'driver' && (
                      <button
                        onClick={() => setViewMode('monthly')}
                        className={`flex-1 text-sm font-medium border-t border-b border-r transition-colors ${viewMode === 'monthly'
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 z-10'
                          : 'bg-card text-card-foreground text-foreground border-border hover:bg-muted'}`}
                      >
                        Monthly
                      </button>
                    )}
                    <button
                      onClick={() => setViewMode('custom')}
                      className={`flex-1 text-sm font-medium border-t border-b border-r rounded-r-md transition-colors ${viewMode === 'custom'
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 z-10'
                        : 'bg-card text-card-foreground text-foreground border-border hover:bg-muted'}`}
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
                        className="pl-9 h-11 dark:[color-scheme:dark]"
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
                          className="pl-9 h-11 dark:[color-scheme:dark]"
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
                          className="pl-9 h-11 dark:[color-scheme:dark]"
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

                <div className={`space-y-1 order-7 flex items-end ${showMobileFilters ? 'flex' : 'hidden'} md:flex`}>
                  <Button
                    variant="outline"
                    className="w-full text-muted-foreground hover:text-foreground border-border"
                    onClick={() => {
                      setFilterDate('');
                      setFilterDateTo('');
                      setFilterRoute('all');
                      setFilterExecutive('all');
                      setFilterVehicle('all');
                      setFilterSearch('');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Order Dialog */}
          <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
            <DialogContent className="w-[95vw] sm:max-w-md p-6">
              <DialogHeader>
                <DialogTitle className="text-xl border-none pb-0">Print Sales Register</DialogTitle>
              </DialogHeader>
              <div className="py-2 text-sm text-muted-foreground text-left space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="printLocationFormat">Location Format (For Drivers)</Label>
                  <Select value={printLocationFormat} onValueChange={(val: any) => setPrintLocationFormat(val)}>
                    <SelectTrigger id="printLocationFormat">
                      <SelectValue placeholder="Select location format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Hide Location)</SelectItem>
                      <SelectItem value="link">Link Only (Best for WhatsApp PDF)</SelectItem>
                      <SelectItem value="qr">QR Code Only (Best for Paper Print)</SelectItem>
                      <SelectItem value="both">Both (QR Code + Link)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p>Do you want to include the Total Active Orders quantity at the bottom of the printed table?</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setShowPrintModal(false); handleTodaySalesRegisterPrint(false, printLocationFormat); }} className="w-full sm:w-auto">
                  No, Hide Totals (N)
                </Button>
                <Button type="button" onClick={() => { setShowPrintModal(false); handleTodaySalesRegisterPrint(true, printLocationFormat); }} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                  Yes, Include Totals (Y)
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <OrderFormModal
            isOpen={showCreateForm}
            onClose={() => {
              setShowCreateForm(false);
              setEditingOrder(null);
            }}
            editingOrder={editingOrder}
            salesUsers={salesUsers}
            isDriverOrAdmin={isDriverOrAdmin}
            isAdmin={isAdmin}
            onSaveSuccess={(date) => {
              stickyDeliveryDate.current = date;
              setShowCreateForm(false);
              setEditingOrder(null);
              fetchOrders();
            }}
            defaultDate={stickyDeliveryDate.current}
            currentUser={user}
          />

          {/* Mobile: Card View */}
          {/* Mobile: Card View */}
          <div className="md:hidden space-y-4 pb-20">
            <div className="text-sm text-muted-foreground font-medium px-1">
              Showing {filteredOrders.length} of {totalOrders} orders
            </div>
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <Card key={order._id} className="overflow-hidden shadow-lg border-border rounded-xl active:scale-[0.99] transition-transform">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-start justify-between gap-2 w-full mb-1">
                          <div className="font-bold text-lg leading-tight text-foreground">{order.customerName}</div>
                          {visibleColumns['messages'] && (
                            <div className="mt-0.5 shrink-0">
                                <OrderMessageIcon
                                  orderId={order._id}
                                  orderCustomer={order.customerName}
                                  messages={order.orderMessages || []}
                                />
                            </div>
                          )}
                        </div>
                        {visibleColumns['date'] && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center text-xs text-muted-foreground font-medium">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                              {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                            {order.deliveryStatus === 'Delivered' && order.deliveredAt && (
                              <div className="flex items-center text-[10px] text-emerald-600 font-bold uppercase tracking-tight">
                                <span className="mr-1">✓</span>
                                Del: {new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                              </div>
                            )}
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
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/20'}
                                ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                                >
                                  {(order.billed ?? false) ? 'BILLED' : 'PENDING'}
                                </button>
                                {(order.isUpdated && !(order.billed ?? false) && !(order.isCancelled ?? false)) && (
                                  <button className=" px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border transition-all bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30">
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
                                        : 'bg-card text-card-foreground text-muted-foreground border-border hover:bg-muted'}
                                  ${!isDriverOrAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                  >
                                    {(order.isCancelled ?? false) ? 'CANCELLED' : 'CANCEL'}
                                  </button>
                                )}
                              </>
                            )}
                            {visibleColumns['delivery'] && order.deliveryStatus === 'Delivered' && (
                              isDriver ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDeliveryStatus(order);
                                  }}
                                  className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm cursor-pointer active:scale-95 transition-all"
                                >
                                  DELIVERED
                                </button>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border bg-emerald-100 text-emerald-700 border-emerald-200">
                                  DELIVERED
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      {visibleColumns['total'] && (
                        <div className="text-right">
                          <span className="block font-bold text-xl text-emerald-600 tracking-tight">₹{order.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm bg-muted p-3.5 rounded-lg mb-4 border">
                      <div className="space-y-1.5">
                        {visibleColumns['route'] && (
                          <>
                            <div className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5" /> Route</div>
                            <div className="font-medium text-base mb-2">{order.route}</div>
                          </>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {visibleColumns['vehicle'] && (
                          <>
                            <div className="text-xs text-muted-foreground flex items-center"><Truck className="h-3.5 w-3.5 mr-1.5" /> Vehicle</div>
                            <ExpandableText text={order.vehicle} className="font-medium text-base" />
                          </>
                        )}
                      </div>
                      <div className="col-span-2 pt-2.5 border-t mt-1 grid grid-cols-2 gap-3">
                        <div>
                          {visibleColumns['salesExecutive'] && (
                            <>
                              <div className="text-xs text-muted-foreground flex items-center"><User className="h-3.5 w-3.5 mr-1.5" /> Sales Executive</div>
                              <div className="font-medium text-base">
                                {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive || 'N/A'}
                              </div>
                            </>
                          )}
                        </div>
                        <div>
                          {visibleColumns['phone'] && (
                            <>
                              <div className="text-xs text-muted-foreground flex items-center"><Phone className="h-3.5 w-3.5 mr-1.5" /> Phone</div>
                              <div className="font-medium text-base">
                                {order.customerPhone ? (
                                  <div className="flex items-center gap-2">
                                    <a href={`tel:${order.customerPhone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
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
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Standard</span>
                            <div className="flex items-baseline gap-1">
                              <p className="font-bold text-lg text-emerald-800 dark:text-emerald-500">{order.standardQty}</p>
                              {visibleColumns['standardPrice'] && <span className="text-xs text-muted-foreground text-emerald-800 dark:text-emerald-500">(₹{order.greenPrice})</span>}
                            </div>
                          </div>
                        )}
                        {visibleColumns['premiumQty'] && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Premium</span>
                            <div className="flex items-baseline gap-1">
                              <p className="font-bold text-lg text-orange-800 dark:text-orange-500">{order.premiumQty}</p>
                              {visibleColumns['premiumPrice'] && <span className="text-xs text-muted-foreground text-orange-800 dark:text-orange-500">(₹{order.orangePrice})</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      {isDriverOrAdmin && visibleColumns['actions'] && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)} className="h-10 w-10 p-0 hover:bg-muted/50 rounded-full">
                            <div className="sr-only">Edit</div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil text-muted-foreground"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
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

                    {/* Mark Delivered (Admin/Driver only) */}
                    <div className="mt-3 pt-3 border-t border-border flex gap-2">
                        {visibleColumns['delivery'] && order.deliveryStatus !== 'Delivered' && !(order.isCancelled ?? false) && (
                          isDriver ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleDeliveryStatus(order); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 active:scale-[0.98] shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                              Mark Delivered
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-semibold bg-muted text-muted-foreground border border-border">
                              Status: Pending
                            </div>
                          )
                        )}
                      </div>
                    
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-card text-card-foreground rounded-lg border border-dashed">
                <p className="text-muted-foreground">No orders found matching your filters</p>
              </div>
            )}
          </div>

          {/* Desktop: Table View */}
          <Card className="hidden md:block shadow-sm">
            <CardHeader className="py-4 border-b bg-muted/40 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Order List <span className="text-sm font-normal text-muted-foreground ml-2">({totalOrders} total)</span></CardTitle>
              {Object.keys(editedSequences).length > 0 && (
                <Button onClick={handleSaveSequences} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold tracking-tight">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Save Sequences
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <OrderTable
                    filteredOrders={filteredOrders}
                    visibleColumns={visibleColumns}
                    orderPage={orderPage}
                    orderLimit={orderLimit}
                    isAdmin={isAdmin}
                    isDriver={isDriver}
                    isDriverOrAdmin={isDriverOrAdmin}
                    resolveName={resolveName}
                    handleToggleBillingStatus={handleToggleBillingStatus}
                    handleToggleCancelled={handleToggleCancelled}
                    handleToggleDeliveryStatus={handleToggleDeliveryStatus}
                    handleEditOrder={handleEditOrder}
                    handleDeleteOrder={handleDeleteOrder}
                    editedSequences={editedSequences}
                    handleManualSequenceChange={handleManualSequenceChange}
                  />
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
        </>
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
                <p className="text-sm font-medium text-foreground mb-2">
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

        {/* Persuasive Tech: Floating Action Button (FAB) - Desktop & Mobile */}
        {!isCeo && (
          <button
            onClick={() => {
              setShowCreateForm(true);
            }}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center z-[50] group"
            title="Add Order"
          >
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:animate-none"></div>
            <Plus className="h-8 w-8 z-10 transition-transform group-hover:rotate-90 duration-300" />
          </button>
        )}
      </div >

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />
    </Layout >
  );
};

export default Orders;
