import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Key, Eye, EyeOff } from 'lucide-react';

interface UserWithId {
  _id?: string;
  id: string;
  username: string;
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
      pin: ''
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Users</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Create User Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pin">PIN (6 digits)</Label>
                    <div className="relative">
                      <Input
                        id="pin"
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={6}
                        value={formData.pin}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Creates a Sales User (not admin)
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Create User</Button>
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
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Username</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{user.username}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-2">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        {updatingPinFor === user._id ? (
                          <div className="flex gap-2 items-center">
                            <div className="relative">
                              <Input
                                type={showUpdatePin ? "text" : "password"}
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="New PIN"
                                value={pinUpdate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinUpdate(e.target.value.replace(/\D/g, ''))}
                                className="w-32 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowUpdatePin(!showUpdatePin)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showUpdatePin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                            <Button size="sm" onClick={() => handleUpdatePin(user._id!)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setUpdatingPinFor(null);
                                setPinUpdate('');
                                setShowUpdatePin(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUpdatingPinFor(user._id!)}
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Update PIN
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Users;
