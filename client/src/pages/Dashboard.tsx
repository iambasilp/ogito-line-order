import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, UserCheck, TrendingUp, Calendar as CalendarIcon, Package, Star, BarChart as BarChartIcon, Target, Trophy } from 'lucide-react';
import { formatCurrency, formatBoxPcs } from '@/utils/formatters';
import { getCurrentTarget } from '@/utils/targets';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

interface AnalyticsData {
  routeWise: {
    _id: string;
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
  }[];
}

interface MonthlyTrendData {
  _id: string; // YYYY-MM
  totalRevenue: number;
  totalOrders: number;
}

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchMonthlyTrend();
    }
  }, [user]);

  const fetchMonthlyTrend = async () => {
    try {
      const response = await api.get('/orders/monthly-trend');
      setMonthlyTrend(response.data);
    } catch (error) {
      console.error('Failed to fetch monthly trend:', error);
    }
  };

  const getDateRange = () => {
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
    } else if (viewMode === 'yearly') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedDate]);

  const fetchAnalytics = async () => {
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
  };

  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'daily') date.setDate(date.getDate() - 1);
    else if (viewMode === 'weekly') date.setDate(date.getDate() - 7);
    else if (viewMode === 'monthly') date.setMonth(date.getMonth() - 1);
    else if (viewMode === 'yearly') date.setFullYear(date.getFullYear() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'daily') date.setDate(date.getDate() + 1);
    else if (viewMode === 'weekly') date.setDate(date.getDate() + 7);
    else if (viewMode === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (viewMode === 'yearly') date.setFullYear(date.getFullYear() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const isAdmin = user?.role === 'admin';

  if (!user || user.role === 'driver') {
    return (
      <Layout>
        <div className="p-8 text-center text-red-500">Access Denied</div>
      </Layout>
    );
  }

  // Calculate targets for Sales Executives
  const salesTarget = user ? getCurrentTarget(user.username.toLowerCase(), selectedDate) : 0;
  const targetAchieved = analytics?.overall.totalRevenue || 0;
  const targetPercentage = salesTarget > 0 ? Math.min(100, (targetAchieved / salesTarget) * 100) : 0;
  const targetRemaining = Math.max(0, salesTarget - targetAchieved);
  const targetHit = targetPercentage >= 100;

  return (
    <Layout fullWidth>
      <div className="space-y-6 w-full pb-10">
        {/* Header and Date Picker */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                &larr; Back to Orders
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> 
              {isAdmin ? 'Analytics Dashboard' : 'My Performance'}
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Revenue and performance metrics overview' : 'Track your sales progress and hit your targets'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
              {(['daily', 'weekly', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handlePrevDay}
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
              className="p-2 hover:bg-white rounded shadow-sm text-gray-600 transition-colors"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : analytics ? (
        <>
          {/* Sales Executive Target Progress (Gamification) */}
          {!isAdmin && salesTarget > 0 && (
            <Card className={`border-none shadow-md overflow-hidden relative transition-all duration-500 ${targetHit ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-white ring-1 ring-gray-100'}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-end mb-4 relative z-10">
                  <div className={targetHit ? 'text-white' : 'text-gray-900'}>
                    <p className={`text-sm font-semibold uppercase tracking-wider mb-1 flex items-center gap-2 ${targetHit ? 'text-emerald-100' : 'text-gray-500'}`}>
                      <Target className="h-4 w-4" /> Monthly Target Status
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{formatCurrency(targetAchieved)}</h2>
                      <span className={`text-sm font-medium ${targetHit ? 'text-emerald-100' : 'text-gray-400'}`}>
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
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      targetPercentage < 50 ? 'bg-orange-400' :
                      targetPercentage < 90 ? 'bg-blue-500' :
                      targetPercentage < 100 ? 'bg-emerald-400' :
                      'bg-white'
                    }`}
                    style={{ width: `${Math.max(2, targetPercentage)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-md">
              <CardContent className="p-6">
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                <h3 className="text-4xl font-bold">{formatCurrency(analytics.overall.totalRevenue)}</h3>
                <p className="mt-2 text-emerald-100 text-sm opacity-80">{analytics.overall.totalOrders} Orders Today</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-none shadow-sm ring-1 ring-gray-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 bg-emerald-50 rounded-full text-emerald-600">
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
                <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
                  <Star className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Premium Volume</p>
                  <h3 className="text-2xl font-bold text-gray-900">{formatBoxPcs(analytics.overall.totalPremiumQty)}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Route Wise Revenue Chart */}
            <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden">
              <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                  <BarChartIcon className="h-5 w-5 mr-2 text-blue-500" /> Route Revenue Chart
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {analytics.routeWise.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No data for selected date</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.routeWise} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="_id" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          dy={10}
                        />
                        <Tooltip 
                          cursor={{ fill: '#F3F4F6' }}
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                          labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                          {analytics.routeWise.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#93C5FD'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales Executive Revenue Chart (Admin Only) */}
            {isAdmin && (
              <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                    <BarChartIcon className="h-5 w-5 mr-2 text-emerald-500" /> Executive Revenue Chart
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {analytics.salesExecutiveWise.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No data for selected date</div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.salesExecutiveWise} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis 
                            dataKey="_id" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            dy={10}
                          />
                          <Tooltip 
                            cursor={{ fill: '#F3F4F6' }}
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                            labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                            {analytics.salesExecutiveWise.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#6EE7B7'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Monthly Revenue Trend Graph (Admin Only) */}
          {isAdmin && monthlyTrend && monthlyTrend.length > 0 && (
            <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden mb-6">
              <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" /> Month-over-Month Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="_id" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        dy={10}
                        tickFormatter={(val) => {
                          if (!val) return '';
                          // Parse YYYY-MM
                          const [year, month] = val.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                          return date.toLocaleDateString('en-GB', { month: 'short' });
                        }}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' }}
                        labelFormatter={(label) => {
                          if (!label) return '';
                          const [year, month] = label.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                          return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                        }}
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                        labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
            {/* Route Wise Revenue */}
            <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden">
              <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                  <MapPin className="h-5 w-5 mr-2 text-blue-500" /> Route Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.routeWise.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No data for selected date</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {analytics.routeWise.map((route, index) => (
                      <li key={route._id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            index === 0 ? 'bg-amber-100 text-amber-700' : 
                            index === 1 ? 'bg-gray-200 text-gray-700' : 
                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{route._id}</p>
                            <p className="text-xs text-gray-500">{route.totalOrders} Orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-lg">{formatCurrency(route.totalRevenue)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Sales Executive Wise Revenue (Admin Only) */}
            {isAdmin && (
              <Card className="shadow-sm border-none ring-1 ring-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center text-gray-800">
                    <UserCheck className="h-5 w-5 mr-2 text-emerald-500" /> Executive Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {analytics.salesExecutiveWise.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No data for selected date</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {analytics.salesExecutiveWise.map((exec, index) => (
                        <li key={exec._id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              index === 0 ? 'bg-amber-100 text-amber-700' : 
                              index === 1 ? 'bg-gray-200 text-gray-700' : 
                              index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{exec._id}</p>
                              <p className="text-xs text-gray-500">{exec.totalOrders} Orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-lg">{formatCurrency(exec.totalRevenue)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}
      </div>
    </Layout>
  );
};

export default Dashboard;
