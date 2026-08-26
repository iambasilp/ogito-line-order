import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Snowflake } from 'lucide-react';

export interface Freezer {
  _id: string;
  freezerId: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  capacityLitres?: number;
  purchaseDate?: string;
  purchaseCost?: number;
  supplier?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  customerName?: string;
  area?: string;
  location?: string;
  salesman?: string;
  installedDate?: string;
  condition: string;
  status: string;
  lastServiceDate?: string;
  nextServiceDueDate?: string;
  averageMonthlySales?: number;
  remarks?: string;
}

const Freezers: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isCeo } = useAuth();
  const [freezers, setFreezers] = useState<Freezer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  
  const [customersList, setCustomersList] = useState<{name: string, route?: any, salesExecutive?: string}[]>([]);
  const [routesList, setRoutesList] = useState<{name: string}[]>([]);
  const [salesUsers, setSalesUsers] = useState<{username: string, name: string}[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    serialNumber: '',
    manufacturer: '',
    model: '',
    capacityLitres: 0,
    customerName: '',
    area: '',
    salesman: '',
    condition: 'New',
    status: 'In Stock',
    purchaseDate: '',
    purchaseCost: 0,
    installedDate: '',
    lastServiceDate: '',
    averageMonthlySales: 0
  });

  const fetchDependencies = async () => {
    try {
      const [custRes, routeRes, usersRes] = await Promise.all([
        api.get('/customers?limit=1000'),
        api.get('/routes'),
        api.get('/users/sales')
      ]);
      setCustomersList(custRes.data.customers || []);
      setRoutesList(routeRes.data || []);
      setSalesUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  const fetchFreezers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCondition !== 'all') params.append('condition', filterCondition);
      
      const response = await api.get(`/freezers?${params.toString()}`);
      setFreezers(response.data);
    } catch (error) {
      console.error('Failed to fetch freezers:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFreezers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus, filterCondition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/freezers', formData);
      setShowForm(false);
      setFormData({
        serialNumber: '',
        manufacturer: '',
        model: '',
        capacityLitres: 0,
        customerName: '',
        area: '',
        salesman: '',
        condition: 'New',
        status: 'In Stock',
        purchaseDate: '',
        purchaseCost: 0,
        installedDate: '',
        lastServiceDate: '',
        averageMonthlySales: 0
      });
      fetchFreezers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create freezer');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Stock': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Under Repair': return 'bg-red-100 text-red-800 border-red-200';
      case 'Retired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  return (
    <Layout fullWidth>
      <div className="space-y-6 w-full max-w-[1600px] px-2 mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Snowflake className="h-8 w-8 text-blue-500" />
              Freezer Master
            </h1>
            <p className="text-muted-foreground mt-1">Manage company freezer assets</p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by ID, Serial, Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full bg-card shadow-sm"
              />
            </div>
            {(isAdmin || isCeo) && (
              <Button onClick={() => setShowForm(true)} className="whitespace-nowrap shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Freezer
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Under Repair">Under Repair</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Transferred">Transferred</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Condition</Label>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="All Conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table View */}
        <Card className="hidden md:block shadow-sm">
          <CardHeader className="py-4 border-b border-border bg-muted/20">
            <CardTitle className="text-lg">Freezer Database <span className="text-sm font-normal text-muted-foreground ml-2">({freezers.length} assets)</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Freezer ID</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-right">Capacity (Litre)</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3">Purchase Date</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Sales man</th>
                    <th className="px-4 py-3">Installed Date</th>
                    <th className="px-4 py-3">Last Service Date</th>
                    <th className="px-4 py-3 text-right">Avg Monthly Sales</th>
                    <th className="px-4 py-3 text-right sticky right-0 bg-card shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {freezers.map((freezer) => (
                    <tr key={freezer._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{freezer.customerName || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{freezer.freezerId}</td>
                      <td className="px-4 py-3">{freezer.model || '-'}</td>
                      <td className="px-4 py-3 text-right">{freezer.capacityLitres ? `${freezer.capacityLitres} L` : '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{freezer.serialNumber || '-'}</td>
                      <td className="px-4 py-3">{freezer.purchaseDate ? new Date(freezer.purchaseDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-right">{freezer.purchaseCost ? `₹${freezer.purchaseCost}` : '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{freezer.condition}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(freezer.status)}`}>
                          {freezer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{freezer.area || '-'}</td>
                      <td className="px-4 py-3">{freezer.salesman || '-'}</td>
                      <td className="px-4 py-3">{freezer.installedDate ? new Date(freezer.installedDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">{freezer.lastServiceDate ? new Date(freezer.lastServiceDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {freezer.averageMonthlySales ? `₹${freezer.averageMonthlySales.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right sticky right-0 bg-card shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/freezers/${freezer.freezerId}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {freezers.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-4 py-8 text-center text-muted-foreground">
                        No freezers found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {freezers.map((freezer) => (
            <Card key={freezer._id} className="shadow-sm border-border bg-card">
              <CardContent className="p-4" onClick={() => navigate(`/freezers/${freezer.freezerId}`)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-blue-600">{freezer.freezerId}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(freezer.status)}`}>
                    {freezer.status}
                  </span>
                </div>
                <div className="text-sm font-medium">{freezer.customerName || 'Unassigned'}</div>
                <div className="text-xs text-muted-foreground mb-3">{freezer.model} • {freezer.serialNumber}</div>
                <Button className="w-full" variant="secondary" size="sm">View Details</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Freezer Modal */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Register New Freezer</DialogTitle>
              <p className="text-sm text-muted-foreground">A new unique Freezer ID will be generated automatically.</p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-3">
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2 border-b pb-1">
                    <h4 className="font-semibold text-sm">Identity & Specs</h4>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Manufacturer</Label>
                    <Input className="h-8" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} placeholder="e.g. Western" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input className="h-8" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} placeholder="e.g. SRC-300" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Serial Number</Label>
                    <Input className="h-8" value={formData.serialNumber} onChange={(e) => setFormData({...formData, serialNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Capacity (Litres)</Label>
                    <Input className="h-8" type="number" value={formData.capacityLitres || ''} onChange={(e) => setFormData({...formData, capacityLitres: parseInt(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-1 col-span-2 border-b pt-2 pb-1 mt-1">
                    <h4 className="font-semibold text-sm">Assignment & Financials</h4>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Customer Name</Label>
                    <Select value={formData.customerName} onValueChange={(val) => {
                      const cust = customersList.find(c => c.name === val);
                      setFormData({
                        ...formData, 
                        customerName: val,
                        area: cust?.route ? (typeof cust.route === 'string' ? cust.route : cust.route.name) : formData.area,
                        salesman: cust?.salesExecutive || formData.salesman
                      });
                    }}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>
                        {customersList.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Area / Route</Label>
                    <Select value={formData.area} onValueChange={(val) => setFormData({...formData, area: val})}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select Route" /></SelectTrigger>
                      <SelectContent>
                        {routesList.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sales Man</Label>
                    <Select value={formData.salesman} onValueChange={(val) => setFormData({...formData, salesman: val})}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select Sales Exec" /></SelectTrigger>
                      <SelectContent>
                        {salesUsers.map(s => <SelectItem key={s.username} value={s.username}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Installed Date</Label>
                    <Input className="h-8" type="date" value={formData.installedDate} onChange={(e) => setFormData({...formData, installedDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Purchase Cost (₹)</Label>
                    <Input className="h-8" type="number" value={formData.purchaseCost || ''} onChange={(e) => setFormData({...formData, purchaseCost: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Average Monthly Sales (₹)</Label>
                    <Input className="h-8" type="number" value={formData.averageMonthlySales || ''} onChange={(e) => setFormData({...formData, averageMonthlySales: parseInt(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-1 col-span-2 border-b pt-2 pb-1 mt-1">
                    <h4 className="font-semibold text-sm">Status & Condition</h4>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Stock">In Stock</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Under Repair">Under Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Condition</Label>
                    <Select value={formData.condition} onValueChange={(val) => setFormData({...formData, condition: val})}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Service Date</Label>
                    <Input className="h-8" type="date" value={formData.lastServiceDate} onChange={(e) => setFormData({...formData, lastServiceDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Purchase Date</Label>
                    <Input className="h-8" type="date" value={formData.purchaseDate} onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">Register Freezer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
};

export default Freezers;
