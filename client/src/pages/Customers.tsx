import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@/types';
import { Plus, Upload, Edit, Search, Download } from 'lucide-react';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

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

  const handleDownloadTemplate = () => {
    const template = `Id,Name,Route,SalesExecutive,GreenPrice,OrangePrice,Phone
1,Customer A,TIRUR,BASIL,52.50,64.00,9846396061
2,Customer B,NILAMBUR,NASEEF,52.50,64.00,9876543210
3,Customer C,MALAPPURAM,DILEEP,55.00,70.00,9947552565`;
    
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
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to import CSV');
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">👥 Customers</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" className="text-white hover:opacity-90" style={{backgroundColor: '#E07012'}} onClick={() => setShowImport(!showImport)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
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
                    Expected format: Id,Name,Route,SalesExecutive,GreenPrice,OrangePrice,Phone
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
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
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
                    <Input
                      id="route"
                      value={formData.route}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, route: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salesExecutive">Sales Executive</Label>
                    <Input
                      id="salesExecutive"
                      value={formData.salesExecutive}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, salesExecutive: e.target.value})}
                      required
                    />
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
                      value={formData.greenPrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, greenPrice: parseFloat(e.target.value) || 0})}
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
                      value={formData.orangePrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, orangePrice: parseFloat(e.target.value) || 0})}
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
            <div className="flex justify-between items-center">
              <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
              <div className="relative w-64">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Route</th>
                    <th className="text-left p-2">Sales Executive</th>
                    <th className="text-right p-2">Standard (₹)</th>
                    <th className="text-right p-2">Premium (₹)</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr key={customer._id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{customer.name}</td>
                      <td className="p-2">{customer.route}</td>
                      <td className="p-2">{customer.salesExecutive}</td>
                      <td className="p-2 text-right">{customer.greenPrice.toFixed(2)}</td>
                      <td className="p-2 text-right">{customer.orangePrice.toFixed(2)}</td>
                      <td className="p-2">{customer.phone || '-'}</td>
                      <td className="p-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
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
