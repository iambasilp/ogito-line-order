import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
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
  AlertCircle
} from 'lucide-react';

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

  const [filterRoute, setFilterRoute] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    route: '',
    salesExecutive: '',
    greenPrice: 0,
    orangePrice: 0,
    phone: ''
  });

  useEffect(() => {
    fetchCustomers(currentPage, searchTerm);
    fetchSalesUsers();
    fetchRoutes();
  }, [currentPage, filterRoute]);

  const fetchCustomers = async (page: number = 1, search: string = '') => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) {
        params.append('search', search);
      }
      if (filterRoute && filterRoute !== 'all') params.append('route', filterRoute);

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

    setSearchDebounce(timeout);
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
      phone: customer.phone
    });
    setShowForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/customers/${customer._id}`);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete customer');
    }
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
      phone: ''
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage client database and pricing</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, phone or route..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                className="pl-9 w-full bg-white shadow-sm h-11"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Button variant="outline" onClick={handleExportCSV} className="whitespace-nowrap shadow-sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate} className="whitespace-nowrap shadow-sm">
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button variant="outline" className="text-orange-700 border-orange-200 hover:bg-orange-50 whitespace-nowrap shadow-sm" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button onClick={() => setShowForm(true)} className="whitespace-nowrap shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Route</Label>
                <Select value={filterRoute} onValueChange={(val) => { setFilterRoute(val); setCurrentPage(1); }}>
                  <SelectTrigger>
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
                      />
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="route">Route</Label>
                    <Select
                      value={formData.route}
                      onValueChange={(value: string) => setFormData({ ...formData, route: value })}
                      required
                    >
                      <SelectTrigger className="pl-9 relative">
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
                    >
                      <SelectTrigger className="pl-9 relative">
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

                  <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="space-y-2">
                      <Label htmlFor="greenPrice" style={{ color: 'darkgreen' }}>Standard Price</Label>
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
                          className="pl-7 focus-visible:ring-1"
                          style={{ borderColor: 'darkgreen', color: 'darkgreen' }}
                          required
                        />
                        <span className="absolute left-3 top-2.5 text-sm font-semibold pointer-events-none" style={{ color: 'darkgreen' }}>₹</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orangePrice" style={{ color: 'darkorange' }}>Premium Price</Label>
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
                          className="pl-7 focus-visible:ring-1"
                          style={{ borderColor: 'darkorange', color: 'darkorange' }}
                          required
                        />
                        <span className="absolute left-3 top-2.5 text-sm font-semibold pointer-events-none" style={{ color: 'darkorange' }}>₹</span>
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
                <Card key={customer._id} className="shadow-sm active:scale-[0.99] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-base text-gray-900">{customer.name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : 'N/A'}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-3">
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-gray-500 hover:bg-gray-100 rounded-full" onClick={() => handleEdit(customer)}>
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => handleDelete(customer)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-green-50 p-2 rounded border border-green-100">
                        <span className="text-xs text-green-700 font-medium uppercase">Standard</span>
                        <div className="font-bold text-green-800">₹{customer.greenPrice.toFixed(2)}</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded border border-orange-100">
                        <span className="text-xs text-orange-700 font-medium uppercase">Premium</span>
                        <div className="font-bold text-orange-800">₹{customer.orangePrice.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {salesUser ? salesUser.name : customer.salesExecutive}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {customer.phone || '-'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <p className="text-muted-foreground">No customers found</p>
            </div>
          )}
        </div>

        {/* Desktop: Table View */}
        <Card className="hidden md:block shadow-sm">
          <CardHeader className="py-4 border-b bg-gray-50/40">
            <CardTitle className="text-lg">Customer Database <span className="text-sm font-normal text-muted-foreground ml-2">({totalCustomers} total)</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="text-left px-4 py-3 min-w-[150px]">Name</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Sales Exec</th>
                    <th className="text-right px-4 py-3 text-green-700">Std Price</th>
                    <th className="text-right px-4 py-3 text-orange-700">Prem Price</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-right px-4 py-3 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.length > 0 ? (
                    customers.map(customer => {
                      const salesUser = salesUsers.find(u => u.username === customer.salesExecutive);
                      return (
                        <tr key={customer._id} className="hover:bg-gray-50/80 transition-colors text-sm">
                          <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                          <td className="px-4 py-3 text-gray-600">{customer.route ? (typeof customer.route === 'string' ? customer.route : customer.route.name) : 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] uppercase font-bold text-gray-500 border">
                                {(salesUser ? salesUser.name : customer.salesExecutive).charAt(0)}
                              </div>
                              {salesUser ? salesUser.name : customer.salesExecutive}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-green-700">₹{customer.greenPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-orange-700">₹{customer.orangePrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600">{customer.phone || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {isAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(customer)} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(customer)}
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
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
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
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
    </Layout>
  );
};

export default Customers;
