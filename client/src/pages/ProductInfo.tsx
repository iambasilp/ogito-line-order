import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Info, Plus, Edit, Trash2, ImagePlus, X, Search, Share2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { compressImageToBase64 } from '@/lib/imageUtils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface ProductInfo {
  _id: string;
  name: string;
  description: string;
  image?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const ProductInfoPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [productInfos, setProductInfos] = useState<ProductInfo[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInfo, setEditingInfo] = useState<ProductInfo | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image: string;
    tags: string[];
  }>({
    name: '',
    description: '',
    image: '',
    tags: []
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [tagInput, setTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterTag, setSelectedFilterTag] = useState<string | null>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Image = await compressImageToBase64(file, 600, 600, 0.8);
      setFormData({ ...formData, image: base64Image });
    } catch (error) {
      console.error('Error compressing image:', error);
      setErrorMessage('Failed to process image');
    }
  };

  const processPendingTag = () => {
    const val = tagInput.trim().replace(/^,|,$/g, '');
    let finalTags = formData.tags;
    if (val && !formData.tags.includes(val)) {
      finalTags = [...formData.tags, val];
      setFormData(prev => ({ ...prev, tags: finalTags }));
      setTagInput('');
    }
    return finalTags;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const finalTags = processPendingTag();

    try {
      await api.post('/product-info', { ...formData, tags: finalTags });
      setShowCreateForm(false);
      setFormData({ name: '', description: '', image: '', tags: [] });
      setTagInput('');
      fetchProductInfos();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to create product info');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!editingInfo) return;

    const finalTags = processPendingTag();

    try {
      await api.put(`/product-info/${editingInfo._id}`, { ...formData, tags: finalTags });
      setEditingInfo(null);
      setFormData({ name: '', description: '', image: '', tags: [] });
      setTagInput('');
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

  const handleShare = async (info: ProductInfo) => {
    const plainTextDescription = new DOMParser().parseFromString(info.description, 'text/html').body.textContent || '';
    const shareText = `Product: ${info.name}\n${info.tags && info.tags.length > 0 ? `Tags: ${info.tags.join(', ')}\n` : ''}Description: ${plainTextDescription}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: info.name,
          text: shareText,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing', error);
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Product details copied to clipboard!');
    }
  };

  const openEditForm = (info: ProductInfo) => {
    setEditingInfo(info);
    setFormData({
      name: info.name,
      description: info.description,
      image: info.image || '',
      tags: info.tags || []
    });
    setErrorMessage('');
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,|,$/g, '');
      if (val && !formData.tags.includes(val)) {
        setFormData({ ...formData, tags: [...formData.tags, val] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingInfo(null);
    setFormData({ name: '', description: '', image: '', tags: [] });
    setTagInput('');
    setErrorMessage('');
  };

  const filteredProducts = productInfos.filter(info => {
    const matchesSearch = info.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          info.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedFilterTag ? info.tags?.includes(selectedFilterTag) : true;
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(productInfos.flatMap(info => info.tags || []))).sort();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              Product Info
            </h1>
            <p className="text-muted-foreground mt-1">Notes and descriptions for products</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isAdmin && (
              <Button onClick={() => setShowCreateForm(true)} style={{ backgroundColor: '#E07012' }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Info
              </Button>
            )}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedFilterTag === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilterTag(null)}
            >
              All
            </Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={selectedFilterTag === tag ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilterTag(tag === selectedFilterTag ? null : tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No product information found. Add some notes to get started.
            </div>
          ) : (
            filteredProducts.map((info, index) => (
              <Card 
                key={info._id} 
                className="flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-in fade-in zoom-in-95"
                style={{ animationFillMode: 'both', animationDelay: `${index * 75}ms` }}
              >
                <CardContent className="p-0 flex-1 flex flex-col">
                  {info.image && (
                    <div 
                      className="w-full h-48 overflow-hidden rounded-t-xl shrink-0 cursor-pointer group bg-muted/30 flex items-center justify-center p-2"
                      onClick={() => setSelectedImage(info.image!)}
                    >
                      <img src={info.image} alt={info.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4 gap-2">
                    <h3 className="font-bold text-lg sm:text-xl text-foreground break-words flex-1">{info.name}</h3>
                  <div className="flex gap-0.5 sm:gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleShare(info)} title="Share details">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>
                  </div>
                  <div 
                    className="text-muted-foreground flex-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:text-foreground [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through"
                    dangerouslySetInnerHTML={{ __html: info.description }}
                  />
                  <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span>Added: {new Date(info.createdAt).toLocaleDateString()}</span>
                  </div>
                  {info.tags && info.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {info.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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

            <form onSubmit={editingInfo ? handleUpdate : handleCreate} className="space-y-4 p-4 sm:p-6">
              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spicy Chicken Wings"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Product Note / Description *</Label>
                <div className="bg-background rounded-md border border-input">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Enter notes about this product..."
                    className="min-h-[150px] [&_.ql-editor]:min-h-[110px] [&_.ql-container]:border-none [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input [&_.ql-editor]:text-foreground [&_.ql-snow_.ql-stroke]:stroke-foreground [&_.ql-snow_.ql-fill]:fill-foreground [&_.ql-snow_.ql-picker]:text-foreground"
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Product Image (Optional)</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted">
                    {formData.image ? (
                      <>
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Upload an image to show on the product card. It will be compressed automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tags / Categories</Label>
                <Input
                  type="text"
                  placeholder="Type a tag and press Enter or comma..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDownTag}
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-1 border-none bg-transparent shadow-none flex items-center justify-center h-[90vh]">
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Full size" 
                className="max-h-[85vh] w-auto max-w-full object-contain rounded-md" 
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ProductInfoPage;
