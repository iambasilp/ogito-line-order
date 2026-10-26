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
  RotateCcw
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
  'Nandini',
  'Milma',
  'Baskin Robbins',
  'Natural Ice Cream',
  'Other'
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
  'Bottle / Shake',
  'Other'
];

const COMMON_WEIGHTS = [
  '50 ml',
  '70 ml',
  '100 ml',
  '120 ml',
  '150 ml',
  '250 ml',
  '500 ml',
  '750 ml',
  '1 Litre',
  '1.2 Litre',
  '2 Litre',
  '50 g',
  '100 g',
  '250 g',
  '500 g',
  '1 kg'
];

export default function MarketStudyPage() {
  const { user } = useAuth();

  const [studies, setStudies] = useState<MarketStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

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

  // Fetch auxiliary autocomplete data (customers & routes)
  useEffect(() => {
    fetchData();

    // Fetch existing customers and routes for convenient auto-suggestions
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
        // Aux data is optional
      }
    };
    fetchAuxiliary();
  }, []);

  // Filtered List
  const filteredStudies = useMemo(() => {
    return studies.filter((item) => {
      // Search
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

      // Brand
      const matchesBrand =
        selectedBrand === 'all' || item.brandName?.toLowerCase() === selectedBrand.toLowerCase();

      // Customer Type
      const matchesType =
        selectedCustomerType === 'all' ||
        item.customerType?.toLowerCase() === selectedCustomerType.toLowerCase();

      // Location
      const matchesLocation =
        selectedLocation === 'all' ||
        item.marketLocation?.toLowerCase() === selectedLocation.toLowerCase();

      // Collector
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

  // Submit form (create / update)
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
      <div className="w-full max-w-[1700px] 3xl:max-w-[2000px] mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-border/60 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Market Study
                  <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-xs">
                    Data Collection
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Track competitor products, retail pricing, packaging, and shop-level market intelligence.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredStudies.length === 0}
              className="gap-2 h-10 px-4 font-medium"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export CSV
            </Button>

            <Button
              onClick={() => handleOpenModal()}
              className="gap-2 h-10 px-5 font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Market Study
            </Button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-border/60 shadow-sm bg-card hover:border-orange-500/30 transition-all">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Products
              </CardTitle>
              <Store className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-foreground">
                {studies.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {filteredStudies.length} matching current filter
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-card hover:border-orange-500/30 transition-all">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brands Monitored
              </CardTitle>
              <Tag className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {uniqueBrands.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {uniqueBrands.slice(0, 3).join(', ')}{uniqueBrands.length > 3 ? '...' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-card hover:border-orange-500/30 transition-all">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg. Landing Price
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-foreground font-mono">
                ₹{summary?.avgLandingPrice || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Retailer cost price</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-card hover:border-orange-500/30 transition-all">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg. MRP
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-foreground font-mono">
                ₹{summary?.avgMRP || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Printed maximum price</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 lg:col-span-1 border-border/60 shadow-sm bg-card hover:border-orange-500/30 transition-all">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg Retail Margin
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                {summary?.avgMarginPercent || 0}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Retailer gross profit margin</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Toolbar */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, shop, brand, collector, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-muted/30 focus-visible:ring-orange-500/30"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filter Selects */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Brand Filter */}
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-muted/30">
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

                {/* Customer Type Filter */}
                <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-muted/30">
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

                {/* Market Location Filter */}
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-muted/30">
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

                {/* Collector Filter */}
                <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-muted/30">
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

              {(searchTerm || selectedBrand !== 'all' || selectedCustomerType !== 'all' || selectedLocation !== 'all' || selectedCollector !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-10 text-muted-foreground hover:text-foreground gap-1.5 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Data Table */}
        <Card className="border-border/60 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
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
                    <td colSpan={13} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-3">
                        <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                          <ClipboardList className="h-7 w-7" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                          {studies.length === 0 ? 'No Market Study Data Yet' : 'No Matching Records Found'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {studies.length === 0
                            ? 'Begin collecting competitor and retail pricing data from field visits to build comprehensive market insights.'
                            : 'Try adjusting your search keywords or filter selections.'}
                        </p>
                        {studies.length === 0 ? (
                          <Button
                            onClick={() => handleOpenModal()}
                            size="sm"
                            className="mt-2 bg-orange-600 hover:bg-orange-700 text-white gap-2 font-medium"
                          >
                            <Plus className="w-4 h-4" /> Add First Record
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-2 text-xs"
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
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
                        {/* 1. Product Name */}
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground leading-snug">
                              {study.productName}
                            </span>
                            {study.notes && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5">
                                Note: {study.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Customer / Shop Name */}
                        <td className="px-4 py-3.5 text-foreground">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]">{study.customerName}</span>
                          </div>
                        </td>

                        {/* 3. Customer Type */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-normal py-0.5 px-2 bg-muted/80 text-foreground border border-border/50"
                          >
                            {study.customerType || 'Retailer'}
                          </Badge>
                        </td>

                        {/* 4. Data Collected By */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {study.collectedBy ? study.collectedBy.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="truncate max-w-[120px]">{study.collectedBy}</span>
                          </div>
                        </td>

                        {/* 5. Product Brand Name */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                              isOgito
                                ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {study.brandName}
                          </span>
                        </td>

                        {/* 6. Product Weight */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-xs font-medium text-foreground">
                          {study.weight ? (
                            <span className="font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/40">
                              {study.weight}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* 7. Packaging Type */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-xs text-foreground">
                          {study.packagingType ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Layers className="h-3 w-3 text-muted-foreground" />
                              {study.packagingType}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* 8. Landing Price */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-right font-mono font-medium text-foreground">
                          ₹{study.landingPrice.toFixed(2)}
                        </td>

                        {/* 9. Selling Price */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-right font-mono font-semibold text-foreground">
                          ₹{study.sellingPrice.toFixed(2)}
                        </td>

                        {/* 10. MRP */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-right font-mono font-bold text-foreground">
                          ₹{study.mrp.toFixed(2)}
                        </td>

                        {/* Retailer Margin */}
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
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
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

                        {/* 11. Market Location */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {study.marketLocation ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              <span className="truncate max-w-[150px]">{study.marketLocation}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              onClick={() => handleOpenModal(study)}
                              title="Edit Entry"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              onClick={() => setDeleteId(study._id)}
                              title="Delete Entry"
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

          {/* Table Footer info */}
          <div className="px-4 py-3 bg-muted/40 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{filteredStudies.length}</span> of{' '}
              <span className="font-semibold text-foreground">{studies.length}</span> records
            </div>
            <div className="flex items-center gap-4">
              <span>Landing = Retailer Purchase</span>
              <span>•</span>
              <span>Selling = Retailer Sales</span>
              <span>•</span>
              <span>MRP = Printed Price</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Add / Edit Market Study Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[760px] w-[95vw] max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center">
                <ClipboardList className="h-4 w-4" />
              </div>
              {isEditing ? 'Edit Market Study Record' : 'Add New Market Study Record'}
            </DialogTitle>
            <DialogClose onClose={() => setIsModalOpen(false)} />
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Product Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. Vanilla Tub 1L, Choco Bar 60ml, Butterscotch Cone"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                />
              </div>

              {/* Customer / Shop Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Customer / Shop Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  list="existing-customer-suggestions"
                  placeholder="e.g. Metro Supermarket, Kerala Cool Bar"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
                <datalist id="existing-customer-suggestions">
                  {existingCustomers.slice(0, 50).map((c) => (
                    <option key={c._id} value={c.shopName || c.name} />
                  ))}
                </datalist>
              </div>

              {/* Customer Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Customer Type</Label>
                <Select
                  value={formData.customerType}
                  onValueChange={(val) => setFormData({ ...formData, customerType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer Type" />
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

              {/* Product Brand Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Product Brand Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  list="common-brand-suggestions"
                  placeholder="e.g. Ogito, Amul, Kwality Wall's, Arun"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                />
                <datalist id="common-brand-suggestions">
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              {/* Data Collected By */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Data Collected By <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Name of sales executive / surveyor"
                  value={formData.collectedBy}
                  onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                />
              </div>

              {/* Product Weight */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Product Weight / Volume</Label>
                <Input
                  list="common-weight-suggestions"
                  placeholder="e.g. 500 ml, 1 Litre, 120 ml, 50 g"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
                <datalist id="common-weight-suggestions">
                  {COMMON_WEIGHTS.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </div>

              {/* Packaging Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Packaging Type</Label>
                <Input
                  list="common-packaging-suggestions"
                  placeholder="e.g. Cone, Cup, Tub, Stick, Box"
                  value={formData.packagingType}
                  onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                />
                <datalist id="common-packaging-suggestions">
                  {PACKAGING_TYPES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              {/* Market Location */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Market Location</Label>
                <Input
                  list="route-location-suggestions"
                  placeholder="e.g. Calicut, Manjeri, Tirur, Kondotty"
                  value={formData.marketLocation}
                  onChange={(e) => setFormData({ ...formData, marketLocation: e.target.value })}
                />
                <datalist id="route-location-suggestions">
                  {existingRoutes.map((r) => (
                    <option key={r._id} value={r.name} />
                  ))}
                </datalist>
              </div>

              {/* Collection Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Collection Date</Label>
                <Input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                />
              </div>

              {/* Pricing Section (3 columns) */}
              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-orange-500" />
                  Pricing Details (INR)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/50">
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
                      onChange={(e) =>
                        setFormData({ ...formData, landingPrice: Number(e.target.value) })
                      }
                      className="font-mono text-base font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">Retailer purchase cost</p>
                  </div>

                  <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/50">
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
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPrice: Number(e.target.value) })
                      }
                      className="font-mono text-base font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">Retailer selling price</p>
                  </div>

                  <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/50">
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
                      className="font-mono text-base font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">Maximum retail price</p>
                  </div>
                </div>

                {/* Real-time Calculated Margin Indicator */}
                <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="font-semibold text-foreground">Calculated Retailer Margin:</span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      ₹{modalMarginAmount.toFixed(2)} ({modalMarginPercent}%)
                    </span>
                  </div>
                  {Number(modalMrpDiscount) > 0 && (
                    <div className="text-muted-foreground">
                      Discount below MRP: <span className="font-mono font-semibold">₹{modalMrpDiscount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">Notes / Observations</Label>
                <Input
                  placeholder="e.g. Free freezer provided by company, 10+1 scheme, prime visibility on top shelf"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
            <DialogClose onClose={() => setDeleteId(null)} />
          </DialogHeader>
          <p className="text-sm text-muted-foreground my-2">
            Are you sure you want to delete this market study entry? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
