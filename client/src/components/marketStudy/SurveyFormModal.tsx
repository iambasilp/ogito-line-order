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
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Check,
  Search,
  Save,
  FileText,
  X,
  Sparkles,
  Edit3
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type {
  MarketStudyCatalogueItem,
  MarketStudySurvey
} from '@/types';
import {
  type ProductGroupItem,
  type VariantRowItem,
  groupObservationsIntoProducts,
  flattenProductGroupsIntoObservations,
  duplicateVariantRow,
  createBlankVariantRow,
  createNewProductGroup,
  calculateVariantMetrics,
  validateSurveySubmission
} from './surveyGroupingUtils';

const COMMON_BRANDS = [
  'PASTIO',
  'Ogito',
  'Amul',
  'Kwality Wall\'s',
  'Arun Icecreams',
  'Bambino',
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
  'Pouch',
  'Box / Family Pack',
  'Tub',
  'Cone',
  'Cup',
  'Stick / Bar',
  'Party Tub (2L+)',
  'Bottle / Jar',
  'Cassata / Cake',
  'Other'
];

const QUICK_WEIGHT_CHIPS = [
  '250 g',
  '400 g',
  '500 g',
  '750 g',
  '1 kg',
  '2 kg',
  '100 ml',
  '250 ml',
  '500 ml',
  '1 Litre',
  '2 Litre'
];

