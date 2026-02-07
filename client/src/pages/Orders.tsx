import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api, { updateOrderBillingStatus } from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import type { Customer, Order } from '@/types';
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
  Phone
} from 'lucide-react';
import { OrderMessageIcon } from '@/components/OrderMessageIcon';

interface SalesUser {
  _id: string;
  username: string;
  name: string;
}

interface Route {
  _id: string;
  name: string;
}

const ExpandableText = ({ text, className = "" }: { text: string; className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className={`cursor-pointer transition-all duration-200 ${isExpanded ? '' : 'line-clamp-1 overflow-hidden text-ellipsis'} ${className}`}
      title={isExpanded ? '' : text}
    >
      {text}
    </div>
  );
};

const Orders: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
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

  // Filters
  // Filters - Persisted
  const [filterDate, setFilterDate] = useState(() => localStorage.getItem('orders_filterDate') || '');
  const [filterRoute, setFilterRoute] = useState(() => localStorage.getItem('orders_filterRoute') || 'all');
  const [filterExecutive, setFilterExecutive] = useState(() => localStorage.getItem('orders_filterExecutive') || 'all');
  const [filterVehicle, setFilterVehicle] = useState(() => localStorage.getItem('orders_filterVehicle') || 'all');
  const [filterSearch, setFilterSearch] = useState(() => localStorage.getItem('orders_filterSearch') || '');

  const [debouncedSearch, setDebouncedSearch] = useState(() => localStorage.getItem('orders_filterSearch') || '');
  const [orderSearchDebounce, setOrderSearchDebounce] = useState<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Persist filters
  useEffect(() => {
    localStorage.setItem('orders_filterDate', filterDate);
    localStorage.setItem('orders_filterRoute', filterRoute);
    localStorage.setItem('orders_filterExecutive', filterExecutive);
    localStorage.setItem('orders_filterVehicle', filterVehicle);
    localStorage.setItem('orders_filterSearch', filterSearch);
  }, [filterDate, filterRoute, filterExecutive, filterVehicle, filterSearch]);

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
    totalRevenue: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    route: '',
    customerId: '',
    vehicle: '',
    standardQty: 0,
    premiumQty: 0
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchSalesUsers();
    fetchRoutes();
  }, [filterDate, filterRoute, filterExecutive, filterVehicle, debouncedSearch, orderPage]);

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

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);

      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', orderPage.toString());
      params.append('limit', orderLimit.toString());

      const response = await api.get(`/orders?${params.toString()}`);
      // Handle paginated response with summary
      const { orders: fetchedOrders, pagination, summary: summaryData } = response.data;
      setOrders(fetchedOrders || []);
      setTotalOrders(pagination?.total || 0);
      setTotalPages(pagination?.totalPages || 1);
      setSummary(summaryData || {
        totalOrders: 0,
        totalStandardQty: 0,
        totalPremiumQty: 0,
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

    // Extract route name from customer
    const routeName = customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : '';

    setFormData({
      ...formData,
      customerId: customer._id,
      route: routeName
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
      premiumQty: order.premiumQty
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
      date: new Date().toISOString().split('T')[0],
      route: '',
      customerId: '',
      vehicle: '',
      standardQty: 0,
      premiumQty: 0
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

    // Optimistic update
    setOrders(orders.map(o => o._id === order._id ? { ...o, billed: newStatus } : o));

    try {
      const response = await updateOrderBillingStatus(order._id, newStatus);

      // Handle new response format { success: true, order: ... }
      if (response.data.success && response.data.order) {
        // Success - state already updated optimistically
        triggerReward();
      }
    } catch (error) {
      console.error('Failed to update billing status:', error);
      // Revert on error
      setOrders(orders.map(o => o._id === order._id ? { ...o, billed: isBilled } : o));
      alert('Failed to update billing status');
    }
  };

  const handleExportCSV = async () => {
    if (!window.confirm("Are you sure you want to export orders as CSV?")) {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);
      if (filterSearch) params.append('search', filterSearch);

      const response = await api.get(`/orders/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  const totals = calculateTotals();

  const uniqueExecutives = [...new Set(orders.map(o => o.salesExecutive).filter(Boolean))];

  // Filter customers based on search (already filtered by route from API)
  const filteredCustomers = customers
    .filter(c => {
      // For non-admin users, only show their own customers
      if (!isAdmin && user) {
        if (c.salesExecutive !== user.username) {
          return false;
        }
      }
      // Search filter is already applied from API, this is just for additional client-side filtering
      return customerSearch === '' ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
    });

  // Backend handles all filtering, no need for client-side filtering
  const filteredOrders = orders;

  return (
    <Layout>
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Orders</h1>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
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
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full sm:w-auto shadow-sm h-11 sm:h-10 text-base sm:text-sm font-medium">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

        {/* Summary Cards - All Users */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#9E1216' }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Orders</p>
                  <div className="text-2xl sm:text-3xl font-bold">
                    <AnimatedNumber value={summary.totalOrders} />
                  </div>
                </div>
                <div className="p-2 bg-red-50 rounded-full">
                  <ShoppingCart className="h-5 w-5 text-[#9E1216]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: 'darkgreen' }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Standard</p>
                  <div className="flex flex-col">
                    <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'darkgreen' }}>
                      <AnimatedNumber value={summary.totalStandardQty} />
                    </div>
                    {summary.totalStandardQty > 0 && (
                      <div className="text-xs font-semibold opacity-80" style={{ color: 'darkgreen' }}>
                        ({Math.floor(summary.totalStandardQty / 30)} Box, {summary.totalStandardQty % 30} Pcs)
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded-full">
                  <Package className="h-5 w-5" style={{ color: 'darkgreen' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: 'darkorange' }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Premium</p>
                  <div className="flex flex-col">
                    <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'darkorange' }}>
                      <AnimatedNumber value={summary.totalPremiumQty} />
                    </div>
                    {summary.totalPremiumQty > 0 && (
                      <div className="text-xs font-semibold opacity-80" style={{ color: 'darkorange' }}>
                        ({Math.floor(summary.totalPremiumQty / 30)} Box, {summary.totalPremiumQty % 30} Pcs)
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-orange-50 rounded-full">
                  <Star className="h-5 w-5" style={{ color: 'darkorange' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#10B981' }}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revenue</p>
                  <div className="text-2xl sm:text-3xl font-bold text-[#10B981]">
                    <AnimatedNumber
                      value={summary.totalRevenue}
                      formatValue={(v) => `₹${v.toLocaleString('en-IN')}`}
                    />
                  </div>
                </div>
                <div className="p-2 bg-emerald-50 rounded-full">
                  <IndianRupee className="h-5 w-5 text-[#10B981]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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

              {/* Other Filters - Hidden on mobile unless toggled */}
              <div className={`space-y-1 order-3 ${showMobileFilters ? 'block' : 'hidden'} md:block`}>
                <Label htmlFor="filter-date" className="text-xs text-muted-foreground">Date</Label>
                <div className="relative">
                  <Input
                    id="filter-date"
                    type="date"
                    value={filterDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                    className="pl-9"
                  />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

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
                      <SelectItem key={exec} value={exec}>{exec}</SelectItem>
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
                      <Label htmlFor="date">Order Date</Label>
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
              <Card key={order._id} className="overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 w-full">
                        <h3 className="font-semibold text-lg leading-tight">{order.customerName}</h3>
                        <div className="mt-0.5 shrink-0">
                          <OrderMessageIcon
                            orderId={order._id}
                            orderCustomer={order.customerName}
                            messages={order.orderMessages || []}
                            onUpdate={fetchOrders}
                          />
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4 mr-1.5" />
                        {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="mt-2">
                        {/* Status Badge for Mobile */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBillingStatus(order);
                          }}
                          disabled={!isAdmin}
                          className={`
                            px-2 py-0.5 rounded text-xs font-medium border transition-colors
                            ${(order.billed ?? false)
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}
                            ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          {(order.billed ?? false) ? 'Billed' : 'Pending'}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-xl text-emerald-600">₹{order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3.5 rounded-lg mb-4 border">
                    <div className="space-y-1.5">
                      <div className="text-xs text-gray-500 flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5" /> Route</div>
                      <div className="font-medium text-base">{order.route}</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs text-gray-500 flex items-center"><Truck className="h-3.5 w-3.5 mr-1.5" /> Vehicle</div>
                      <ExpandableText text={order.vehicle} className="font-medium text-base" />
                    </div>
                    <div className="col-span-2 pt-2.5 border-t mt-1 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 flex items-center"><User className="h-3.5 w-3.5 mr-1.5" /> Sales Executive</div>
                        <div className="font-medium text-base">
                          {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 flex items-center"><Phone className="h-3.5 w-3.5 mr-1.5" /> Phone</div>
                        <div className="font-medium text-base">
                          {order.customerPhone ? (
                            <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline">
                              {order.customerPhone}
                            </a>
                          ) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm px-1">
                    <div className="flex gap-6">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Standard</span>
                        <p className="font-bold text-lg" style={{ color: 'darkgreen' }}>{order.standardQty}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Premium</span>
                        <p className="font-bold text-lg" style={{ color: 'darkorange' }}>{order.premiumQty}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)} className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full">
                          <div className="sr-only">Edit</div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil text-gray-600"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order._id)} className="h-10 w-10 p-0 hover:bg-red-50 rounded-full">
                          <div className="sr-only">Delete</div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 text-red-600"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                        </Button>
                      </div>
                    )}
                  </div>
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="text-left px-4 py-3 w-[100px]">Date</th>
                    <th className="text-center px-2 py-3 w-[80px]">Status</th>
                    <th className="px-2 py-3 w-[50px] text-center"></th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-right px-4 py-3" style={{ color: 'darkgreen' }}>Std Qty</th>
                    <th className="text-right px-4 py-3" style={{ color: 'darkorange' }}>Prem Qty</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Executive</th>
                    <th className="text-left px-4 py-3">Vehicle</th>
                    <th className="text-left px-4 py-3">Phone</th>

                    <th className="text-right px-4 py-3">Total</th>

                    {isAdmin && <th className="text-right px-4 py-3 w-[80px]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-50/80 transition-colors text-sm">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBillingStatus(order);
                            }}
                            disabled={!isAdmin}
                            className={`
                              px-2 py-0.5 rounded text-xs font-medium border transition-colors
                              ${(order.billed ?? false)
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}
                              ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            {(order.billed ?? false) ? 'Billed' : 'Pending'}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <OrderMessageIcon
                            orderId={order._id}
                            orderCustomer={order.customerName}
                            messages={order.orderMessages || []}
                            onUpdate={fetchOrders}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{order.customerName}</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: 'darkgreen' }}>{order.standardQty}</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: 'darkorange' }}>{order.premiumQty}</td>
                        <td className="px-4 py-3 text-gray-600">{order.route}</td>
                        <td className="px-4 py-3 text-gray-600 w-[140px] truncate">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold border">
                              {order.salesExecutive ? order.salesExecutive.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span className="truncate max-w-[100px]" title={salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive}>
                              {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 w-[100px] max-w-[100px]">
                          <ExpandableText text={order.vehicle} />
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.customerPhone ? (
                            <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600 hover:underline">
                              {order.customerPhone}
                            </a>
                          ) : '-'}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{order.total.toFixed(2)}</td>

                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)} className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
                                <div className="sr-only">Edit</div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil h-4 w-4 text-gray-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order._id)} className="h-8 w-8 p-0 hover:bg-red-50 rounded-full">
                                <div className="sr-only">Delete</div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 h-4 w-4 text-red-500"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 9} className="px-4 py-12 text-center text-gray-500">
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
      </div >
    </Layout >
  );
};

export default Orders;
