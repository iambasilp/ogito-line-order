import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer, Order } from '@/types';
import { VEHICLES } from '@/types';
import { Plus, Download, Filter } from 'lucide-react';

interface SalesUser {
  _id: string;
  username: string;
  name: string;
}

const Orders: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
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

  const uniqueRoutes = [...new Set(orders.map(o => o.route))];
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">📋 Orders</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

        {/* Summary Cards - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4" style={{borderLeftColor: '#9E1216'}}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ORDERS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{orders.length}</div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4" style={{borderLeftColor: '#E07012'}}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">STANDARD QTY</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{color: '#E07012'}}>
                  {orders.reduce((sum, order) => sum + order.standardQty, 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4" style={{borderLeftColor: '#FDBA6A'}}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">PREMIUM QTY</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{color: '#FDBA6A'}}>
                  {orders.reduce((sum, order) => sum + order.premiumQty, 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4" style={{borderLeftColor: '#10B981'}}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL PRICE</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{color: '#10B981'}}>
                  ₹{orders.reduce((sum, order) => sum + order.total, 0).toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              <Input
                type="date"
                value={filterDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                placeholder="Date"
              />
              <Select value={filterRoute} onValueChange={setFilterRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="All Routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {uniqueRoutes.map(route => (
                    <SelectItem key={route} value={route}>{route}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Input
                type="text"
                value={filterSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterSearch(e.target.value)}
                placeholder="Search customer/phone"
              />
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Order Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingOrder ? 'Edit Order' : 'New Order'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="customer">Customer</Label>
                    <Input
                      id="customer"
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (!e.target.value) {
                          setSelectedCustomer(null);
                          setFormData({...formData, customerId: ''});
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      required
                      autoComplete="off"
                    />
                    {showCustomerDropdown && customerSearch && (
                      <div className="customer-dropdown absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => (
                            <button
                              key={customer._id}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.phone} • {customer.route}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500">No customers found</div>
                        )}
                        {customers.length > 50 && filteredCustomers.length === 50 && (
                          <div className="px-4 py-2 text-xs text-gray-400 border-t">
                            Showing first 50 results. Type more to narrow down.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedCustomer && (
                    <>
                      <div className="space-y-2">
                        <Label>Route</Label>
                        <Input value={selectedCustomer.route} disabled />
                      </div>

                      {isAdmin && (
                        <div className="space-y-2">
                          <Label>Sales Executive</Label>
                          <Input value={selectedCustomer.salesExecutive} disabled />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={selectedCustomer.phone} disabled />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vehicle">Vehicle</Label>
                        <Select value={formData.vehicle} onValueChange={(value: string) => setFormData({...formData, vehicle: value})} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {VEHICLES.map((vehicle: string) => (
                              <SelectItem key={vehicle} value={vehicle}>{vehicle}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="standardQty">Standard Qty (₹{selectedCustomer.greenPrice}/unit)</Label>
                        <Input
                          id="standardQty"
                          type="number"
                          min="0"
                          value={formData.standardQty}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, standardQty: parseFloat(e.target.value) || 0})}
                        />
                        <p className="text-sm text-muted-foreground">Total: ₹{totals.standardTotal.toFixed(2)}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="premiumQty">Premium Qty (₹{selectedCustomer.orangePrice}/unit)</Label>
                        <Input
                          id="premiumQty"
                          type="number"
                          min="0"
                          value={formData.premiumQty}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, premiumQty: parseFloat(e.target.value) || 0})}
                        />
                        <p className="text-sm text-muted-foreground">Total: ₹{totals.premiumTotal.toFixed(2)}</p>
                      </div>
                    </>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="bg-primary/10 p-4 rounded-md">
                    <p className="text-lg font-semibold">Total: ₹{totals.total.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Including GST</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={!selectedCustomer}>
                    {editingOrder ? 'Update Order' : 'Submit Order'}
                  </Button>
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
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs sm:text-sm">Date</th>
                    <th className="text-left p-2 text-xs sm:text-sm">Customer</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden md:table-cell">Route</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden lg:table-cell">Sales Exec</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden lg:table-cell">Vehicle</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden sm:table-cell">Phone</th>
                    <th className="text-right p-2 text-xs sm:text-sm">Std Qty</th>
                    <th className="text-right p-2 text-xs sm:text-sm">Prem Qty</th>
                    <th className="text-right p-2 text-xs sm:text-sm">Total</th>
                    {isAdmin && <th className="text-left p-2 text-xs sm:text-sm hidden xl:table-cell">Created By</th>}
                    {isAdmin && <th className="text-left p-2 text-xs sm:text-sm">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter(order => {
                      const matchDate = !filterDate || new Date(order.date).toISOString().split('T')[0] === filterDate;
                      const matchRoute = filterRoute === 'all' || order.route === filterRoute;
                      const matchExecutive = filterExecutive === 'all' || order.salesExecutive === filterExecutive;
                      const matchVehicle = filterVehicle === 'all' || order.vehicle === filterVehicle;
                      const matchSearch = !filterSearch || 
                        order.customerName.toLowerCase().includes(filterSearch.toLowerCase()) ||
                        order.customerPhone.includes(filterSearch);
                      
                      return matchDate && matchRoute && matchExecutive && matchVehicle && matchSearch;
                    })
                    .map(order => (
                    <tr key={order._id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-xs sm:text-sm">{new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</td>
                      <td className="p-2 text-xs sm:text-sm">{order.customerName}</td>
                      <td className="p-2 text-xs sm:text-sm hidden md:table-cell">{order.route}</td>
                      <td className="p-2 text-xs sm:text-sm hidden lg:table-cell">
                        {salesUsers.find((u: SalesUser) => u.username === order.salesExecutive)?.name || order.salesExecutive}
                      </td>
                      <td className="p-2 text-xs sm:text-sm hidden lg:table-cell">{order.vehicle}</td>
                      <td className="p-2 text-xs sm:text-sm hidden sm:table-cell">{order.customerPhone}</td>
                      <td className="p-2 text-right text-xs sm:text-sm">{order.standardQty}</td>
                      <td className="p-2 text-right text-xs sm:text-sm">{order.premiumQty}</td>
                      <td className="p-2 text-right font-semibold text-xs sm:text-sm">₹{order.total.toFixed(2)}</td>
                      {isAdmin && <td className="p-2 text-xs sm:text-sm hidden xl:table-cell">{order.createdByUsername}</td>}
                      {isAdmin && (
                        <td className="p-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} className="text-xs">
                            Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No orders found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Orders;
