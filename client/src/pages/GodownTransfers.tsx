import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '@/lib/api';
import type { GodownTransfer } from '../types/godown';
import { Plus, Check, Truck, Clock, ShieldAlert, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GodownTransfers: React.FC = () => {
  const { isAdmin } = useAuth();
  
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [transfers, setTransfers] = useState<GodownTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    source: 'Production Cold Storage',
    destination: '',
    product: 'Standard',
    quantity: 0,
    dispatchTime: new Date().toISOString().substring(0, 16)
  });

  const godowns = [
    'Production Cold Storage',
    'Godown 1', 'Godown 2', 'Godown 3', 'Godown 4',
    'Godown 5', 'Godown 6', 'Godown 7', 'Godown 8'
  ];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '483444') {
      setIsAuthenticated(true);
      fetchTransfers(password);
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
      
      // Reset form partially
      setFormData(prev => ({
        ...prev,
        vehicleNumber: '',
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
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Godown Access</CardTitle>
              <p className="text-sm text-muted-foreground">Enter the secure PIN to access godown transfers.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full text-center tracking-widest text-lg border rounded-md px-3 py-2"
                  autoFocus
                />
                <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-medium hover:bg-primary/90">
                  Verify
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Godown Transfers</h1>
            <p className="text-muted-foreground mt-1">Track dispatch and delivery across branches.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Dispatch
          </button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-in slide-in-from-top-4">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Dispatch Entry</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dispatch Time</label>
                  <input type="datetime-local" required value={formData.dispatchTime} onChange={e => setFormData({...formData, dispatchTime: e.target.value})} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle No.</label>
                  <input type="text" required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full border rounded p-2 uppercase" placeholder="KL-..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Product</label>
                  <select required value={formData.product} onChange={e => setFormData({...formData, product: e.target.value as any})} className="w-full border rounded p-2">
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Alhaj">Alhaj</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity (Boxes)</label>
                  <input type="number" required min="1" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source</label>
                  <select required value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full border rounded p-2">
                    {godowns.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium mb-1">Destination</label>
                  <select required value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full border rounded p-2">
                    <option value="">-- Select Destination --</option>
                    {godowns.filter(g => g !== formData.source).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-span-full flex justify-end gap-3 mt-2 border-t pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-white rounded font-medium flex items-center gap-2"><Truck className="w-4 h-4"/> Dispatch</button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Route</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading transfers...</td></tr>
                ) : transfers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No transfers recorded.</td></tr>
                ) : (
                  transfers.map(tr => (
                    <tr key={tr._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{new Date(tr.date).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {new Date(tr.dispatchTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate max-w-[120px]">{tr.source}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium truncate max-w-[120px]">{tr.destination}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs border uppercase">{tr.vehicleNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{tr.quantity} <span className="text-muted-foreground font-normal text-xs">boxes</span></div>
                        <div className="text-xs text-primary">{tr.product}</div>
                      </td>
                      <td className="px-4 py-3">
                        {tr.status === 'Dispatched' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">In Transit</span>
                        ) : tr.status === 'Delivered' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Delivered {tr.deliveryTime && <span className="ml-1 text-[10px] opacity-80">({new Date(tr.deliveryTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">Cancelled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tr.status === 'Dispatched' && (
                          <button 
                            onClick={() => markDelivered(tr._id)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Mark Delivered
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
