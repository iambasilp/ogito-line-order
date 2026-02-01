import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import {
  Plus,
  Key,
  Eye,
  EyeOff,
  User,
  Shield,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface UserWithId {
  _id?: string;
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'user';
  createdAt?: string;
  updatedAt?: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [updatingPinFor, setUpdatingPinFor] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showUpdatePin, setShowUpdatePin] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    pin: ''
  });

  const [pinUpdate, setPinUpdate] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.pin.length !== 6 || !/^\d+$/.test(formData.pin)) {
      alert('PIN must be exactly 6 digits');
      return;
    }

    try {
      await api.post('/users', formData);
      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdatePin = async (userId: string) => {
    if (pinUpdate.length !== 6 || !/^\d+$/.test(pinUpdate)) {
      alert('PIN must be exactly 6 digits');
      return;
    }

    try {
      await api.put(`/users/${userId}/pin`, { pin: pinUpdate });
      alert('PIN updated successfully');
      setUpdatingPinFor(null);
      setPinUpdate('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update PIN');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      pin: ''
    });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
            <p className="text-muted-foreground mt-1">Control access and permissions</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Create User Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sales User</DialogTitle>
              <DialogClose onClose={() => {
                setShowForm(false);
                resetForm();
              }} />
            </DialogHeader>
            <div className="py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                      required
                      className="pl-9"
                      placeholder="e.g. john_doe"
                    />
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin">Access PIN (6 digits)</Label>
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.pin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                      className="pr-10 font-mono tracking-widest"
                      placeholder="******"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    This user will have 'user' role permissions
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create User</Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile: Card View */}
        <div className="md:hidden grid gap-4">
          {users.map(user => (
            <Card key={user._id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.username}</h3>
                      <p className="text-sm text-gray-500">{user.name || 'No Name'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${user.role === 'admin'
                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                    : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                    {user.role}
                  </span>
                </div>

                <div className="text-xs text-gray-400 mb-4 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>

                <div className="pt-3 border-t">
                  {updatingPinFor === user._id ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          type={showUpdatePin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Enter new 6-digit PIN"
                          value={pinUpdate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinUpdate(e.target.value.replace(/\D/g, ''))}
                          className="pr-10 font-mono text-center tracking-widest"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowUpdatePin(!showUpdatePin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showUpdatePin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button size="sm" variant="outline" className="h-11" onClick={() => {
                          setUpdatingPinFor(null);
                          setPinUpdate('');
                          setShowUpdatePin(false);
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-11" onClick={() => handleUpdatePin(user._id!)}>
                          Save PIN
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setUpdatingPinFor(user._id!)}
                      variant="outline"
                      className="w-full text-sm h-11 font-medium"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Reset PIN
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: Table View */}
        <Card className="hidden md:block shadow-sm">
          <CardHeader className="py-4 border-b bg-gray-50/40">
            <CardTitle className="text-lg">System Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="text-left px-6 py-3">User Profile</th>
                    <th className="text-left px-6 py-3">Role</th>
                    <th className="text-left px-6 py-3">Created At</th>
                    <th className="text-right px-6 py-3">Security Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.username}</div>
                            <div className="text-xs text-gray-500">{user.name || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {updatingPinFor === user._id ? (
                          <div className="flex items-center justify-end gap-2 animate-in fade-in duration-200">
                            <div className="relative w-32">
                              <Input
                                type={showUpdatePin ? "text" : "password"}
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="PIN"
                                value={pinUpdate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinUpdate(e.target.value.replace(/\D/g, ''))}
                                className="h-8 text-xs font-mono pr-8"
                              />
                            </div>
                            <Button size="sm" onClick={() => handleUpdatePin(user._id!)} className="h-8 w-8 p-0">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setUpdatingPinFor(null);
                              setPinUpdate('');
                            }} className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                              <DialogClose onClose={() => { }} />
                              <span className="sr-only">X</span>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUpdatingPinFor(user._id!)}
                            className="h-8 text-xs"
                          >
                            <Key className="h-3 w-3 mr-2 text-gray-400" />
                            Update PIN
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">No users found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Users;
