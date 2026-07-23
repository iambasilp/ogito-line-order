import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import type { Customer } from '@/types';
import {
  Plus,
  Upload,
  Edit,
  Search,
  Download,
  Trash2,
  MapPin,
  User,
  Phone,
  FileSpreadsheet,
  AlertCircle,
  Link,
  QrCode
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface SalesUser {
  _id: string;
  username: string;
  name: string;
}

interface Route {
  _id: string;
  name: string;
}

const Customers: React.FC = () => {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ row: number, data: string, issues: string[] }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchDebounce, setSearchDebounce] = useState<number | null>(null);

  // UX Polish: Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'default';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {}
  });

  const [filterRoute, setFilterRoute] = useState('all');
  const [filterSalesExecutive, setFilterSalesExecutive] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [selectedQrCustomer, setSelectedQrCustomer] = useState<Customer | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const generateCustomerQR = async (customer: Customer) => {
    try {
      const qrData = customer.phone || customer.name;
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeUrl(url);
      setSelectedQrCustomer(customer);
    } catch (err) {
      console.error('Error generating QR', err);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    route: '',
    salesExecutive: '',
    greenPrice: 0,
    orangePrice: 0,
    phone: '',
    locationUrl: '',
    customerSince: ''
  });

  useEffect(() => {
    fetchCustomers(currentPage, searchTerm);
    fetchSalesUsers();
    fetchRoutes();
  }, [currentPage, filterRoute, filterSalesExecutive, filterStartDate, filterEndDate]);

  const fetchCustomers = async (page: number = 1, search: string = '') => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) {
        params.append('search', search);
      }
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterSalesExecutive && filterSalesExecutive !== 'all') params.append('salesExecutive', filterSalesExecutive);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const response = await api.get(`/customers?${params.toString()}`);
      const { customers: fetchedCustomers, pagination } = response.data;

      setCustomers(fetchedCustomers);
      setCurrentPage(pagination.page);
      setTotalPages(pagination.totalPages);
      setTotalCustomers(pagination.total);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      fetchCustomers(1, value);
    }, 400);

    setSearchDebounce(timeout as unknown as number);
  };

  const fetchSalesUsers = async () => {
    try {
      const response = await api.get('/users/sales');
      setSalesUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch sales users:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, formData);
      } else {
        await api.post('/customers', formData);
      }

      triggerReward();

      setShowForm(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers(currentPage, searchTerm);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      route: customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : '',
      salesExecutive: customer.salesExecutive,
      greenPrice: customer.greenPrice,
      orangePrice: customer.orangePrice,
      phone: customer.phone || '',
      locationUrl: customer.locationUrl || '',
      customerSince: customer.customerSince ? customer.customerSince.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Customer',
      description: `Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/customers/${customer._id}`);
          fetchCustomers();
        } catch (error: any) {
          alert(error.response?.data?.error || 'Failed to delete customer');
        }
      }
    });
  };

  const handleDownloadTemplate = () => {
    const template = `Id,Name,Route,SalesExecutive,GreenPrice,OrangePrice,Phone
1,Customer A,TIRUR,Basil,52.50,64.00,9846396061
2,Customer B,MALAPPURAM,Naseef,52.50,64.00,9876543210
3,Customer C,NILAMBUR,Dileep,55.00,70.00,9947552565`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customer-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      route: '',
      salesExecutive: '',
      greenPrice: 0,
      orangePrice: 0,
      phone: '',
      locationUrl: '',
      customerSince: ''
    });
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    try {
      const text = await csvFile.text();
      const response = await api.post('/customers/import', { csvData: text });
      alert(response.data.message);
      setShowImport(false);
      setCsvFile(null);
      setImportErrors([]);
      fetchCustomers(1, searchTerm);
    } catch (error: any) {
      // Show detailed error messages if available
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        setImportErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.error || 'Failed to import CSV');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);
      if (filterSalesExecutive && filterSalesExecutive !== 'all') params.append('salesExecutive', filterSalesExecutive);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const response = await api.get(`/customers/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export customers');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setCsvFile(file);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage client database and pricing</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, phone or route..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                className="pl-9 w-full bg-card shadow-sm h-11 border-border"
                aria-label="Search customers"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Button variant="outline" onClick={handleExportCSV} className="whitespace-nowrap shadow-sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={handleDownloadTemplate} className="whitespace-nowrap shadow-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                  <Button variant="outline" className="text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-950/40 hover:bg-orange-50 dark:hover:bg-orange-950/20 whitespace-nowrap shadow-sm" onClick={() => setShowImport(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button onClick={() => setShowForm(true)} className="whitespace-nowrap shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block" htmlFor="filterRoute">Route</Label>
                <Select name="filterRoute" value={filterRoute} onValueChange={(val) => { setFilterRoute(val); setCurrentPage(1); }}>
                  <SelectTrigger id="filterRoute">
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route._id} value={route.name}>{route.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {isAdmin && (
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1.5 block" htmlFor="filterSalesExecutive">Sales Executive</Label>
                  <Select name="filterSalesExecutive" value={filterSalesExecutive} onValueChange={(val) => { setFilterSalesExecutive(val); setCurrentPage(1); }}>
                    <SelectTrigger id="filterSalesExecutive">
                      <SelectValue placeholder="All Sales Execs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sales Execs</SelectItem>
                      {salesUsers.map((user) => (
                        <SelectItem key={user._id} value={user.username}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block" htmlFor="filterStartDate">Since Date (From)</Label>
                <Input
                  id="filterStartDate"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                  className="w-full"
                  max={filterEndDate || undefined}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block" htmlFor="filterEndDate">Since Date (To)</Label>
                <Input
                  id="filterEndDate"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                  className="w-full"
                  min={filterStartDate || undefined}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import CSV Modal */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Import Customers</DialogTitle>
              <DialogClose onClose={() => {
                setShowImport(false);
                setCsvFile(null);
                setImportErrors([]);
              }} />
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">CSV Format Required</p>
                    <p className="opacity-90">Id,Name,Route,SalesExecutive,GreenPrice,OrangePrice,Phone</p>
                    <p className="opacity-75 text-xs mt-1">Example: 1,John Doe,Tirur,Basil,52.50,65.00,9876543210</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleImportCSV} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csvFile">Upload File</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    {csvFile ? (
                      <div className="space-y-1">
                        <p className="font-medium text-primary">{csvFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-600">Click to upload CSV</p>
                        <p className="text-xs text-muted-foreground">or drag and drop here</p>
                      </div>
                    )}
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 max-h-60 overflow-y-auto">
                    <div className="flex items-center gap-2 text-red-800 font-semibold mb-2 sticky top-0 bg-red-50 pb-2 border-b border-red-100">
                      <AlertCircle className="h-4 w-4" />
                      <span>{importErrors.length} errors found</span>
                    </div>
                    <div className="space-y-3">
                      {importErrors.map((error, idx) => (
                        <div key={idx} className="text-sm border-b border-red-100 last:border-0 pb-2 last:pb-0">
                          <div className="flex justify-between text-red-900 font-medium mb-1">
                            <span>Row {error.row}</span>
                            <span className="font-mono text-xs opacity-70 truncate max-w-[150px]">{error.data}</span>
                          </div>
                          <ul className="list-disc list-inside text-red-700 text-xs pl-1">
                            {error.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowImport(false);
                      setCsvFile(null);
                      setImportErrors([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!csvFile}>
                    Import Data
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Customer Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 gap-6">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              <DialogClose onClose={() => {
                setShowForm(false);
                setEditingCustomer(null);
                resetForm();
              }} />
            </DialogHeader>
            <div className="">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Customer Name</Label>
                    <div className="relative">
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-9"
                        placeholder="Company or Person Name"
                        required
                        aria-required="true"
                        autoComplete="name"
                      />
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-9"
                        placeholder="10-digit mobile"
                        autoComplete="tel"
                      />
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locationUrl">Google Maps Link</Label>
                    <div className="relative">
                      <Input
                        id="locationUrl"
                        type="url"
                        value={formData.locationUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, locationUrl: e.target.value })}
                        className="pl-9"
                        placeholder="https://maps.app.goo.gl/..."
                      />
                      <Link className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="route">Route</Label>
                    <Select
                      value={formData.route}
                      onValueChange={(value: string) => setFormData({ ...formData, route: value })}
                      required
                      name="route"
                    >
                      <SelectTrigger id="route" className="pl-9 relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <SelectValue placeholder="Select Route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map(route => (
                          <SelectItem key={route._id} value={route.name}>{route.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salesExecutive">Sales Executive</Label>
                    <Select
                      value={formData.salesExecutive}
                      onValueChange={(value: string) => setFormData({ ...formData, salesExecutive: value })}
                      required
                      name="salesExecutive"
                    >
                      <SelectTrigger id="salesExecutive" className="pl-9 relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <SelectValue placeholder="Select Sales Exec" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesUsers.map(user => (
                          <SelectItem key={user._id} value={user.username}>
                            {user.name} (@{user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerSince">Customer Since (Acquisition Date)</Label>
                    <div className="relative">
                      <Input
                        id="customerSince"
                        type="date"
                        value={formData.customerSince}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, customerSince: e.target.value })}
                        className="w-full"
                        max={new Date().toISOString().split('T')[0]} // Cannot be in the future
                        disabled={!!editingCustomer && !isAdmin} // Only Admins can edit after creation
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label htmlFor="greenPrice" className="text-emerald-800 dark:text-emerald-500">Standard Price</Label>
                      <div className="relative">
                        <Input
                          id="greenPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.greenPrice === 0 ? '' : formData.greenPrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, greenPrice: parseFloat(e.target.value) || 0 })}
                          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                          placeholder="0.00"
                          className="pl-7 focus-visible:ring-1 border-emerald-800 dark:border-emerald-500 text-emerald-800 dark:text-emerald-500"
                          required
                          aria-required="true"
                        />
                        <span className="absolute left-3 top-2.5 text-sm font-semibold pointer-events-none text-emerald-800 dark:text-emerald-500">₹</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orangePrice" className="text-orange-800 dark:text-orange-500">Premium Price</Label>
                      <div className="relative">
                        <Input
                          id="orangePrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.orangePrice === 0 ? '' : formData.orangePrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, orangePrice: parseFloat(e.target.value) || 0 })}
                          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                          placeholder="0.00"
                          className="pl-7 focus-visible:ring-1 border-orange-800 dark:border-orange-500 text-orange-800 dark:text-orange-500"
                          required
                          aria-required="true"
                        />
                        <span className="absolute left-3 top-2.5 text-sm font-semibold pointer-events-none text-orange-800 dark:text-orange-500">₹</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCustomer(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCustomer ? 'Update Customer' : 'Save Customer'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile: Card View */}
        <div className="md:hidden space-y-4">
          <div className="text-sm text-muted-foreground font-medium px-1">
            Showing {customers.length} of {totalCustomers} customers
          </div>
          {customers.length > 0 ? (
            customers.map(customer => {
              const salesUser = salesUsers.find(u => u.username === customer.salesExecutive);
              return (
                <Card key={customer._id} className="shadow-sm active:scale-[0.99] transition-transform border-border bg-card text-card-foreground">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-base text-foreground">{customer.name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : 'N/A'}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-3">
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:bg-muted rounded-full" onClick={() => generateCustomerQR(customer)}>
                            <QrCode className="h-5 w-5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:bg-muted rounded-full" onClick={() => handleEdit(customer)}>
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-full" onClick={() => handleDelete(customer)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-emerald-500/10 dark:bg-emerald-950/20 p-2 rounded border border-emerald-500/20 dark:border-emerald-900/30">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase">Standard</span>
                        <div className="font-bold text-emerald-800 dark:text-emerald-300">₹{customer.greenPrice.toFixed(2)}</div>
                      </div>
                      <div className="bg-orange-500/10 dark:bg-orange-950/20 p-2 rounded border border-orange-500/20 dark:border-orange-900/30">
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase">Premium</span>
                        <div className="font-bold text-orange-800 dark:text-orange-300">₹{customer.orangePrice.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-muted-foreground pt-3 border-t border-border">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {salesUser ? salesUser.name : customer.salesExecutive}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {customer.phone || '-'}
                      </div>
                      {customer.locationUrl && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Link className="h-3 w-3 mr-1" />
                          <a href={customer.locationUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View Map</a>
                        </div>
                      )}
                    </div>
                    {customer.customerSince && (
                      <div className="flex items-center text-xs text-muted-foreground pt-2 mt-2 border-t border-border/50">
                        <span className="font-medium mr-1">Customer Since:</span> 
                        {new Date(customer.customerSince).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">No customers found</p>
            </div>
          )}
        </div>

        {/* Desktop: Table View */}
        <Card className="hidden md:block shadow-sm">
          <CardHeader className="py-4 border-b border-border bg-muted/20">
            <CardTitle className="text-lg">Customer Database <span className="text-sm font-normal text-muted-foreground ml-2">({totalCustomers} total)</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-medium">
                  <tr>
                    <th className="text-left px-4 py-3 min-w-[150px]">Name</th>
                    <th className="text-left px-4 py-3">Customer Since</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Sales Exec</th>
                    <th className="text-right px-4 py-3 text-emerald-600 dark:text-emerald-400">Std Price</th>
                    <th className="text-right px-4 py-3 text-orange-600 dark:text-orange-400">Prem Price</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Map</th>
                    <th className="text-right px-4 py-3 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {customers.length > 0 ? (
                    customers.map(customer => {
                      const salesUser = salesUsers.find(u => u.username === customer.salesExecutive);
                      return (
                        <tr key={customer._id} className="hover:bg-muted/40 transition-colors text-sm">
                          <td className="px-4 py-3 font-medium text-foreground">{customer.name}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {customer.customerSince ? new Date(customer.customerSince).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : 'N/A'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] uppercase font-bold text-muted-foreground border border-border">
                                {(salesUser ? salesUser.name : customer.salesExecutive).charAt(0)}
                              </div>
                              {salesUser ? salesUser.name : customer.salesExecutive}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">₹{customer.greenPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-orange-600 dark:text-orange-400">₹{customer.orangePrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{customer.phone || '-'}</td>
                          <td className="px-4 py-3">
                            {customer.locationUrl ? (
                              <a href={customer.locationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Open in Google Maps">
                                <MapPin className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => generateCustomerQR(customer)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Generate QR">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(customer)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(customer)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No customers found matching your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pb-20 md:pb-6">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalCustomers)} of {totalCustomers} customers
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          description={confirmModalConfig.description}
          confirmText={confirmModalConfig.confirmText}
          variant={confirmModalConfig.variant}
        />

        {/* QR Code Dialog */}
        <Dialog open={!!selectedQrCustomer} onOpenChange={(open) => !open && setSelectedQrCustomer(null)}>
          <DialogContent className="sm:max-w-md flex flex-col items-center p-6">
            <DialogHeader className="w-full flex flex-row items-center justify-between mb-2 relative">
              <DialogTitle className="text-xl font-bold text-center w-full">Customer QR Code</DialogTitle>
            </DialogHeader>
            
            {selectedQrCustomer && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-border flex flex-col items-center w-full">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedQrCustomer.name}</h3>
                <p className="text-gray-500 text-sm mb-4">
                  {selectedQrCustomer.phone ? `Phone: ${selectedQrCustomer.phone}` : 'Scan to search by name'}
                </p>
                
                <div className="bg-white p-2 rounded-lg border border-border">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt={`QR for ${selectedQrCustomer.name}`} className="w-[220px] h-[220px] object-contain" />
                  ) : (
                    <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-50 text-gray-400">Generating...</div>
                  )}
                </div>
                
                <p className="text-xs text-center text-gray-500 mt-4">
                  Show this QR code to the driver to quickly locate your account.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Customers;
