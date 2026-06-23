import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, TrendingUp, Calendar as CalendarIcon, Package, Star, BarChart as BarChartIcon, Target, Trophy, ChevronRight, ChevronDown, Loader2, Medal, Globe, X, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { formatCurrency, formatBoxPcs } from '@/utils/formatters';
import { getCurrentTarget } from '@/utils/targets';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList, Area, ComposedChart, Line, Tooltip } from 'recharts';

interface AnalyticsData {
  routeWise: {
    _id: string;
    routeId?: string;
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
  }[];
  salesExecutiveWise: {
    _id: string;
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
  }[];
  overall: {
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
  };
  trend?: {
    _id: string; // YYYY-MM-DD
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
  }[];
  topCustomers?: {
    _id: string;
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
    salesExecutive: string;
    route: string;
  }[];
  recentOrders?: {
    _id: string;
    customerName: string;
    salesExecutive: string;
    route: string;
    standardQty: number;
    premiumQty: number;
    total: number;
    createdAt: string;
  }[];
}

interface AdminInsights {
  sleepingCustomers: {
    _id: string;
    customerName: string;
    phone: string;
    lastOrderDate: string;
    totalOrders: number;
  }[];
  busiestDays: {
    day: string;
    totalOrders: number;
  }[];
}

interface PartyBreakdownItem {
  _id: string;
  totalRevenue: number;
  totalOrders: number;
  totalStandardQty: number;
  totalPremiumQty: number;
}

interface MonthlyTrendData {
  _id: string; // YYYY-MM
  totalRevenue: number;
  totalOrders: number;
}


type ViewMode = 'daily' | 'weekly' | 'monthly' | 'custom';

