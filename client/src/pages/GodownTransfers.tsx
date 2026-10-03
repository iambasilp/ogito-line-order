import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '@/lib/api';
import type { GodownTransfer, Godown } from '../types/godown';
import { Plus, Check, Truck, Clock, ShieldAlert, Lock, Settings, Trash2, Search, Download, Calendar, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GodownTransfers: React.FC = () => {
  const { isAdmin } = useAuth();
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [transfers, setTransfers] = useState<GodownTransfer[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newGodownName, setNewGodownName] = useState('');
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterGodown, setFilterGodown] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    driverName: '',
    source: '',
    destination: '',
    product: 'Standard',
    quantity: 0,
    dispatchTime: new Date().toISOString().substring(0, 16),
    status: 'Dispatched',
    deliveryTime: ''
  });

  useEffect(() => {
    if (godowns.length > 0 && !formData.source) {
      setFormData(prev => ({ ...prev, source: godowns[0].name }));
    }
  }, [godowns]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '483444') {
      setIsAuthenticated(true);
      fetchTransfers(password);
      fetchGodowns(password);
    } else {
      alert('Invalid password');
      setPassword('');
    }
  };

  const fetchTransfers = async (authPwd = password) => {
    try {
      setLoading(true);
      const res = await api.get('/godown-transfers', {
        headers: { 'x-godown-password': authPwd }
      });
      setTransfers(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
      }
      console.error('Failed to fetch transfers', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGodowns = async (authPwd = password) => {
    try {
      const res = await api.get('/godown-transfers/locations', {
        headers: { 'x-godown-password': authPwd }
      });
      setGodowns(res.data);
    } catch (error) {
      console.error('Failed to fetch godowns', error);
    }
  };

  const handleAddGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGodownName.trim()) return;
    try {
      await api.post('/godown-transfers/locations', { name: newGodownName }, {
        headers: { 'x-godown-password': password }
      });
      setNewGodownName('');
      fetchGodowns();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add godown');
    }
  };

  const handleDeleteGodown = async (id: string) => {
    if (!window.confirm('Delete this Godown?')) return;
    try {
      await api.delete(`/godown-transfers/locations/${id}`, {
        headers: { 'x-godown-password': password }
      });
      fetchGodowns();
    } catch (error: any) {
      alert('Failed to delete godown');
    }
  };

  const handleEditTransfer = (tr: GodownTransfer) => {
    setFormData({
      date: new Date(tr.date).toISOString().split('T')[0],
      vehicleNumber: tr.vehicleNumber,
      driverName: tr.driverName || '',
      source: tr.source,
      destination: tr.destination,
      product: tr.product,
      quantity: tr.quantity,
      dispatchTime: new Date(tr.dispatchTime).toISOString().substring(0, 16),
      status: tr.status,
      deliveryTime: tr.deliveryTime ? new Date(tr.deliveryTime).toISOString().substring(0, 16) : ''
    });
    setEditingTransferId(tr._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        dispatchTime: new Date(formData.dispatchTime)
      };
      
      if (formData.status === 'Delivered' && formData.deliveryTime) {
        payload.deliveryTime = new Date(formData.deliveryTime);
      }
      
      if (editingTransferId) {
        await api.put(`/godown-transfers/${editingTransferId}`, payload, {
          headers: { 'x-godown-password': password }
        });
      } else {
        await api.post('/godown-transfers', payload, {
          headers: { 'x-godown-password': password }
        });
      }
      
      setShowForm(false);
      setEditingTransferId(null);
      fetchTransfers();
      
      setFormData(prev => ({
        ...prev,
        vehicleNumber: '',
        driverName: '',
        quantity: 0,
        status: 'Dispatched',
        deliveryTime: ''
      }));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create transfer');
    }
  };

  const updateStatus = async (id: string, status: 'Delivered' | 'Cancelled') => {
    if (!window.confirm(`Mark as ${status}?`)) return;
    try {
      await api.put(`/godown-transfers/${id}`, {
        status,
        ...(status === 'Delivered' ? { deliveryTime: new Date() } : {})
      }, {
        headers: { 'x-godown-password': password }
      });
      fetchTransfers();
    } catch (error: any) {
      alert(`Failed to mark ${status}`);
    }
  };

  // Derived state
  const filteredTransfers = useMemo(() => {
    return transfers.filter(tr => {
      const matchSearch = (tr.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (tr.driverName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchDate = filterDate ? new Date(tr.date).toISOString().split('T')[0] === filterDate : true;
      const matchGodown = filterGodown ? tr.source === filterGodown || tr.destination === filterGodown : true;
      return matchSearch && matchDate && matchGodown;
    });
  }, [transfers, searchQuery, filterDate, filterGodown]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTransfers = transfers.filter(tr => new Date(tr.date).toISOString().split('T')[0] === todayStr);
    
    return {
      totalToday: todayTransfers.length,
      inTransit: transfers.filter(tr => tr.status === 'Dispatched').length,
      deliveredToday: todayTransfers.filter(tr => tr.status === 'Delivered').length,
      boxesToday: todayTransfers.filter(tr => tr.status !== 'Cancelled').reduce((sum, tr) => sum + tr.quantity, 0)
    };
  }, [transfers]);

  const handleExportCSV = () => {
    if (filteredTransfers.length === 0) return alert("No data to export");
    const headers = ['Date', 'Dispatch Time', 'Delivery Time', 'Source', 'Destination', 'Vehicle No', 'Driver', 'Product', 'Quantity', 'Status'];
    
    const rows = filteredTransfers.map(tr => [
      new Date(tr.date).toLocaleDateString(),
      new Date(tr.dispatchTime).toLocaleTimeString(),
      tr.deliveryTime ? new Date(tr.deliveryTime).toLocaleTimeString() : '',
      `"${tr.source}"`,
      `"${tr.destination}"`,
      `"${tr.vehicleNumber}"`,
      `"${tr.driverName || ''}"`,
      tr.product,
      tr.quantity,
      tr.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `godown_transfers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center text-red-500 flex-col gap-4">
          <ShieldAlert className="w-16 h-16" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Godown Access</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Enter the secure PIN to access godown transfers.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full text-center tracking-widest text-xl font-bold border-2 focus:border-primary rounded-lg px-3 py-3 outline-none"
                  autoFocus
                />
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-md">
                  VERIFY ACCESS
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Godown Transfers</h1>
            <p className="text-muted-foreground mt-1">Track dispatch and delivery across branches.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium flex items-center gap-2 hover:bg-secondary/80 transition-colors">
              <Settings className="w-4 h-4" /> Manage Godowns
            </button>
            <button onClick={() => {
              setFormData({
                date: new Date().toISOString().split('T')[0],
                vehicleNumber: '',
                driverName: '',
                source: godowns.length > 0 ? godowns[0].name : '',
                destination: '',
                product: 'Standard',
                quantity: 0,
                dispatchTime: new Date().toISOString().substring(0, 16),
                status: 'Dispatched',
                deliveryTime: ''
              });
              setEditingTransferId(null);
              setShowForm(true);
            }} className="flex-1 sm:flex-none bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Dispatch
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dispatched Today</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalToday}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full"><Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active In Transit</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.inTransit}</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full"><Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered Today</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.deliveredToday}</p>
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full"><Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Boxes Moved (Today)</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.boxesToday}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full"><TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar (Filters & Search & Export) */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search Vehicle or Driver..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="relative flex-1 md:max-w-[160px]">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="date" 
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary transition-all text-muted-foreground"
              />
            </div>
            <select 
              value={filterGodown}
              onChange={e => setFilterGodown(e.target.value)}
              className="px-3 py-2 bg-background border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary transition-all flex-1 md:max-w-[180px]"
            >
              <option value="">All Godowns</option>
              {godowns.map(g => <option key={g._id} value={g.name}>{g.name}</option>)}
            </select>
            {(searchQuery || filterDate || filterGodown) && (
              <button 
                onClick={() => { setSearchQuery(''); setFilterDate(''); setFilterGodown(''); }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-4"
              >
                Clear
              </button>
            )}
          </div>
          <button 
            onClick={handleExportCSV}
            className="w-full md:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-sm font-bold inline-flex justify-center items-center gap-2 transition-all dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Manage Godowns Dropdown */}
        {showSettings && (
          <Card className="animate-in slide-in-from-top-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3 border-b border-primary/10">
              <CardTitle className="text-lg">Godown Master Data</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddGodown} className="flex gap-3 mb-6 max-w-md">
                <input 
                  type="text" 
                  value={newGodownName} 
                  onChange={e => setNewGodownName(e.target.value)} 
                  placeholder="Enter Godown Name (e.g., Main Warehouse)" 
                  className="flex-1 border border-primary/20 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
                  required
                />
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">Add</button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {godowns.map(g => (
                  <div key={g._id} className="flex items-center justify-between bg-background p-3 rounded-lg border shadow-sm">
                    <span className="font-medium text-sm truncate pr-2 text-foreground">{g.name}</span>
                    <button onClick={() => handleDeleteGodown(g._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {godowns.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No godowns configured. Add one above.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dispatch Form Dropdown */}
        {showForm && (
          <Card className="animate-in slide-in-from-top-2 shadow-lg border-primary/30 relative overflow-hidden mb-6">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle>{editingTransferId ? 'Edit Dispatch Entry' : 'Create New Dispatch Entry'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Dispatch Time</label>
                  <input type="datetime-local" required value={formData.dispatchTime} onChange={e => setFormData({...formData, dispatchTime: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Vehicle No.</label>
                  <input type="text" required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full border rounded-md p-2 bg-background uppercase focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. KL-10-AB-1234" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Driver Name</label>
                  <input type="text" required value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="Enter driver name" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Product</label>
                  <select required value={formData.product} onChange={e => setFormData({...formData, product: e.target.value as any})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Alhaj">Alhaj</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Quantity (Boxes)</label>
                  <input type="number" required min="1" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Source Location</label>
                  <select required value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                    <option value="">-- Select Source --</option>
                    {godowns.map(g => <option key={g._id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Destination</label>
                  <select required value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                    <option value="">-- Select Destination --</option>
                    {godowns.filter(g => g.name !== formData.source).map(g => <option key={g._id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                
                {editingTransferId && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Status</label>
                      <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                        <option value="Dispatched">Dispatched</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    {formData.status === 'Delivered' && (
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Delivery Time</label>
                        <input type="datetime-local" required value={formData.deliveryTime} onChange={e => setFormData({...formData, deliveryTime: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                      </div>
                    )}
                  </>
                )}
                
                <div className="col-span-full flex justify-end gap-3 mt-4 border-t pt-5">
                  <button type="button" onClick={() => { setShowForm(false); setEditingTransferId(null); }} className="px-5 py-2.5 border border-input bg-background hover:bg-muted text-foreground rounded-md font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
                    <Truck className="w-4 h-4"/> {editingTransferId ? 'Save Changes' : 'Confirm Dispatch'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card className="shadow-sm border-0 ring-1 ring-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/80 text-muted-foreground uppercase text-[11px] font-bold tracking-widest border-b">
                <tr>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4">Route</th>
                  <th className="px-5 py-4">Transport</th>
                  <th className="px-5 py-4">Load</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16 text-muted-foreground font-medium">Loading transfers...</td></tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground font-medium">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="w-10 h-10 opacity-20" /> 
                        {transfers.length === 0 ? "No transfers recorded yet." : "No transfers match your filters."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map(tr => (
                    <tr key={tr._id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{new Date(tr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                          <Clock className="w-3 h-3 opacity-70" /> {new Date(tr.dispatchTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 text-[13px]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                            <span className="font-medium text-foreground truncate max-w-[150px]">{tr.source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                            <span className="font-medium text-foreground truncate max-w-[150px]">{tr.destination}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono bg-secondary/50 text-secondary-foreground px-2 py-1 rounded inline-block text-[11px] border font-bold uppercase tracking-wider">{tr.vehicleNumber}</div>
                        <div className="text-[12px] text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                           {tr.driverName || 'Unknown Driver'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground text-sm">{tr.quantity} <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider ml-0.5">boxes</span></div>
                        <div className="text-[10px] font-bold text-primary mt-1 uppercase tracking-wider bg-primary/10 border border-primary/20 inline-block px-1.5 py-0.5 rounded">{tr.product}</div>
                      </td>
                      <td className="px-5 py-4">
                        {tr.status === 'Dispatched' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mr-1.5 animate-pulse"></span> IN TRANSIT
                          </span>
                        ) : tr.status === 'Delivered' ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 shadow-sm">
                              <Check className="w-3 h-3 mr-1" /> DELIVERED
                            </span>
                            {tr.deliveryTime && (
                              <span className="text-[10px] text-muted-foreground font-medium ml-1">
                                {new Date(tr.deliveryTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 shadow-sm">
                            <XCircle className="w-3 h-3 mr-1" /> CANCELLED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditTransfer(tr)}
                            title="Edit Dispatch"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm border border-blue-200 p-2 rounded-md transition-all dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50 dark:hover:bg-blue-900/40"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          
                          {tr.status === 'Dispatched' && (
                            <>
                              <button 
                                onClick={() => updateStatus(tr._id, 'Delivered')}
                                title="Mark as Delivered"
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm border border-emerald-200 p-2 rounded-md transition-all dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/40"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => updateStatus(tr._id, 'Cancelled')}
                                title="Cancel Dispatch"
                                className="bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-sm border border-red-200 p-2 rounded-md transition-all dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/40"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
    </Layout>
  );
};

export default GodownTransfers;
