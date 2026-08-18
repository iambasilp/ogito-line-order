import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Info, Plus, Edit, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ProductInfo {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const ProductInfoPage: React.FC = () => {

  const [productInfos, setProductInfos] = useState<ProductInfo[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInfo, setEditingInfo] = useState<ProductInfo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  const fetchProductInfos = useCallback(async () => {
    try {
      const response = await api.get('/product-info');
      setProductInfos(response.data);
    } catch (error) {
      console.error('Failed to fetch product info:', error);
    }
  }, []);

  useEffect(() => {
    fetchProductInfos();
  }, [fetchProductInfos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      await api.post('/product-info', formData);
      setShowCreateForm(false);
      setFormData({ name: '', description: '' });
      fetchProductInfos();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to create product info');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!editingInfo) return;

    try {
      await api.put(`/product-info/${editingInfo._id}`, formData);
      setEditingInfo(null);
      setFormData({ name: '', description: '' });
      fetchProductInfos();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to update product info');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Product Info',
      description: 'Are you sure you want to delete this product info?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/product-info/${id}`);
          fetchProductInfos();
        } catch (error: any) {
          alert(error.response?.data?.error || 'Failed to delete product info');
        }
      }
    });
  };

  const openEditForm = (info: ProductInfo) => {
    setEditingInfo(info);
    setFormData({
      name: info.name,
      description: info.description
    });
    setErrorMessage('');
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingInfo(null);
    setFormData({ name: '', description: '' });
    setErrorMessage('');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Info className="h-8 w-8" style={{ color: '#E07012' }} />
              Product Info
            </h1>
            <p className="text-muted-foreground mt-1">Notes and descriptions for products</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} style={{ backgroundColor: '#E07012' }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Info
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productInfos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No product information found. Add some notes to get started.
            </div>
          ) : (
            productInfos.map((info) => (
              <Card key={info._id} className="flex flex-col h-full">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-xl text-foreground break-words">{info.name}</h3>
                  <div className="flex gap-1 ml-4 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(info)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(info._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  </div>
                  <div className="text-muted-foreground whitespace-pre-wrap flex-1">
                    {info.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                    Added: {new Date(info.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={showCreateForm || editingInfo !== null} onOpenChange={closeForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingInfo ? 'Edit Product Info' : 'Add Product Info'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={editingInfo ? handleUpdate : handleCreate} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errorMessage}
                </div>
              )}

              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spicy Chicken Wings"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Product Note / Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter notes about this product..."
                  required
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" style={{ backgroundColor: '#E07012' }}>
                  {editingInfo ? 'Update Info' : 'Add Info'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig({ ...confirmModalConfig, isOpen: false })}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        description={confirmModalConfig.description}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
      />
    </Layout>
  );
};

export default ProductInfoPage;
