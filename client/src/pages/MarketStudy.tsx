import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  User as UserIcon,
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

export default function MarketStudyPage() {
  const { user } = useAuth();

  const [studies, setStudies] = useState<MarketStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // Mobile View Mode: 'cards' or 'table'. Defaults to 'cards' on mobile (<640px)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'cards' : 'table';
    }
    return 'cards';
  });

  // Mobile filters visibility toggle
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCustomerType, setSelectedCustomerType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');

  // Existing DB options for autocomplete
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [existingRoutes, setExistingRoutes] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productName: '',
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
        item.weight?.toLowerCase().includes(searchLower);

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

      return matchesSearch && matchesBrand && matchesType && matchesLocation && matchesCollector;
    });
  }, [studies, searchTerm, selectedBrand, selectedCustomerType, selectedLocation, selectedCollector]);

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
    return count;
  }, [selectedBrand, selectedCustomerType, selectedLocation, selectedCollector]);

  // Open modal for Create or Edit
  const handleOpenModal = (study?: MarketStudy) => {
    if (study) {
      setIsEditing(true);
      setCurrentId(study._id);
      setFormData({
        productName: study.productName || '',
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
      <div className="w-full max-w-[1700px] 3xl:max-w-[2000px] mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6 space-y-4 sm:space-y-6 pb-20 sm:pb-8">
        
        {/* Top Header Card */}
        <div className="bg-card/70 backdrop-blur-md p-3.5 sm:p-6 rounded-2xl border border-border/60 shadow-sm flex flex-col gap-3.5 sm:gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
                <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                    Market Study
                  </h1>
                  <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-[10px] sm:text-xs font-semibold py-0.5 px-2">
                    Field Intelligence
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                  Competitor pricing, shop details & margins
                </p>
              </div>
            </div>

            {/* View Mode Switcher (Cards vs Table) */}
            <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border/50 shrink-0">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`h-8 px-2.5 text-xs font-medium gap-1.5 ${
                  viewMode === 'cards' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs' : 'text-muted-foreground'
                }`}
                title="Card View (Optimized for Mobile)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-8 px-2.5 text-xs font-medium gap-1.5 ${
                  viewMode === 'table' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs' : 'text-muted-foreground'
                }`}
                title="Spreadsheet Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </Button>
            </div>
          </div>

          {/* Action Buttons for Mobile / Desktop */}
          <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 sm:gap-2.5 pt-1 border-t sm:border-t-0 border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredStudies.length === 0}
              className="h-11 sm:h-10 text-xs sm:text-sm font-semibold gap-2 border-border/80"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </Button>

            <Button
              onClick={() => handleOpenModal()}
              className="h-11 sm:h-10 text-xs sm:text-sm font-bold gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md active:scale-98 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Entry</span>
            </Button>
          </div>
        </div>

        {/* Analytics Summary Cards - Horizontal scroll on mobile for compact swipeable metrics */}
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
          {/* Card 1: Total */}
          <Card className="min-w-[140px] sm:min-w-0 flex-1 border-border/60 shadow-xs bg-card shrink-0">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Products
              </CardTitle>
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-extrabold text-foreground">
                {studies.length}
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                {filteredStudies.length} shown
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Brands */}
          <Card className="min-w-[140px] sm:min-w-0 flex-1 border-border/60 shadow-xs bg-card shrink-0">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Brands
              </CardTitle>
              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {uniqueBrands.length}
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Monitored
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Avg Landing */}
          <Card className="min-w-[140px] sm:min-w-0 flex-1 border-border/60 shadow-xs bg-card shrink-0">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Avg Landing
              </CardTitle>
              <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
                ₹{summary?.avgLandingPrice || 0}
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Retail cost
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Avg MRP */}
          <Card className="min-w-[140px] sm:min-w-0 flex-1 border-border/60 shadow-xs bg-card shrink-0">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Avg MRP
              </CardTitle>
              <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
                ₹{summary?.avgMRP || 0}
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Printed price
              </p>
            </CardContent>
          </Card>

          {/* Card 5: Avg Margin */}
          <Card className="min-w-[140px] sm:min-w-0 flex-1 border-border/60 shadow-xs bg-card shrink-0">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Avg Margin
              </CardTitle>
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {summary?.avgMarginPercent || 0}%
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Retailer profit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar - Mobile Touch Optimized */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search product, shop, brand, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9.5 pr-8 h-11 text-base sm:text-sm bg-muted/30 border-border/80 rounded-xl"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle Button */}
              <Button
                variant={mobileFiltersOpen || activeFilterCount > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className={`sm:hidden h-11 px-3 rounded-xl text-xs font-medium gap-1.5 shrink-0 ${
                  activeFilterCount > 0 ? 'bg-orange-600 text-white' : ''
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-white text-orange-600 text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Filter Dropdowns: Collapsible on mobile, always inline grid on tablet/desktop */}
            <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} sm:grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 sm:pt-0`}>
              {/* Brand Filter */}
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block sm:hidden font-medium">Brand</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="h-10 text-xs bg-muted/30 rounded-xl">
                    <SelectValue placeholder="Brand: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {uniqueBrands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Type Filter */}
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block sm:hidden font-medium">Customer Type</Label>
                <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                  <SelectTrigger className="h-10 text-xs bg-muted/30 rounded-xl">
                    <SelectValue placeholder="Type: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shop Types</SelectItem>
                    {CUSTOMER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Market Location Filter */}
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block sm:hidden font-medium">Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-10 text-xs bg-muted/30 rounded-xl">
                    <SelectValue placeholder="Location: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Collector Filter */}
              <div>
                <Label className="text-[11px] text-muted-foreground mb-1 block sm:hidden font-medium">Collector</Label>
                <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                  <SelectTrigger className="h-10 text-xs bg-muted/30 rounded-xl">
                    <SelectValue placeholder="Collector: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collectors</SelectItem>
                    {uniqueCollectors.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter reset indicator */}
            {(searchTerm || activeFilterCount > 0) && (
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">
                  Found <strong className="text-foreground">{filteredStudies.length}</strong> matching results
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 text-xs text-orange-600 hover:text-orange-700 p-0 gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Mode 1: Responsive Cards View (Superb for Mobile Smartphones) */}
        {viewMode === 'cards' ? (
          <div className="space-y-3">
            {loading ? (
              <Card className="p-10 text-center border-border/60">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                  <span className="text-sm font-medium text-muted-foreground">Loading market studies...</span>
                </div>
              </Card>
            ) : filteredStudies.length === 0 ? (
              <Card className="p-8 text-center border-border/60">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2.5">
                  <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">No Records Found</h3>
                  <p className="text-xs text-muted-foreground">
                    No market study data matches your search or filter.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleOpenModal()}
                    className="mt-2 bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Entry
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudies.map((study) => {
                  const margin = study.sellingPrice - study.landingPrice;
                  const marginPct =
                    study.sellingPrice > 0 ? ((margin / study.sellingPrice) * 100).toFixed(1) : '0';
                  const isOgito = study.brandName?.toLowerCase().includes('ogito');

                  return (
                    <Card
                      key={study._id}
                      className={`border-border/70 shadow-xs hover:border-orange-500/40 transition-all rounded-2xl overflow-hidden ${
                        isOgito ? 'ring-1 ring-orange-500/30 bg-orange-500/[0.02]' : ''
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Top: Product Name, Brand & Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                  isOgito
                                    ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                }`}
                              >
                                {study.brandName}
                              </span>
                              {study.weight && (
                                <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {study.weight}
                                </span>
                              )}
                              {study.packagingType && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  {study.packagingType}
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-base text-foreground leading-snug break-words">
                              {study.productName}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                              onClick={() => handleOpenModal(study)}
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                              onClick={() => setDeleteId(study._id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Customer & Location Details */}
                        <div className="bg-muted/30 rounded-xl p-2.5 space-y-1.5 border border-border/50 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-medium text-foreground min-w-0">
                              <Store className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="truncate">{study.customerName}</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0 bg-background">
                              {study.customerType || 'Retailer'}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-muted-foreground text-[11px] pt-1 border-t border-border/40">
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span className="truncate">{study.marketLocation || 'Location not specified'}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <UserIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[100px]">{study.collectedBy}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3-Column Pricing Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/50 text-center">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Landing
                            </span>
                            <span className="text-sm font-bold font-mono text-foreground block">
                              ₹{study.landingPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-0.5 border-x border-border/50 px-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Selling
                            </span>
                            <span className="text-sm font-bold font-mono text-foreground block">
                              ₹{study.sellingPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              MRP
                            </span>
                            <span className="text-sm font-bold font-mono text-foreground block">
                              ₹{study.mrp.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Retailer Margin Banner */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            Retailer Margin
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{margin.toFixed(2)} ({marginPct}%)
                          </span>
                        </div>

                        {/* Notes if available */}
                        {study.notes && (
                          <p className="text-[11px] text-muted-foreground italic px-1 line-clamp-2">
                            Note: {study.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* View Mode 2: Multi-Column Table View (Scroll-optimized for Desktop & Tablets) */
          <Card className="border-border/60 shadow-md overflow-hidden">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-semibold border-b border-border/80 tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">
                      Product Name
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">
                      Customer / Shop Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                      Customer Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                      Data Collected By
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                      Product Brand Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                      Product Weight
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                      Packaging Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap text-right">
                      Landing Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap text-right">
                      Selling Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap text-right">
                      MRP
                    </th>
                    <th scope="col" className="px-3 py-3.5 whitespace-nowrap text-center">
                      Retailer Margin
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">
                      Market Location
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap text-right min-w-[90px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Loading market study data...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudies.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-16 text-center text-muted-foreground">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredStudies.map((study) => {
                      const margin = study.sellingPrice - study.landingPrice;
                      const marginPct =
                        study.sellingPrice > 0 ? ((margin / study.sellingPrice) * 100).toFixed(1) : '0';
                      const isPositiveMargin = margin > 0;
                      const isOgito = study.brandName?.toLowerCase().includes('ogito');

                      return (
                        <tr
                          key={study._id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isOgito ? 'bg-orange-500/[0.03]' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground leading-snug">
                                {study.productName}
                              </span>
                              {study.notes && (
                                <span className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5">
                                  {study.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-foreground">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[180px]">{study.customerName}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <Badge variant="secondary" className="text-[11px] font-normal py-0.5 px-2 bg-muted/80">
                              {study.customerType || 'Retailer'}
                            </Badge>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                {study.collectedBy ? study.collectedBy.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="truncate max-w-[110px]">{study.collectedBy}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                isOgito
                                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                              }`}
                            >
                              {study.brandName}
                            </span>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-xs font-medium text-foreground">
                            {study.weight ? (
                              <span className="font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/40">
                                {study.weight}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-xs text-foreground">
                            {study.packagingType ? (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Layers className="h-3 w-3" />
                                {study.packagingType}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-right font-mono font-medium text-foreground">
                            ₹{study.landingPrice.toFixed(2)}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-right font-mono font-semibold text-foreground">
                            ₹{study.sellingPrice.toFixed(2)}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-right font-mono font-bold text-foreground">
                            ₹{study.mrp.toFixed(2)}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-center">
                            {study.sellingPrice > 0 ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className={`text-xs font-semibold font-mono ${
                                    isPositiveMargin ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                                  }`}
                                >
                                  ₹{margin.toFixed(2)}
                                </span>
                                <span
                                  className={`text-[10px] font-medium px-1.5 rounded ${
                                    isPositiveMargin
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-amber-500/10 text-amber-700'
                                  }`}
                                >
                                  {marginPct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {study.marketLocation ? (
                              <div className="flex items-center gap-1.5 text-xs text-foreground">
                                <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                <span className="truncate max-w-[130px]">{study.marketLocation}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                onClick={() => handleOpenModal(study)}
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                onClick={() => setDeleteId(study._id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
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

            <div className="px-4 py-3 bg-muted/40 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div>
                Showing <strong className="text-foreground">{filteredStudies.length}</strong> of{' '}
                <strong className="text-foreground">{studies.length}</strong> records
              </div>
              <div className="flex items-center gap-3">
                <span>Landing = Purchase</span>
                <span>•</span>
                <span>Selling = Retail</span>
                <span>•</span>
                <span>MRP = Printed Price</span>
              </div>
            </div>
          </Card>
        )}

        {/* Mobile Floating Action Button (FAB) - Quick Add while on the go */}
        <div className="sm:hidden fixed bottom-6 right-5 z-40">
          <Button
            onClick={() => handleOpenModal()}
            className="h-14 w-14 rounded-full p-0 shadow-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center active:scale-90 transition-transform border-2 border-white/40"
            aria-label="Add Market Study"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </div>
      </div>

      {/* Add / Edit Market Study Modal - Fully Mobile Optimized */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[96vw] sm:w-full sm:max-w-[760px] max-h-[95vh] sm:max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">
          {/* Sticky Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border/70 shrink-0 bg-card">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4" />
              </div>
              <span className="truncate">{isEditing ? 'Edit Market Study' : 'Add Market Study Data'}</span>
            </DialogTitle>
            <DialogClose onClose={() => setIsModalOpen(false)} />
          </DialogHeader>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
            {/* Section 1: Product & Brand */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Product Name <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal">e.g. Choco Feast 80ml</span>
                </Label>
                <Input
                  required
                  placeholder="Enter product or flavor name..."
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
              </div>

              {/* Brand Name with Quick Tap Chips */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Product Brand Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  list="common-brand-suggestions"
                  placeholder="Select or type brand..."
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
                <datalist id="common-brand-suggestions">
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>

                {/* Quick Brand Tap Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_BRANDS.slice(0, 6).map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setFormData({ ...formData, brandName: brand })}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        formData.brandName === brand
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/60'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Shop & Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Customer / Shop Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  list="existing-customer-suggestions"
                  placeholder="e.g. Metro Supermarket"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
                <datalist id="existing-customer-suggestions">
                  {existingCustomers.slice(0, 60).map((c) => (
                    <option key={c._id} value={c.shopName || c.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Customer Type</Label>
                <Select
                  value={formData.customerType}
                  onValueChange={(val) => setFormData({ ...formData, customerType: val })}
                >
                  <SelectTrigger className="h-11 text-base sm:text-sm rounded-xl">
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
            </div>

            {/* Section 3: Weight, Packaging & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Product Weight / Volume</Label>
                <Input
                  list="common-weight-suggestions"
                  placeholder="e.g. 500 ml, 1 Litre"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
                <datalist id="common-weight-suggestions">
                  {COMMON_WEIGHTS.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
                {/* Weight quick chips */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {['100 ml', '500 ml', '1 Litre'].map((wt) => (
                    <button
                      key={wt}
                      type="button"
                      onClick={() => setFormData({ ...formData, weight: wt })}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground font-mono"
                    >
                      {wt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Packaging Type</Label>
                <Input
                  list="common-packaging-suggestions"
                  placeholder="e.g. Cone, Cup, Tub"
                  value={formData.packagingType}
                  onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
                <datalist id="common-packaging-suggestions">
                  {PACKAGING_TYPES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {/* Packaging quick chips */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {['Cone', 'Cup', 'Tub', 'Stick'].map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setFormData({ ...formData, packagingType: pkg })}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground"
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Market Location</Label>
                <Input
                  list="route-location-suggestions"
                  placeholder="Town, city, or area..."
                  value={formData.marketLocation}
                  onChange={(e) => setFormData({ ...formData, marketLocation: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
                <datalist id="route-location-suggestions">
                  {existingRoutes.map((r) => (
                    <option key={r._id} value={r.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Data Collected By <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Sales executive name"
                  value={formData.collectedBy}
                  onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Section 4: Pricing (Touch Optimized 3-card layout) */}
            <div className="pt-2 border-t border-border/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-orange-500" />
                Pricing in Indian Rupees (₹)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {/* Landing Price */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Landing Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.landingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, landingPrice: Number(e.target.value) })}
                    className="h-11 font-mono text-lg font-bold bg-background rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">Shop purchase cost</p>
                </div>

                {/* Selling Price */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Selling Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="h-11 font-mono text-lg font-bold bg-background rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">Retail consumer price</p>
                </div>

                {/* MRP */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    MRP (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.mrp || ''}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                    className="h-11 font-mono text-lg font-bold bg-background rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">Max printed price</p>
                </div>
              </div>

              {/* Calculated Margin Live Box */}
              <div className="mt-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span className="font-semibold text-foreground">Calculated Margin:</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    ₹{modalMarginAmount.toFixed(2)} ({modalMarginPercent}%)
                  </span>
                </div>
                {Number(modalMrpDiscount) > 0 && (
                  <div className="text-muted-foreground text-[11px]">
                    Below MRP: <span className="font-mono font-semibold">₹{modalMrpDiscount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Notes / Observations</Label>
                <Input
                  placeholder="e.g. Free freezer, 10+1 scheme, visibility..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Collection Date</Label>
                <Input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                  className="h-11 text-base sm:text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Bottom spacer for mobile scrolling */}
            <div className="h-2" />
          </form>

          {/* Sticky Bottom Actions Bar */}
          <div className="p-3 sm:p-4 border-t border-border/70 bg-card/95 backdrop-blur shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="h-11 sm:h-10 text-xs sm:text-sm rounded-xl w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 sm:h-10 text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl min-w-[130px] w-full sm:w-auto shadow-md"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal - Mobile Friendly */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-5 rounded-2xl">
          <DialogHeader className="p-0 border-none pb-2">
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
            <DialogClose onClose={() => setDeleteId(null)} />
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground my-2">
            Are you sure you want to delete this market study record? This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
              className="h-10 text-xs flex-1 sm:flex-none rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-10 text-xs flex-1 sm:flex-none rounded-xl"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
