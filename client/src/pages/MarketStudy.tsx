import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Package,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { MarketStudyObservationView, MarketStudySurvey } from '@/types';
import ProductCatalogueManager from '@/components/marketStudy/ProductCatalogueManager';
import SurveyFormModal from '@/components/marketStudy/SurveyFormModal';

export default function MarketStudyPage() {
  const { isAdmin, isCeo } = useAuth();
  const canManageCatalogue = isAdmin || isCeo;

  // Data State
  const [observations, setObservations] = useState<MarketStudyObservationView[]>([]);
  const [surveys, setSurveys] = useState<MarketStudySurvey[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View Mode: 'table' or 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCustomerType, setSelectedCustomerType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedVariant, setSelectedVariant] = useState('all');
  const [selectedWeight, setSelectedWeight] = useState('all');
  const [selectedPackaging, setSelectedPackaging] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals State
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [surveyToEdit, setSurveyToEdit] = useState<MarketStudySurvey | null>(null);
  const [isCatalogueModalOpen, setIsCatalogueModalOpen] = useState(false);

  // Delete Confirm Dialog State
  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null);
  const [deleteObservationItem, setDeleteObservationItem] = useState<{
    surveyId: string;
    obsId: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all Market Study observations & surveys
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/market-study/observations');
      setObservations(res.data.observations || []);
      setSurveys(res.data.surveys || []);
      setSummary(res.data.summary || null);
    } catch (error) {
      console.error('Failed to load market study data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Observations
  const filteredObservations = useMemo(() => {
    return observations.filter((item) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.marketLocation?.toLowerCase().includes(searchLower) ||
        item.collectedBy?.toLowerCase().includes(searchLower) ||
        item.catalogueProductName?.toLowerCase().includes(searchLower) ||
        item.brandName?.toLowerCase().includes(searchLower) ||
        item.variant?.toLowerCase().includes(searchLower) ||
        item.weight?.toLowerCase().includes(searchLower) ||
        item.packagingType?.toLowerCase().includes(searchLower) ||
        item.notes?.toLowerCase().includes(searchLower) ||
        item.promotionNotes?.toLowerCase().includes(searchLower);

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

      const matchesProduct =
        selectedProduct === 'all' ||
        item.catalogueProductName?.toLowerCase() === selectedProduct.toLowerCase();

      const matchesVariant =
        selectedVariant === 'all' ||
        item.variant?.toLowerCase() === selectedVariant.toLowerCase();

      const matchesWeight =
        selectedWeight === 'all' ||
        item.weight?.toLowerCase() === selectedWeight.toLowerCase();

      const matchesPackaging =
        selectedPackaging === 'all' ||
        item.packagingType?.toLowerCase() === selectedPackaging.toLowerCase();

      // Date Range Match
      let matchesDate = true;
      if (fromDate) {
        matchesDate = matchesDate && new Date(item.surveyDate) >= new Date(fromDate);
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(item.surveyDate) <= to;
      }

      return (
        matchesSearch &&
        matchesBrand &&
        matchesType &&
        matchesLocation &&
        matchesCollector &&
        matchesProduct &&
        matchesVariant &&
        matchesWeight &&
        matchesPackaging &&
        matchesDate
      );
    });
  }, [
    observations,
    searchTerm,
    selectedBrand,
    selectedCustomerType,
    selectedLocation,
    selectedCollector,
    selectedProduct,
    selectedVariant,
    selectedWeight,
    selectedPackaging,
    fromDate,
    toDate
  ]);

  // Unique Lists for Filters
  const uniqueBrands = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.brandName).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const uniqueLocations = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.marketLocation).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const uniqueCollectors = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.collectedBy).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const uniqueProducts = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.catalogueProductName).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const uniqueVariants = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.variant).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const uniqueWeights = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.weight).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const uniquePackagingTypes = useMemo(() => {
    return (Array.from(new Set(observations.map((o) => o.packagingType).filter(Boolean))) as string[]).sort();
  }, [observations]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBrand !== 'all') count++;
    if (selectedCustomerType !== 'all') count++;
    if (selectedLocation !== 'all') count++;
    if (selectedCollector !== 'all') count++;
    if (selectedProduct !== 'all') count++;
    if (selectedVariant !== 'all') count++;
    if (selectedWeight !== 'all') count++;
    if (selectedPackaging !== 'all') count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [
    selectedBrand,
    selectedCustomerType,
    selectedLocation,
    selectedCollector,
    selectedProduct,
    selectedVariant,
    selectedWeight,
    selectedPackaging,
    fromDate,
    toDate
  ]);

  // Open Add Survey Modal
  const handleOpenNewSurvey = () => {
    setSurveyToEdit(null);
    setIsSurveyModalOpen(true);
  };

  // Open Edit Survey Modal
  const handleOpenEditSurvey = async (surveyId: string) => {
    try {
      const res = await api.get(`/market-study/surveys/${surveyId}`);
      if (res.data?.survey) {
        setSurveyToEdit(res.data.survey);
        setIsSurveyModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load survey details for editing:', err);
      alert('Failed to load survey for editing.');
    }
  };

  // Delete Observation
  const handleDeleteObservationConfirm = async () => {
    if (!deleteObservationItem) return;
    setIsDeleting(true);
    try {
      await api.delete(
        `/market-study/surveys/${deleteObservationItem.surveyId}/observations/${deleteObservationItem.obsId}`
      );
      setDeleteObservationItem(null);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to remove observation:', err);
      alert(err?.response?.data?.error || 'Failed to remove observation.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Complete Survey
  const handleDeleteSurveyConfirm = async () => {
    if (!deleteSurveyId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/market-study/surveys/${deleteSurveyId}`);
      setDeleteSurveyId(null);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to delete survey:', err);
      alert(err?.response?.data?.error || 'Failed to delete survey.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV (1 row per observed product variant)
  const handleExportCSV = () => {
    if (filteredObservations.length === 0) {
      alert('No observations available to export.');
      return;
    }

    const headers = [
      'Survey ID',
      'Survey Date',
      'Customer / Shop Name',
      'Customer Type',
      'Data Collected By',
      'Market Location',
      'Catalogue Product Name',
      'Brand Name',
      'Variant / Flavour',
      'Product Weight',
      'Packaging Type',
      'Landing Price (INR)',
      'Selling Price (INR)',
      'MRP (INR)',
      'Retailer Margin (INR)',
      'Retailer Margin (%)',
      'Discount Below MRP (INR)',
      'Promotion / Scheme Notes',
      'Variant Notes',
      'Visit Notes'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredObservations.map((o) => {
      const margin = o.retailerProfit ? o.retailerProfit.toFixed(2) : '0';
      const marginPct = o.marginPercent ? `${o.marginPercent}%` : '0%';
      const mrpDisc = o.mrpDiscount ? o.mrpDiscount.toFixed(2) : '0';

      return [
        escapeCSV(o.surveyId),
        escapeCSV(o.surveyDate ? o.surveyDate.split('T')[0] : ''),
        escapeCSV(o.customerName),
        escapeCSV(o.customerType || 'Retailer'),
        escapeCSV(o.collectedBy),
        escapeCSV(o.marketLocation || ''),
        escapeCSV(o.catalogueProductName),
        escapeCSV(o.brandName),
        escapeCSV(o.variant || ''),
        escapeCSV(o.weight || ''),
        escapeCSV(o.packagingType || ''),
        escapeCSV(o.landingPrice),
        escapeCSV(o.sellingPrice),
        escapeCSV(o.mrp),
        escapeCSV(margin),
        escapeCSV(marginPct),
        escapeCSV(mrpDisc),
        escapeCSV(o.promotionNotes || ''),
        escapeCSV(o.notes || ''),
        escapeCSV(o.surveyNotes || '')
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
    setSelectedProduct('all');
    setSelectedVariant('all');
    setSelectedWeight('all');
    setSelectedPackaging('all');
    setFromDate('');
    setToDate('');
  };

  return (
    <Layout fullWidth>
      <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-3.5 sm:space-y-4 pb-16 sm:pb-8 overflow-hidden">
        
        {/* Top Header Card */}
        <div className="bg-card/70 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
                  Market Study Intelligence
                </h1>
                <Badge
                  variant="outline"
                  className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] font-mono font-bold"
                >
                  {observations.length} Observations • {surveys.length} Visits
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Predefined catalogue surveys with multi-variant competitor pricing & margin tracking
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-border/70 bg-muted/40">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-7 px-2.5 text-xs font-semibold rounded-md gap-1 ${
                  viewMode === 'table' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
                title="Table View (Full Width)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`h-7 px-2.5 text-xs font-semibold rounded-md gap-1 ${
                  viewMode === 'cards' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>

            {/* Export CSV Button */}
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              disabled={filteredObservations.length === 0}
              className="h-8 text-xs font-semibold rounded-lg gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export</span> CSV
            </Button>

            {/* Product Catalogue Button (Admin / CEO) */}
            {canManageCatalogue && (
              <Button
                onClick={() => setIsCatalogueModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg gap-1.5 border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
              >
                <Package className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden lg:inline">Product</span> Catalogue
              </Button>
            )}

            {/* + New Survey Button (Primary Action) */}
            <Button
              onClick={handleOpenNewSurvey}
              size="sm"
              className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Survey
            </Button>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 w-full">
          {/* Card 1: Completed Observations */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Observations</span>
              <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              {summary?.totalObservations || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              Across {summary?.totalShopsSurveyed || 0} shops
            </p>
          </Card>

          {/* Card 2: Catalogue Products Tracked */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Products</span>
              <Package className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              {summary?.totalProductsObserved || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              In {summary?.uniqueBrandsCount || 0} brands
            </p>
          </Card>

          {/* Card 3: Avg Landing Price */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Landing</span>
              <IndianRupee className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ₹{summary?.avgLandingPrice || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">Retailer cost</p>
          </Card>

          {/* Card 4: Avg Selling Price */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Selling</span>
              <IndianRupee className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ₹{summary?.avgSellingPrice || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">Shop retail price</p>
          </Card>

          {/* Card 5: Avg MRP */}
          <Card className="border-border/60 shadow-xs bg-card p-3">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg MRP</span>
              <IndianRupee className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ₹{summary?.avgMRP || 0}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">Maximum retail price</p>
          </Card>

          {/* Card 6: Avg Retailer Margin */}
          <Card className="border-border/60 shadow-xs bg-card p-3 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Margin</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {summary?.avgMarginPercent || 0}%
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">Retail gross margin</p>
          </Card>
        </div>

        {/* Filter Toolbar Card */}
        <Card className="border-border/60 shadow-xs w-full overflow-hidden">
          <CardContent className="p-3 sm:p-3.5 space-y-2.5">
            {/* Top Search Input & Mobile Filter Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by product, shop, brand, variant, location, or surveyor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8.5 pr-8 h-9 text-xs bg-muted/30 border-border/70 rounded-lg"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
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

            {/* Filter Dropdowns Grid */}
            <div
              className={`${
                mobileFiltersOpen ? 'grid' : 'hidden'
              } sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2`}
            >
              {/* Brand Filter */}
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

              {/* Catalogue Product Filter */}
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Product: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Variant / Flavour Filter */}
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Variant: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Variants</SelectItem>
                  {uniqueVariants.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Weight / Volume Filter */}
              <Select value={selectedWeight} onValueChange={setSelectedWeight}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Weight: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weights</SelectItem>
                  {uniqueWeights.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Packaging Filter */}
              <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Pack: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packaging</SelectItem>
                  {uniquePackagingTypes.map((pkg) => (
                    <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Filter */}
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

              {/* Surveyor Filter */}
              <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                <SelectTrigger className="h-8 text-xs bg-muted/30 rounded-lg">
                  <SelectValue placeholder="Surveyor: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Surveyors</SelectItem>
                  {uniqueCollectors.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Bar */}
            {(searchTerm || activeFilterCount > 0) && (
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Found <strong className="text-foreground">{filteredObservations.length}</strong> matching observations
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-6 text-[11px] text-orange-600 hover:text-orange-700 p-0 gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Mode 1: FULL-WIDTH TABLE */}
        {viewMode === 'table' ? (
          <Card className="w-full border-border/60 shadow-xs overflow-hidden rounded-xl">
            {/* Desktop Table View */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col className="w-[15%]" /> {/* Product & Variant */}
                  <col className="w-[8.5%]" />  {/* Brand */}
                  <col className="w-[14%]" /> {/* Customer / Shop */}
                  <col className="w-[7.5%]" />  {/* Customer Type */}
                  <col className="w-[8%]" />  {/* Weight & Packaging */}
                  <col className="w-[8.5%]" />  {/* Surveyor */}
                  <col className="w-[6%]" />  {/* Landing */}
                  <col className="w-[6%]" />  {/* Selling */}
                  <col className="w-[6%]" />  {/* MRP */}
                  <col className="w-[8%]" />  {/* Margin */}
                  <col className="w-[8.5%]" />  {/* Location */}
                  <col className="w-[6%]" />  {/* Actions */}
                </colgroup>
                <thead className="text-[10px] uppercase bg-muted/60 text-muted-foreground font-bold border-b border-border/80 tracking-wider">
                  <tr>
                    <th scope="col" className="px-2 py-2.5 truncate" title="Catalogue Product & Variant">Product & Variant</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Brand">Brand</th>
                    <th scope="col" className="px-2 py-2.5 truncate" title="Shop / Customer">Shop / Customer</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Customer Type">Type</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Weight & Packaging">Size</th>
                    <th scope="col" className="px-1.5 py-2.5 truncate" title="Surveyor">Surveyor</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Retailer Landing Price">Landing</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Retailer Selling Price">Selling</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Maximum Retail Price">MRP</th>
                    <th scope="col" className="px-1.5 py-2.5 text-center truncate" title="Retailer Gross Margin">Margin</th>
                    <th scope="col" className="px-2 py-2.5 truncate" title="Location">Location</th>
                    <th scope="col" className="px-1.5 py-2.5 text-right truncate" title="Actions">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                          <span>Loading survey observations...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredObservations.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                        No survey observations found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredObservations.map((obs) => {
                      const isOgito = obs.brandName?.toLowerCase().includes('ogito');
                      const isPositiveMargin = obs.retailerProfit > 0;

                      return (
                        <tr
                          key={obs._id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isOgito ? 'bg-orange-500/[0.03]' : ''
                          }`}
                        >
                          {/* 1. Product & Variant */}
                          <td className="px-2 py-2 truncate">
                            <div className="font-bold text-foreground truncate" title={obs.catalogueProductName}>
                              {obs.catalogueProductName}
                            </div>
                            {obs.variant ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 truncate max-w-[120px]"
                                  title={obs.variant}
                                >
                                  {obs.variant}
                                </span>
                              </div>
                            ) : null}
                          </td>

                          {/* 2. Brand */}
                          <td className="px-1.5 py-2 text-center truncate">
                            <span
                              className={`truncate block text-center text-[10px] font-bold py-0.5 px-1 rounded ${
                                isOgito
                                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                              }`}
                              title={obs.brandName}
                            >
                              {obs.brandName}
                            </span>
                          </td>

                          {/* 3. Customer / Shop */}
                          <td className="px-2 py-2 truncate">
                            <div className="font-semibold text-foreground truncate flex items-center gap-1" title={obs.customerName}>
                              <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{obs.customerName}</span>
                            </div>
                          </td>

                          {/* 4. Customer Type */}
                          <td className="px-1.5 py-2 text-center truncate">
                            <span
                              className="truncate block text-[10px] py-0.5 px-1 rounded bg-muted text-muted-foreground font-medium"
                              title={obs.customerType}
                            >
                              {obs.customerType}
                            </span>
                          </td>

                          {/* 5. Weight & Packaging */}
                          <td className="px-1.5 py-2 text-center truncate">
                            <div className="font-mono text-[11px] text-foreground truncate" title={obs.weight}>
                              {obs.weight || '-'}
                            </div>
                            {obs.packagingType && (
                              <div className="text-[9px] text-muted-foreground truncate" title={obs.packagingType}>
                                {obs.packagingType}
                              </div>
                            )}
                          </td>

                          {/* 6. Surveyor */}
                          <td className="px-1.5 py-2 truncate">
                            <div className="text-muted-foreground truncate text-[11px]" title={obs.collectedBy}>
                              {obs.collectedBy}
                            </div>
                            <div className="text-[9px] text-muted-foreground truncate">
                              {obs.surveyDate ? obs.surveyDate.split('T')[0] : ''}
                            </div>
                          </td>

                          {/* 7. Landing Price */}
                          <td className="px-1.5 py-2 text-right font-mono text-xs tabular-nums text-foreground">
                            ₹{obs.landingPrice.toFixed(0)}
                          </td>

                          {/* 8. Selling Price */}
                          <td className="px-1.5 py-2 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                            ₹{obs.sellingPrice.toFixed(0)}
                          </td>

                          {/* 9. MRP */}
                          <td className="px-1.5 py-2 text-right font-mono text-xs font-bold tabular-nums text-foreground">
                            ₹{obs.mrp.toFixed(0)}
                          </td>

                          {/* 10. Margin */}
                          <td className="px-1.5 py-2 text-center truncate">
                            <span
                              className={`font-mono text-[11px] font-bold block ${
                                isPositiveMargin
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              ₹{obs.retailerProfit.toFixed(0)} ({obs.marginPercent}%)
                            </span>
                          </td>

                          {/* 11. Location */}
                          <td className="px-2 py-2 truncate text-muted-foreground text-[11px]">
                            <span className="truncate flex items-center gap-0.5" title={obs.marketLocation}>
                              <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                              <span className="truncate">{obs.marketLocation || '-'}</span>
                            </span>
                          </td>

                          {/* 12. Actions */}
                          <td className="px-1.5 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg p-0"
                                onClick={() => handleOpenEditSurvey(obs.surveyId)}
                                title="Edit Entire Survey Visit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-0"
                                onClick={() =>
                                  setDeleteObservationItem({
                                    surveyId: obs.surveyId,
                                    obsId: obs._id,
                                    name: `${obs.catalogueProductName} (${obs.brandName})`
                                  })
                                }
                                title="Remove Observation"
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
          </Card>
        ) : (
          /* View Mode 2: RESPONSIVE CARDS VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                <span>Loading observations...</span>
              </div>
            ) : filteredObservations.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No survey observations found matching your filters.
              </div>
            ) : (
              filteredObservations.map((obs) => {
                const isOgito = obs.brandName?.toLowerCase().includes('ogito');
                return (
                  <Card
                    key={obs._id}
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
                              {obs.brandName}
                            </span>
                            {obs.weight && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {obs.weight}
                              </span>
                            )}
                            {obs.packagingType && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground flex items-center gap-1">
                                <Layers className="w-2.5 h-2.5" />
                                {obs.packagingType}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-foreground leading-snug break-words">
                            {obs.catalogueProductName}
                          </h3>
                          {obs.variant && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1 mt-1">
                              <Tag className="w-2.5 h-2.5" />
                              {obs.variant}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg p-0"
                            onClick={() => handleOpenEditSurvey(obs.surveyId)}
                            title="Edit Survey Visit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-0"
                            onClick={() =>
                              setDeleteObservationItem({
                                surveyId: obs.surveyId,
                                obsId: obs._id,
                                name: `${obs.catalogueProductName} (${obs.brandName})`
                              })
                            }
                            title="Delete Observation"
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
                            <span className="truncate">{obs.customerName}</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 shrink-0 bg-background">
                            {obs.customerType || 'Retailer'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-muted-foreground text-[10px]">
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                            <span className="truncate">{obs.marketLocation || 'Location not specified'}</span>
                          </div>
                          <span className="truncate max-w-[100px]">By {obs.collectedBy}</span>
                        </div>
                      </div>

                      {/* 3-Column Pricing Grid */}
                      <div className="grid grid-cols-3 gap-1.5 bg-muted/20 p-2 rounded-lg border border-border/50 text-center">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Landing</span>
                          <span className="text-xs font-bold font-mono text-foreground block">
                            ₹{obs.landingPrice.toFixed(0)}
                          </span>
                        </div>
                        <div className="border-x border-border/50 px-1">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Selling</span>
                          <span className="text-xs font-bold font-mono text-foreground block">
                            ₹{obs.sellingPrice.toFixed(0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">MRP</span>
                          <span className="text-xs font-bold font-mono text-foreground block">
                            ₹{obs.mrp.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* Margin Banner */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-600" /> Retail Margin:
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                          ₹{obs.retailerProfit.toFixed(0)} ({obs.marginPercent}%)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Survey Creation & Edit Modal */}
      <SurveyFormModal
        isOpen={isSurveyModalOpen}
        onClose={() => {
          setIsSurveyModalOpen(false);
          setSurveyToEdit(null);
        }}
        surveyToEdit={surveyToEdit}
        onSurveySaved={fetchData}
      />

      {/* Admin Catalogue Manager Modal */}
      {canManageCatalogue && (
        <ProductCatalogueManager
          isOpen={isCatalogueModalOpen}
          onClose={() => setIsCatalogueModalOpen(false)}
          onCatalogueUpdated={fetchData}
        />
      )}

      {/* Delete Observation Confirmation */}
      <Dialog
        open={!!deleteObservationItem}
        onOpenChange={(open) => !open && setDeleteObservationItem(null)}
      >
        <DialogContent className="w-[92vw] sm:max-w-[380px] p-4 rounded-xl">
          <DialogHeader className="p-0 border-none pb-2">
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />
              Remove Observation
            </DialogTitle>
            <DialogClose onClose={() => setDeleteObservationItem(null)} />
          </DialogHeader>
          <p className="text-xs text-muted-foreground my-2">
            Are you sure you want to remove <strong>{deleteObservationItem?.name}</strong> from this survey?
          </p>
          <div className="flex gap-2 mt-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteObservationItem(null)}
              disabled={isDeleting}
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteObservationConfirm}
              disabled={isDeleting}
              className="h-8 text-xs rounded-lg"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Survey Confirmation */}
      <Dialog open={!!deleteSurveyId} onOpenChange={(open) => !open && setDeleteSurveyId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[380px] p-4 rounded-xl">
          <DialogHeader className="p-0 border-none pb-2">
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />
              Delete Survey Visit
            </DialogTitle>
            <DialogClose onClose={() => setDeleteSurveyId(null)} />
          </DialogHeader>
          <p className="text-xs text-muted-foreground my-2">
            Are you sure you want to delete this complete survey visit and all its recorded observations? This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteSurveyId(null)}
              disabled={isDeleting}
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSurveyConfirm}
              disabled={isDeleting}
              className="h-8 text-xs rounded-lg"
            >
              {isDeleting ? 'Deleting...' : 'Delete Visit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
