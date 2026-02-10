import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndianRupee, ShoppingCart, TrendingUp, Package, Calendar, ArrowUpRight, CreditCard } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface DashboardStats {
    kpi: {
        totalRevenue: number;
        revenueGrowth: number;
        totalOrders: number;
        ordersGrowth: number;
        totalStandard: number;
        totalPremium: number;
        avgOrderValue: number;
    };
    activeCustomers: number;
    customerGrowth: number;
    revenueChart: { _id: string; date: string; revenue: number; orders: number }[];
    topRoutes: { _id: string; revenue: number; count: number }[];
}

// Generate realistic mock data based on date range
const getMockData = (days: number): DashboardStats => {
    const today = new Date();
    const revenueChart = [];
    let cumulativeRevenue = 0;

    // Generate daily data
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);

        // Random daily revenue between 25k and 45k with some weekly seasonality
        const baseRevenue = 35000;
        const randomVar = (Math.random() - 0.5) * 15000;
        const seasonality = (d.getDay() === 0 || d.getDay() === 6) ? -5000 : 5000; // Less on weekends

        const dailyRevenue = Math.max(10000, Math.floor(baseRevenue + randomVar + seasonality));
        const dailyOrders = Math.floor(dailyRevenue / 1200); // Approx avg order value 1200

        revenueChart.push({
            _id: d.toISOString(),
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            revenue: dailyRevenue,
            orders: dailyOrders
        });
        cumulativeRevenue += dailyRevenue;
    }

    const totalOrders = revenueChart.reduce((acc, curr) => acc + curr.orders, 0);
    const standardRatio = 0.65; // 65% standard products

    return {
        kpi: {
            totalRevenue: cumulativeRevenue,
            revenueGrowth: 12.5,
            totalOrders: totalOrders,
            ordersGrowth: 8.2,
            totalStandard: Math.floor(totalOrders * 35 * standardRatio), // Approx qty per order
            totalPremium: Math.floor(totalOrders * 20 * (1 - standardRatio)),
            avgOrderValue: Math.floor(cumulativeRevenue / totalOrders)
        },
        activeCustomers: 142,
        customerGrowth: 4.3,
        revenueChart,
        topRoutes: [
            { _id: 'Kochi Central', revenue: Math.floor(cumulativeRevenue * 0.35), count: Math.floor(totalOrders * 0.32) },
            { _id: 'Edapally High', revenue: Math.floor(cumulativeRevenue * 0.25), count: Math.floor(totalOrders * 0.22) },
            { _id: 'Vytilla Hub', revenue: Math.floor(cumulativeRevenue * 0.15), count: Math.floor(totalOrders * 0.18) },
            { _id: 'Kaloor North', revenue: Math.floor(cumulativeRevenue * 0.12), count: Math.floor(totalOrders * 0.12) },
            { _id: 'Palarivattom', revenue: Math.floor(cumulativeRevenue * 0.08), count: Math.floor(totalOrders * 0.10) },
        ]
    };
};

const Dashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30'); // '7', '30', '90'

    const fetchStats = async () => {
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
            const data = getMockData(parseInt(dateRange));
            setStats(data);
            setLoading(false);
        }, 800);
    };

    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    if (!stats) return null;

    return (
        <Layout>
            <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Overview of your key performance metrics.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                        <Calendar className="h-4 w-4 text-gray-500 ml-2" />
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-[180px] border-0 focus:ring-0">
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="90">Last 3 Months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                    <h3 className="text-2xl font-bold mt-2 text-emerald-600">
                                        ₹{stats.kpi.totalRevenue.toLocaleString('en-IN')}
                                    </h3>
                                </div>
                                <div className="p-3 bg-emerald-100/50 rounded-xl">
                                    <IndianRupee className="h-5 w-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="flex items-center mt-4 text-xs">
                                <span className="text-emerald-600 font-medium flex items-center bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <ArrowUpRight className="h-3 w-3 mr-1" />
                                    {stats.kpi.revenueGrowth}%
                                </span>
                                <span className="text-muted-foreground ml-2">vs last period</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                    <h3 className="text-2xl font-bold mt-2 text-blue-600">
                                        {stats.kpi.totalOrders.toLocaleString('en-IN')}
                                    </h3>
                                </div>
                                <div className="p-3 bg-blue-100/50 rounded-xl">
                                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="flex items-center mt-4 text-xs">
                                <span className="text-blue-600 font-medium flex items-center bg-blue-50 px-2 py-0.5 rounded-full">
                                    <ArrowUpRight className="h-3 w-3 mr-1" />
                                    {stats.kpi.ordersGrowth}%
                                </span>
                                <span className="text-muted-foreground ml-2">vs last period</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                                    <h3 className="text-2xl font-bold mt-2 text-purple-600">
                                        ₹{stats.kpi.avgOrderValue.toLocaleString('en-IN')}
                                    </h3>
                                </div>
                                <div className="p-3 bg-purple-100/50 rounded-xl">
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                </div>
                            </div>
                            <div className="flex items-center mt-4 text-xs">
                                <span className="text-purple-600 font-medium flex items-center bg-purple-50 px-2 py-0.5 rounded-full">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Stable
                                </span>
                                <span className="text-muted-foreground ml-2">consistent avg</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Product Volume</p>
                                    <div className="flex gap-4 mt-2">
                                        <div>
                                            <div className="text-xs text-green-600 font-semibold mb-1">Standard</div>
                                            <div className="text-lg font-bold">{stats.kpi.totalStandard.toLocaleString()}</div>
                                        </div>
                                        <div className="w-px bg-gray-200 h-8 self-center"></div>
                                        <div>
                                            <div className="text-xs text-orange-600 font-semibold mb-1">Premium</div>
                                            <div className="text-lg font-bold">{stats.kpi.totalPremium.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-orange-100/50 rounded-xl">
                                    <Package className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend - Takes up 2 columns */}
                    <Card className="shadow-sm lg:col-span-2 hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle>Revenue Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.revenueChart} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            tickFormatter={(value) => `₹${value / 1000}k`}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                                            labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '0.25rem' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                                            fill="url(#colorRevenue)"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Routes - Takes up 1 column */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle>Top Routes (Revenue)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.topRoutes} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="_id"
                                            type="category"
                                            width={100}
                                            tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                            formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                                        />
                                        <Bar
                                            dataKey="revenue"
                                            fill="#3B82F6"
                                            radius={[0, 4, 4, 0]}
                                            barSize={24}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Product Mix */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle>Sales Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full flex justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Standard Product', value: stats.kpi.totalStandard },
                                                { name: 'Premium Product', value: stats.kpi.totalPremium }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#166534" /> {/* Standard */}
                                            <Cell fill="#EA580C" /> {/* Premium */}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Units']} />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats / Summary */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle>System Health</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="font-medium text-gray-700">API Status</span>
                                    </div>
                                    <span className="text-sm text-green-600 font-semibold">Operational</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        <span className="font-medium text-gray-700">Last Data Sync</span>
                                    </div>
                                    <span className="text-sm text-gray-600">Just now</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                                        <span className="font-medium text-gray-700">Active Sessions</span>
                                    </div>
                                    <span className="text-sm text-gray-600">3 Users</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