// Reusable standalone component to prevent state loss on parent re-render
const DrilldownContent = ({ loading, data, isModal = false }: { loading: boolean; data: PartyBreakdownItem[], isModal?: boolean }) => {
  const [showAll, setShowAll] = useState(false);

  // Reset showAll when data changes (e.g. user clicks a different row)
  useEffect(() => {
    setShowAll(false);
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Loading party breakdown...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="py-6 text-center text-muted-foreground text-xs">No party data found.</div>;
  }

  const displayData = (showAll || isModal) ? data : data.slice(0, 3);
  const maxRev = data[0]?.totalRevenue || 1;

  return (
    <div className="pt-4 pb-2 border-t border-border mt-2 px-1 sm:px-3 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex justify-between items-center mb-3 px-2">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Medal className="h-3.5 w-3.5" /> Party Ranking</h4>
        <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{data.length} Parties</span>
      </div>
      <ul className={`space-y-3 ${isModal ? 'max-h-[50vh] overflow-y-auto pr-2' : ''}`}>
        {displayData.map((party, index) => {
          const width = Math.max(2, (party.totalRevenue / maxRev) * 100);
          return (
            <li key={party._id} className="relative bg-card text-card-foreground border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-top-1 fade-in duration-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-muted text-muted-foreground shrink-0 border border-border">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-xs sm:text-sm leading-none mb-1">{party._id}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-none">{party.totalOrders} order{party.totalOrders !== 1 && 's'} · {formatBoxPcs(party.totalStandardQty)} Std · {formatBoxPcs(party.totalPremiumQty)} Prem</p>
                  </div>
                </div>
                <p className="font-bold text-card-foreground text-xs sm:text-sm shrink-0 font-mono tabular-nums">{formatCurrency(party.totalRevenue)}</p>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary/40" style={{ width: `${width}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      {!isModal && data.length > 3 && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent row click from toggling
            setShowAll(!showAll);
          }}
          className={`w-full mt-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${showAll ? 'text-muted-foreground bg-muted hover:bg-muted/50' : 'text-primary bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40'
            }`}
        >
          {showAll ? (
            <>Close Full List <X className="h-3.5 w-3.5" /></>
          ) : (
            <>See Full List ({data.length - 3} more) <ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [adminInsights, setAdminInsights] = useState<AdminInsights | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<PartyBreakdownItem[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Modal State for Route Drilldown
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [selectedRouteTitle, setSelectedRouteTitle] = useState('');

  // Modal State for Detailed Analytics
  const [isDetailedAnalyticsOpen, setIsDetailedAnalyticsOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const today = new Date().toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState<string>(today);
  const [customEnd, setCustomEnd] = useState<string>(today);

  const fetchMonthlyTrend = useCallback(async () => {
    try {
      const response = await api.get('/orders/monthly-trend');
      setMonthlyTrend(response.data);
    } catch (error: any) {
      // Silently ignore 404 - endpoint may not be available on this server version
      if (error?.response?.status !== 404) {
        console.error('Failed to fetch monthly trend:', error);
      }
    }
  }, []);

  const fetchRouteDrilldown = useCallback(async (routeId: string, start: Date, end: Date) => {
    setDrilldownData([]);
    setDrilldownLoading(true);
    try {
      const response = await api.get('/orders/analytics/route-breakdown', {
        params: { routeId, startDate: start.toISOString(), endDate: end.toISOString() }
      });
      setDrilldownData(response.data);
    } catch (error) {
      console.error('Failed to fetch route breakdown:', error);
    } finally {
      setDrilldownLoading(false);
    }
  }, []);

  const toggleExecRow = useCallback(async (executive: string, start: Date, end: Date) => {
    const rowKey = `exec_${executive}`;
    if (expandedRowId === rowKey) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(rowKey);
    setDrilldownData([]);
    setDrilldownLoading(true);
    try {
      const response = await api.get('/orders/analytics/executive-breakdown', {
        params: { executive, startDate: start.toISOString(), endDate: end.toISOString() }
      });
      setDrilldownData(response.data);
    } catch (error) {
      console.error('Failed to fetch executive breakdown:', error);
    } finally {
      setDrilldownLoading(false);
    }
  }, [expandedRowId]);

  // Pass necessary state to the standalone DrilldownContent component
  const renderDrilldown = (isModal = false) => (
    <DrilldownContent loading={drilldownLoading} data={drilldownData} isModal={isModal} />
  );




  const getDateRange = useCallback(() => {
    const date = new Date(selectedDate);
    const start = new Date(date);
    const end = new Date(date);

    if (viewMode === 'daily') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'weekly') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'custom') {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    return { start, end };
  }, [selectedDate, viewMode, customStart, customEnd]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const response = await api.get('/orders/analytics', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });

      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  const fetchAdminInsights = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get('/orders/admin/insights');
      setAdminInsights(response.data);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Failed to fetch admin insights:', error);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAnalytics();
    if (isAdmin) {
      fetchMonthlyTrend();
      fetchAdminInsights();
    }
  }, [fetchAnalytics, fetchMonthlyTrend, fetchAdminInsights, isAdmin]);

  // Kept here so it retains original functionality

  const handlePrevDay = () => {
    if (viewMode === 'custom') return;
    const date = new Date(selectedDate);
    if (viewMode === 'daily') date.setDate(date.getDate() - 1);
    else if (viewMode === 'weekly') date.setDate(date.getDate() - 7);
    else if (viewMode === 'monthly') date.setMonth(date.getMonth() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (viewMode === 'custom') return;
    const date = new Date(selectedDate);
    if (viewMode === 'daily') date.setDate(date.getDate() + 1);
    else if (viewMode === 'weekly') date.setDate(date.getDate() + 7);
    else if (viewMode === 'monthly') date.setMonth(date.getMonth() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    fetchAnalytics();
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  useEffect(() => {
    document.title = isAdmin ? 'Analytics Dashboard | Ogito' : 'My Performance | Ogito';
  }, [isAdmin]);

  if (!user || user.role === 'driver') {
    return (
      <Layout>
        <div className="p-8 text-center text-red-500">Access Denied</div>
      </Layout>
    );
  }

  // Calculate targets for Sales Executives
  const { salesTarget, targetPercentage, targetRemaining, targetHit } = React.useMemo(() => {
    const st = user ? getCurrentTarget(user.username.toLowerCase(), selectedDate) : 0;
    const ta = analytics?.overall.totalRevenue || 0;
    const tp = st > 0 ? Math.min(100, (ta / st) * 100) : 0;
    const tr = Math.max(0, st - ta);
    const th = tp >= 100;
    return { salesTarget: st, targetAchieved: ta, targetPercentage: tp, targetRemaining: tr, targetHit: th };
  }, [user, selectedDate, analytics]);

  return (
    <Layout fullWidth>
      <div className="space-y-6 w-full max-w-[1600px] px-2 mx-auto pb-10">
        {/* Header and Date Picker */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
                &larr; Back to Orders
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-card-foreground flex items-center gap-2">

              {isAdmin ? 'Analytics Dashboard' : 'My Performance'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Revenue and performance metrics overview' : 'Track your sales progress and hit your targets'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex bg-muted p-0.5 rounded-lg w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly', 'custom'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${viewMode === mode
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {viewMode === 'custom' ? (
              <div className="flex flex-col sm:flex-row items-center gap-1.5 bg-muted p-1.5 rounded-lg border border-border w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-1.5 py-1 text-xs bg-background text-foreground border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-1.5 py-1 text-xs bg-background text-foreground border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={handleApplyCustom}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg border border-border w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={handlePrevDay}
                  aria-label="Previous Day"
                  className="p-1.5 hover:bg-card text-card-foreground rounded shadow-sm text-muted-foreground transition-colors"
                >
                  &larr;
                </button>

                <div className="flex items-center px-3 py-1 bg-background text-foreground rounded shadow-sm text-sm font-medium min-w-[120px] justify-center cursor-pointer relative">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                  {viewMode === 'daily' && (isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }))}
                  {viewMode === 'weekly' && `${new Date(getDateRange().start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                  {viewMode === 'monthly' && new Date(selectedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </div>

                <button
                  onClick={handleNextDay}
                  aria-label="Next Day"
                  className="p-1.5 hover:bg-background rounded shadow-sm text-muted-foreground transition-colors"
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="sr-only">Loading analytics...</span>
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">

            {/* Unified Hero KPI: Revenue + Target */}
            <Card className={`animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both border-none shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden relative transition-all ${!isAdmin && targetHit ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'} ${isAdmin ? 'md:col-span-5 lg:col-span-4' : 'md:col-span-12'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
                  <div>
                    <p className={`text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2 ${!isAdmin && targetHit ? 'text-emerald-100' : 'text-orange-100'}`}>
                      <TrendingUp className="h-4 w-4" /> Total Revenue
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{formatCurrency(analytics.overall.totalRevenue)}</h2>
                    </div>
                  </div>

                  {!isAdmin && salesTarget > 0 && (
                    <div className="text-left sm:text-right w-full sm:w-auto bg-black/20 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${targetHit ? 'text-emerald-100' : 'text-orange-100'}`}>
                        Monthly Target
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold font-mono tabular-nums">{targetPercentage.toFixed(1)}%</span>
                        <span className={`text-xs ${targetHit ? 'text-emerald-100' : 'text-orange-100'}`}>
                          of {formatCurrency(salesTarget)}
                        </span>
                      </div>
                      <div className="text-xs">
                        {targetHit ? (
                          <span className="flex items-center text-yellow-300 font-bold"><Trophy className="h-3 w-3 mr-1" /> Smashed!</span>
                        ) : (
                          <span className="text-white font-medium">{formatCurrency(targetRemaining)} left</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!isAdmin && salesTarget > 0 && (
                  <div className="h-2.5 w-full bg-white/25 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.max(2, targetPercentage)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consolidated Orders & Volume */}
            <Card className={`bg-card text-card-foreground border-none shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl ring-1 ring-border/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both flex flex-col justify-center ${isAdmin ? 'md:col-span-7 lg:col-span-8' : 'md:col-span-12'}`}>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 divide-x divide-border h-full">
                  <div className="p-3 sm:p-5 flex flex-col items-center justify-center text-center">
                    <div className="mx-auto w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-1.5 shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-muted-foreground text-[9px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 truncate w-full">Total Orders</p>
                    <h3 className="text-sm sm:text-lg lg:text-2xl font-bold text-card-foreground whitespace-nowrap tracking-tighter font-mono tabular-nums">{analytics.overall.totalOrders}</h3>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col items-center justify-center text-center">
                    <div className="mx-auto w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-1.5 shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-muted-foreground text-[9px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 truncate w-full">Standard Box</p>
                    <h3 className="text-sm sm:text-lg lg:text-2xl font-bold text-card-foreground whitespace-nowrap tracking-tighter font-mono tabular-nums">{formatBoxPcs(analytics.overall.totalStandardQty)}</h3>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col items-center justify-center text-center">
                    <div className="mx-auto w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-1.5 shrink-0">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-muted-foreground text-[9px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 truncate w-full">Premium Box</p>
                    <h3 className="text-sm sm:text-lg lg:text-2xl font-bold text-card-foreground whitespace-nowrap tracking-tighter font-mono tabular-nums">{formatBoxPcs(analytics.overall.totalPremiumQty)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Routes List */}
            <Card className={`shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl border-none ring-1 ring-border/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both flex flex-col ${isAdmin ? 'md:col-span-12 lg:col-span-4' : 'md:col-span-12'}`}>
              <CardHeader className="bg-muted/80 border-b border-border pb-3 pt-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold flex items-center text-foreground uppercase tracking-wider">
                    <MapPin className="h-4 w-4 mr-2 text-primary" /> Top Routes
                  </CardTitle>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border shadow-sm">
                    {analytics.routeWise.length} Total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.routeWise.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No data available</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {analytics.routeWise.slice(0, 3).map((route, index) => {
                      const maxRev = analytics.routeWise[0]?.totalRevenue || 1;
                      const width = Math.max(2, (route.totalRevenue / maxRev) * 100);
                      return (
                        <li key={route._id} className="p-4 hover:bg-muted transition-colors relative">
                          <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-gray-300 text-lg w-4">{index + 1}</span>
                              <div>
                                <p className="font-bold text-card-foreground text-sm leading-tight">{route._id}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{route.totalOrders} orders</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-card-foreground text-sm font-mono tabular-nums">{formatCurrency(route.totalRevenue)}</p>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/80 rounded-full" style={{ width: `${width}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="p-3 bg-muted border-t border-border">
                  <button
                    onClick={() => setIsDetailedAnalyticsOpen(true)}
                    className="w-full py-2 text-sm font-semibold text-primary bg-card border border-orange-100 dark:border-orange-950/40 shadow-sm rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors flex items-center justify-center gap-2"
                  >
                    View Detailed Analytics <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Admin Insights & Leaderboards */}
            {isAdmin && (
              <>
                {/* Global Top 5 Customers */}
                {analytics.topCustomers && (
                  <Card className="shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl border-none ring-1 ring-border/50 overflow-hidden flex flex-col md:col-span-12 lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-1000 fill-mode-both">
                    <CardHeader className="bg-muted/80 border-b border-border pb-4">
                      <CardTitle className="text-lg font-bold flex items-center text-foreground">
                        <Globe className="h-5 w-5 mr-2 text-primary" /> Highest Volume Customers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {analytics.topCustomers.length > 0 ? (
                        <ul className="divide-y divide-border">
                        {analytics.topCustomers.map((customer, index) => (
                          <li key={customer._id} className="p-4 hover:bg-muted transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-sm shrink-0 ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white border border-amber-300/50 shadow-md' : index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white border border-gray-300/50 shadow-md' : index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border border-orange-400/50 shadow-md' : 'bg-muted text-muted-foreground border border-border'}`}>
                                  #{index + 1}
                                </div>
                                <div>
                                  <p className="font-bold text-card-foreground text-sm">{customer._id}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {customer.route} • <span className="font-medium">{formatBoxPcs(customer.totalStandardQty)}</span> Std / <span className="font-medium text-amber-600">{formatBoxPcs(customer.totalPremiumQty)}</span> Prem
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-card-foreground text-sm font-mono tabular-nums">{formatCurrency(customer.totalRevenue)}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{customer.totalOrders} order{customer.totalOrders !== 1 && 's'}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      ) : (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-muted/50 text-muted-foreground rounded-full flex items-center justify-center mb-3">
                            <Globe className="h-6 w-6" />
                          </div>
                          <p className="text-card-foreground font-semibold">No Top Customers Data</p>
                          <p className="text-muted-foreground text-sm mt-1">Check back later when orders are placed.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Executive Performance — Ranked Leaderboard */}
                <Card className="shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl border-none ring-1 ring-border/50 overflow-hidden flex flex-col md:col-span-12 lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
                  <CardHeader className="bg-muted/80 border-b border-border pb-4">
                    <CardTitle className="text-lg font-bold flex items-center text-foreground">
                      <UserCheck className="h-5 w-5 mr-2 text-primary" /> Sales Executive Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {analytics.salesExecutiveWise.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No data for selected date</div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {analytics.salesExecutiveWise.map((exec, index) => {
                          const rankStyles = [
                            { badge: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md border border-amber-300/50', bar: 'bg-gradient-to-r from-yellow-400 to-amber-500' },
                            { badge: 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md border border-gray-300/50', bar: 'bg-gradient-to-r from-gray-300 to-gray-400' },
                            { badge: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md border border-orange-400/50', bar: 'bg-gradient-to-r from-orange-400 to-orange-600' },
                          ];
                          const style = rankStyles[index] || { badge: 'bg-muted/50 text-muted-foreground', bar: 'bg-gray-200' };
                          const maxRevenue = analytics.salesExecutiveWise[0]?.totalRevenue || 1;
                          const barWidth = Math.max(4, (exec.totalRevenue / maxRevenue) * 100);
                          const isExpanded = expandedRowId === `exec_${exec._id}`;

                          return (
                            <li key={exec._id} className={`transition-all ${isExpanded ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}`}>
                              <div
                                className="p-4 flex flex-col gap-2 cursor-pointer hover:bg-orange-50/60 dark:hover:bg-orange-950/20 active:bg-orange-100 dark:active:bg-orange-950/45"
                                onClick={() => {
                                  const { start, end } = getDateRange();
                                  toggleExecRow(exec._id, start, end);
                                }}
                                role="button"
                                aria-expanded={isExpanded}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${style.badge}`}>
                                      #{index + 1}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-card-foreground">{exec._id}</p>
                                      <p className="text-xs text-muted-foreground">{exec.totalOrders} Orders · Std: {formatBoxPcs(exec.totalStandardQty)} · Prem: {formatBoxPcs(exec.totalPremiumQty)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-card-foreground text-base font-mono tabular-nums">{formatCurrency(exec.totalRevenue)}</p>
                                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </div>
                                  </div>
                                </div>
                                {/* Revenue progress bar */}
                                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ${style.bar}`} style={{ width: `${barWidth}%` }} />
                                </div>
                              </div>

                              {/* Accordion Content */}
                              {isExpanded && (
                                <div className="px-4 pb-4">
                                  {renderDrilldown()}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Churn Risk (Sleeping Customers) */}
                {adminInsights && (
                  <Card className="shadow-[0_2px_10px_-3px_rgba(225,29,72,0.15)] rounded-2xl border-none ring-1 ring-rose-100 dark:ring-rose-950/30 overflow-hidden flex flex-col md:col-span-12 lg:col-span-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700 fill-mode-both">
                    <CardHeader className="bg-rose-50/80 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 pb-4">
                      <CardTitle className="text-lg font-bold flex items-center text-rose-800 dark:text-rose-300">
                        <Target className="h-5 w-5 mr-2 text-rose-600 dark:text-rose-400" /> Churn Risk Radar
                      </CardTitle>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">VIPs who haven't ordered in 14+ days</p>
                    </CardHeader>
                    <CardContent className="p-0">
                      {adminInsights.sleepingCustomers.length > 0 ? (
                        <ul className="divide-y divide-rose-50 dark:divide-rose-950/10">
                          {adminInsights.sleepingCustomers.map((customer: { _id: string; customerName: string; phone: string; lastOrderDate: string; totalOrders: number; }) => {
                            const daysSince = Math.floor((new Date().getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 3600 * 24));
                            return (
                              <li key={customer._id} className="p-4 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 transition-colors cursor-pointer group">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-card-foreground text-sm group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">{customer.customerName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{customer.phone} • {customer.totalOrders} total orders</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
                                      {daysSince} days ago
                                    </span>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-3">
                            <Trophy className="h-6 w-6" />
                          </div>
                          <p className="text-card-foreground font-semibold">No Churn Risks Detected!</p>
                          <p className="text-muted-foreground text-sm mt-1">All your key customers are ordering actively.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}


              </>
            )}
          </div>
        ) : null}
      </div>

      <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] w-[95vw] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Route Breakdown: {selectedRouteTitle}</DialogTitle>
            <DialogClose onClose={() => setIsRouteModalOpen(false)} />
          </DialogHeader>
          <div className="p-2 sm:p-4 bg-muted/50 min-h-[300px]">
            {renderDrilldown(true)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailedAnalyticsOpen} onOpenChange={setIsDetailedAnalyticsOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] w-[95vw] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Detailed Analytics</DialogTitle>
            <DialogClose onClose={() => setIsDetailedAnalyticsOpen(false)} />
          </DialogHeader>
          <div className="p-4 bg-muted min-h-[300px] flex flex-col gap-6">

            {/* Full Route Revenue Chart */}
            <Card className="shadow-sm border-none ring-1 ring-border overflow-hidden">
              <CardHeader className="bg-muted/80 border-b border-border pb-4">
                <CardTitle className="text-lg font-bold flex items-center text-foreground">
                  <BarChartIcon className="h-5 w-5 mr-2 text-primary" /> Route Revenue Chart
                  <span className="ml-auto text-xs font-normal text-muted-foreground">Click a bar to see party breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                {analytics?.routeWise && analytics.routeWise.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No data for selected date</div>
                ) : (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={Math.max((analytics?.routeWise.length || 0) * 42 + 40, 160)}>
                      <BarChart
                        data={analytics?.routeWise || []}
                        layout="vertical"
                        margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
                        barCategoryGap="8%"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: theme === 'dark' ? '#9CA3AF' : '#9CA3AF' }}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <YAxis
                          type="category"
                          dataKey="_id"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: theme === 'dark' ? '#D1D5DB' : '#374151', fontWeight: 600 }}
                          width={90}
                          interval={0}
                        />
                        <Bar
                          dataKey="totalRevenue"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={36}
                          cursor="pointer"
                          onClick={(data) => {
                            const routeData = data.payload || data;
                            if (routeData.routeId) {
                              setSelectedRouteTitle(routeData._id);
                              setIsRouteModalOpen(true);
                              const { start, end } = getDateRange();
                              fetchRouteDrilldown(routeData.routeId, start, end);
                            }
                          }}
                        >
                          {analytics?.routeWise.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#E07012' : index % 2 === 0 ? '#F97316' : '#FDBA74'} />
                          ))}
                          <LabelList
                            dataKey="totalRevenue"
                            position="right"
                            formatter={(v: any) => formatCurrency(Number(v))}
                            style={{ fontSize: 11, fontWeight: 700, fill: theme === 'dark' ? '#D1D5DB' : '#374151' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            {isAdmin && monthlyTrend && monthlyTrend.length > 0 && (
              <Card className="shadow-sm border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/80 border-b border-border pb-4">
                  <CardTitle className="text-lg font-bold flex items-center text-foreground">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" /> Month-over-Month Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="w-full overflow-x-auto pb-2 min-w-0">
                    <div className="min-w-[700px] h-[288px] min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyTrend} margin={{ top: 35, right: 10, left: 10, bottom: 20 }}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F97316" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#FB923C" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#E07012" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#E07012" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                          <Tooltip 
                            contentStyle={{
                              borderRadius: '8px', 
                              border: theme === 'dark' ? '1px solid #374151' : 'none', 
                              backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                              color: theme === 'dark' ? '#F3F4F6' : '#111827',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }} 
                            formatter={(value: any, name: any) => [name === 'totalRevenue' ? formatCurrency(value as number) : value, name === 'totalRevenue' ? 'Revenue' : 'Orders']}
                          />
                          <XAxis
                            dataKey="_id"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: theme === 'dark' ? '#9CA3AF' : '#6B7280', fontWeight: 500 }}
                            dy={10}
                            tickFormatter={(val) => {
                              if (!val) return '';
                              const [year, month] = val.split('-');
                              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                              return date.toLocaleDateString('en-GB', { month: 'short' });
                            }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: theme === 'dark' ? '#9CA3AF' : '#9CA3AF' }}
                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                            width={52}
                          />
                          <Area type="monotone" dataKey="totalRevenue" fill="url(#areaGradient)" stroke="none" />
                          <Bar dataKey="totalRevenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} barSize={36}>
                            <LabelList
                              dataKey="totalRevenue"
                              position="top"
                              offset={24}
                              formatter={(v: any) => formatCurrency(Number(v))}
                              style={{ fontSize: 11, fontWeight: 700, fill: theme === 'dark' ? '#D1D5DB' : '#1F2937' }}
                            />
                          </Bar>
                          <Line
                            type="monotone"
                            dataKey="totalRevenue"
                            stroke="#EA580C"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#ffffff', stroke: '#EA580C', strokeWidth: 2 }}
                            activeDot={{ r: 8, fill: '#EA580C', stroke: '#ffffff', strokeWidth: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Busiest Days Heatmap (Admin Only) */}
            {isAdmin && adminInsights && adminInsights.busiestDays.length > 0 && (
              <Card className="shadow-sm border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/80 border-b border-border pb-4">
                  <CardTitle className="text-lg font-bold flex items-center text-foreground">
                    <CalendarIcon className="h-5 w-5 mr-2 text-primary" /> Busiest Days Heatmap
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Total order volume by day of week (last 90 days)</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="w-full overflow-x-auto pb-2 min-w-0">
                    <div className="min-w-[500px] h-[240px] min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={adminInsights.busiestDays} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                          <Tooltip 
                            cursor={{fill: theme === 'dark' ? '#374151' : '#F3F4F6'}} 
                            contentStyle={{
                              borderRadius: '8px', 
                              border: theme === 'dark' ? '1px solid #374151' : 'none', 
                              backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                              color: theme === 'dark' ? '#F3F4F6' : '#111827',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }} 
                          />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#9CA3AF' : '#6B7280' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#9CA3AF' : '#9CA3AF' }} />
                          <Bar dataKey="totalOrders" name="Total Orders" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {adminInsights.busiestDays.map((entry: {day: string; totalOrders: number}) => (
                              <Cell key={`cell-${entry.day}`} fill={entry.day === 'Sunday' ? '#f43f5e' : '#0ea5e9'} />
                            ))}
                            <LabelList dataKey="totalOrders" position="top" style={{ fontSize: 12, fontWeight: 700, fill: theme === 'dark' ? '#D1D5DB' : '#4B5563' }} dy={-5} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
