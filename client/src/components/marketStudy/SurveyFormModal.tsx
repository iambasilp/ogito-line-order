import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Store,
  MapPin,
  Package,
  Plus,
  Trash2,
  Copy,
  Tag,
  Scale,
  IndianRupee,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Check,
  Search,
  Save,
  FileText,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type {
  MarketStudyCatalogueItem,
  MarketStudySurvey,
  MarketStudyObservation
} from '@/types';

const COMMON_BRANDS = [
  'Ogito',
  'Amul',
  'Kwality Wall\'s',
  'Arun Icecreams',
  'Havmor',
  'Vadilal',
  'Hangyo',
  'Dairy Day',
  'Creambell',
  'Mother Dairy',
  'Milma'
];

const CUSTOMER_TYPES = [
  'Retailer',
  'Supermarket',
  'Wholesaler',
  'HORECA',
  'Modern Trade',
  'Distributor',
  'Bakery / Sweet Shop',
  'Cool Bar / Juice Center',
  'General Store',
  'Other'
];

const PACKAGING_TYPES = [
  'Cone',
  'Cup',
  'Tub',
  'Stick / Bar',
  'Box / Family Pack',
  'Party Tub (2L+)',
  'Pouch',
  'Cassata / Cake',
  'Other'
];

const QUICK_LITRE_WEIGHTS = [
  '70 ml',
  '100 ml',
  '120 ml',
  '250 ml',
  '500 ml',
  '750 ml',
  '1 Litre',
  '1.25 Litre',
  '1.5 Litre',
  '2 Litre',
  '2.5 Litre',
  '3 Litre',
  '4 Litre',
  '5 Litre'
];

const QUICK_KG_WEIGHTS = [
  '250 g',
  '400 g',
  '500 g',
  '750 g',
  '1 kg',
  '1.25 kg',
  '1.5 kg',
  '2 kg',
  '2.5 kg',
  '3 kg',
  '4 kg',
  '5 kg'
];

const POPULAR_VARIANT_LABELS = [
  'Vanilla',
  'Butterscotch',
  'Chocolate',
  'Spanish Delight',
  'Mango',
  'Kesar Pista',
  'Strawberry',
  'Black Forest',
  'Kulfi',
  'Sugar Free',
  'Twin Pack',
  'Family Pack',
  '1+1 Offer'
];

interface ProductGroup {
  catalogueProductId?: string;
  catalogueProductName: string;
  isExpanded: boolean;
  variants: MarketStudyObservation[];
}

interface SurveyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyToEdit?: MarketStudySurvey | null;
  onSurveySaved: () => void;
}