const POPULAR_VARIANT_LABELS = [
  'Regular',
  'Vanilla',
  'Butterscotch',
  'Chocolate',
  'Ragi',
  'Wheat',
  'Spanish Delight',
  'Mango',
  'Strawberry',
  'Kesar Pista',
  'Twin Pack',
  '1+1 Offer'
];

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

  // Grouped Product Groups (Product Group -> Variants)
  const [productGroups, setProductGroups] = useState<ProductGroupItem[]>([]);

  // Add Product selector state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [isCustomProductMode, setIsCustomProductMode] = useState(false);

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

      // Group observations into clean product groups
      const grouped = groupObservationsIntoProducts(surveyToEdit.observations || []);
      setProductGroups(grouped);
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

    setIsAddingProduct(false);
    setSelectedCatalogueId('');
    setCustomProductName('');
    setIsCustomProductMode(false);
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

  // Add Product to survey (from catalogue or custom name)
  const handleAddProductGroup = () => {
    let prodId: string | undefined = undefined;
    let prodName = '';

    if (isCustomProductMode) {
      if (!customProductName.trim()) return;
      prodName = customProductName.trim();
    } else {
      if (!selectedCatalogueId) return;
      const catItem = catalogue.find((p) => p._id === selectedCatalogueId);
      if (!catItem) return;
      prodId = catItem._id;
      prodName = catItem.name;
    }

    // Default packaging based on name heuristic
    const defaultPack = prodName.toLowerCase().includes('tub')
      ? 'Tub'
      : prodName.toLowerCase().includes('cone')
      ? 'Cone'
      : prodName.toLowerCase().includes('cup')
      ? 'Cup'
      : 'Pouch';

    const newGroup = createNewProductGroup(prodId, prodName, '', defaultPack);

    setProductGroups([...productGroups, newGroup]);
    setSelectedCatalogueId('');
    setCustomProductName('');
    setIsAddingProduct(false);
    setIsCustomProductMode(false);
  };

  // Remove whole product group
  const handleRemoveProductGroup = (groupIndex: number) => {
    const group = productGroups[groupIndex];
    const groupName = group.catalogueProductName;
    const count = group.variants.length;
    const confirmMsg = count > 0
      ? `Remove "${groupName}" and all its ${count} recorded variant(s)?`
      : `Remove "${groupName}"?`;

    if (confirm(confirmMsg)) {
      setProductGroups(productGroups.filter((_, idx) => idx !== groupIndex));
    }
  };

  // Update Brand Name for entire product group (Entered once)
  const handleUpdateGroupBrand = (groupIndex: number, brand: string) => {
    const updated = [...productGroups];
    updated[groupIndex].brandName = brand;
    setProductGroups(updated);
  };

  // Toggle expand/collapse of product group
  const handleToggleExpand = (groupIndex: number) => {
    const updated = [...productGroups];
    updated[groupIndex].isExpanded = !updated[groupIndex].isExpanded;
    setProductGroups(updated);
  };

  // Add blank variant row under product
  const handleAddVariantRow = (groupIndex: number, initialWeight = '') => {
    const group = productGroups[groupIndex];
    const defaultPack = group.variants[group.variants.length - 1]?.packagingType || 'Pouch';
    const newVariant = createBlankVariantRow(initialWeight, defaultPack);

    const updated = [...productGroups];
    updated[groupIndex].variants.push(newVariant);
    updated[groupIndex].isExpanded = true;
    setProductGroups(updated);
  };

  // Duplicate variant row (Fast Entry)
  const handleDuplicateVariantRow = (groupIndex: number, variantIndex: number) => {
    const source = productGroups[groupIndex].variants[variantIndex];
    const cloned = duplicateVariantRow(source);

    const updated = [...productGroups];
    updated[groupIndex].variants.splice(variantIndex + 1, 0, cloned);
    setProductGroups(updated);
  };

  // Update specific field on variant row
  const handleUpdateVariantField = (
    groupIndex: number,
    variantIndex: number,
    field: keyof VariantRowItem,
    value: any
  ) => {
    const updated = [...productGroups];
    (updated[groupIndex].variants[variantIndex] as any)[field] = value;
    setProductGroups(updated);
  };

  // Toggle notes display for variant
  const handleToggleVariantNotes = (groupIndex: number, variantIndex: number) => {
    const updated = [...productGroups];
    const current = updated[groupIndex].variants[variantIndex].showNotes;
    updated[groupIndex].variants[variantIndex].showNotes = !current;
    setProductGroups(updated);
  };

  // Remove single variant row
  const handleRemoveVariantRow = (groupIndex: number, variantIndex: number) => {
    const updated = [...productGroups];
    updated[groupIndex].variants.splice(variantIndex, 1);

    // If all variants removed, ask to remove group or keep empty
    if (updated[groupIndex].variants.length === 0) {
      if (confirm(`All variants removed. Delete "${updated[groupIndex].catalogueProductName}"?`)) {
        updated.splice(groupIndex, 1);
      } else {
        // Keep 1 blank variant
        updated[groupIndex].variants.push(createBlankVariantRow('', 'Pouch'));
      }
    }
    setProductGroups(updated);
  };

  // Flattened observations count and preview
  const allFlattenedObservations = useMemo(() => {
    return flattenProductGroupsIntoObservations(productGroups);
  }, [productGroups]);

  // Overall totals for review
  const surveyTotals = useMemo(() => {
    let totalSelling = 0;
    let totalLanding = 0;
    let totalProfit = 0;
    let validCount = 0;

    allFlattenedObservations.forEach((v) => {
      const selling = Number(v.sellingPrice) || 0;
      const landing = Number(v.landingPrice) || 0;
      totalSelling += selling;
      totalLanding += landing;
      if (selling > 0 && landing > 0) {
        totalProfit += selling - landing;
        validCount++;
      }
    });

    const avgMargin = totalSelling > 0 ? ((totalProfit / totalSelling) * 100).toFixed(1) : '0';
    return {
      totalProducts: productGroups.length,
      totalVariants: allFlattenedObservations.length,
      totalProfit,
      avgMargin,
      validCount
    };
  }, [productGroups, allFlattenedObservations]);

  // Save Survey Handler (Atomic save)
  const handleSaveSurvey = async (saveStatus: 'completed' | 'draft') => {
    const validation = validateSurveySubmission({
      customerName,
      collectedBy,
      status: saveStatus,
      productGroups
    });

    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadObservations = flattenProductGroupsIntoObservations(productGroups);

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
        observations: payloadObservations
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="w-[98vw] sm:w-full sm:max-w-[1020px] max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl bg-background border border-border/80">
        
        {/* Native datalists for instant suggestion support */}
        <datalist id="survey-flavour-datalist">
          {POPULAR_VARIANT_LABELS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <datalist id="survey-weight-datalist">
          {QUICK_WEIGHT_CHIPS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <datalist id="survey-packaging-datalist">
          {PACKAGING_TYPES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        {/* Sticky Header */}
        <DialogHeader className="p-3.5 sm:p-4.5 border-b border-border/80 shrink-0 bg-card">
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
                  Record competitor pricing with grouped products & multi-variant sizes
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

              {/* Customer Type, Location & Date Grid */}
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

          {/* STEP 2: Products & Multi-Variant Form */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-orange-600" />
                  <span>Step 2: Observed Products & Variants ({productGroups.length} Products, {allFlattenedObservations.length} Variants)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enter Brand Name once per product, then add multiple sizes & prices under that product
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
                Add Product to Survey
              </Button>
            </div>

            {/* Add Product Picker Dialog / Inline Card */}
            {isAddingProduct && (
              <Card className="p-3.5 border-orange-500/40 bg-orange-500/[0.03] rounded-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <Label className="text-xs font-bold text-orange-900 dark:text-orange-300">
                      Add Product to Visit
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomProductMode(!isCustomProductMode)}
                      className="text-[11px] font-semibold text-orange-600 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isCustomProductMode ? 'Pick from Catalogue' : 'Enter Custom Product'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="text-muted-foreground hover:text-foreground text-xs p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {!isCustomProductMode ? (
                    <Select value={selectedCatalogueId} onValueChange={setSelectedCatalogueId}>
                      <SelectTrigger className="h-9 text-xs rounded-lg bg-background flex-1">
                        <SelectValue placeholder="Choose a product from catalogue (e.g. Macaroni, Fusilli, Product 1)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogue
                          .filter((p) => p.isActive)
                          .map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Type custom product name (e.g. Roasted Vermicelli, Spaghettini)..."
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      className="h-9 text-xs rounded-lg bg-background flex-1"
                      autoFocus
                    />
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddProductGroup}
                    disabled={!isCustomProductMode ? !selectedCatalogueId : !customProductName.trim()}
                    className="h-9 px-4 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shrink-0 shadow-xs"
                  >
                    Add Product Group
                  </Button>
                </div>
              </Card>
            )}

            {/* Empty State */}
            {productGroups.length === 0 && !isAddingProduct && (
              <div className="py-10 text-center border-2 border-dashed border-border/80 rounded-2xl p-6 bg-muted/10 space-y-2">
                <Package className="w-8 h-8 text-orange-500/60 mx-auto" />
                <h4 className="text-xs font-bold text-foreground">No Products Added Yet</h4>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Click the <strong>"+ Add Product to Survey"</strong> button above to pick a product and record competitor brands, sizes, and pricing.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingProduct(true)}
                  className="h-8 text-xs font-bold border-orange-500/40 text-orange-600 hover:bg-orange-50 mt-1"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add First Product
                </Button>
              </div>
            )}

            {/* List of Product Group Cards */}
            {productGroups.map((group, groupIdx) => {
              // Calculate group summary metrics
              let groupSelling = 0;
              let groupLanding = 0;
              let groupProfit = 0;

              group.variants.forEach((v) => {
                const s = Number(v.sellingPrice) || 0;
                const l = Number(v.landingPrice) || 0;
                groupSelling += s;
                groupLanding += l;
                if (s > 0 && l > 0) {
                  groupProfit += s - l;
                }
              });

              const groupMargin = groupSelling > 0 ? ((groupProfit / groupSelling) * 100).toFixed(1) : '0';

              return (
                <Card
                  key={group.id}
                  className="border-border/80 shadow-xs rounded-xl overflow-hidden bg-card transition-all"
                >
                  {/* Product Header Accordion Bar */}
                  <div className="p-3 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
                      onClick={() => handleToggleExpand(groupIdx)}
                    >
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                      >
                        {group.isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-orange-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-black tracking-wide text-orange-600">
                          Product:
                        </span>
                        <span className="font-black text-xs sm:text-sm text-foreground truncate">
                          {group.catalogueProductName}
                        </span>

                        <span className="text-muted-foreground text-xs">•</span>

                        <span className="text-[10px] uppercase font-black tracking-wide text-muted-foreground">
                          Brand:
                        </span>
                        {group.brandName ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-bold border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                            {group.brandName}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-medium text-red-500 bg-red-50 dark:bg-red-950/30">
                            Brand Required *
                          </Badge>
                        )}

                        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-mono">
                          {group.variants.length} {group.variants.length === 1 ? 'Variant' : 'Variants'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddVariantRow(groupIdx)}
                        className="h-7 px-2.5 text-[10px] font-bold gap-1 rounded-lg border-orange-500/30 text-orange-600 hover:bg-orange-50"
                        title="Add another variant size under this product"
                      >
                        <Plus className="w-3 h-3" />
                        Add Variant
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveProductGroup(groupIdx)}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-0"
                        title="Remove Product Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible Product Body */}
                  {group.isExpanded && (
                    <CardContent className="p-3 sm:p-4 space-y-3.5 bg-background">
                      
                      {/* COMMON PRODUCT DETAILS: Entered ONCE per product group */}
                      <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-orange-500" />
                            <span>Common Product Details</span>
                            <span className="text-[10px] font-normal text-muted-foreground capitalize">
                              (Entered once, applies to all variants below)
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                          {/* Catalogue / Product Name */}
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-foreground">
                              Product Name
                            </Label>
                            <Input
                              value={group.catalogueProductName}
                              onChange={(e) => {
                                const updated = [...productGroups];
                                updated[groupIdx].catalogueProductName = e.target.value;
                                setProductGroups(updated);
                              }}
                              className="h-8.5 text-xs rounded-lg font-medium bg-background"
                              placeholder="Product Name"
                            />
                          </div>

                          {/* Brand Name Input + Quick Brand Selection Chips */}
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                              <span>Brand Name <span className="text-red-500">*</span></span>
                              {group.brandName && (
                                <span className="text-[9px] font-mono font-bold text-orange-600">
                                  {group.brandName}
                                </span>
                              )}
                            </Label>
                            <Input
                              required
                              placeholder="Type Brand (e.g. PASTIO, Amul, Ogito, Bambino)..."
                              value={group.brandName}
                              onChange={(e) => handleUpdateGroupBrand(groupIdx, e.target.value)}
                              className="h-8.5 text-xs rounded-lg font-medium bg-background"
                            />

                            {/* Quick Brand Preset Chips */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {COMMON_BRANDS.slice(0, 8).map((brand) => (
                                <button
                                  key={brand}
                                  type="button"
                                  onClick={() => handleUpdateGroupBrand(groupIdx, brand)}
                                  className={`text-[9px] px-2 py-0.5 rounded-md border font-medium transition-all ${
                                    group.brandName.toLowerCase() === brand.toLowerCase()
                                      ? 'bg-orange-500 text-white border-orange-500 font-bold shadow-2xs'
                                      : 'bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted'
                                  }`}
                                >
                                  {brand}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COMPACT VARIANTS TABLE */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-orange-500" />
                            <span>Variants, Packaging & Pricing</span>
                          </span>

                          {groupProfit > 0 && (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Est. Margin: ₹{groupProfit.toFixed(0)} ({groupMargin}%)
                            </span>
                          )}
                        </div>

                        {/* Scrollable Table Container */}
                        <div className="overflow-x-auto rounded-xl border border-border/70 shadow-2xs">
                          <table className="min-w-[820px] w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-muted/50 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <th className="p-2 text-center w-8">#</th>
                                <th className="p-2 text-left w-36">Variant / Flavour</th>
                                <th className="p-2 text-left w-32">Weight / Volume *</th>
                                <th className="p-2 text-left w-32">Packaging</th>
                                <th className="p-2 text-right w-24">Landing (₹)</th>
                                <th className="p-2 text-right w-24">Selling (₹) *</th>
                                <th className="p-2 text-right w-24">MRP (₹)</th>
                                <th className="p-2 text-center w-36">Margin</th>
                                <th className="p-2 text-center w-24">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-background">
                              {group.variants.map((variant, varIdx) => {
                                const metrics = calculateVariantMetrics(
                                  variant.sellingPrice,
                                  variant.landingPrice,
                                  variant.mrp
                                );

                                return (
                                  <tr
                                    key={variant.id}
                                    className="hover:bg-muted/20 transition-colors group"
                                  >
                                    {/* Index */}
                                    <td className="p-2 text-center text-[10px] font-mono font-bold text-muted-foreground">
                                      #{varIdx + 1}
                                    </td>

                                    {/* Variant / Flavour */}
                                    <td className="p-2">
                                      <Input
                                        list="survey-flavour-datalist"
                                        placeholder="Regular, Vanilla..."
                                        value={variant.variant}
                                        onChange={(e) =>
                                          handleUpdateVariantField(
                                            groupIdx,
                                            varIdx,
                                            'variant',
                                            e.target.value
                                          )
                                        }
                                        className="h-8 text-xs rounded-md bg-background"
                                      />
                                    </td>

                                    {/* Weight / Volume */}
                                    <td className="p-2">
                                      <Input
                                        required
                                        list="survey-weight-datalist"
                                        placeholder="500 g, 1 kg, 1L..."
                                        value={variant.weight}
                                        onChange={(e) =>
                                          handleUpdateVariantField(
                                            groupIdx,
                                            varIdx,
                                            'weight',
                                            e.target.value
                                          )
                                        }
                                        className="h-8 text-xs font-medium rounded-md bg-background"
                                      />
                                    </td>

                                    {/* Packaging Type */}
                                    <td className="p-2">
                                      <Input
                                        list="survey-packaging-datalist"
                                        placeholder="Pouch, Box, Tub..."
                                        value={variant.packagingType}
                                        onChange={(e) =>
                                          handleUpdateVariantField(
                                            groupIdx,
                                            varIdx,
                                            'packagingType',
                                            e.target.value
                                          )
                                        }
                                        className="h-8 text-xs rounded-md bg-background"
                                      />
                                    </td>

                                    {/* Landing Price */}
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={variant.landingPrice !== undefined ? variant.landingPrice : ''}
                                        onChange={(e) =>
                                          handleUpdateVariantField(
                                            groupIdx,
                                            varIdx,
                                            'landingPrice',
                                            e.target.value === '' ? '' : Number(e.target.value)
                                          )
                                        }
                                        className="h-8 text-xs font-mono font-medium text-right rounded-md bg-background"
                                      />
                                    </td>

                                    {/* Selling Price */}
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={variant.sellingPrice !== undefined ? variant.sellingPrice : ''}
                                        onChange={(e) =>
                                          handleUpdateVariantField(
                                            groupIdx,
                                            varIdx,
                                            'sellingPrice',
                                            e.target.value === '' ? '' : Number(e.target.value)
                                          )
                                        }
                                        className="h-8 text-xs font-mono font-bold text-right rounded-md bg-background"
                                      />
                                    </td>

                                    {/* MRP */}
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={variant.mrp !== undefined ? variant.mrp : ''}
                                        onChange={(e) =>
                                          handleUpdateVariantField(
                                            groupIdx,
                                            varIdx,
                                            'mrp',
                                            e.target.value === '' ? '' : Number(e.target.value)
                                          )
                                        }
                                        className="h-8 text-xs font-mono text-right rounded-md bg-background"
                                      />
                                    </td>

                                    {/* Profit & Margin */}
                                    <td className="p-2 text-center">
                                      <div className="flex flex-col items-center justify-center gap-0.5">
                                        {metrics.profit > 0 ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] font-mono font-bold py-0 h-5 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                          >
                                            ₹{metrics.profit.toFixed(0)} ({metrics.marginPercent}%)
                                          </Badge>
                                        ) : metrics.profit < 0 ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] font-mono font-bold py-0 h-5 px-1.5 bg-red-500/10 text-red-600 border border-red-500/20"
                                          >
                                            Loss ₹{Math.abs(metrics.profit).toFixed(0)}
                                          </Badge>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground font-mono">—</span>
                                        )}

                                        {metrics.mrpDiff > 0 && (
                                          <span className="text-[9px] text-muted-foreground font-mono">
                                            Save ₹{metrics.mrpDiff.toFixed(0)}
                                          </span>
                                        )}

                                        {metrics.isSellingAboveMrp && (
                                          <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5" title="Selling price is higher than MRP">
                                            <AlertTriangle className="w-2.5 h-2.5" /> Sell &gt; MRP
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleDuplicateVariantRow(groupIdx, varIdx)}
                                          className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md transition-colors"
                                          title="Duplicate this size & price"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleVariantNotes(groupIdx, varIdx)}
                                          className={`p-1.5 rounded-md transition-colors ${
                                            variant.showNotes || variant.promotionNotes || variant.notes
                                              ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/40'
                                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                          }`}
                                          title="Toggle promo/notes for this variant"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveVariantRow(groupIdx, varIdx)}
                                          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                                          title="Remove variant"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Optional Expanded Notes Sub-Lines for Variants */}
                        {group.variants.some((v) => v.showNotes || v.promotionNotes || v.notes) && (
                          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Variant Notes & Promotion Schemes:
                            </span>
                            {group.variants.map((v, vIdx) => {
                              if (!v.showNotes && !v.promotionNotes && !v.notes) return null;
                              return (
                                <div key={v.id} className="flex items-center gap-2 text-xs">
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono shrink-0">
                                    #{vIdx + 1} {v.weight || 'Variant'}
                                  </Badge>
                                  <Input
                                    placeholder="Promotional scheme / discount / remark for this size..."
                                    value={v.promotionNotes || ''}
                                    onChange={(e) =>
                                      handleUpdateVariantField(groupIdx, vIdx, 'promotionNotes', e.target.value)
                                    }
                                    className="h-7 text-xs rounded bg-background flex-1"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Bottom Variant Quick Action Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddVariantRow(groupIdx)}
                            className="h-7.5 px-3 text-xs font-bold gap-1 rounded-lg border-orange-500/30 text-orange-600 hover:bg-orange-50 self-start"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Blank Variant
                          </Button>

                          {/* Quick Add Weight Chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                              Quick Add:
                            </span>
                            {QUICK_WEIGHT_CHIPS.slice(0, 7).map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => handleAddVariantRow(groupIdx, chip)}
                                className="text-[9px] font-semibold px-2 py-1 rounded-md border border-border/80 bg-background hover:bg-orange-50 hover:border-orange-500/40 hover:text-orange-600 transition-colors"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                    </CardContent>
                  )}
                </Card>
              );
            })}
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
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{surveyTotals.totalProfit.toFixed(0)}
                  </strong>
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
