import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PaymentCollection } from '../types';
import RecordPaymentModal from '../components/collections/RecordPaymentModal';
import {
  Wallet,
  Banknote,
  Search,
  Trash2,
  Calendar,
  Download,
  Printer,
  Loader2,
  Clock,
  User as UserIcon,
  MapPin,
  Truck,
  RotateCcw
} from 'lucide-react';
import { printCashCollectionReport } from '../utils/cashCollectionPrint';

export const Collections = () => {
  const { user, isAdmin, isCeo } = useAuth();
  const isDriver = user?.role === 'driver';

  const [collections, setCollections] = useState<PaymentCollection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalCash: 0,
    totalCount: 0,
  });

  // Filter States
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [driverFilter, setDriverFilter] = useState<string>(isDriver ? user?.username || 'all' : 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dropdown data
  const [drivers, setDrivers] = useState<{ username: string; name?: string }[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);

  // Fetch Drivers & Customers once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [salesRes, customersRes] = await Promise.allSettled([
          api.get('/users/sales'),
          api.get('/customers?limit=1000')
        ]);

        if (salesRes.status === 'fulfilled' && Array.isArray(salesRes.value.data)) {
          setDrivers(salesRes.value.data);
        }

        if (customersRes.status === 'fulfilled') {
          const raw = customersRes.value.data;
          const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.customers) ? raw.customers : []);
          setAllCustomers(list);
        }
      } catch (err) {
        console.error('Failed to load collection metadata', err);
      }
    };

    fetchMetadata();
  }, []);

  // Fetch Collections whenever filters change
  useEffect(() => {
    fetchCollections();
  }, [startDate, endDate, driverFilter]);

  const handleDateQuickSelect = (mode: 'today' | 'yesterday' | 'month' | 'custom') => {
    setDateFilterMode(mode);
    const now = new Date();

    if (mode === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (mode === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (mode === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('paymentMode', 'Cash');
      if (driverFilter && driverFilter !== 'all') params.append('collectedBy', driverFilter);

      const res = await api.get(`/collections?${params.toString()}`);
      setCollections(Array.isArray(res.data?.collections) ? res.data.collections : []);
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch collections', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment collection record?')) {
      return;
    }

    try {
      await api.delete(`/collections/${id}`);
      fetchCollections();
    } catch (err: any) {
      console.error('Failed to delete collection', err);
      alert(err.response?.data?.error || 'Failed to delete collection record');
    }
  };

  const handleExportCSV = () => {
    if (collections.length === 0) {
      alert('No collections to export');
      return;
    }

    const headers = [
      'Date & Time',
      'Customer Name',
      'Cash Amount (INR)',
      'Collected By',
      'Vehicle',
      'Route',
      'Remarks',
    ];

    const rows = filteredCollections.map((c) => [
      `"${new Date(c.date).toLocaleString('en-IN')}"`,
      `"${c.customerName || ''}"`,
      c.amount,
      `"${c.collectedByName || c.collectedByUsername}"`,
      `"${c.vehicle || ''}"`,
      `"${c.routeName || ''}"`,
      `"${c.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Cash_Collections_${startDate}_to_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    if (filteredCollections.length === 0) {
      alert('No cash collections found to print.');
      return;
    }

    const dateDisplay = startDate === endDate 
      ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : `${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`;

    printCashCollectionReport({
      collections: filteredCollections,
      dateStr: dateDisplay,
      collectorName: driverFilter !== 'all' ? (drivers.find(d => d.username === driverFilter)?.name || driverFilter) : undefined,
      reportTitle: dateFilterMode === 'today' ? "TODAY'S CASH COLLECTION REPORT" : "CASH COLLECTION RECONCILIATION REPORT"
    });
  };

  // Local search filter
  const filteredCollections = collections.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const custName = (c.customerName || '').toLowerCase();
    const collector = (c.collectedByName || c.collectedByUsername || '').toLowerCase();
    const notes = (c.notes || '').toLowerCase();
    const amountStr = c.amount?.toString() || '';
    return custName.includes(q) || collector.includes(q) || notes.includes(q) || amountStr.includes(q);
  });

  return (
    <Layout fullWidth>
      <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
              <span>Customer Cash Collections</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Digital payment recording & driver cash reconciliation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-10 text-xs sm:text-sm font-medium"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPDF}
              className="h-10 text-xs sm:text-sm font-medium"
            >
              <Printer className="w-4 h-4 mr-1.5 text-emerald-600" />
              PDF Report
            </Button>

            <Button
              onClick={() => setIsRecordModalOpen(true)}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs sm:text-sm px-4"
            >
              <Banknote className="w-4 h-4 mr-1.5" />
              Record Cash
            </Button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Cash Collected
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Banknote className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300">
                ₹{summary.totalCash.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 font-medium">
                Physical cash handed over to office
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Collections
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {summary.totalCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Customer collection receipts
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Average per Customer
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Banknote className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                ₹{summary.totalCount > 0 ? Math.round(summary.totalCash / summary.totalCount).toLocaleString('en-IN') : 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Avg cash collected
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reconciliation Period
              </CardTitle>
              <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {dateFilterMode === 'today' ? 'Today' : dateFilterMode === 'yesterday' ? 'Yesterday' : dateFilterMode === 'month' ? 'This Month' : 'Filtered'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Quick Date Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={dateFilterMode === 'today' ? 'default' : 'outline'}
                  onClick={() => handleDateQuickSelect('today')}
                  className="h-8 text-xs font-semibold rounded-full px-3"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dateFilterMode === 'yesterday' ? 'default' : 'outline'}
                  onClick={() => handleDateQuickSelect('yesterday')}
                  className="h-8 text-xs font-semibold rounded-full px-3"
                >
                  Yesterday
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dateFilterMode === 'month' ? 'default' : 'outline'}
                  onClick={() => handleDateQuickSelect('month')}
                  className="h-8 text-xs font-semibold rounded-full px-3"
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dateFilterMode === 'custom' ? 'default' : 'outline'}
                  onClick={() => handleDateQuickSelect('custom')}
                  className="h-8 text-xs font-semibold rounded-full px-3"
                >
                  Custom Range
                </Button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search customer, collector..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-background"
                />
              </div>
            </div>

            {/* Detailed Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setStartDate(e.target.value);
                      setDateFilterMode('custom');
                    }}
                    className="pl-8 h-9 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEndDate(e.target.value);
                      setDateFilterMode('custom');
                    }}
                    className="pl-8 h-9 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Collected By</Label>
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff / Drivers</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.username} value={d.username}>
                        {d.name || d.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collections Table */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 sm:px-6 border-b bg-muted/40 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>Collection Entries</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredCollections.length} records)
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCollections}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold text-right">Cash Collected</th>
                  <th className="px-4 py-3 font-semibold">Collected By</th>
                  <th className="px-4 py-3 font-semibold">Vehicle / Route</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>Loading collections...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Banknote className="h-8 w-8 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">No cash collections found</p>
                        <p className="text-xs">Try adjusting your filters or record a new cash collection.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((col) => {
                    const canDelete =
                      isAdmin ||
                      isCeo ||
                      user?.id === (col.collectedBy as any)?._id ||
                      user?.username === col.collectedByUsername;

                    return (
                      <tr key={col._id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-foreground">
                            {new Date(col.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(col.createdAt || col.date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground truncate max-w-[200px]">
                            {col.customerName}
                          </div>
                          {col.orderId && (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-medium">
                              Order Delivery
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-black text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                            ₹{col.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {col.collectedByName || col.collectedByUsername}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {col.vehicle && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Truck className="h-3 w-3" />
                              <span>{col.vehicle}</span>
                            </div>
                          )}
                          {col.routeName && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <MapPin className="h-3 w-3" />
                              <span>{col.routeName}</span>
                            </div>
                          )}
                          {!col.vehicle && !col.routeName && '-'}
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                          {col.notes || '-'}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(col._id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full"
                              title="Delete Collection"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        allCustomers={allCustomers}
        onSuccess={() => {
          fetchCollections();
        }}
      />
    </Layout>
  );
};

export default Collections;