export default function SurveyFormModal({
  isOpen,
  onClose,
  surveyToEdit,
  onSurveySaved
}: SurveyFormModalProps) {
  const { user } = useAuth();

  // Reference data
  const [catalogue, setCatalogue] = useState<MarketStudyCatalogueItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Survey header visit state
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState('Retailer');
  const [marketLocation, setMarketLocation] = useState('');
  const [routeId, setRouteId] = useState<string | undefined>(undefined);
  const [surveyDate, setSurveyDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectedBy, setCollectedBy] = useState('');
  const [surveyNotes, setSurveyNotes] = useState('');
  const [status, setStatus] = useState<'completed' | 'draft'>('completed');

  // Multi-Product & Variant Groups
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);

  // Add Product selector state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch reference data on modal open
  useEffect(() => {
    if (!isOpen) return;

    const fetchRefs = async () => {
      try {
        const [catRes, custRes, routeRes] = await Promise.allSettled([
          api.get('/market-study/catalogue'),
          api.get('/customers?limit=2000'),
          api.get('/routes')
        ]);

        if (catRes.status === 'fulfilled' && catRes.value.data?.products) {
          setCatalogue(catRes.value.data.products);
        }
        if (custRes.status === 'fulfilled' && custRes.value.data?.customers) {
          setCustomers(custRes.value.data.customers);
        }
        if (routeRes.status === 'fulfilled' && Array.isArray(routeRes.value.data)) {
          setRoutes(routeRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load survey form references:', err);
      }
    };

    fetchRefs();
  }, [isOpen]);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (surveyToEdit) {
      // Edit existing survey
      setCustomerName(surveyToEdit.customerName || '');
      setCustomerType(surveyToEdit.customerType || 'Retailer');
      setMarketLocation(surveyToEdit.marketLocation || '');
      setRouteId(surveyToEdit.routeId ? String(surveyToEdit.routeId) : undefined);
      setSurveyDate(
        surveyToEdit.surveyDate
          ? surveyToEdit.surveyDate.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setCollectedBy(surveyToEdit.collectedBy || user?.name || user?.username || 'Staff');
      setSurveyNotes(surveyToEdit.notes || '');
      setStatus(surveyToEdit.status || 'completed');

      // Group observations by catalogueProductName
      const groupedMap = new Map<string, MarketStudyObservation[]>();
      (surveyToEdit.observations || []).forEach((obs) => {
        const key = obs.catalogueProductName || 'General Product';
        if (!groupedMap.has(key)) {
          groupedMap.set(key, []);
        }
        groupedMap.get(key)!.push({ ...obs });
      });

      const newGroups: ProductGroup[] = [];
      groupedMap.forEach((obsList, prodName) => {
        newGroups.push({
          catalogueProductId: obsList[0]?.catalogueProductId ? String(obsList[0].catalogueProductId) : undefined,
          catalogueProductName: prodName,
          isExpanded: true,
          variants: obsList
        });
      });

      setProductGroups(newGroups);
    } else {
      // Fresh New Survey
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setCustomerName('');
      setCustomerType('Retailer');
      setMarketLocation('');
      setRouteId(undefined);
      setSurveyDate(new Date().toISOString().split('T')[0]);
      setCollectedBy(user?.name || user?.username || 'Staff');
      setSurveyNotes('');
      setStatus('completed');
      setProductGroups([]);
    }
  }, [isOpen, surveyToEdit, user]);

  // Customer Selection Handler
  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name || cust.shopName || '');
    if (cust.customerType) setCustomerType(cust.customerType);

    // Resolve location / route
    if (cust.route) {
      if (typeof cust.route === 'object' && cust.route.name) {
        setMarketLocation(cust.route.name);
        setRouteId(cust.route._id);
      } else {
        const found = routes.find((r) => r._id === cust.route);
        if (found) {
          setMarketLocation(found.name);
          setRouteId(found._id);
        }
      }
    }
  };

  // Add Product to survey from catalogue
  const handleAddProduct = () => {
    if (!selectedCatalogueId) return;

    const prod = catalogue.find((p) => p._id === selectedCatalogueId);
    if (!prod) return;

    // Check if product group already exists
    const existingIndex = productGroups.findIndex(
      (g) => g.catalogueProductName.toLowerCase() === prod.name.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Just expand existing product group
      const updated = [...productGroups];
      updated[existingIndex].isExpanded = true;
      setProductGroups(updated);
    } else {
      // Create new product group with 1 empty initial variant
      const initialVariant: MarketStudyObservation = {
        catalogueProductId: prod._id,
        catalogueProductName: prod.name,
        brandName: '',
        variant: '',
        weight: '',
        packagingType: 'Tub',
        landingPrice: 0,
        sellingPrice: 0,
        mrp: 0,
        promotionNotes: '',
        notes: '',
        createdAt: new Date().toISOString()
      };

      setProductGroups([
        ...productGroups,
        {
          catalogueProductId: prod._id,
          catalogueProductName: prod.name,
          isExpanded: true,
          variants: [initialVariant]
        }
      ]);
    }

    setSelectedCatalogueId('');
    setIsAddingProduct(false);
  };

  // Remove whole product group
  const handleRemoveProductGroup = (groupIndex: number) => {
    const groupName = productGroups[groupIndex].catalogueProductName;
    if (confirm(`Remove "${groupName}" and all its recorded variants?`)) {
      setProductGroups(productGroups.filter((_, idx) => idx !== groupIndex));
    }
  };

  // Add blank variant under product
  const handleAddVariant = (groupIndex: number) => {
    const group = productGroups[groupIndex];
    const newVariant: MarketStudyObservation = {
      catalogueProductId: group.catalogueProductId,
      catalogueProductName: group.catalogueProductName,
      brandName: '',
      variant: '',
      weight: '',
      packagingType: 'Tub',
      landingPrice: 0,
      sellingPrice: 0,
      mrp: 0,
      promotionNotes: '',
      notes: '',
      createdAt: new Date().toISOString()
    };

    const updated = [...productGroups];
    updated[groupIndex].variants.push(newVariant);
    setProductGroups(updated);
  };

  // Copy previous variant under product (FAST ENTRY)
  const handleCopyVariant = (groupIndex: number, variantIndex: number) => {
    const source = productGroups[groupIndex].variants[variantIndex];
    const cloned: MarketStudyObservation = {
      ...source,
      _id: undefined, // New record
      variant: '', // Clear flavor so surveyor can quickly pick new flavor
      createdAt: new Date().toISOString()
    };

    const updated = [...productGroups];
    updated[groupIndex].variants.splice(variantIndex + 1, 0, cloned);
    setProductGroups(updated);
  };

  // Update specific variant field
  const handleUpdateVariant = (
    groupIndex: number,
    variantIndex: number,
    field: keyof MarketStudyObservation,
    value: any
  ) => {
    const updated = [...productGroups];
    (updated[groupIndex].variants[variantIndex] as any)[field] = value;
    setProductGroups(updated);
  };

  // Remove single variant
  const handleRemoveVariant = (groupIndex: number, variantIndex: number) => {
    const updated = [...productGroups];
    updated[groupIndex].variants.splice(variantIndex, 1);
    // If all variants removed, remove product group or keep 1 blank
    if (updated[groupIndex].variants.length === 0) {
      updated.splice(groupIndex, 1);
    }
    setProductGroups(updated);
  };

  // Toggle expand/collapse
  const handleToggleExpand = (groupIndex: number) => {
    const updated = [...productGroups];
    updated[groupIndex].isExpanded = !updated[groupIndex].isExpanded;
    setProductGroups(updated);
  };

  // Total flat observations
  const allFlattenedObservations = useMemo(() => {
    return productGroups.flatMap((g) => g.variants);
  }, [productGroups]);

  // Overall totals for review
  const surveyTotals = useMemo(() => {
    let totalSelling = 0;
    let totalLanding = 0;
    let totalProfit = 0;
    let validCount = 0;

    allFlattenedObservations.forEach((v) => {
      totalSelling += v.sellingPrice || 0;
      totalLanding += v.landingPrice || 0;
      if (v.sellingPrice > 0 && v.landingPrice > 0) {
        totalProfit += v.sellingPrice - v.landingPrice;
        validCount++;
      }
    });

    const avgMargin = totalSelling > 0 ? ((totalProfit / totalSelling) * 100).toFixed(1) : '0';
    return {
      totalProducts: productGroups.length,
      totalVariants: allFlattenedObservations.length,
      totalProfit,
      avgMargin
    };
  }, [productGroups, allFlattenedObservations]);

  // Save Survey Handler (Atomic save)
  const handleSaveSurvey = async (saveStatus: 'completed' | 'draft') => {
    if (!customerName.trim()) {
      alert('Please select or enter a Customer / Shop Name.');
      return;
    }

    if (saveStatus === 'completed' && allFlattenedObservations.length === 0) {
      alert('Please add at least one product and variant to complete the survey.');
      return;
    }

    // Validate brand names
    if (saveStatus === 'completed') {
      for (let g = 0; g < productGroups.length; g++) {
        const grp = productGroups[g];
        for (let v = 0; v < grp.variants.length; v++) {
          const vr = grp.variants[v];
          if (!vr.brandName.trim()) {
            alert(
              `Please select or type a Brand Name for "${grp.catalogueProductName}" (Variant #${v + 1}).`
            );
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer?._id || surveyToEdit?.customerId || undefined,
        customerName: customerName.trim(),
        customerType,
        marketLocation: marketLocation.trim(),
        routeId,
        surveyDate,
        collectedBy: collectedBy.trim() || user?.name || user?.username || 'Staff',
        notes: surveyNotes.trim(),
        status: saveStatus,
        observations: allFlattenedObservations.map((obs) => ({
          ...obs,
          landingPrice: Number(obs.landingPrice) || 0,
          sellingPrice: Number(obs.sellingPrice) || 0,
          mrp: Number(obs.mrp) || 0
        }))
      };

      if (surveyToEdit) {
        await api.put(`/market-study/surveys/${surveyToEdit._id}`, payload);
      } else {
        await api.post('/market-study/surveys', payload);
      }

      onSurveySaved();
      onClose();
    } catch (error: any) {
      console.error('Failed to save market survey:', error);
      alert(error?.response?.data?.error || 'Failed to save market survey.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered customer list for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 10);
    const q = customerSearchQuery.toLowerCase().trim();
    return customers
      .filter((c) => (c.name || c.shopName || '').toLowerCase().includes(q))
      .slice(0, 15);
  }, [customers, customerSearchQuery]);

  // Available catalogue items not yet added
  const availableCatalogueProducts = useMemo(() => {
    const addedNames = new Set(productGroups.map((g) => g.catalogueProductName.toLowerCase()));
    return catalogue.filter((p) => p.isActive && !addedNames.has(p.name.toLowerCase()));
  }, [catalogue, productGroups]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="w-[98vw] sm:w-full sm:max-w-[940px] max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl bg-background">
        
        {/* Sticky Header */}
        <DialogHeader className="p-3.5 sm:p-5 border-b border-border/80 shrink-0 bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold truncate">
                  {surveyToEdit ? 'Edit Market Survey' : 'New Market Survey Visit'}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground truncate">
                  Collect multi-product competitor pricing & margins for this shop visit
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={status === 'completed' ? 'default' : 'secondary'}
                className="text-[10px] font-semibold py-0.5"
              >
                {status === 'completed' ? 'Completed Survey' : 'Draft'}
              </Badge>
              <DialogClose onClose={onClose} />
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain">
          
          {/* STEP 1: Shop & Visit Information Card */}
          <Card className="border-border/70 shadow-xs rounded-xl overflow-hidden bg-card">
            <div className="p-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Step 1: Shop & Visit Information
                </h3>
              </div>
              {selectedCustomer && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Customer Master Linked
                </span>
              )}
            </div>

            <CardContent className="p-3.5 space-y-3">
              {/* Customer Search Autocomplete */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Select Customer / Shop <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search existing shop name (e.g. Metro Supermarket, Calicut)..."
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setCustomerSearchQuery(e.target.value);
                    }}
                    className="pl-8.5 text-xs h-10 rounded-lg bg-background"
                  />
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName('');
                        setSelectedCustomer(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Suggestions dropdown chips */}
                {customerSearchQuery && filteredCustomers.length > 0 && !selectedCustomer && (
                  <div className="mt-1 p-2 bg-popover border border-border/80 rounded-xl shadow-lg max-h-40 overflow-y-auto space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground px-1 block">
                      Select Existing Customer:
                    </span>
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust._id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full text-left p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="font-semibold text-foreground truncate">
                          {cust.name || cust.shopName}
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">
                          {cust.customerType || 'Retailer'} • {typeof cust.route === 'object' ? cust.route?.name : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Type, Location & Collector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Customer Type</Label>
                  <Select value={customerType} onValueChange={setCustomerType}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue placeholder="Customer Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> Location / Route
                  </Label>
                  <Input
                    list="survey-routes-list"
                    placeholder="e.g. Calicut, Route B"
                    value={marketLocation}
                    onChange={(e) => setMarketLocation(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                  <datalist id="survey-routes-list">
                    {routes.map((r) => (
                      <option key={r._id} value={r.name} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Survey Date</Label>
                  <Input
                    type="date"
                    value={surveyDate}
                    onChange={(e) => setSurveyDate(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Surveyor & Visit Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Surveyor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="Officer name"
                    value={collectedBy}
                    onChange={(e) => setCollectedBy(e.target.value)}
                    className="h-9 text-xs rounded-lg font-medium"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">General Visit Notes</Label>
                  <Input
                    placeholder="e.g. Competitor freezer installed, store footfall high, discount ongoing..."
                    value={surveyNotes}
                    onChange={(e) => setSurveyNotes(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: Products & Observed Variants */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-orange-600" />
                  <span>Step 2: Observed Products & Variants ({productGroups.length} Products)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add catalogue products found in this store and record multiple flavor/size variants under each
                </p>
              </div>

              {/* Add Product Button */}
              <Button
                type="button"
                onClick={() => setIsAddingProduct(true)}
                size="sm"
                className="h-8 px-3 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Catalogue Product
              </Button>
            </div>

            {/* Add Product Inline Picker */}
            {isAddingProduct && (
              <Card className="p-3 border-orange-500/40 bg-orange-500/[0.03] rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-orange-800 dark:text-orange-300">
                    Select Product from Predefined Catalogue
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsAddingProduct(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedCatalogueId} onValueChange={setSelectedCatalogueId}>
                    <SelectTrigger className="h-9 text-xs rounded-lg bg-background flex-1">
                      <SelectValue placeholder="Choose a product from catalogue (e.g. Product 1, Tub 1L)..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCatalogueProducts.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddProduct}
                    disabled={!selectedCatalogueId}
                    className="h-9 px-4 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shrink-0 shadow-xs"
                  >
                    Add
                  </Button>
                </div>
              </Card>
            )}

            {/* Empty State */}
            {productGroups.length === 0 && !isAddingProduct && (
              <div className="py-10 text-center border-2 border-dashed border-border/80 rounded-2xl p-6 bg-muted/10 space-y-2">
                <Package className="w-8 h-8 text-orange-500/60 mx-auto" />
                <h4 className="text-xs font-bold text-foreground">No Products Added to this Visit Yet</h4>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Click the <strong>"+ Add Catalogue Product"</strong> button above to pick products from the company catalogue and log competitor variants.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingProduct(true)}
                  className="h-8 text-xs font-bold border-orange-500/40 text-orange-600 hover:bg-orange-50 mt-1"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Pick First Product
                </Button>
              </div>
            )}

            {/* List of Product Groups */}
            {productGroups.map((group, groupIdx) => (
              <Card
                key={groupIdx}
                className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-card"
              >
                {/* Product Header Accordion */}
                <div className="p-3 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                    onClick={() => handleToggleExpand(groupIdx)}
                  >
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      {group.isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-orange-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs sm:text-sm text-foreground truncate">
                          {group.catalogueProductName}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 font-mono">
                          {group.variants.length} {group.variants.length === 1 ? 'Variant' : 'Variants'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddVariant(groupIdx)}
                      className="h-7 px-2.5 text-[10px] font-bold gap-1 rounded-lg"
                      title="Add another variant under this product"
                    >
                      <Plus className="w-3 h-3 text-orange-600" />
                      Add Variant
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveProductGroup(groupIdx)}
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-0"
                      title="Remove Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Collapsible Variants Container */}
                {group.isExpanded && (
                  <CardContent className="p-3 sm:p-4 space-y-3.5 bg-background">
                    {group.variants.map((variant, varIdx) => {
                      // Live Calculations
                      const landing = Number(variant.landingPrice) || 0;
                      const selling = Number(variant.sellingPrice) || 0;
                      const mrp = Number(variant.mrp) || 0;

                      const profit = selling > 0 && landing > 0 ? selling - landing : 0;
                      const marginPct =
                        selling > 0 && landing > 0
                          ? (((selling - landing) / selling) * 100).toFixed(1)
                          : '0';
                      const mrpDiff = mrp > 0 && selling > 0 ? mrp - selling : 0;

                      const isSellingAboveMrp = mrp > 0 && selling > mrp;
                      const isLandingAboveSelling = selling > 0 && landing > selling;

                      return (
                        <div
                          key={varIdx}
                          className="p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card shadow-xs space-y-2.5 relative"
                        >
                          {/* Variant Card Top Toolbar */}
                          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                                <span className="h-5 w-5 rounded-md bg-orange-500/10 text-orange-600 text-[10px] font-mono font-bold flex items-center justify-center">
                                  #{varIdx + 1}
                                </span>
                                <span>{variant.brandName || 'Observed Variant'}</span>
                              </span>
                              {variant.variant && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  {variant.variant}
                                </Badge>
                              )}
                              {variant.weight && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                  {variant.weight}
                                </span>
                              )}
                            </div>

                            {/* Fast Actions: Copy & Remove */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyVariant(groupIdx, varIdx)}
                                className="h-7 px-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg gap-1"
                                title="Duplicate this variant and edit flavor/price"
                              >
                                <Copy className="w-3 h-3" />
                                Copy Variant
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveVariant(groupIdx, varIdx)}
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-0"
                                title="Remove Variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Brand & Variant Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Brand Name */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-foreground">
                                Brand Name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                placeholder="e.g. Arun, Amul, Ogito..."
                                value={variant.brandName}
                                onChange={(e) =>
                                  handleUpdateVariant(groupIdx, varIdx, 'brandName', e.target.value)
                                }
                                className="h-8 text-xs rounded-lg"
                              />
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {COMMON_BRANDS.slice(0, 5).map((b) => (
                                  <button
                                    key={b}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateVariant(groupIdx, varIdx, 'brandName', b)
                                    }
                                    className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${
                                      variant.brandName === b
                                        ? 'bg-orange-500 text-white border-orange-500 font-bold'
                                        : 'bg-muted/40 text-muted-foreground border-border/70'
                                    }`}
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Flavour / Variant Label */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                <Tag className="w-3 h-3 text-orange-500" />
                                <span>Flavour / Variant / Label</span>
                              </Label>
                              <Input
                                placeholder="e.g. Vanilla, Butterscotch, Sugar Free..."
                                value={variant.variant}
                                onChange={(e) =>
                                  handleUpdateVariant(groupIdx, varIdx, 'variant', e.target.value)
                                }
                                className="h-8 text-xs rounded-lg"
                              />
                              <div className="flex flex-wrap gap-1 pt-0.5 max-h-12 overflow-y-auto">
                                {POPULAR_VARIANT_LABELS.slice(0, 6).map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateVariant(groupIdx, varIdx, 'variant', tag)
                                    }
                                    className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${
                                      variant.variant === tag
                                        ? 'bg-amber-500 text-white border-amber-500 font-bold'
                                        : 'bg-muted/40 text-muted-foreground border-border/70'
                                    }`}
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Weight & Packaging Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Product Weight */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                  <Scale className="w-3 h-3 text-orange-500" />
                                  <span>Weight / Volume</span>
                                </Label>
                                {variant.weight && (
                                  <span className="text-[9px] font-mono font-bold text-orange-600">
                                    {variant.weight}
                                  </span>
                                )}
                              </div>
                              <Input
                                placeholder="e.g. 1 Litre, 500 ml, 250 g..."
                                value={variant.weight}
                                onChange={(e) =>
                                  handleUpdateVariant(groupIdx, varIdx, 'weight', e.target.value)
                                }
                                className="h-8 text-xs rounded-lg"
                              />
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {[...QUICK_LITRE_WEIGHTS.slice(0, 6), ...QUICK_KG_WEIGHTS.slice(0, 5)].map(
                                  (w) => (
                                    <button
                                      key={w}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateVariant(groupIdx, varIdx, 'weight', w)
                                      }
                                      className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${
                                        variant.weight === w
                                          ? 'bg-orange-500 text-white border-orange-500 font-bold'
                                          : 'bg-muted/40 text-muted-foreground border-border/70'
                                      }`}
                                    >
                                      {w}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Packaging Type */}
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                <Layers className="w-3 h-3 text-orange-500" />
                                <span>Packaging Type</span>
                              </Label>
                              <Input
                                placeholder="e.g. Tub, Cone, Cup, Bar..."
                                value={variant.packagingType}
                                onChange={(e) =>
                                  handleUpdateVariant(
                                    groupIdx,
                                    varIdx,
                                    'packagingType',
                                    e.target.value
                                  )
                                }
                                className="h-8 text-xs rounded-lg"
                              />
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {PACKAGING_TYPES.map(
                                  (p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateVariant(groupIdx, varIdx, 'packagingType', p)
                                      }
                                      className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${
                                        variant.packagingType === p
                                          ? 'bg-orange-500 text-white border-orange-500 font-bold'
                                          : 'bg-muted/40 text-muted-foreground border-border/70'
                                      }`}
                                    >
                                      {p.split(' ')[0]}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pricing Inputs (3-Column Grid) */}
                          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <IndianRupee className="w-3 h-3 text-orange-500" />
                                <span>Variant Pricing (INR)</span>
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {profit > 0 && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    Gross Profit: ₹{profit.toFixed(2)} ({marginPct}%)
                                  </span>
                                )}
                                {mrpDiff > 0 && (
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    • Save ₹{mrpDiff.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                                  Landing (₹) *
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={variant.landingPrice || ''}
                                  onChange={(e) =>
                                    handleUpdateVariant(
                                      groupIdx,
                                      varIdx,
                                      'landingPrice',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-8 font-mono text-xs font-bold bg-background rounded"
                                />
                              </div>

                              <div>
                                <Label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                                  Selling (₹) *
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={variant.sellingPrice || ''}
                                  onChange={(e) =>
                                    handleUpdateVariant(
                                      groupIdx,
                                      varIdx,
                                      'sellingPrice',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-8 font-mono text-xs font-bold bg-background rounded"
                                />
                              </div>

                              <div>
                                <Label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                                  MRP (₹) *
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={variant.mrp || ''}
                                  onChange={(e) =>
                                    handleUpdateVariant(
                                      groupIdx,
                                      varIdx,
                                      'mrp',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-8 font-mono text-xs font-bold bg-background rounded"
                                />
                              </div>
                            </div>

                            {/* Warnings for Suspicious Prices */}
                            {isSellingAboveMrp && (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-500/10 p-1.5 rounded font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Selling price (₹{selling}) is higher than MRP (₹{mrp}). Please verify.</span>
                              </div>
                            )}

                            {isLandingAboveSelling && (
                              <div className="flex items-center gap-1.5 text-[10px] text-red-600 bg-red-500/10 p-1.5 rounded font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Landing price (₹{landing}) exceeds selling price (₹{selling})!</span>
                              </div>
                            )}

                            {/* Promotion / Scheme Notes */}
                            <div className="pt-1">
                              <Input
                                placeholder="Variant scheme notes (e.g. 10% cash back, free cone holder)..."
                                value={variant.promotionNotes}
                                onChange={(e) =>
                                  handleUpdateVariant(
                                    groupIdx,
                                    varIdx,
                                    'promotionNotes',
                                    e.target.value
                                  )
                                }
                                className="h-7 text-[10px] rounded bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* STEP 3: Live Review Before Saving Drawer / Banner */}
          {allFlattenedObservations.length > 0 && (
            <Card className="p-3.5 bg-gradient-to-tr from-orange-500/10 to-amber-500/10 border-orange-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span>Survey Summary for Review</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Shop: <strong className="text-foreground">{customerName || 'None selected'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-background border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">Products</span>
                  <strong className="text-foreground font-mono">{surveyTotals.totalProducts}</strong>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">Total Variants</span>
                  <strong className="text-foreground font-mono">{surveyTotals.totalVariants}</strong>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">Est. Profit</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{surveyTotals.totalProfit.toFixed(0)}</strong>
                </div>
                <div className="p-2 rounded-lg bg-background border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">Avg Gross Margin</span>
                  <strong className="text-orange-600 font-mono">{surveyTotals.avgMargin}%</strong>
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Sticky Action Footer */}
        <div className="p-3 sm:p-4 border-t border-border/80 bg-card/95 backdrop-blur shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[11px] text-muted-foreground">
            {allFlattenedObservations.length} observation(s) under {productGroups.length} product(s)
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 text-xs rounded-lg px-3"
            >
              Cancel
            </Button>

            {/* Save as Draft */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSaveSurvey('draft')}
              disabled={isSubmitting || !customerName.trim()}
              className="h-9 text-xs font-semibold rounded-lg px-3.5 gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Save as Draft
            </Button>

            {/* Save Completed Survey */}
            <Button
              type="button"
              onClick={() => handleSaveSurvey('completed')}
              disabled={isSubmitting || !customerName.trim()}
              size="sm"
              className="h-9 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-5 shadow-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Saving Survey...' : surveyToEdit ? 'Update Survey' : 'Save Survey'}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
