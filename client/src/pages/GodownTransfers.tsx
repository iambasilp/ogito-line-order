import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '@/lib/api';
import type { GodownTransfer, Godown } from '../types/godown';
import { Plus, Check, Truck, Clock, ShieldAlert, Lock, Settings, Trash2 } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    driverName: '',
    source: '',
    destination: '',
    product: 'Standard',
    quantity: 0,
    dispatchTime: new Date().toISOString().substring(0, 16)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/godown-transfers', {
        ...formData,
        dispatchTime: new Date(formData.dispatchTime)
      }, {
        headers: { 'x-godown-password': password }
      });
      setShowForm(false);
      fetchTransfers();
      
      setFormData(prev => ({
        ...prev,
        vehicleNumber: '',
        driverName: '',
        quantity: 0
      }));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create transfer');
    }
  };

  const markDelivered = async (id: string) => {
    if (!window.confirm('Mark as delivered?')) return;
    try {
      await api.put(`/godown-transfers/${id}`, {
        status: 'Delivered',
        deliveryTime: new Date()
      }, {
        headers: { 'x-godown-password': password }
      });
      fetchTransfers();
    } catch (error: any) {
      alert('Failed to mark delivered');
    }
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
          <Card className="w-full max-w-sm shadow-xl">
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
                  className="w-full text-center tracking-widest text-xl font-bold border-2 focus:border-primary rounded-lg px-3 py-3"
                  autoFocus
                />
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Godown Transfers</h1>
            <p className="text-muted-foreground mt-1">Track dispatch and delivery across branches.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium flex items-center gap-2 hover:bg-secondary/80 transition-colors">
              <Settings className="w-4 h-4" /> Manage Godowns
            </button>
            <button onClick={() => setShowForm(true)} className="flex-1 sm:flex-none bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Dispatch
            </button>
          </div>
        </div>

        {showSettings && (
          <Card className="mb-8 animate-in slide-in-from-top-4 border-primary/20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Manage Godown Locations</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddGodown} className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={newGodownName} 
                  onChange={e => setNewGodownName(e.target.value)} 
                  placeholder="Enter Godown Name (e.g., Godown 9)" 
                  className="flex-1 border rounded-md px-3 py-2"
                  required
                />
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md font-medium">Add Godown</button>
              </form>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {godowns.map(g => (
                  <div key={g._id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                    <span className="font-medium text-sm truncate pr-2">{g.name}</span>
                    <button onClick={() => handleDeleteGodown(g._id)} className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {godowns.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No godowns configured. Add one above.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="mb-8 animate-in slide-in-from-top-4 shadow-md border-primary/20">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle>Dispatch Entry Form</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Dispatch Time</label>
                  <input type="datetime-local" required value={formData.dispatchTime} onChange={e => setFormData({...formData, dispatchTime: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Vehicle No.</label>
                  <input type="text" required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full border rounded-md p-2 uppercase focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="e.g. KL-10-AB-1234" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Driver Name</label>
                  <input type="text" required value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="Enter driver name" />
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
                  <input type="number" required min="1" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground/90">Source Location</label>
                  <select required value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full border rounded-md p-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all">
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
                
                <div className="col-span-full flex justify-end gap-3 mt-4 border-t pt-5">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-input bg-background hover:bg-muted text-foreground rounded-md font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"><Truck className="w-4 h-4"/> Confirm Dispatch</button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm">
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/80 text-muted-foreground uppercase text-xs font-bold tracking-wider">
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
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground font-medium">Loading transfers...</td></tr>
                ) : transfers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground font-medium flex-col items-center justify-center flex gap-2"><Truck className="w-8 h-8 opacity-20" /> No transfers recorded yet.</td></tr>
                ) : (
                  transfers.map(tr => (
                    <tr key={tr._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{new Date(tr.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                          <Clock className="w-3 h-3 opacity-70" /> {new Date(tr.dispatchTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-[13px]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="font-medium text-foreground truncate max-w-[150px]">{tr.source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-medium text-foreground truncate max-w-[150px]">{tr.destination}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono bg-secondary/50 text-secondary-foreground px-2 py-1 rounded inline-block text-xs border font-bold uppercase tracking-wider">{tr.vehicleNumber}</div>
                        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <span className="font-medium">{tr.driverName || 'Unknown Driver'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground">{tr.quantity} <span className="text-muted-foreground font-normal text-xs uppercase tracking-wider">boxes</span></div>
                        <div className="text-[11px] font-bold text-primary mt-1 uppercase tracking-wider bg-primary/10 inline-block px-1.5 py-0.5 rounded">{tr.product}</div>
                      </td>
                      <td className="px-5 py-4">
                        {tr.status === 'Dispatched' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mr-1.5 animate-pulse"></span> IN TRANSIT
                          </span>
                        ) : tr.status === 'Delivered' ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                              <Check className="w-3 h-3 mr-1" /> DELIVERED
                            </span>
                            {tr.deliveryTime && (
                              <span className="text-[10px] text-muted-foreground font-medium ml-1">
                                {new Date(tr.deliveryTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                            CANCELLED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {tr.status === 'Dispatched' && (
                          <button 
                            onClick={() => markDelivered(tr._id)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm border border-emerald-200 px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/40"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Delivered
                          </button>
                        )}
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
