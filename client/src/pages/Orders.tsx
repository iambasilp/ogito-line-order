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

const Orders: React.FC = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    vehicle: '',
    standardQty: 0,
    premiumQty: 0
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [filterDate, filterRoute, filterExecutive, filterVehicle, filterSearch]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterRoute) params.append('route', filterRoute);
      if (filterExecutive) params.append('salesExecutive', filterExecutive);
      if (filterVehicle) params.append('vehicle', filterVehicle);
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

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setFormData({
        ...formData,
        customerId: customer._id
      });
    }
  };

  const calculateTotals = () => {
    if (!selectedCustomer) return { standardTotal: 0, premiumTotal: 0, total: 0 };
    
    const standardTotal = formData.standardQty * selectedCustomer.greenPrice;
    const premiumTotal = formData.premiumQty * selectedCustomer.orangePrice;
    const total = standardTotal + premiumTotal;
    
    return { standardTotal, premiumTotal, total };
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      vehicle: '',
      standardQty: 0,
      premiumQty: 0
    });
    setSelectedCustomer(null);
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterRoute) params.append('route', filterRoute);
      if (filterExecutive) params.append('salesExecutive', filterExecutive);
      if (filterVehicle) params.append('vehicle', filterVehicle);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Daily Orders</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              + New Order
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select value={formData.customerId} onValueChange={handleCustomerSelect} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer._id} value={customer._id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomer && (
                    <>
                      <div className="space-y-2">
                        <Label>Route</Label>
                        <Input value={selectedCustomer.route} disabled />
                      </div>

                      <div className="space-y-2">
                        <Label>Sales Executive</Label>
                        <Input value={selectedCustomer.salesExecutive} disabled />
                      </div>

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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Route</th>
                    <th className="text-left p-2">Sales Exec</th>
                    <th className="text-left p-2">Vehicle</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-right p-2">Std Qty</th>
                    <th className="text-right p-2">Prem Qty</th>
                    <th className="text-right p-2">Total</th>
                    {isAdmin && <th className="text-left p-2">Created By</th>}
                    {isAdmin && <th className="text-left p-2">Actions</th>}
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
                      <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="p-2">{order.customerName}</td>
                      <td className="p-2">{order.route}</td>
                      <td className="p-2">{order.salesExecutive}</td>
                      <td className="p-2">{order.vehicle}</td>
                      <td className="p-2">{order.customerPhone}</td>
                      <td className="p-2 text-right">{order.standardQty}</td>
                      <td className="p-2 text-right">{order.premiumQty}</td>
                      <td className="p-2 text-right font-semibold">₹{order.total.toFixed(2)}</td>
                      {isAdmin && <td className="p-2">{order.createdByUsername}</td>}
                      {isAdmin && (
                        <td className="p-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)}>
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
