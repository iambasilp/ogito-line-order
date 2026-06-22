import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, TrendingUp, Calendar as CalendarIcon, Package, Star, BarChart as BarChartIcon, PieChart as PieChartIcon, Target, Trophy, ChevronRight, ChevronDown, Loader2, Medal, Globe, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { formatCurrency, formatBoxPcs } from '@/utils/formatters';
import { getCurrentTarget } from '@/utils/targets';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie, Area, ComposedChart, Line } from 'recharts';

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

const PIE_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#EAB308', '#06B6D4', '#14B8A6'];

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const [year, month] = (label as string).split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const formattedDate = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #F3F4F6', padding: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}>
        <p style={{ fontWeight: 'bold', color: '#111827', margin: 0, marginBottom: '8px' }}>{formattedDate}</p>
        <p style={{ color: '#EA580C', margin: 0, fontWeight: 500 }}>
          Revenue: <span style={{ fontWeight: 700 }}>{formatCurrency(Number(payload[0].value))}</span>
        </p>
      </div>
    );
  }
  return null;
};

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
    return <div className="py-6 text-center text-gray-400 text-xs">No party data found.</div>;
  }

  const displayData = (showAll || isModal) ? data : data.slice(0, 3);
  const maxRev = data[0]?.totalRevenue || 1;

  return (
    <div className="pt-4 pb-2 border-t border-gray-100 mt-2 px-1 sm:px-3 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex justify-between items-center mb-3 px-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Medal className="h-3.5 w-3.5" /> Party Ranking</h4>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{data.length} Parties</span>
      </div>
      <ul className={`space-y-3 ${isModal ? 'max-h-[50vh] overflow-y-auto pr-2' : ''}`}>
        {displayData.map((party, index) => {
          const width = Math.max(2, (party.totalRevenue / maxRev) * 100);
          return (
            <li key={party._id} className="relative bg-white border border-gray-50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-top-1 fade-in duration-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-gray-50 text-gray-400 shrink-0 border border-gray-100">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-xs sm:text-sm leading-none mb-1">{party._id}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 leading-none">{party.totalOrders} order{party.totalOrders !== 1 && 's'} · {formatBoxPcs(party.totalStandardQty)} Std · {formatBoxPcs(party.totalPremiumQty)} Prem</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900 text-xs sm:text-sm shrink-0">{formatCurrency(party.totalRevenue)}</p>
              </div>
              <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
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
          className={`w-full mt-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            showAll ? 'text-gray-500 bg-gray-50 hover:bg-gray-100' : 'text-primary bg-orange-50 hover:bg-orange-100'
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
  const { salesTarget, targetAchieved, targetPercentage, targetRemaining, targetHit } = React.useMemo(() => {
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                &larr; Back to Orders
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">

              {isAdmin ? 'Analytics Dashboard' : 'My Performance'}
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Revenue and performance metrics overview' : 'Track your sales progress and hit your targets'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly', 'custom'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${viewMode === mode
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {viewMode === 'custom' ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={handleApplyCustom}
                  className="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={handlePrevDay}
                  aria-label="Previous Day"
                  className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-colors"
                >
                  &larr;
                </button>

                <div className="flex items-center px-4 py-2 bg-white rounded shadow-sm font-medium min-w-[140px] justify-center cursor-pointer relative">
                  <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                  {viewMode === 'daily' && (isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }))}
                  {viewMode === 'weekly' && `Week of ${new Date(getDateRange().start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                  {viewMode === 'monthly' && new Date(selectedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </div>

                <button
                  onClick={handleNextDay}
                  aria-label="Next Day"
                  className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-colors"
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
          <>

            {/* Sales Executive Target Progress (Gamification) */}
            {!isAdmin && salesTarget > 0 && (
              <Card className={`animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both border-none shadow-md overflow-hidden relative transition-all ${targetHit ? 'bg-gradient-to-r from-orange-500 to-primary' : 'bg-white ring-1 ring-gray-100'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-end mb-4 relative z-10">
                    <div className={targetHit ? 'text-white' : 'text-gray-900'}>
                      <p className={`text-sm font-semibold uppercase tracking-wider mb-1 flex items-center gap-2 ${targetHit ? 'text-orange-100' : 'text-gray-500'}`}>
                        <Target className="h-4 w-4" /> Monthly Target Status
                      </p>
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{formatCurrency(targetAchieved)}</h2>
                        <span className={`text-sm font-medium ${targetHit ? 'text-orange-100' : 'text-gray-400'}`}>
                          / {formatCurrency(salesTarget)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      {targetHit ? (
                        <div className="flex items-center text-white bg-white/20 px-4 py-2 rounded-full font-bold shadow-sm backdrop-blur-sm">
                          <Trophy className="h-5 w-5 mr-2 text-yellow-300" /> Target Smashed!
                        </div>
                      ) : (
                        <div className="text-orange-500 font-bold bg-orange-50 px-4 py-2 rounded-full">
                          {formatCurrency(targetRemaining)} left to hit target
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className={`h-4 w-full rounded-full overflow-hidden ${targetHit ? 'bg-white/30' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${targetPercentage < 50 ? 'bg-orange-400' :
                          targetPercentage < 90 ? 'bg-amber-500' :
                            targetPercentage < 100 ? 'bg-primary' :
                              'bg-white'
                        }`}
                      style={{ width: `${Math.max(2, targetPercentage)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Summary */}
            <div className={`grid grid-cols-1 md:grid-cols-3 ${isAdmin ? 'lg:grid-cols-4' : ''} gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both`}>
              <Card className="bg-gradient-to-br from-primary to-orange-600 text-white border-none shadow-md">
                <CardContent className="p-6">
                  <p className="text-orange-100 text-sm font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                  <h3 className="text-4xl font-bold">{formatCurrency(analytics.overall.totalRevenue)}</h3>
                  <p className="mt-2 text-orange-100 text-sm opacity-80">{analytics.overall.totalOrders} Orders Today</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm ring-1 ring-gray-100">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-orange-50 rounded-full text-primary">
                    <Package className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Standard Volume</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatBoxPcs(analytics.overall.totalStandardQty)}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm ring-1 ring-gray-100">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-4 bg-amber-50 rounded-full text-amber-600">
                    <Star className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Premium Volume</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatBoxPcs(analytics.overall.totalPremiumQty)}</h3>
                  </div>
                </CardContent>
              </Card>

              {/* Average Order Value (AOV) Card - Admin Only */}
              {isAdmin && (
                <Card className="bg-white border-none shadow-sm ring-1 ring-gray-100">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 rounded-full text-emerald-600">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Avg Order Value</p>
                      <h3 className="text-2xl font-bold text-gray-900">{analytics.overall.totalOrders > 0 ? formatCurrency(analytics.overall.totalRevenue / analytics.overall.totalOrders) : '₹0'}</h3>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
              {/* Route Wise Revenue Chart — Horizontal Bar Chart */}
              <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                    <BarChartIcon className="h-5 w-5 mr-2 text-primary" /> Route Revenue Chart
                    <span className="ml-auto text-xs font-normal text-gray-400">Click a bar to see party breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-6">
                  {analytics.routeWise.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No data for selected date</div>
                  ) : (
                    <div className="w-full">
                      <ResponsiveContainer width="100%" height={Math.max(analytics.routeWise.length * 42 + 40, 160)}>
                        <BarChart
                          data={analytics.routeWise}
                          layout="vertical"
                          margin={{ top: 4, right: 70, left: 8, bottom: 4 }}
                          barCategoryGap="8%"
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            tickFormatter={(v) => formatCurrency(v)}
                          />
                          <YAxis
                            type="category"
                            dataKey="_id"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                            width={90}
                            interval={0}
                          />
                          <Tooltip
                            cursor={{ fill: '#FFF7ED' }}
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                            labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
                            {analytics.routeWise.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#E07012' : index % 2 === 0 ? '#F97316' : '#FDBA74'} />
                            ))}
                            <LabelList
                              dataKey="totalRevenue"
                              position="right"
                              formatter={(v: any) => formatCurrency(Number(v))}
                              style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sales Executive Revenue Chart (Admin Only) */}
              {isAdmin && (
                <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden flex flex-col h-full">
                  <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                      <PieChartIcon className="h-5 w-5 mr-2 text-primary" /> Executive Revenue Chart
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col justify-center">
                    {analytics.salesExecutiveWise.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No data for selected date</div>
                    ) : (
                      <div className="w-full flex-1 min-h-[300px] flex justify-center min-w-0">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={analytics.salesExecutiveWise}
                              dataKey="totalRevenue"
                              nameKey="_id"
                              cx="50%"
                              cy="50%"
                              outerRadius="75%"
                              paddingAngle={1}
                              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                              labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                            >
                              {analytics.salesExecutiveWise.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Monthly Revenue Trend Graph (Admin Only) */}
            {isAdmin && monthlyTrend && monthlyTrend.length > 0 && (
              <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
                <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center text-gray-800">
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                          dataKey="_id"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }}
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
                          tick={{ fontSize: 11, fill: '#9CA3AF' }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          width={52}
                        />
                        <Tooltip
                          cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                          content={<CustomAreaTooltip />}
                        />
                        
                        {/* Soft Area Background */}
                        <Area type="monotone" dataKey="totalRevenue" fill="url(#areaGradient)" stroke="none" />
                        
                        {/* Bar for Exact Volume */}
                        <Bar dataKey="totalRevenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} barSize={36}>
                          <LabelList
                            dataKey="totalRevenue"
                            position="top"
                            offset={24}
                            formatter={(v: any) => formatCurrency(Number(v))}
                            style={{ fontSize: 11, fontWeight: 700, fill: '#1F2937' }}
                          />
                        </Bar>
                        
                        {/* Sharp Line for Trend Focus */}
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

            <div className={`grid grid-cols-1 gap-6`}>
              {/* Executive Performance — Ranked Leaderboard (Admin Only) */}
              {isAdmin && (
                <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden">
                  <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                      <UserCheck className="h-5 w-5 mr-2 text-primary" /> Executive Performance
                      <span className="ml-auto text-xs font-normal text-gray-400">Click row to see parties</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {analytics.salesExecutiveWise.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No data for selected date</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {analytics.salesExecutiveWise.map((exec, index) => {
                          const rankStyles = [
                            { badge: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md border border-amber-300/50', bar: 'bg-gradient-to-r from-yellow-400 to-amber-500' },
                            { badge: 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md border border-gray-300/50', bar: 'bg-gradient-to-r from-gray-300 to-gray-400' },
                            { badge: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md border border-orange-400/50', bar: 'bg-gradient-to-r from-orange-400 to-orange-600' },
                          ];
                          const style = rankStyles[index] || { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-200' };
                          const maxRevenue = analytics.salesExecutiveWise[0]?.totalRevenue || 1;
                          const barWidth = Math.max(4, (exec.totalRevenue / maxRevenue) * 100);
                          const isExpanded = expandedRowId === `exec_${exec._id}`;

                          return (
                            <li key={exec._id} className={`transition-all ${isExpanded ? 'bg-orange-50/30' : ''}`}>
                              <div
                                className="p-4 flex flex-col gap-2 cursor-pointer hover:bg-orange-50/60 active:bg-orange-100"
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
                                      <p className="font-semibold text-gray-900">{exec._id}</p>
                                      <p className="text-xs text-gray-500">{exec.totalOrders} Orders · Std: {formatBoxPcs(exec.totalStandardQty)} · Prem: {formatBoxPcs(exec.totalPremiumQty)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900 text-base">{formatCurrency(exec.totalRevenue)}</p>
                                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </div>
                                  </div>
                                </div>
                                {/* Revenue progress bar */}
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
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
              )}
            </div>

            {/* Global Leaderboards & Admin Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
              
              {/* Global Top 5 Customers */}
              {analytics.topCustomers && analytics.topCustomers.length > 0 && (
                <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden flex flex-col">
                  <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                      <Globe className="h-5 w-5 mr-2 text-primary" /> Global Hall of Fame
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-gray-50">
                      {analytics.topCustomers.map((customer, index) => (
                        <li key={customer._id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-sm shrink-0 ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white border border-amber-300/50 shadow-md' : index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white border border-gray-300/50 shadow-md' : index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border border-orange-400/50 shadow-md' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                                #{index + 1}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{customer._id}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {customer.route} • <span className="font-medium">{formatBoxPcs(customer.totalStandardQty)}</span> Std / <span className="font-medium text-amber-600">{formatBoxPcs(customer.totalPremiumQty)}</span> Prem
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900 text-sm">{formatCurrency(customer.totalRevenue)}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{customer.totalOrders} order{customer.totalOrders !== 1 && 's'}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Churn Risk (Sleeping Customers) - Admin Only */}
              {isAdmin && adminInsights && adminInsights.sleepingCustomers.length > 0 && (
                <Card className="shadow-sm border-none ring-1 ring-red-100 overflow-hidden flex flex-col">
                  <CardHeader className="bg-red-50/80 border-b border-red-100 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center text-red-800">
                      <Target className="h-5 w-5 mr-2 text-red-600" /> Churn Risk Radar
                    </CardTitle>
                    <p className="text-xs text-red-600 mt-1">VIPs who haven't ordered in 14+ days</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-red-50">
                      {adminInsights.sleepingCustomers.map((customer: any) => {
                        const daysSince = Math.floor((new Date().getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 3600 * 24));
                        return (
                          <li key={customer._id} className="p-4 hover:bg-red-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{customer.customerName}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{customer.phone} • {customer.totalOrders} total orders</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                  {daysSince} days ago
                                </span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Busiest Days Heatmap - Admin Only */}
              {isAdmin && adminInsights && adminInsights.busiestDays.length > 0 && (
                <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden flex flex-col h-full lg:col-span-2 mt-2">
                  <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                      <CalendarIcon className="h-5 w-5 mr-2 text-primary" /> Busiest Days Heatmap
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">Total order volume by day of week (last 90 days)</p>
                  </CardHeader>
                  <CardContent className="p-6 flex-1">
                    <div className="w-full overflow-x-auto pb-2 min-w-0">
                      <div className="min-w-[500px] h-[240px] min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={adminInsights.busiestDays} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                            <Tooltip
                              cursor={{ fill: '#F3F4F6' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="totalOrders" name="Total Orders" radius={[4, 4, 0, 0]} maxBarSize={50}>
                              {adminInsights.busiestDays.map((entry: any, index: any) => (
                                <Cell key={`cell-${index}`} fill={entry.day === 'Sunday' ? '#F87171' : '#3B82F6'} />
                              ))}
                              <LabelList dataKey="totalOrders" position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#4B5563' }} dy={-5} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : null}
      </div>

      <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Route Breakdown: {selectedRouteTitle}</DialogTitle>
            <DialogClose onClose={() => setIsRouteModalOpen(false)} />
          </DialogHeader>
          <div className="p-4 bg-gray-50/50 min-h-[300px]">
            {renderDrilldown(true)}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
