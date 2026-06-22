import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  Key,
  Eye,
  EyeOff,
  User,
  Calendar,
  CheckCircle2,
  Truck
} from 'lucide-react';

interface UserWithId {
  _id?: string;
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'user' | 'driver';
  createdAt?: string;
  updatedAt?: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [updatingPinFor, setUpdatingPinFor] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showUpdatePin, setShowUpdatePin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    pin: '',
    role: 'user' as 'user' | 'driver'
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

    setIsSubmitting(true);
    try {
      await api.post('/users', formData);
      triggerReward();
      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePin = async (userId: string) => {
    if (pinUpdate.length !== 6 || !/^\d+$/.test(pinUpdate)) {
      alert('PIN must be exactly 6 digits');
      return;
    }

    try {
      await api.put(`/users/${userId}/pin`, { pin: pinUpdate });
      triggerReward();
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
      pin: '',
      role: 'user'
    });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Control access and permissions</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="sm:max-w-[440px] p-0 border border-border shadow-xl rounded-2xl overflow-hidden bg-card text-card-foreground">
            <div className="p-8 space-y-8">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Create User
                </DialogTitle>
                <p className="text-muted-foreground text-sm">Add a new team member to the platform</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Inputs Group */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                      required
                      aria-required="true"
                      autoComplete="username"
                      className="h-11 bg-muted/30 border-border focus:bg-card transition-all rounded-xl"
                      placeholder="e.g. john_doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      required
                      aria-required="true"
                      autoComplete="name"
                      className="h-11 bg-muted/30 border-border focus:bg-card transition-all rounded-xl"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Role</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'user' })}
                      className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all font-medium ${formData.role === 'user'
                          ? 'border-primary bg-primary text-primary-foreground shadow-md'
                          : 'border-border bg-muted text-muted-foreground hover:border-border/80'
                        }`}
                    >
                      <User className="h-4 w-4" />
                      Salesman
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'driver' })}
                      className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all font-medium ${formData.role === 'driver'
                          ? 'border-primary bg-primary text-primary-foreground shadow-md'
                          : 'border-border bg-muted text-muted-foreground hover:border-border/80'
                        }`}
                    >
                      <Truck className="h-4 w-4" />
                      Driver
                    </button>
                  </div>
                </div>

                {/* PIN */}
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-sm font-medium text-foreground">Access PIN</Label>
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.pin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                      className="h-12 bg-muted/30 border-border text-center text-xl font-mono tracking-widest focus:bg-card rounded-xl"
                      placeholder="••••••"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 text-muted-foreground rounded-xl"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile: Card View */}
        <div className="md:hidden grid gap-4">
          {users.map(user => (
            <Card key={user._id} className="shadow-sm border-border bg-card text-card-foreground">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                      user.role === 'admin' 
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/30' 
                        : user.role === 'driver' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30' 
                          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30'
                    }`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{user.username}</h3>
                      <p className="text-sm text-muted-foreground">{user.name || 'No Name'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border transition-all ${user.role === 'admin'
                      ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/20'
                      : user.role === 'driver'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/20'
                        : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/20'
                    }`}>
                    {user.role}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground mb-4 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>

                <div className="pt-3 border-t border-border">
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
                          aria-label="New PIN"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUpdatePin(!showUpdatePin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showUpdatePin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button size="sm" variant="outline" className="h-11 rounded-xl" onClick={() => {
                          setUpdatingPinFor(null);
                          setPinUpdate('');
                          setShowUpdatePin(false);
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-11 rounded-xl bg-primary text-primary-foreground" onClick={() => handleUpdatePin(user._id!)}>
                          Save PIN
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setUpdatingPinFor(user._id!)}
                      variant="outline"
                      className="w-full text-sm h-11 font-medium rounded-xl border-border hover:bg-muted"
                    >
                      <Key className="h-4 w-4 mr-2 text-muted-foreground" />
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
          <CardHeader className="py-4 border-b border-border bg-muted/20">
            <CardTitle className="text-lg">System Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-medium">
                  <tr>
                    <th className="text-left px-6 py-3">User Profile</th>
                    <th className="text-left px-6 py-3">Role</th>
                    <th className="text-left px-6 py-3">Created At</th>
                    <th className="text-right px-6 py-3">Security Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                            user.role === 'admin' 
                              ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/30' 
                              : user.role === 'driver' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30' 
                                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30'
                          }`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{user.username}</div>
                            <div className="text-xs text-muted-foreground">{user.name || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${user.role === 'admin'
                          ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/20'
                          : user.role === 'driver'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/20'
                            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/20'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
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
                                className="h-8 text-xs font-mono pr-8 rounded-lg"
                                aria-label="New PIN"
                                autoComplete="new-password"
                              />
                            </div>
                            <Button size="sm" onClick={() => handleUpdatePin(user._id!)} className="h-8 w-8 p-0 rounded-lg bg-primary text-primary-foreground">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button 
                               size="sm" 
                               variant="ghost" 
                               onClick={() => {
                                 setUpdatingPinFor(null);
                                 setPinUpdate('');
                               }} 
                               className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                             >
                               <span className="text-lg leading-none">&times;</span>
                               <span className="sr-only">Cancel</span>
                             </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUpdatingPinFor(user._id!)}
                            className="h-8 text-xs rounded-lg border-border hover:bg-muted"
                          >
                            <Key className="h-3 w-3 mr-2 text-muted-foreground" />
                            Update PIN
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No users found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Users;
