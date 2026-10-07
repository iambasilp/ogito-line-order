import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Search, Snowflake } from 'lucide-react';
import api from '@/lib/api';

interface Freezer {
  _id: string;
  freezerId: string;
  model: string;
  capacity: number;
  serialNumber: string;
  purchaseDate: string;
  cost: number;
  condition: 'New' | 'Good' | 'Fair' | 'Needs Repair';
  status: 'In Stock' | 'Installed' | 'In Repair' | 'Scrapped';
  customerId?: any;
  route?: any;
  salesExecutive?: string;
  installedDate?: string;
  lastServiceDate?: string;
  avgMonthlySales?: number;
}

const FreezerMaster = () => {
  const [freezers, setFreezers] = useState<Freezer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Freezer>>({
    model: '',
    capacity: 0,
    serialNumber: '',
    purchaseDate: '',
    cost: 0,
    condition: 'New',
    status: 'In Stock',
    customerId: '',
    route: '',
    salesExecutive: '',
    installedDate: '',
    lastServiceDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [freezersRes, customersRes, routesRes, usersRes] = await Promise.all([
        api.get('/freezers'),
        api.get('/customers'),
        api.get('/routes'),
        api.get('/users')
      ]);
      setFreezers(freezersRes.data);
      setCustomers(customersRes.data.customers || []);
      setRoutes(routesRes.data);
      setSalesmen(usersRes.data.filter((u: any) => u.role === 'salesman'));
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (freezer?: Freezer) => {
    if (freezer) {
      setIsEdit(true);
      setCurrentId(freezer._id);
      setFormData({
        ...freezer,
        purchaseDate: freezer.purchaseDate ? freezer.purchaseDate.split('T')[0] : '',
        installedDate: freezer.installedDate ? freezer.installedDate.split('T')[0] : '',
        lastServiceDate: freezer.lastServiceDate ? freezer.lastServiceDate.split('T')[0] : '',
        customerId: freezer.customerId?._id || '',
        route: freezer.route?._id || ''
      });
    } else {
      setIsEdit(false);
      setCurrentId(null);
      setFormData({
        model: '',
        capacity: 0,
        serialNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        cost: 0,
        condition: 'New',
        status: 'In Stock',
        customerId: '',
        route: '',
        salesExecutive: '',
        installedDate: '',
        lastServiceDate: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.customerId || payload.customerId === 'none') delete payload.customerId;
      if (!payload.route || payload.route === 'none') delete payload.route;
      if (!payload.installedDate) delete payload.installedDate;
      if (!payload.lastServiceDate) delete payload.lastServiceDate;
      if (!payload.salesExecutive || payload.salesExecutive === 'none') delete payload.salesExecutive;

      if (isEdit && currentId) {
        await api.put(`/freezers/${currentId}`, payload);
      } else {
        await api.post('/freezers', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save freezer', error);
      alert('Failed to save freezer');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this freezer?')) {
      try {
        await api.delete(`/freezers/${id}`);
        fetchData();
      } catch (error) {
        console.error('Failed to delete freezer', error);
        alert('Failed to delete freezer');
      }
    }
  };

  const filteredFreezers = freezers.filter(f => 
    f.freezerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Snowflake className="h-6 w-6 text-blue-500" />
              Freezer Master
            </h1>
            <p className="text-muted-foreground mt-1">Manage company freezers, assignments, and statuses</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="sm:w-auto w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Freezer
          </Button>
        </div>

        {/* Dashboard Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Freezers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{freezers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Installed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {freezers.filter(f => f.status === 'Installed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {freezers.filter(f => f.status === 'In Stock').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Repair</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {freezers.filter(f => f.condition === 'Needs Repair' || f.status === 'In Repair').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-muted">
          <CardHeader className="py-4 px-6 border-b border-muted/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Freezer Inventory</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search freezers..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Freezer ID</th>
                  <th className="px-4 py-3 font-medium">Customer Name</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Serial No</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Sales Man</th>
                  <th className="px-4 py-3 font-medium text-center">Avg Sales (Qty)</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredFreezers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No freezers found</td>
                  </tr>
                ) : (
                  filteredFreezers.map((freezer) => (
                    <tr key={freezer._id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium">{freezer.freezerId}</td>
                      <td className="px-4 py-3">{freezer.customerId?.shopName || freezer.customerId?.name || '-'}</td>
                      <td className="px-4 py-3">{freezer.model}</td>
                      <td className="px-4 py-3">{freezer.capacity} L</td>
                      <td className="px-4 py-3 text-muted-foreground">{freezer.serialNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          freezer.status === 'Installed' ? 'bg-green-100 text-green-800' :
                          freezer.status === 'In Stock' ? 'bg-blue-100 text-blue-800' :
                          freezer.status === 'In Repair' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {freezer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          freezer.condition === 'Needs Repair' ? 'bg-red-100 text-red-800' :
                          freezer.condition === 'New' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {freezer.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3">{freezer.route?.name || '-'}</td>
                      <td className="px-4 py-3 capitalize">{freezer.salesExecutive || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold">{freezer.avgMonthlySales || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(freezer)}>
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(freezer._id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Freezer' : 'Add New Freezer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-2">
                <Label>Model *</Label>
                <Input required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="e.g. Blue Star 300L" />
              </div>
              <div className="space-y-2">
                <Label>Capacity (Litre) *</Label>
                <Input type="number" required value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
              </div>
              
              <div className="space-y-2">
                <Label>Serial Number *</Label>
                <Input required value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Cost (₹) *</Label>
                <Input type="number" required value={formData.cost || ''} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
              </div>

              <div className="space-y-2">
                <Label>Purchase Date *</Label>
                <Input type="date" required value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Installed">Installed</SelectItem>
                    <SelectItem value="In Repair">In Repair</SelectItem>
                    <SelectItem value="Scrapped">Scrapped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition *</Label>
                <Select value={formData.condition} onValueChange={(v: any) => setFormData({...formData, condition: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Linking */}
              <div className="space-y-2">
                <Label>Assigned Customer</Label>
                <Select value={formData.customerId || 'none'} onValueChange={v => setFormData({...formData, customerId: v === 'none' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.shopName || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Area / Route</Label>
                <Select value={formData.route || 'none'} onValueChange={v => setFormData({...formData, route: v === 'none' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select Area" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {routes.map(r => (
                      <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sales Man</Label>
                <Select value={formData.salesExecutive || 'none'} onValueChange={v => setFormData({...formData, salesExecutive: v === 'none' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select Salesman" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {salesmen.map(s => (
                      <SelectItem key={s._id} value={s.username}>{s.name || s.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Installed Date</Label>
                <Input type="date" value={formData.installedDate} onChange={e => setFormData({...formData, installedDate: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label>Last Service Date</Label>
                <Input type="date" value={formData.lastServiceDate} onChange={e => setFormData({...formData, lastServiceDate: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-border">
              <Button type="button" variant="outline" className="px-6" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="px-6">Save Freezer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FreezerMaster;
