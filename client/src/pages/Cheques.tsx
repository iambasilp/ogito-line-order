import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, FileSignature } from 'lucide-react';
import api from '@/lib/api';
import Layout from '@/components/Layout';

interface Cheque {
  _id: string;
  customerName: string;
  chequeNumber: string;
  chequeDate: string;
  amount: number;
  bankName: string;
  receivedDate: string;
  status: 'Pending' | 'Submitted' | 'Cleared' | 'Bounced';
  bounceReason?: string;
  remarks?: string;
}

interface SummaryStats {
  totalCheques: number;
  totalAmount: number;
  pendingAmount: number;
  submittedAmount: number;
  clearedAmount: number;
  bouncedAmount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export default function Cheques() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalCheques: 0,
    totalAmount: 0,
    pendingAmount: 0,
    submittedAmount: 0,
    clearedAmount: 0,
    bouncedAmount: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [formData, setFormData] = useState<Partial<Cheque>>({
    status: 'Pending',
    receivedDate: new Date().toISOString().split('T')[0]
  });

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chequeToDelete, setChequeToDelete] = useState<string | null>(null);

  // Customer Suggestions State
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Formatted Amount State
  const [displayAmount, setDisplayAmount] = useState('');

  const formatWithCommas = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    const intPart = parts[0] ? Number(parts[0]).toLocaleString('en-IN') : '';
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    
    setDisplayAmount(val);
    setFormData({ ...formData, amount: val === '' ? 0 : parseFloat(val) });
  };

  const fetchCustomerSuggestions = async (search: string) => {
    if (!search || search.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/customers?search=${search}&limit=5`);
      setCustomerSuggestions(res.data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cheques', {
        params: { search: searchQuery, status: statusFilter }
      });
      setCheques(res.data.cheques);
      setSummary(res.data.summary);
    } catch (error) {
      console.error('Failed to fetch cheques:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCheques();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, statusFilter]);

  const handleOpenModal = (cheque?: Cheque) => {
    if (cheque) {
      setEditingCheque(cheque);
      setDisplayAmount(cheque.amount ? cheque.amount.toString() : '');
      setFormData({
        ...cheque,
        // Format dates to YYYY-MM-DD for input type="date"
        chequeDate: new Date(cheque.chequeDate).toISOString().split('T')[0],
        receivedDate: new Date(cheque.receivedDate).toISOString().split('T')[0]
      });
    } else {
      setEditingCheque(null);
      setDisplayAmount('');
      setFormData({
        customerName: '',
        chequeNumber: '',
        chequeDate: '',
        amount: '' as any,
        bankName: '',
        status: 'Pending',
        receivedDate: new Date().toISOString().split('T')[0],
        bounceReason: '',
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCheque) {
        await api.put(`/cheques/${editingCheque._id}`, formData);
      } else {
        await api.post('/cheques', formData);
      }
      setIsModalOpen(false);
      fetchCheques();
    } catch (error) {
      console.error('Failed to save cheque:', error);
      alert('Failed to save cheque');
    }
  };

  const handleDeleteClick = (id: string) => {
    setChequeToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!chequeToDelete) return;
    try {
      await api.delete(`/cheques/${chequeToDelete}`);
      setDeleteModalOpen(false);
      setChequeToDelete(null);
      fetchCheques();
    } catch (error) {
      console.error('Failed to delete cheque:', error);
      alert('Failed to delete cheque');
    }
  };



  return (
    <Layout fullWidth>
      <div className="space-y-6 w-full max-w-[1600px] px-2 mx-auto pt-4">
        
        {/* Header & Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <FileSignature className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Cheque Collection</h1>
          </div>
          <Button onClick={() => handleOpenModal()} className="font-semibold shadow-sm w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Cheque
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Cheques</p>
              <h3 className="text-2xl font-bold text-foreground">{summary.totalCheques}</h3>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
              <h3 className="text-xl font-bold text-foreground">{formatCurrency(summary.totalAmount || 0)}</h3>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Pending</p>
              <h3 className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(summary.pendingAmount || 0)}</h3>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Submitted</p>
              <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(summary.submittedAmount || 0)}</h3>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Cleared</p>
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(summary.clearedAmount || 0)}</h3>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Bounced</p>
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400">{formatCurrency(summary.bouncedAmount || 0)}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-3 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search customer, cheque no. or bank..." 
              className="pl-9 h-10 w-full bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="w-full sm:w-[180px] h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Submitted">Submitted</option>
            <option value="Cleared">Cleared</option>
            <option value="Bounced">Bounced</option>
          </select>
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden border-border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border">
              <thead className="bg-muted border-b text-xs uppercase text-muted-foreground font-medium">
                <tr>
                  <th className="px-2 py-2.5 text-center w-[50px]">S.No</th>
                  <th className="px-2 py-2.5 text-left">Customer Name</th>
                  <th className="px-2 py-2.5 text-left">Cheque No.</th>
                  <th className="px-2 py-2.5 text-left">Cheque Date</th>
                  <th className="px-2 py-2.5 text-right">Amount</th>
                  <th className="px-2 py-2.5 text-left">Bank</th>
                  <th className="px-2 py-2.5 text-left">Received Date</th>
                  <th className="px-2 py-2.5 text-center w-[120px]">Status</th>
                  <th className="px-2 py-2.5 text-left">Bounce Reason</th>
                  <th className="px-2 py-2.5 text-left">Remarks</th>
                  <th className="px-2 py-2.5 text-center w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : cheques.length === 0 ? (
                  <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No cheques found.</td></tr>
                ) : (
                  cheques.map((c, idx) => (
                    <tr key={c._id} className="hover:bg-muted/80 transition-colors text-[13px] tracking-tight">
                      <td className="px-2 py-2 text-center text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium">{c.customerName}</td>
                      <td className="px-2 py-2 font-mono">{c.chequeNumber}</td>
                      <td className="px-2 py-2">{new Date(c.chequeDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-2 py-2 text-right font-bold text-foreground">{formatCurrency(c.amount)}</td>
                      <td className="px-2 py-2">{c.bankName}</td>
                      <td className="px-2 py-2">{new Date(c.receivedDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-2 py-2 text-center">
                        <div className={`inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-full text-[10px] uppercase font-bold border w-full max-w-[100px] ${
                          c.status === 'Cleared' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' : 
                          c.status === 'Bounced' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50' : 
                          c.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50' :
                          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                        }`}>
                          {c.status}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground max-w-[150px] truncate" title={c.bounceReason}>{c.bounceReason || '—'}</td>
                      <td className="px-2 py-2 text-muted-foreground max-w-[150px] truncate" title={c.remarks}>{c.remarks || '—'}</td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenModal(c)} className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteClick(c._id)} className="h-7 w-7 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
            <DialogTitle className="text-xl">{editingCheque ? 'Edit Cheque' : 'Add Cheque'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCheque} className="p-6 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input 
                  required 
                  placeholder="Customer Name *"
                  value={formData.customerName || ''} 
                  onChange={e => {
                    setFormData({...formData, customerName: e.target.value});
                    setShowCustomerDropdown(true);
                    fetchCustomerSuggestions(e.target.value);
                  }} 
                  onFocus={() => {
                    if (formData.customerName && formData.customerName.length >= 2) {
                      setShowCustomerDropdown(true);
                      fetchCustomerSuggestions(formData.customerName);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  autoComplete="off"
                />
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                    {customerSuggestions.map(customer => (
                      <li 
                        key={customer._id}
                        className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData({...formData, customerName: customer.name});
                          setShowCustomerDropdown(false);
                        }}
                      >
                        {customer.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Input 
                  required 
                  list="bank-list"
                  placeholder="Select or type bank name *"
                  value={formData.bankName || ''} 
                  onChange={e => setFormData({...formData, bankName: e.target.value})} 
                />
                <datalist id="bank-list">
                  <option value="State Bank of India" />
                  <option value="HDFC Bank" />
                  <option value="ICICI Bank" />
                  <option value="Axis Bank" />
                  <option value="Punjab National Bank" />
                  <option value="Kotak Mahindra Bank" />
                  <option value="Bank of Baroda" />
                  <option value="Union Bank of India" />
                  <option value="Canara Bank" />
                  <option value="IndusInd Bank" />
                  <option value="IDFC First Bank" />
                  <option value="Yes Bank" />
                  <option value="Federal Bank" />
                  <option value="South Indian Bank" />
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input required placeholder="Cheque No. *" value={formData.chequeNumber || ''} onChange={e => setFormData({...formData, chequeNumber: e.target.value})} />
              </div>
              <div>
                <Input 
                  type="text" 
                  required 
                  placeholder="Amount *"
                  value={formatWithCommas(displayAmount)} 
                  onChange={handleAmountChange} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input type="date" required value={formData.chequeDate || ''} onChange={e => setFormData({...formData, chequeDate: e.target.value})} />
                {!formData.chequeDate && <span className="absolute left-3 top-2.5 text-muted-foreground text-sm pointer-events-none">Cheque Date *</span>}
              </div>
              <div className="relative">
                <Input type="date" required value={formData.receivedDate || ''} onChange={e => setFormData({...formData, receivedDate: e.target.value})} />
                {!formData.receivedDate && <span className="absolute left-3 top-2.5 text-muted-foreground text-sm pointer-events-none">Received Date *</span>}
              </div>
            </div>

            <div className="pt-2">
              <select
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.status || 'Pending'}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Pending">Status: Pending</option>
                <option value="Submitted">Status: Submitted</option>
                <option value="Cleared">Status: Cleared</option>
                <option value="Bounced">Status: Bounced</option>
              </select>
            </div>

            {formData.status === 'Bounced' && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/30">
                <Input required placeholder="Bounce Reason *" value={formData.bounceReason || ''} onChange={e => setFormData({...formData, bounceReason: e.target.value})} className="border-red-200 focus-visible:ring-red-500 bg-white" />
              </div>
            )}

            <div>
              <Input placeholder="Remarks" value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} />
            </div>

            <div className="pt-4 border-t mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Cheque</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Cheque</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">Are you sure you want to delete this cheque? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
