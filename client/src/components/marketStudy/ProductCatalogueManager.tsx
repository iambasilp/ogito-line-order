import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Edit2, 
  Search, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import api from '@/lib/api';
import type { MarketStudyCatalogueItem } from '@/types';

interface ProductCatalogueManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogueUpdated?: () => void;
}

export default function ProductCatalogueManager({
  isOpen,
  onClose,
  onCatalogueUpdated
}: ProductCatalogueManagerProps) {
  const [products, setProducts] = useState<MarketStudyCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add / Edit Modal state
  const [editingProduct, setEditingProduct] = useState<MarketStudyCatalogueItem | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivate / Delete warning state
  const [deactivatingProduct, setDeactivatingProduct] = useState<MarketStudyCatalogueItem | null>(null);
  const [usageInfo, setUsageInfo] = useState<{ inUse: boolean; usageCount: number } | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  const fetchCatalogue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/market-study/catalogue?all=true');
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Failed to load catalogue products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCatalogue();
    }
  }, [isOpen]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    const nextOrder = products.length > 0 ? Math.max(...products.map(p => p.displayOrder || 0)) + 1 : 1;
    setFormDisplayOrder(nextOrder);
    setFormIsActive(true);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (product: MarketStudyCatalogueItem) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDisplayOrder(product.displayOrder || 1);
    setFormIsActive(product.isActive);
    setIsAddEditOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.put(`/market-study/catalogue/${editingProduct._id}`, {
          name: formName.trim(),
          displayOrder: Number(formDisplayOrder) || 1,
          isActive: formIsActive
        });
      } else {
        await api.post('/market-study/catalogue', {
          name: formName.trim(),
          displayOrder: Number(formDisplayOrder) || 1,
          isActive: formIsActive
        });
      }

      setIsAddEditOpen(false);
      await fetchCatalogue();
      if (onCatalogueUpdated) onCatalogueUpdated();
    } catch (error: any) {
      console.error('Error saving catalogue product:', error);
      alert(error?.response?.data?.error || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (product: MarketStudyCatalogueItem) => {
    // If turning inactive, check historical usage
    if (product.isActive) {
      setIsCheckingUsage(true);
      setDeactivatingProduct(product);
      try {
        const res = await api.get(`/market-study/catalogue/${product._id}/usage`);
        setUsageInfo(res.data);
      } catch (err) {
        setUsageInfo({ inUse: false, usageCount: 0 });
      } finally {
        setIsCheckingUsage(false);
      }
    } else {
      // Activating is always safe
      try {
        await api.put(`/market-study/catalogue/${product._id}`, { isActive: true });
        await fetchCatalogue();
        if (onCatalogueUpdated) onCatalogueUpdated();
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Failed to activate product');
      }
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingProduct) return;
    try {
      await api.put(`/market-study/catalogue/${deactivatingProduct._id}`, { isActive: false });
      setDeactivatingProduct(null);
      setUsageInfo(null);
      await fetchCatalogue();
      if (onCatalogueUpdated) onCatalogueUpdated();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to deactivate product');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredProducts.length) return;

    const currentItem = filteredProducts[index];
    const targetItem = filteredProducts[targetIndex];

    const newCurrentOrder = targetItem.displayOrder;
    const newTargetOrder = currentItem.displayOrder;

    try {
      await api.put('/market-study/catalogue/reorder', {
        items: [
          { id: currentItem._id, displayOrder: newCurrentOrder },
          { id: targetItem._id, displayOrder: newTargetOrder }
        ]
      });
      await fetchCatalogue();
      if (onCatalogueUpdated) onCatalogueUpdated();
    } catch (err) {
      console.error('Failed to swap display order:', err);
    }
  };

  const filteredProducts = products.filter(p =>
    !searchTerm.trim() || p.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[96vw] sm:w-full sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/70 shrink-0 bg-card">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <span>Market Study Product Catalogue</span>
                  <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                    Predefined products surveyed by sales officers across retail stores
                  </p>
                </div>
              </DialogTitle>
              <DialogClose onClose={onClose} />
            </div>
          </DialogHeader>

          {/* Search & Action Bar */}
          <div className="p-3.5 sm:p-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search catalogue products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8.5 pr-8 h-9 text-xs rounded-lg bg-background"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="h-9 px-4 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </Button>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                <span>Loading product catalogue...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Package className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No catalogue products found</p>
                <p className="text-[11px] mt-0.5">Click "Add Product" to add items to your catalogue</p>
              </div>
            ) : (
              filteredProducts.map((product, idx) => (
                <div
                  key={product._id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    product.isActive
                      ? 'bg-card border-border/80 shadow-xs hover:border-orange-500/40'
                      : 'bg-muted/40 border-border/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="h-6 w-6 rounded-md bg-muted text-muted-foreground text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {product.displayOrder || idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {product.name}
                        </h4>
                        <Badge
                          variant={product.isActive ? 'default' : 'secondary'}
                          className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${
                            product.isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {product.isActive
                          ? 'Available in survey product selectors'
                          : 'Hidden from new surveys (historical records preserved)'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reorder Buttons */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg p-0"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === filteredProducts.length - 1}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg p-0"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>

                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(product)}
                      className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg p-0"
                      title="Edit Product Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    {/* Toggle Active / Inactive */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(product)}
                      className={`h-7 px-2 text-[10px] font-bold rounded-lg ${
                        product.isActive
                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                      title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 border-t border-border/70 bg-card/95 backdrop-blur shrink-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Catalogue Products: <strong className="text-foreground">{products.length}</strong></span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs rounded-lg px-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Product Modal */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="w-[92vw] sm:max-w-[420px] p-4 sm:p-5 rounded-2xl shadow-xl">
          <DialogHeader className="p-0 border-none pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <span>{editingProduct ? 'Edit Catalogue Product' : 'Add Catalogue Product'}</span>
            </DialogTitle>
            <DialogClose onClose={() => setIsAddEditOpen(false)} />
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="e.g. Cone 120ml, Tub 1L, Cup 100ml"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 text-xs rounded-lg"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                This product category will be available for surveyors to observe across brands.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Display Order</Label>
                <Input
                  type="number"
                  min="1"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  className="h-9 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Status</Label>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-full h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    formIsActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border/70'
                  }`}
                >
                  {formIsActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>{formIsActive ? 'Active' : 'Inactive'}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddEditOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formName.trim()}
                size="sm"
                className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-xs"
              >
                {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation Warning */}
      <Dialog open={!!deactivatingProduct} onOpenChange={(open) => !open && setDeactivatingProduct(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-5 rounded-2xl shadow-xl">
          <DialogHeader className="p-0 border-none pb-2">
            <DialogTitle className="text-base font-bold text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Confirm Product Deactivation</span>
            </DialogTitle>
            <DialogClose onClose={() => setDeactivatingProduct(null)} />
          </DialogHeader>

          <div className="space-y-2.5 my-2 text-xs">
            <p className="text-foreground">
              Are you sure you want to deactivate <strong className="text-orange-600">{deactivatingProduct?.name}</strong>?
            </p>

            {isCheckingUsage ? (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Checking historical surveys...</span>
              </div>
            ) : usageInfo && usageInfo.usageCount > 0 ? (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                <p className="font-semibold">
                  Notice: This product is used in {usageInfo.usageCount} historical survey observation(s).
                </p>
                <p className="text-muted-foreground">
                  Deactivating it will hide it from <em>future</em> survey product selectors. All historical observations will remain safely preserved and visible in reports.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                This product will no longer appear when surveyors create new market surveys.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivatingProduct(null)}
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDeactivation}
              size="sm"
              className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
            >
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
