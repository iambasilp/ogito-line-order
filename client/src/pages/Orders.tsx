import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
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
  Phone,
  X
} from 'lucide-react';

interface SalesUser {
  _id: string;
  username: string;
  name: string;
}

interface Route {
  _id: string;
  name: string;
}

const Orders: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterExecutive, setFilterExecutive] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    route: '',
    vehicle: '',
    standardQty: 0,
    premiumQty: 0
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchSalesUsers();
    fetchRoutes();
  }, [filterDate, filterRoute, filterExecutive, filterVehicle, filterSearch]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterExecutive && filterExecutive !== 'all') params.append('salesExecutive', filterExecutive);
      if (filterVehicle && filterVehicle !== 'all') params.append('vehicle', filterVehicle);
      if (filterSearch) params.append('search', filterSearch);

      const response = await api.get(`/orders?${params.toString()}`);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
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
    setFormData({
      ...formData,
      customerId: customer._id,
      route: customer.route
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

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerId || !formData.vehicle || !formData.route) {
      alert('Please fill in all required fields (Customer and Vehicle)');
      return;
    }

    try {
      if (editingOrder) {
        await api.put(`/orders/${editingOrder._id}`, formData);
      } else {
        await api.post('/orders', formData);
      }

      setShowCreateForm(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save order');
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      date: new Date(order.date).toISOString().split('T')[0],
      customerId: order.customerId,
      route: order.route,
      vehicle: order.vehicle,
      standardQty: order.standardQty,
      premiumQty: order.premiumQty
    });
    const customer = customers.find(c => c._id === order.customerId);
    setSelectedCustomer(customer || null);
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      customerId: '',
      route: '',
      vehicle: '',
      standardQty: 0,
      premiumQty: 0
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleExportCSV = async () => {
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

  const uniqueExecutives = [...new Set(orders.map(o => o.salesExecutive))];

  // Filter customers based on search
  const filteredCustomers = customers
    .filter(c => {
      // For non-admin users, only show their own customers
      if (!isAdmin && user) {
        if (c.salesExecutive !== user.username) {
          return false;
        }
      }
      // Apply search filter
      return customerSearch === '' ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
    })
    .slice(0, 50); // Limit to 50 results for performance

  // Derived filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchDate = !filterDate || new Date(order.date).toISOString().split('T')[0] === filterDate;
    const matchRoute = filterRoute === 'all' || order.route === filterRoute;
    const matchExecutive = filterExecutive === 'all' || order.salesExecutive === filterExecutive;
    const matchVehicle = filterVehicle === 'all' || order.vehicle === filterVehicle;
    const matchSearch = !filterSearch ||
      order.customerName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      order.customerPhone.includes(filterSearch);

    return matchDate && matchRoute && matchExecutive && matchVehicle && matchSearch;
  });

  return (
    <Layout>
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Orders</h1>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto shadow-sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full sm:w-auto shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

        {/* Summary Cards - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#9E1216' }}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Orders</p>
                    <div className="text-2xl sm:text-3xl font-bold">{orders.length}</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-full">
                    <ShoppingCart className="h-5 w-5 text-[#9E1216]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#E07012' }}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Standard</p>
                    <div className="text-2xl sm:text-3xl font-bold text-[#E07012]">
                      {orders.reduce((sum, order) => sum + order.standardQty, 0)}
                    </div>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-full">
                    <Package className="h-5 w-5 text-[#E07012]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#FDBA6A' }}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Premium</p>
                    <div className="text-2xl sm:text-3xl font-bold text-[#FDBA6A]">
                      {orders.reduce((sum, order) => sum + order.premiumQty, 0)}
                    </div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded-full">
                    <Star className="h-5 w-5 text-[#FDBA6A]" />
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
                      ₹{orders.reduce((sum, order) => sum + order.total, 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-full">
                    <IndianRupee className="h-5 w-5 text-[#10B981]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <div className="space-y-1">
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

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Route</Label>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route._id} value={route.name}>{route.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
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

              <div className="space-y-1">
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

              <div className="space-y-1 sm:col-span-2 lg:col-span-4 xl:col-span-1">
                <Label htmlFor="search" className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Input
                    id="search"
                    type="text"
                    value={filterSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterSearch(e.target.value)}
                    placeholder="Customer or Phone..."
                    className="pl-9"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Order Dialog */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh] p-4 sm:p-6 gap-0">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
              <DialogClose onClose={() => {
                setShowCreateForm(false);
                setEditingOrder(null);
                resetForm();
              }} />
            </DialogHeader>

            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-base font-medium">Order Date</Label>
                <div className="relative">
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="pl-10 h-12 text-base shadow-sm"
                  />
                  <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Customer Selection */}
              <div className="space-y-2 relative z-20">
                <Label htmlFor="customer" className="text-base font-medium">Customer</Label>
                <div className="relative">
                  <Input
                    id="customer"
                    type="text"
                    placeholder="Search name, phone, or route..."
                    value={customerSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      if (!e.target.value) {
                        setSelectedCustomer(null);
                        setFormData({ ...formData, customerId: '' });
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    required
                    autoComplete="off"
                    className="pl-10 h-12 text-base shadow-sm"
                  />
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />

                  {/* Clear Button */}
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch('');
                        setSelectedCustomer(null);
                        setFormData({ ...formData, customerId: '' });
                      }}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-2xl max-h-[40vh] overflow-y-auto ring-1 ring-black/5">
                    {filteredCustomers.length > 0 ? (
                      <div className="py-1">
                        {filteredCustomers.map(customer => (
                          <button
                            key={customer._id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-primary/5 focus:bg-primary/5 focus:outline-none border-b last:border-0 transition-colors group"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-semibold text-gray-900 group-hover:text-primary">{customer.name}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap items-center mt-1 gap-y-1">
                              <span className="flex items-center mr-3">
                                <Phone className="h-3 w-3 mr-1" /> {customer.phone}
                              </span>
                              <span className="flex items-center mr-3">
                                <MapPin className="h-3 w-3 mr-1" /> {customer.route}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>No customers found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="rounded-xl border bg-gray-50/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start p-3 bg-white rounded-lg border shadow-sm">
                      <MapPin className="h-5 w-5 mr-3 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Route</p>
                        <p className="text-gray-600">{selectedCustomer.route}</p>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-white rounded-lg border shadow-sm">
                      <User className="h-5 w-5 mr-3 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Executive</p>
                        <p className="text-gray-600">{selectedCustomer.salesExecutive}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">Delivery Vehicle</Label>
                    <Select
                      value={formData.vehicle}
                      onValueChange={(value: string) => setFormData({ ...formData, vehicle: value })}
                      required
                    >
                      <SelectTrigger className="h-12 bg-white">
                        <SelectValue placeholder="Select Vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLES.map((vehicle: string) => (
                          <SelectItem key={vehicle} value={vehicle}>
                            <div className="flex items-center">
                              <Truck className="h-4 w-4 mr-2" />
                              {vehicle}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-white rounded-xl border p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <h3 className="font-semibold text-gray-900">Order Items</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Unit Prices: ₹{selectedCustomer.greenPrice} / ₹{selectedCustomer.orangePrice}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="standardQty" className="text-green-700 font-bold">Standard</Label>
                          <span className="text-xs font-mono text-green-700">₹{totals.standardTotal.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                          <Input
                            id="standardQty"
                            type="number"
                            min="0"
                            className="h-12 text-lg font-bold border-green-200 focus-visible:ring-green-500 pr-12"
                            value={formData.standardQty === 0 ? '' : formData.standardQty}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, standardQty: parseFloat(e.target.value) || 0 })}
                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-3.5 text-sm font-medium text-green-600">Qty</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="premiumQty" className="text-orange-700 font-bold">Premium</Label>
                          <span className="text-xs font-mono text-orange-700">₹{totals.premiumTotal.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                          <Input
                            id="premiumQty"
                            type="number"
                            min="0"
                            className="h-12 text-lg font-bold border-orange-200 focus-visible:ring-orange-500 pr-12"
                            value={formData.premiumQty === 0 ? '' : formData.premiumQty}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, premiumQty: parseFloat(e.target.value) || 0 })}
                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-3.5 text-sm font-medium text-orange-600">Qty</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t mt-2 flex justify-between items-center bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl">
                      <span className="text-sm font-medium text-gray-500">Order Total</span>
                      <span className="text-2xl font-bold text-gray-900">₹{totals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-2 sticky bottom-0 bg-white pb-2 sm:static">
                    <Button type="submit" size="lg" className="w-full text-base font-semibold shadow-md active:scale-[0.98] transition-all">
                      {editingOrder ? 'Update Order' : 'Create Order'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </DialogContent>
        </Dialog>

        {/* Mobile: Card View */}
        < div className="md:hidden space-y-4" >
          <div className="text-sm text-muted-foreground font-medium px-1">
            Showing {filteredOrders.length} orders
          </div>
          {
            filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <Card key={order._id} className="overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-base">{order.customerName}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-lg text-emerald-600">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-md mb-3 border">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 flex items-center"><MapPin className="h-3 w-3 mr-1" /> Route</div>
                        <div className="font-medium">{order.route}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 flex items-center"><Truck className="h-3 w-3 mr-1" /> Vehicle</div>
                        <div className="font-medium">{order.vehicle}</div>
                      </div>
                      <div className="col-span-2 pt-2 border-t mt-1">
                        <div className="text-xs text-gray-500 flex items-center"><User className="h-3 w-3 mr-1" /> Sales Executive</div>
                        <div className="font-medium">
                          {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm px-1">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-xs text-gray-500 uppercase">Standard</span>
                          <p className="font-semibold text-green-700">{order.standardQty}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase">Premium</span>
                          <p className="font-semibold text-orange-700">{order.premiumQty}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} className="h-8">
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <p className="text-muted-foreground">No orders found matching your filters</p>
              </div>
            )
          }
        </div >

        {/* Desktop: Table View */}
        < Card className="hidden md:block shadow-sm" >
          <CardHeader className="py-4 border-b bg-gray-50/40">
            <CardTitle className="text-lg">Order List <span className="text-sm font-normal text-muted-foreground ml-2">({filteredOrders.length} records)</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="text-left px-4 py-3 w-[100px]">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Executive</th>
                    <th className="text-left px-4 py-3">Vehicle</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-right px-4 py-3 text-green-700">Std Qty</th>
                    <th className="text-right px-4 py-3 text-orange-700">Prem Qty</th>
                    <th className="text-right px-4 py-3">Total</th>
                    {isAdmin && <th className="text-left px-4 py-3">Created By</th>}
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
                        <td className="px-4 py-3 font-medium text-gray-900">{order.customerName}</td>
                        <td className="px-4 py-3 text-gray-600">{order.route}</td>
                        <td className="px-4 py-3 text-gray-600 w-[140px] truncate">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold border">
                              {order.salesExecutive.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[100px]" title={salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive}>
                              {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 w-[100px] truncate">{order.vehicle}</td>
                        <td className="px-4 py-3 text-gray-600">{order.customerPhone}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{order.standardQty}</td>
                        <td className="px-4 py-3 text-right font-medium text-orange-700">{order.premiumQty}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{order.total.toFixed(2)}</td>
                        {isAdmin && <td className="px-4 py-3 text-gray-500 text-xs">{order.createdByUsername}</td>}
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)} className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
                              <div className="sr-only">Edit</div>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil h-4 w-4 text-gray-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                            </Button>
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
        </Card >
      </div >
    </Layout >
  );
};

export default Orders;
