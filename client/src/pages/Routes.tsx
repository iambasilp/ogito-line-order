import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';

interface Route {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RouteStats {
  customersCount: number;
  ordersCount: number;
}

const Routes: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [routeStats, setRouteStats] = useState<Record<string, RouteStats>>({});

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data);
      
      // Fetch stats for each route
      const stats: Record<string, RouteStats> = {};
      await Promise.all(
        response.data.map(async (route: Route) => {
          try {
            const statsRes = await api.get(`/routes/${route._id}/stats`);
            stats[route._id] = statsRes.data;
          } catch (error) {
            console.error(`Failed to fetch stats for route ${route._id}`);
          }
        })
      );
      setRouteStats(stats);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      await api.post('/routes', formData);
      setShowCreateForm(false);
      setFormData({ name: '' });
      fetchRoutes();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to create route');
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!editingRoute) return;

    try {
      await api.put(`/routes/${editingRoute._id}`, formData);
      setEditingRoute(null);
      setFormData({ name: '' });
      fetchRoutes();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to update route');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm('Are you sure you want to delete this route?')) {
      return;
    }

    try {
      await api.delete(`/routes/${routeId}`);
      fetchRoutes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete route');
    }
  };

  const openEditForm = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name
    });
    setErrorMessage('');
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingRoute(null);
    setFormData({ name: '' });
    setErrorMessage('');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-8 w-8" style={{ color: '#9E1216' }} />
              Routes Management
            </h1>
            <p className="text-gray-600 mt-1">Manage delivery routes</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} style={{ backgroundColor: '#9E1216' }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>

        {/* Routes Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No routes found. Create your first route to get started.
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => (
                      <tr key={route._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                            <span className="font-medium text-gray-900">{route.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {routeStats[route._id]?.customersCount ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {routeStats[route._id]?.ordersCount ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(route.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditForm(route)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRoute(route._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Route Dialog */}
        <Dialog open={showCreateForm || editingRoute !== null} onOpenChange={closeForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Edit Route' : 'Create New Route'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={editingRoute ? handleUpdateRoute : handleCreateRoute} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errorMessage}
                </div>
              )}

              <div>
                <Label htmlFor="name">Route Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  placeholder="e.g., PANDIKKAD, TIRUR"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: '#9E1216' }}>
                  {editingRoute ? 'Update Route' : 'Create Route'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Routes;
