import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@/types';
import { Plus, Upload, Edit, Search, Download, Trash2 } from 'lucide-react';

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
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{row: number, data: string, issues: string[]}>>([]);

  const [formData, setFormData] = useState({
    name: '',
    route: '',
    salesExecutive: '',
    greenPrice: 0,
    orangePrice: 0,
    phone: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchSalesUsers();
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.route.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
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
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      route: customer.route,
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
      fetchCustomers();
    } catch (error: any) {
      // Show detailed error messages if available
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        setImportErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.error || 'Failed to import CSV');
      }
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">👥 Customers</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleDownloadTemplate} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Download Template</span>
              <span className="sm:hidden">Template</span>
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none text-white hover:opacity-90 text-xs sm:text-sm" style={{backgroundColor: '#E07012'}} onClick={() => setShowImport(!showImport)}>
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button onClick={() => setShowForm(!showForm)} className="flex-1 sm:flex-none text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Import CSV Form */}
        {showImport && (
          <Card>
            <CardHeader>
              <CardTitle>Import Customers from CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImportCSV} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csvFile">Select CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {csvFile && (
                    <p className="text-sm text-green-600">
                      Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Expected format: Id,Name,Route,SalesExecutive,GreenPrice,OrangePrice,Phone<br/>
                    Note: Use sales executive name (e.g., Basil, Naseef) - case insensitive
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={!csvFile}>Import</Button>
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
                </div>
              </form>

              {/* Import Errors Display */}
              {importErrors.length > 0 && (
                <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md">
                  <h3 className="font-semibold text-red-800 mb-2">
                    ❌ Import Failed: {importErrors.length} row(s) have errors
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-red-200">
                          <th className="text-left p-2 text-red-900">Row #</th>
                          <th className="text-left p-2 text-red-900">Customer Name</th>
                          <th className="text-left p-2 text-red-900">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importErrors.map((error, idx) => (
                          <tr key={idx} className="border-b border-red-200">
                            <td className="p-2 font-mono text-red-900">{error.row}</td>
                            <td className="p-2 text-red-900">{error.data}</td>
                            <td className="p-2">
                              <ul className="list-disc list-inside text-red-700">
                                {error.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-red-700 mt-2">
                    Please fix the errors in your CSV file and try importing again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Customer Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingCustomer ? 'Edit Customer' : 'New Customer'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Customer Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="route">Route</Label>
                    <Select 
                      value={formData.route} 
                      onValueChange={(value: string) => setFormData({...formData, route: value})}
                      required
                    >
                      <SelectTrigger>
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
                      onValueChange={(value: string) => setFormData({...formData, salesExecutive: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Sales Executive" />
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
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="greenPrice">Standard Price (₹)</Label>
                    <Input
                      id="greenPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.greenPrice === 0 ? '' : formData.greenPrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, greenPrice: parseFloat(e.target.value) || 0})}
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orangePrice">Premium Price (₹)</Label>
                    <Input
                      id="orangePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.orangePrice === 0 ? '' : formData.orangePrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, orangePrice: parseFloat(e.target.value) || 0})}
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </Button>
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
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Customer List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg sm:text-xl">Customers ({filteredCustomers.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs sm:text-sm">Name</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden md:table-cell">Route</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden lg:table-cell">Sales Executive</th>
                    <th className="text-right p-2 text-xs sm:text-sm">Std (₹)</th>
                    <th className="text-right p-2 text-xs sm:text-sm">Prem (₹)</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden sm:table-cell">Phone</th>
                    <th className="text-left p-2 text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => {
                    const salesUser = salesUsers.find(u => u.username === customer.salesExecutive);
                    return (
                      <tr key={customer._id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-xs sm:text-sm">{customer.name}</td>
                        <td className="p-2 text-xs sm:text-sm hidden md:table-cell">{customer.route}</td>
                        <td className="p-2 text-xs sm:text-sm hidden lg:table-cell">
                          {salesUser ? salesUser.name : customer.salesExecutive}
                        </td>
                        <td className="p-2 text-right text-xs sm:text-sm">{customer.greenPrice.toFixed(2)}</td>
                        <td className="p-2 text-right text-xs sm:text-sm">{customer.orangePrice.toFixed(2)}</td>
                        <td className="p-2 text-xs sm:text-sm hidden sm:table-cell">{customer.phone || '-'}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {isAdmin && (
                              <Button size="sm" variant="outline" onClick={() => handleEdit(customer)} className="text-xs">
                                <Edit className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            )}
                            {isAdmin && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDelete(customer)} 
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCustomers.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No customers found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Customers;
