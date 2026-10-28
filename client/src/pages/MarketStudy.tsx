import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  ClipboardList, 
  Download, 
  MapPin, 
  Store, 
  Tag, 
  TrendingUp, 
  IndianRupee, 
  Layers, 
  RotateCcw,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { MarketStudy } from '@/types';

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
  'HORECA (Hotel/Restaurant/Cafe)',
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
  'Tub (500ml / 1L)',
  'Stick / Bar',
  'Pouch',
  'Box / Family Pack',
  'Party Tub (2L+)',
  'Cassata / Cake',
  'Other'
];

const COMMON_WEIGHTS = [
  '50 ml',
  '70 ml',
  '100 ml',
  '120 ml',
  '250 ml',
  '500 ml',
  '750 ml',
  '1 Litre',
  '1.2 Litre',
  '2 Litre',
  '500 g',
  '1 kg'
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
  '1+1 Offer',
  'Premium Gold'
];

export default function MarketStudyPage() {
  const { user } = useAuth();

  const [studies, setStudies] = useState<MarketStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // View Mode: 'table' (Full Width Fit) or 'cards' (Full Width Cards)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Mobile filters visibility toggle
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCustomerType, setSelectedCustomerType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedLabel, setSelectedLabel] = useState('all');

  // Existing DB options for autocomplete
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [existingRoutes, setExistingRoutes] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Label tag input in modal
  const [currentLabelInput, setCurrentLabelInput] = useState('');

  // Delete Confirm Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productName: '',
    labels: [] as string[],
    customerName: '',
    customerType: 'Retailer',
    collectedBy: '',
    brandName: '',
    weight: '',
    packagingType: '',
    landingPrice: 0,
    sellingPrice: 0,
    mrp: 0,
    marketLocation: '',
    notes: '',
    collectionDate: new Date().toISOString().split('T')[0]
  });

  // Fetch market study data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/market-study');
      setStudies(res.data.studies || []);
      setSummary(res.data.summary || null);
    } catch (error) {
      console.error('Failed to load market study data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch auxiliary autocomplete data
  useEffect(() => {
    fetchData();

    const fetchAuxiliary = async () => {
      try {
        const [custRes, routeRes] = await Promise.allSettled([
          api.get('/customers?limit=2000'),
          api.get('/routes')
        ]);
        if (custRes.status === 'fulfilled' && custRes.value.data?.customers) {
          setExistingCustomers(custRes.value.data.customers);
        }
        if (routeRes.status === 'fulfilled' && Array.isArray(routeRes.value.data)) {
          setExistingRoutes(routeRes.value.data);
        }
      } catch (err) {
        // Optional
      }
    };
    fetchAuxiliary();
  }, []);

  // Aggregate all known labels dynamically from existing DB records + backend summary + starter list
  const allKnownLabels = useMemo(() => {
    const labelSet = new Set<string>();
    // Backend summary unique labels
    if (Array.isArray(summary?.uniqueLabels)) {
      summary.uniqueLabels.forEach((l: string) => l && labelSet.add(l.trim()));
    }
    // Existing loaded studies
    studies.forEach((s) => {
      s.labels?.forEach((l) => l && labelSet.add(l.trim()));
    });
    // Common starter variants
    POPULAR_VARIANT_LABELS.forEach((l) => labelSet.add(l));
    return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
  }, [summary, studies]);

  // Labels not yet selected in the current modal form (for 1-click quick-add chips)
  const suggestedAvailableLabels = useMemo(() => {
    const currentSelected = new Set(formData.labels.map((l) => l.toLowerCase()));
    return allKnownLabels.filter((l) => !currentSelected.has(l.toLowerCase()));
  }, [allKnownLabels, formData.labels]);

  // Label handlers for modal
  const handleAddLabel = (tag?: string) => {
    const text = (tag !== undefined ? tag : currentLabelInput).trim();
    if (!text) return;
    if (!formData.labels.some((l) => l.toLowerCase() === text.toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        labels: [...prev.labels, text]
      }));
    }
    setCurrentLabelInput('');
  };

  const handleRemoveLabel = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l !== tagToRemove)
    }));
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddLabel();
    }
  };

  // Filtered List
  const filteredStudies = useMemo(() => {
    return studies.filter((item) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        item.productName?.toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.brandName?.toLowerCase().includes(searchLower) ||
        item.marketLocation?.toLowerCase().includes(searchLower) ||
        item.collectedBy?.toLowerCase().includes(searchLower) ||
        item.packagingType?.toLowerCase().includes(searchLower) ||
        item.weight?.toLowerCase().includes(searchLower) ||
        item.labels?.some((l) => l.toLowerCase().includes(searchLower));

      const matchesBrand =
        selectedBrand === 'all' || item.brandName?.toLowerCase() === selectedBrand.toLowerCase();

      const matchesType =
        selectedCustomerType === 'all' ||
        item.customerType?.toLowerCase() === selectedCustomerType.toLowerCase();

      const matchesLocation =
        selectedLocation === 'all' ||
        item.marketLocation?.toLowerCase() === selectedLocation.toLowerCase();

      const matchesCollector =
        selectedCollector === 'all' ||
        item.collectedBy?.toLowerCase() === selectedCollector.toLowerCase();

      const matchesLabel =
        selectedLabel === 'all' ||
        item.labels?.some((l) => l.toLowerCase() === selectedLabel.toLowerCase());

      return matchesSearch && matchesBrand && matchesType && matchesLocation && matchesCollector && matchesLabel;
    });
  }, [studies, searchTerm, selectedBrand, selectedCustomerType, selectedLocation, selectedCollector, selectedLabel]);

  // Unique lists for filter dropdowns
  const uniqueBrands = useMemo(() => {
    return (Array.from(new Set(studies.map((s) => s.brandName).filter(Boolean))) as string[]).sort();
  }, [studies]);

  const uniqueLocations = useMemo(() => {
    return (Array.from(new Set(studies.map((s) => s.marketLocation).filter(Boolean))) as string[]).sort();
  }, [studies]);

  const uniqueCollectors = useMemo(() => {
    return (Array.from(new Set(studies.map((s) => s.collectedBy).filter(Boolean))) as string[]).sort();
  }, [studies]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBrand !== 'all') count++;
    if (selectedCustomerType !== 'all') count++;
    if (selectedLocation !== 'all') count++;
    if (selectedCollector !== 'all') count++;
    if (selectedLabel !== 'all') count++;
    return count;
  }, [selectedBrand, selectedCustomerType, selectedLocation, selectedCollector, selectedLabel]);

  // Open modal for Create or Edit
  const handleOpenModal = (study?: MarketStudy) => {
    setIsDuplicating(false);
    setCurrentLabelInput('');
    if (study) {
      setIsEditing(true);
      setCurrentId(study._id);
      setFormData({
        productName: study.productName || '',
        labels: study.labels ? [...study.labels] : [],
        customerName: study.customerName || '',
        customerType: study.customerType || 'Retailer',
        collectedBy: study.collectedBy || user?.name || user?.username || '',
        brandName: study.brandName || '',
        weight: study.weight || '',
        packagingType: study.packagingType || '',
        landingPrice: study.landingPrice || 0,
        sellingPrice: study.sellingPrice || 0,
        mrp: study.mrp || 0,
        marketLocation: study.marketLocation || '',
        notes: study.notes || '',
        collectionDate: study.collectionDate
          ? study.collectionDate.split('T')[0]
          : new Date().toISOString().split('T')[0]
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        productName: '',
        labels: [],
        customerName: '',
        customerType: 'Retailer',
        collectedBy: user?.name || user?.username || '',
        brandName: '',
        weight: '',
        packagingType: '',
        landingPrice: 0,
        sellingPrice: 0,
        mrp: 0,
        marketLocation: '',
        notes: '',
        collectionDate: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  // Open modal for Duplicating an existing entry (pre-filled, saves as new record)
  const handleDuplicate = (study: MarketStudy) => {
    setIsEditing(false);
    setIsDuplicating(true);
    setCurrentId(null);
    setCurrentLabelInput('');
    setFormData({
      productName: study.productName || '',
      labels: study.labels ? [...study.labels] : [],
      customerName: study.customerName || '',
      customerType: study.customerType || 'Retailer',
      collectedBy: study.collectedBy || user?.name || user?.username || '',
      brandName: study.brandName || '',
      weight: study.weight || '',
      packagingType: study.packagingType || '',
      landingPrice: study.landingPrice || 0,
      sellingPrice: study.sellingPrice || 0,
      mrp: study.mrp || 0,
      marketLocation: study.marketLocation || '',
      notes: study.notes || '',
      collectionDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.customerName.trim() || !formData.brandName.trim()) {
      alert('Please fill in Product Name, Customer / Shop Name, and Brand Name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        labels: formData.labels || [],
        landingPrice: Number(formData.landingPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        mrp: Number(formData.mrp) || 0,
        collectedBy: formData.collectedBy.trim() || user?.name || user?.username || 'Staff'
      };

      if (isEditing && currentId) {
        await api.put(`/market-study/${currentId}`, payload);
      } else {
        await api.post('/market-study', payload);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error saving market study entry:', error);
      alert(error?.response?.data?.error || 'Failed to save market study entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/market-study/${deleteId}`);
      setDeleteId(null);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to delete market study entry:', error);
      alert(error?.response?.data?.error || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredStudies.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Product Name',
      'Variants / Labels',
      'Customer / Shop Name',
      'Customer Type',
      'Data Collected By',
      'Product Brand Name',
      'Product Weight',
      'Packaging Type',
      'Landing Price (INR)',
      'Selling Price (INR)',
      'MRP (INR)',
      'Retailer Margin (INR)',
      'Retailer Margin (%)',
      'Market Location',
      'Collection Date',
      'Notes'
    ];

    const rows = filteredStudies.map((s) => {
      const margin = s.sellingPrice > 0 ? (s.sellingPrice - s.landingPrice).toFixed(2) : '0';
      const marginPct =
        s.sellingPrice > 0
          ? (((s.sellingPrice - s.landingPrice) / s.sellingPrice) * 100).toFixed(1) + '%'
          : '0%';

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      return [
        escapeCSV(s.productName),
        escapeCSV(s.labels && s.labels.length > 0 ? s.labels.join(', ') : ''),
        escapeCSV(s.customerName),
        escapeCSV(s.customerType || ''),
        escapeCSV(s.collectedBy),
        escapeCSV(s.brandName),
        escapeCSV(s.weight || ''),
        escapeCSV(s.packagingType || ''),
        escapeCSV(s.landingPrice),
        escapeCSV(s.sellingPrice),
        escapeCSV(s.mrp),
        escapeCSV(margin),
        escapeCSV(marginPct),
        escapeCSV(s.marketLocation || ''),
        escapeCSV(s.collectionDate ? s.collectionDate.split('T')[0] : ''),
        escapeCSV(s.notes || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `market_study_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBrand('all');
    setSelectedCustomerType('all');
    setSelectedLocation('all');
    setSelectedCollector('all');
    setSelectedLabel('all');
  };

  // Live modal margin calculations
  const modalMarginAmount = (Number(formData.sellingPrice) || 0) - (Number(formData.landingPrice) || 0);
  const modalMarginPercent =
    Number(formData.sellingPrice) > 0
      ? ((modalMarginAmount / Number(formData.sellingPrice)) * 100).toFixed(1)
      : '0';
  const modalMrpDiscount =
    Number(formData.mrp) > 0 && Number(formData.sellingPrice) > 0
      ? (Number(formData.mrp) - Number(formData.sellingPrice)).toFixed(2)
      : '0';

  return (
    <Layout fullWidth>
      <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-3.5 sm:space-y-4 pb-16 sm:pb-8 overflow-hidden">
        
        {/* Top Header Card - Always 100% Full Width */}
        <div className="bg-card/70 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
                  Market Study
                </h1>
                <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-[10px] font-semibold py-0.5 px-2">
                  Data Collection
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Competitor pricing, retailer landing cost, MRP & shop margins
              </p>
            </div>
          </div>

          {/* Action Buttons & View Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border/50 shrink-0">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-8 px-2.5 text-xs font-semibold gap-1.5 ${
                  viewMode === 'table' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs' : 'text-muted-foreground'
                }`}
                title="Full-Width Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`h-8 px-2.5 text-xs font-semibold gap-1.5 ${
                  viewMode === 'cards' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs' : 'text-muted-foreground'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredStudies.length === 0}
              className="h-8 sm:h-9 text-xs font-medium gap-1.5 px-3 border-border/80"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>

            <Button
              onClick={() => handleOpenModal()}
              size="sm"
              className="h-8 sm:h-9 text-xs font-bold gap-1.5 px-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Entry</span>
            </Button>
          </div>
        </div>

        {/* Analytics Summary Cards - 100% Full Width Grid, Zero Overflow */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 w-full">
          {/* Card 1: Total */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Products</span>
              <Store className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {studies.length}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {filteredStudies.length} matching filter
            </p>
          </Card>

          {/* Card 2: Brands */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Brands</span>
              <Tag className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {uniqueBrands.length}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              Tracked competitors
            </p>
          </Card>

          {/* Card 3: Avg Landing */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Landing</span>
              <IndianRupee className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ₹{summary?.avgLandingPrice || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              Retailer purchase cost
            </p>
          </Card>

          {/* Card 4: Avg MRP */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg MRP</span>
              <IndianRupee className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ₹{summary?.avgMRP || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              Maximum retail price
            </p>
          </Card>

          {/* Card 5: Avg Margin */}
          <Card className="col-span-2 sm:col-span-1 border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Margin</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {summary?.avgMarginPercent || 0}%
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              Retail gross margin
            </p>
          </Card>
        </div>

        {/* Search & Filter Toolbar - 100% Full Width Fit */}
        <Card className="border-border/60 shadow-xs w-full overflow-hidden">
          <CardContent className="p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by product, shop, brand, location, or collector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8.5 pr-8 h-9 text-xs sm:text-xs bg-muted/30 border-border/70 rounded-lg"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle */}
              <Button
                variant={mobileFiltersOpen || activeFilterCount > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className={`sm:hidden h-9 px-2.5 rounded-lg text-xs font-medium gap-1 shrink-0 ${
                  activeFilterCount > 0 ? 'bg-orange-600 text-white' : ''
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-white text-orange-600 text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Filter Dropdowns */}
            <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} sm:grid grid-cols-2 lg:grid-cols-5 gap-2`}>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Brand: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {uniqueBrands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Customer Type: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shop Types</SelectItem>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLabel} onValueChange={setSelectedLabel}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Variant: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Variants / Labels</SelectItem>
                  {allKnownLabels.map((lbl) => (
                    <SelectItem key={lbl} value={lbl}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Location: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Collector: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collectors</SelectItem>
                  {uniqueCollectors.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {(searchTerm || activeFilterCount > 0) && (
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Found <strong className="text-foreground">{filteredStudies.length}</strong> matching records
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-6 text-[11px] text-orange-600 hover:text-orange-700 p-0 gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Mode 1: FULL-WIDTH TABLE (Guaranteed ZERO horizontal scroll, fits 100% width) */}
        {viewMode === 'table' ? (
          <Card className="w-full border-border/60 shadow-xs overflow-hidden rounded-xl">
            {/* 1. Desktop & Large Screens (>= 1024px): All 11 columns in 100% width table-fixed */}
            <div className="hidden lg:block w-full overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col className="w-[14%]" /> {/* Product Name */}
                  <col className="w-[13%]" /> {/* Customer / Shop Name */}
                  <col className="w-[8%]" />  {/* Customer Type */}
                  <col className="w-[8%]" />  {/* Data Collected By */}
                  <col className="w-[7.5%]" />  {/* Product Brand Name */}
                  <col className="w-[5.5%]" />  {/* Product Weight */}
                  <col className="w-[6.5%]" />  {/* Packaging Type */}
                  <col className="w-[5.5%]" />  {/* Landing Price */}
                  <col className="w-[5.5%]" />  {/* Selling Price */}
                  <col className="w-[5.5%]" />  {/* MRP */}
                  <col className="w-[6.5%]" />  {/* Margin */}
                  <col className="w-[8.5%]" />  {/* Market Location */}
                  <col className="w-[6%]" />  {/* Actions */}
                </colgroup>
                <thead className="text-[10px] uppercase bg-muted/60 text-muted-foreground font-bold border-b border-border/80 tracking-wider">
                  <tr>
                    <th scope="col" className="px-2 py-2.5 truncate" title="Product Name">Product Name</th>
                    <th scope="col" className="px-2 py-2.5 truncate" title="Customer / Shop Name">Shop / Customer</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Customer Type">Type</th>
                    <th scope="col" className="px-1.5 py-2.5 truncate" title="Data Collected By">Collector</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Product Brand Name">Brand</th>
                    <th scope="col" className="px-1 py-2.5 text-center truncate" title="Product Weight">Weight</th>
                    <th scope="col" className="px-1 py-2.5 text-center truncate" title="Packaging Type">Packaging</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Landing Price">Landing</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Selling Price">Selling</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Maximum Retail Price">MRP</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Retailer Margin">Margin</th>
                    <th scope="col" className="px-2 py-2.5 truncate" title="Market Location">Location</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Actions">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                          <span>Loading market data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudies.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                        No market study records found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudies.map((study) => {
                      const margin = study.sellingPrice - study.landingPrice;
                      const marginPct =
                        study.sellingPrice > 0 ? ((margin / study.sellingPrice) * 100).toFixed(0) : '0';
                      const isPositive = margin > 0;
                      const isOgito = study.brandName?.toLowerCase().includes('ogito');

                      return (
                        <tr
                          key={study._id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isOgito ? 'bg-orange-500/[0.03]' : ''
                          }`}
                        >
                          {/* 1. Product Name */}
                          <td className="px-2 py-2 truncate">
                            <div className="font-semibold text-foreground truncate" title={study.productName}>
                              {study.productName}
                            </div>
                            {study.labels && study.labels.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-0.5 max-w-full">
                                {study.labels.map((lbl, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 truncate max-w-[100px]"
                                    title={lbl}
                                  >
                                    {lbl}
                                  </span>
                                ))}
                              </div>
                            )}
                            {study.notes && (
                              <div className="text-[10px] text-muted-foreground truncate" title={study.notes}>
                                {study.notes}
                              </div>
                            )}
                          </td>

                          {/* 2. Customer / Shop Name */}
                          <td className="px-2 py-2 truncate">
                            <div className="font-medium text-foreground truncate flex items-center gap-1" title={study.customerName}>
                              <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{study.customerName}</span>
                            </div>
                          </td>

                          {/* 3. Customer Type */}
                          <td className="px-1.5 py-2 text-center truncate">
                            <span
                              className="truncate block text-[10px] py-0.5 px-1 rounded bg-muted text-muted-foreground font-medium"
                              title={study.customerType || 'Retailer'}
                            >
                              {study.customerType || 'Retailer'}
                            </span>
                          </td>

                          {/* 4. Data Collected By */}
                          <td className="px-1.5 py-2 truncate">
                            <div className="text-muted-foreground truncate text-[11px]" title={study.collectedBy}>
                              {study.collectedBy}
                            </div>
                          </td>

                          {/* 5. Product Brand Name */}
                          <td className="px-1.5 py-2 text-center truncate">
                            <span
                              className={`truncate block text-center text-[10px] font-bold py-0.5 px-1 rounded ${
                                isOgito
                                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                              }`}
                              title={study.brandName}
                            >
                              {study.brandName}
                            </span>
                          </td>

                          {/* 6. Product Weight */}
                          <td className="px-1 py-2 text-center truncate">
                            <span className="truncate block font-mono text-[11px] text-muted-foreground" title={study.weight}>
                              {study.weight || '-'}
                            </span>
                          </td>

                          {/* 7. Packaging Type */}
                          <td className="px-1 py-2 text-center truncate">
                            <span className="truncate block text-[11px] text-muted-foreground" title={study.packagingType}>
                              {study.packagingType || '-'}
                            </span>
                          </td>

                          {/* 8. Landing Price */}
                          <td className="px-1.5 py-2 text-right font-mono text-xs tabular-nums text-foreground">
                            ₹{study.landingPrice.toFixed(0)}
                          </td>

                          {/* 9. Selling Price */}
                          <td className="px-1.5 py-2 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                            ₹{study.sellingPrice.toFixed(0)}
                          </td>

                          {/* 10. MRP */}
                          <td className="px-1.5 py-2 text-right font-mono text-xs font-bold tabular-nums text-foreground">
                            ₹{study.mrp.toFixed(0)}
                          </td>

                          {/* Margin */}
                          <td className="px-1.5 py-2 text-center">
                            <div className={`font-mono text-[11px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                              ₹{margin.toFixed(0)}
                              <span className="text-[9px] font-normal block">({marginPct}%)</span>
                            </div>
                          </td>

                          {/* 11. Market Location */}
                          <td className="px-2 py-2 truncate">
                            <div className="truncate text-xs flex items-center gap-1 text-foreground" title={study.marketLocation}>
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="truncate">{study.marketLocation || '-'}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-1 py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 p-0"
                                onClick={() => handleDuplicate(study)}
                                title="Duplicate & Edit"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-0"
                                onClick={() => handleOpenModal(study)}
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 p-0"
                                onClick={() => setDeleteId(study._id)}
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. Tablet & Mobile Screen Table (< 1024px): Responsive 4-Column Structured Table (100% Full Width, ZERO horizontal scroll) */}
            <div className="block lg:hidden w-full overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col className="w-[32%]" /> {/* Product & Brand */}
                  <col className="w-[28%]" /> {/* Shop & Location */}
                  <col className="w-[24%]" /> {/* Pricing & Margin */}
                  <col className="w-[16%]" /> {/* Actions */}
                </colgroup>
                <thead className="text-[10px] uppercase bg-muted/60 text-muted-foreground font-bold border-b border-border/80">
                  <tr>
                    <th scope="col" className="px-2.5 py-2">Product & Brand</th>
                    <th scope="col" className="px-2 py-2">Shop & Location</th>
                    <th scope="col" className="px-2 py-2 text-right">Pricing / Margin</th>
                    <th scope="col" className="px-1.5 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredStudies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredStudies.map((study) => {
                      const margin = study.sellingPrice - study.landingPrice;
                      const marginPct =
                        study.sellingPrice > 0 ? ((margin / study.sellingPrice) * 100).toFixed(0) : '0';
                      const isOgito = study.brandName?.toLowerCase().includes('ogito');

                      return (
                        <tr key={study._id} className="hover:bg-muted/20 transition-colors">
                          {/* Col 1: Product & Brand & Weight */}
                          <td className="px-2.5 py-2.5 align-top">
                            <div className="font-bold text-foreground text-xs leading-snug line-clamp-2">
                              {study.productName}
                            </div>
                            {study.labels && study.labels.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {study.labels.map((lbl, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  >
                                    {lbl}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isOgito
                                    ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {study.brandName}
                              </span>
                              {study.weight && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {study.weight}
                                </span>
                              )}
                              {study.packagingType && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {study.packagingType}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col 2: Shop & Customer Type & Location */}
                          <td className="px-2 py-2.5 align-top">
                            <div className="font-semibold text-foreground text-xs truncate flex items-center gap-1">
                              <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{study.customerName}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal">
                                {study.customerType || 'Retailer'}
                              </Badge>
                              {study.marketLocation && (
                                <span className="truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                                  {study.marketLocation}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                              By: {study.collectedBy}
                            </div>
                          </td>

                          {/* Col 3: Pricing & Margin */}
                          <td className="px-2 py-2.5 text-right align-top">
                            <div className="font-mono text-xs font-bold text-foreground">
                              ₹{study.sellingPrice.toFixed(0)} <span className="text-[10px] text-muted-foreground font-normal">(MRP ₹{study.mrp.toFixed(0)})</span>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              Land: ₹{study.landingPrice.toFixed(0)}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Margin: ₹{margin.toFixed(0)} ({marginPct}%)
                            </div>
                          </td>

                          {/* Col 4: Actions */}
                          <td className="px-1.5 py-2.5 text-right align-top">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 p-0"
                                onClick={() => handleDuplicate(study)}
                                title="Duplicate & Edit"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-0"
                                onClick={() => handleOpenModal(study)}
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 p-0"
                                onClick={() => setDeleteId(study._id)}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-3 py-2 bg-muted/40 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground w-full">
              <div>
                Showing <strong className="text-foreground">{filteredStudies.length}</strong> of{' '}
                <strong className="text-foreground">{studies.length}</strong> records
              </div>
              <div className="text-[10px] text-muted-foreground">
                All 11 data columns fitted in 100% full width
              </div>
            </div>
          </Card>
        ) : (
          /* View Mode 2: CARDS VIEW (100% Full Width Fit) */
          <div className="w-full space-y-2.5">
            {loading ? (
              <Card className="p-8 text-center border-border/60">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              </Card>
            ) : filteredStudies.length === 0 ? (
              <Card className="p-8 text-center border-border/60 text-xs text-muted-foreground">
                No records found.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
                {filteredStudies.map((study) => {
                  const margin = study.sellingPrice - study.landingPrice;
                  const marginPct =
                    study.sellingPrice > 0 ? ((margin / study.sellingPrice) * 100).toFixed(0) : '0';
                  const isOgito = study.brandName?.toLowerCase().includes('ogito');

                  return (
                    <Card
                      key={study._id}
                      className={`border-border/70 shadow-xs hover:border-orange-500/40 transition-all rounded-xl overflow-hidden ${
                        isOgito ? 'ring-1 ring-orange-500/30 bg-orange-500/[0.02]' : ''
                      }`}
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isOgito
                                    ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                }`}
                              >
                                {study.brandName}
                              </span>
                              {study.weight && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {study.weight}
                                </span>
                              )}
                              {study.packagingType && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground flex items-center gap-1">
                                  <Layers className="w-2.5 h-2.5" />
                                  {study.packagingType}
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-sm text-foreground leading-snug break-words">
                              {study.productName}
                            </h3>
                            {study.labels && study.labels.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                {study.labels.map((lbl, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1"
                                  >
                                    <Tag className="w-2.5 h-2.5" />
                                    {lbl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg p-0"
                              onClick={() => handleDuplicate(study)}
                              title="Duplicate & Edit"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg p-0"
                              onClick={() => handleOpenModal(study)}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-0"
                              onClick={() => setDeleteId(study._id)}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Customer & Location */}
                        <div className="bg-muted/30 rounded-lg p-2 space-y-1 border border-border/50 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                              <Store className="w-3 h-3 text-orange-500 shrink-0" />
                              <span className="truncate">{study.customerName}</span>
                            </div>
                            <Badge variant="secondary" className="text-[9px] py-0 px-1.5 shrink-0 bg-background">
                              {study.customerType || 'Retailer'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-muted-foreground text-[10px]">
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                              <span className="truncate">{study.marketLocation || 'Location not specified'}</span>
                            </div>
                            <span className="truncate max-w-[100px]">By {study.collectedBy}</span>
                          </div>
                        </div>

                        {/* 3-Column Pricing Grid */}
                        <div className="grid grid-cols-3 gap-1.5 bg-muted/20 p-2 rounded-lg border border-border/50 text-center">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Landing</span>
                            <span className="text-xs font-bold font-mono text-foreground block">₹{study.landingPrice.toFixed(0)}</span>
                          </div>
                          <div className="border-x border-border/50 px-1">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Selling</span>
                            <span className="text-xs font-bold font-mono text-foreground block">₹{study.sellingPrice.toFixed(0)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground block">MRP</span>
                            <span className="text-xs font-bold font-mono text-foreground block">₹{study.mrp.toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Margin */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-600" /> Retail Margin:
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                            ₹{margin.toFixed(0)} ({marginPct}%)
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add / Edit Market Study Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[96vw] sm:w-full sm:max-w-[720px] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="p-3.5 sm:p-4 border-b border-border/70 shrink-0 bg-card">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDuplicating ? 'bg-amber-500/15 text-amber-600' : 'bg-orange-500/15 text-orange-600'
              }`}>
                {isDuplicating ? <Copy className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
              </div>
              <span className="truncate">
                {isDuplicating ? 'Duplicate & Edit Record' : isEditing ? 'Edit Market Study Record' : 'Add Market Study Record'}
              </span>
            </DialogTitle>
            <DialogClose onClose={() => setIsModalOpen(false)} />
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 overscroll-contain">
            {isDuplicating && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pre-filled from existing entry. Tweak the product name or details and save as a new record.</span>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="e.g. Vanilla Tub 1L, Choco Bar 60ml"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="h-10 text-xs sm:text-xs rounded-lg"
              />
            </div>

            {/* Variants / Labels with Dynamic Self-Learning Autofill */}
            <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-orange-500" />
                  <span>Product Variant / Labels (Learns from previous entries)</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">Press Enter or comma to add</span>
              </div>

              {/* Active Labels Badges */}
              {formData.labels && formData.labels.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  {formData.labels.map((lbl) => (
                    <Badge
                      key={lbl}
                      variant="secondary"
                      className="text-xs py-0.5 pl-2.5 pr-1.5 gap-1.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/25 rounded-md font-medium"
                    >
                      <span>{lbl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(lbl)}
                        className="hover:bg-orange-500/20 rounded-full p-0.5 text-orange-600 dark:text-orange-400"
                        title="Remove label"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input with Datalist Autofill */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    list="all-known-labels-suggestions"
                    placeholder="Type variant name (e.g. Vanilla, Sugar-Free, Twin Pack)..."
                    value={currentLabelInput}
                    onChange={(e) => setCurrentLabelInput(e.target.value)}
                    onKeyDown={handleLabelKeyDown}
                    className="h-9 text-xs sm:text-xs rounded-lg bg-background"
                  />
                  <datalist id="all-known-labels-suggestions">
                    {allKnownLabels.map((lbl) => (
                      <option key={lbl} value={lbl} />
                    ))}
                  </datalist>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddLabel()}
                  disabled={!currentLabelInput.trim()}
                  className="h-9 px-3 text-xs font-semibold rounded-lg shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {/* Quick-Click Suggestions from already formed labels */}
              {suggestedAvailableLabels.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    Tap to add existing variant:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {suggestedAvailableLabels.slice(0, 10).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddLabel(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-background hover:bg-orange-50 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-600 border border-border/70 hover:border-orange-300 font-medium transition-colors flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5 text-orange-500" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Brand */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Product Brand Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                list="common-brand-suggestions"
                placeholder="e.g. Ogito, Amul, Arun"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="h-10 text-xs sm:text-xs rounded-lg"
              />
              <datalist id="common-brand-suggestions">
                {COMMON_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {COMMON_BRANDS.slice(0, 6).map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setFormData({ ...formData, brandName: brand })}
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                      formData.brandName === brand
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-muted/40 text-muted-foreground border-border/60'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Shop & Customer Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Customer / Shop Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  list="existing-customer-suggestions"
                  placeholder="e.g. Metro Supermarket"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="h-10 text-xs sm:text-xs rounded-lg"
                />
                <datalist id="existing-customer-suggestions">
                  {existingCustomers.slice(0, 50).map((c) => (
                    <option key={c._id} value={c.shopName || c.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Customer Type</Label>
                <Select
                  value={formData.customerType}
                  onValueChange={(val) => setFormData({ ...formData, customerType: val })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue placeholder="Customer Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Weight, Packaging, Location & Collector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Product Weight / Volume</Label>
                <Input
                  list="common-weight-suggestions"
                  placeholder="e.g. 500 ml, 1 Litre"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="h-10 text-xs sm:text-xs rounded-lg"
                />
                <datalist id="common-weight-suggestions">
                  {COMMON_WEIGHTS.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Packaging Type</Label>
                <Input
                  list="common-packaging-suggestions"
                  placeholder="e.g. Cone, Cup, Tub"
                  value={formData.packagingType}
                  onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                  className="h-10 text-xs sm:text-xs rounded-lg"
                />
                <datalist id="common-packaging-suggestions">
                  {PACKAGING_TYPES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Market Location</Label>
                <Input
                  list="route-location-suggestions"
                  placeholder="Town or area name..."
                  value={formData.marketLocation}
                  onChange={(e) => setFormData({ ...formData, marketLocation: e.target.value })}
                  className="h-10 text-xs sm:text-xs rounded-lg"
                />
                <datalist id="route-location-suggestions">
                  {existingRoutes.map((r) => (
                    <option key={r._id} value={r.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Data Collected By <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Name of surveyor"
                  value={formData.collectedBy}
                  onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                  className="h-10 text-xs sm:text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="pt-2 border-t border-border/40">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-orange-500" /> Pricing (INR)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Landing (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.landingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, landingPrice: Number(e.target.value) })}
                    className="h-9 font-mono text-sm font-bold bg-background rounded"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Selling (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="h-9 font-mono text-sm font-bold bg-background rounded"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">MRP (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.mrp || ''}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                    className="h-9 font-mono text-sm font-bold bg-background rounded"
                  />
                </div>
              </div>

              {/* Calculated Margin Indicator */}
              <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
                  <span>Retailer Margin:</span>
                  <span className="font-mono text-orange-600 font-bold">
                    ₹{modalMarginAmount.toFixed(2)} ({modalMarginPercent}%)
                  </span>
                </div>
                {Number(modalMrpDiscount) > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Below MRP: ₹{modalMrpDiscount}
                  </span>
                )}
              </div>
            </div>

            {/* Notes & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border/40">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-foreground">Notes / Observations</Label>
                <Input
                  placeholder="e.g. Free freezer, discount schemes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Collection Date</Label>
                <Input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>
          </form>

          {/* Sticky Modal Footer */}
          <div className="p-3 border-t border-border/70 bg-card/95 backdrop-blur shrink-0 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="h-9 text-xs rounded-lg px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="sm"
              className="h-9 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-5 shadow-xs"
            >
              {isSubmitting ? 'Saving...' : isDuplicating ? 'Save as New Record' : isEditing ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] p-4 rounded-xl">
          <DialogHeader className="p-0 border-none pb-2">
            <DialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />
              Confirm Delete
            </DialogTitle>
            <DialogClose onClose={() => setDeleteId(null)} />
          </DialogHeader>
          <p className="text-xs text-muted-foreground my-2">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-8 text-xs rounded-lg"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
