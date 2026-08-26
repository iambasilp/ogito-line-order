import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import type { Freezer } from './Freezers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Edit, Trash2, Snowflake } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const FreezerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [freezer, setFreezer] = useState<Freezer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Freezer>>({});
  
  const [customersList, setCustomersList] = useState<{name: string, route?: any, salesExecutive?: string}[]>([]);
  const [routesList, setRoutesList] = useState<{name: string}[]>([]);
  const [salesUsers, setSalesUsers] = useState<{username: string, name: string}[]>([]);

  useEffect(() => {
    const fetchFreezer = async () => {
      try {
        const response = await api.get(`/freezers/${id}`);
        setFreezer(response.data);
        setFormData(response.data);
      } catch (error) {
        console.error('Failed to fetch freezer details:', error);
        alert('Freezer not found');
        navigate('/freezers');
      }
    };

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

    fetchFreezer();
    fetchDependencies();
  }, [id, navigate]);

  const handleSave = async () => {
    try {
      const response = await api.put(`/freezers/${id}`, formData);
      setFreezer(response.data);
      setFormData(response.data);
      setIsEditing(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update freezer');
    }
  };

  const handleRetire = async () => {
    if (window.confirm('Are you sure you want to retire this freezer? It will be marked as Retired.')) {
      try {
        await api.delete(`/freezers/${id}`);
        navigate('/freezers');
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to retire freezer');
      }
    }
  };

  if (!freezer) {
    return <Layout><div className="p-8 text-center">Loading...</div></Layout>;
  }

  const handleChange = (field: keyof Freezer, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-emerald-500 text-white';
      case 'In Stock': return 'bg-blue-500 text-white';
      case 'Under Repair': return 'bg-red-500 text-white';
      case 'Retired': return 'bg-gray-500 text-white';
      default: return 'bg-orange-500 text-white';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/freezers')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Snowflake className="h-6 w-6 text-blue-500" />
              {freezer.freezerId}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(freezer.status)}`}>
              {freezer.status}
            </span>
          </div>
          
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(freezer); }}>Cancel</Button>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Record
                  </Button>
                  <Button variant="destructive" onClick={handleRetire}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Retire Asset
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Specs */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                  {isEditing ? (
                    <Input value={formData.manufacturer || ''} onChange={(e) => handleChange('manufacturer', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.manufacturer || '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  {isEditing ? (
                    <Input value={formData.model || ''} onChange={(e) => handleChange('model', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.model || '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Serial Number</Label>
                  {isEditing ? (
                    <Input value={formData.serialNumber || ''} onChange={(e) => handleChange('serialNumber', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.serialNumber || '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Capacity (Litres)</Label>
                  {isEditing ? (
                    <Input type="number" value={formData.capacityLitres || ''} onChange={(e) => handleChange('capacityLitres', parseInt(e.target.value))} />
                  ) : (
                    <div className="font-medium">{freezer.capacityLitres ? `${freezer.capacityLitres} L` : '-'}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Assignment */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-blue-50/50 dark:bg-blue-950/20">
              <CardTitle className="text-lg text-blue-800 dark:text-blue-300">Current Assignment</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Customer Name</Label>
                  {isEditing ? (
                    <Select value={formData.customerName || ''} onValueChange={(val) => {
                      const cust = customersList.find(c => c.name === val);
                      setFormData({
                        ...formData, 
                        customerName: val,
                        area: cust?.route ? (typeof cust.route === 'string' ? cust.route : cust.route.name) : formData.area,
                        salesman: cust?.salesExecutive || formData.salesman
                      });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>
                        {customersList.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="font-medium">{freezer.customerName || 'Unassigned'}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Area</Label>
                    {isEditing ? (
                      <Select value={formData.area || ''} onValueChange={(val) => handleChange('area', val)}>
                        <SelectTrigger><SelectValue placeholder="Select Route" /></SelectTrigger>
                        <SelectContent>
                          {routesList.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="font-medium">{freezer.area || '-'}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Salesman</Label>
                    {isEditing ? (
                      <Select value={formData.salesman || ''} onValueChange={(val) => handleChange('salesman', val)}>
                        <SelectTrigger><SelectValue placeholder="Select Sales Exec" /></SelectTrigger>
                        <SelectContent>
                          {salesUsers.map(s => <SelectItem key={s.username} value={s.username}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="font-medium">{freezer.salesman || '-'}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Location Details</Label>
                    {isEditing ? (
                      <Input value={formData.location || ''} onChange={(e) => handleChange('location', e.target.value)} />
                    ) : (
                      <div className="font-medium">{freezer.location || '-'}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Installed Date</Label>
                    {isEditing ? (
                      <Input type="date" value={formData.installedDate ? formData.installedDate.split('T')[0] : ''} onChange={(e) => handleChange('installedDate', e.target.value)} />
                    ) : (
                      <div className="font-medium">{freezer.installedDate ? new Date(freezer.installedDate).toLocaleDateString() : '-'}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Service */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Status & Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  {isEditing ? (
                    <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Stock">In Stock</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Under Repair">Under Repair</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Transferred">Transferred</SelectItem>
                        <SelectItem value="Returned">Returned</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="font-medium">{freezer.status}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Condition</Label>
                  {isEditing ? (
                    <Select value={formData.condition} onValueChange={(val) => handleChange('condition', val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="font-medium">{freezer.condition}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Last Service</Label>
                  {isEditing ? (
                    <Input type="date" value={formData.lastServiceDate ? formData.lastServiceDate.split('T')[0] : ''} onChange={(e) => handleChange('lastServiceDate', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.lastServiceDate ? new Date(freezer.lastServiceDate).toLocaleDateString() : '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Next Service Due</Label>
                  {isEditing ? (
                    <Input type="date" value={formData.nextServiceDueDate ? formData.nextServiceDueDate.split('T')[0] : ''} onChange={(e) => handleChange('nextServiceDueDate', e.target.value)} />
                  ) : (
                    <div className="font-medium text-orange-600">{freezer.nextServiceDueDate ? new Date(freezer.nextServiceDueDate).toLocaleDateString() : '-'}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Details */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Purchase Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Purchase Cost</Label>
                  {isEditing ? (
                    <Input type="number" value={formData.purchaseCost || ''} onChange={(e) => handleChange('purchaseCost', parseInt(e.target.value))} />
                  ) : (
                    <div className="font-medium">{freezer.purchaseCost ? `₹${freezer.purchaseCost.toLocaleString()}` : '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  {isEditing ? (
                    <Input value={formData.supplier || ''} onChange={(e) => handleChange('supplier', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.supplier || '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Purchase Date</Label>
                  {isEditing ? (
                    <Input type="date" value={formData.purchaseDate ? formData.purchaseDate.split('T')[0] : ''} onChange={(e) => handleChange('purchaseDate', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.purchaseDate ? new Date(freezer.purchaseDate).toLocaleDateString() : '-'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Warranty Ends</Label>
                  {isEditing ? (
                    <Input type="date" value={formData.warrantyEndDate ? formData.warrantyEndDate.split('T')[0] : ''} onChange={(e) => handleChange('warrantyEndDate', e.target.value)} />
                  ) : (
                    <div className="font-medium">{freezer.warrantyEndDate ? new Date(freezer.warrantyEndDate).toLocaleDateString() : '-'}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commercial & Misc */}
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader className="pb-3 border-b bg-green-50/50 dark:bg-green-950/20">
              <CardTitle className="text-lg text-green-800 dark:text-green-300">Commercial & Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Average Monthly Sales</Label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">₹</span>
                      <Input type="number" className="pl-8" value={formData.averageMonthlySales || ''} onChange={(e) => handleChange('averageMonthlySales', parseInt(e.target.value))} />
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                      ₹{freezer.averageMonthlySales ? freezer.averageMonthlySales.toLocaleString() : '0'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Remarks / Notes</Label>
                  {isEditing ? (
                    <Input value={formData.remarks || ''} onChange={(e) => handleChange('remarks', e.target.value)} placeholder="Add internal notes..." />
                  ) : (
                    <div className="font-medium italic text-muted-foreground">{freezer.remarks || 'No remarks added.'}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
};

export default FreezerDetail;
