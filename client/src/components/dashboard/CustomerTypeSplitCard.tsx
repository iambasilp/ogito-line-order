import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Download, 
  Share2, 
  Check, 
  Loader2, 
  Store, 
  Coffee, 
  ShoppingBag, 
  Truck, 
  BarChart3,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import api from '@/lib/api';

export interface CustomerTypeBreakdown {
  customerType: "Distributor" | "Wholesaler" | "Modern Trade" | "Retailer" | "HORECA";
  revenue: number;
  orders: number;
  standardQty: number;
  premiumQty: number;
  customerCount: number;
  totalCustomersInSystem: number;
  percentage: number;
}

export interface CustomerTypeMonthlyData {
  month: string; // YYYY-MM
  monthLabel: string;
  totalRevenue: number;
  totalOrders: number;
  totalStandardQty: number;
  totalPremiumQty: number;
  breakdown: CustomerTypeBreakdown[];
}

export interface CustomerTypeSplitData {
  categories: string[];
  monthlyData: CustomerTypeMonthlyData[];
  overallSummary: {
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
    breakdown: CustomerTypeBreakdown[];
  };
  threeMonthSummary: {
    months: string[];
    monthLabels: string[];
    totalRevenue: number;
    totalOrders: number;
    totalStandardQty: number;
    totalPremiumQty: number;
    breakdown: CustomerTypeBreakdown[];
  };
}

interface CustomerTypeSplitCardProps {
  isAdmin?: boolean;
}

const getCategoryTheme = (type: string) => {
  switch (type) {
    case 'Distributor':
      return {
        icon: Truck,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        border: 'border-blue-200 dark:border-blue-800',
        barColor: 'bg-blue-500'
      };
    case 'Wholesaler':
      return {
        icon: Building2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        barColor: 'bg-emerald-500'
      };
    case 'Modern Trade':
      return {
        icon: ShoppingBag,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        border: 'border-purple-200 dark:border-purple-800',
        barColor: 'bg-purple-500'
      };
    case 'Retailer':
      return {
        icon: Store,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        border: 'border-amber-200 dark:border-amber-800',
        barColor: 'bg-amber-500'
      };
    case 'HORECA':
      return {
        icon: Coffee,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        border: 'border-rose-200 dark:border-rose-800',
        barColor: 'bg-rose-500'
      };
    default:
      return {
        icon: Building2,
        color: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-500/10 dark:bg-gray-500/20',
        border: 'border-gray-200 dark:border-gray-800',
        barColor: 'bg-gray-500'
      };
  }
};

export const CustomerTypeSplitCard: React.FC<CustomerTypeSplitCardProps> = () => {
  const [data, setData] = useState<CustomerTypeSplitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | '3months_completed' | '3months_recent'>('all');
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders/analytics/customer-type-split');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch customer type split data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter months based on user selection
  const getFilteredMonths = () => {
    if (!data) return [];
    if (selectedFilter === '3months_completed') {
      // Completed 3 calendar months (e.g. Aug, Sep, Oct)
      return data.monthlyData.filter(m => data.threeMonthSummary.months.includes(m.month));
    } else if (selectedFilter === '3months_recent') {
      // Last 3 months ending in current (e.g. Sep, Oct, Nov)
      return data.monthlyData.slice(-3);
    }
    return data.monthlyData;
  };

  const filteredMonths = getFilteredMonths();

  // Compute active summary for the selected filter
  const getActiveSummary = () => {
    if (!data) return null;
    if (selectedFilter === '3months_completed') {
      return data.threeMonthSummary;
    }
    if (selectedFilter === '3months_recent') {
      const months = filteredMonths.map(m => m.month);
      const labels = filteredMonths.map(m => m.monthLabel);
      let totalRev = 0;
      let totalOrd = 0;
      let totalStd = 0;
      let totalPrem = 0;
      const typeTotals: Record<string, { revenue: number, orders: number, std: number, prem: number }> = {};
      data.categories.forEach(c => {
        typeTotals[c] = { revenue: 0, orders: 0, std: 0, prem: 0 };
      });

      filteredMonths.forEach(m => {
        totalRev += m.totalRevenue;
        totalOrd += m.totalOrders;
        totalStd += m.totalStandardQty;
        totalPrem += m.totalPremiumQty;
        m.breakdown.forEach(b => {
          if (typeTotals[b.customerType]) {
            typeTotals[b.customerType].revenue += b.revenue;
            typeTotals[b.customerType].orders += b.orders;
            typeTotals[b.customerType].std += b.standardQty;
            typeTotals[b.customerType].prem += b.premiumQty;
          }
        });
      });

      const breakdown = data.categories.map(c => {
        const item = typeTotals[c];
        const pct = totalRev > 0 ? (item.revenue / totalRev) * 100 : 0;
        return {
          customerType: c as any,
          revenue: item.revenue,
          orders: item.orders,
          standardQty: item.std,
          premiumQty: item.prem,
          customerCount: 0,
          totalCustomersInSystem: 0,
          percentage: parseFloat(pct.toFixed(2))
        };
      });

      return {
        months,
        monthLabels: labels,
        totalRevenue: totalRev,
        totalOrders: totalOrd,
        totalStandardQty: totalStd,
        totalPremiumQty: totalPrem,
        breakdown
      };
    }
    return data.overallSummary;
  };

  const activeSummary = getActiveSummary();

  // CSV Export
  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'Section',
      'Period',
      'Customer Classification',
      'Total Orders',
      'Unique Customers',
      'Standard Boxes',
      'Premium Boxes',
      'Total Sales Revenue (INR)',
      'Sales Contribution (%)'
    ];
    const rows: string[] = [headers.join(',')];

    // Monthly Split
    filteredMonths.forEach(m => {
      m.breakdown.forEach(b => {
        rows.push([
          '"Monthly Breakdown"',
          `"${m.monthLabel}"`,
          `"${b.customerType}"`,
          b.orders,
          b.customerCount,
          b.standardQty,
          b.premiumQty,
          b.revenue.toFixed(2),
          `${b.percentage}%`
        ].join(','));
      });
      rows.push([
        '"Monthly Total"',
        `"${m.monthLabel}"`,
        '"TOTAL ALL CUSTOMER TYPES"',
        m.totalOrders,
        '-',
        m.totalStandardQty,
        m.totalPremiumQty,
        m.totalRevenue.toFixed(2),
        '100%'
      ].join(','));
    });

    // Summary Section
    if (activeSummary) {
      const summaryLabel = selectedFilter === '3months_completed'
        ? `3-Month Summary (${data.threeMonthSummary.monthLabels.join(' - ')})`
        : selectedFilter === '3months_recent'
        ? 'Last 3 Months Summary (Sep - Nov 2026)'
        : 'Overall Summary (All Months)';

      activeSummary.breakdown.forEach(b => {
        rows.push([
          `"${summaryLabel}"`,
          `"${summaryLabel}"`,
          `"${b.customerType}"`,
          b.orders,
          '-',
          b.standardQty,
          b.premiumQty,
          b.revenue.toFixed(2),
          `${b.percentage}%`
        ].join(','));
      });

      rows.push([
        `"${summaryLabel} Total"`,
        `"${summaryLabel}"`,
        '"TOTAL ALL CUSTOMER TYPES"',
        activeSummary.totalOrders,
        '-',
        activeSummary.totalStandardQty,
        activeSummary.totalPremiumQty,
        activeSummary.totalRevenue.toFixed(2),
        '100%'
      ].join(','));
    }

    const csvString = rows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ogito_Customer_Type_Sales_Split_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // WhatsApp-Friendly Copy
  const handleCopyWhatsApp = () => {
    if (!data) return;

    let text = `📊 *OGITO FOODS - SALES SPLIT-UP REPORT*\n`;
    text += `🏢 *Customer Classification Breakdown*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    filteredMonths.forEach(m => {
      text += `🗓️ *${m.monthLabel.toUpperCase()}*\n`;
      text += `────────────────────────────\n`;
      m.breakdown.forEach(b => {
        let icon = '🏢';
        if (b.customerType === 'Distributor') icon = '🚚';
        else if (b.customerType === 'Wholesaler') icon = '🏬';
        else if (b.customerType === 'Modern Trade') icon = '🛒';
        else if (b.customerType === 'Retailer') icon = '🏪';
        else if (b.customerType === 'HORECA') icon = '☕';

        text += `${icon} *${b.customerType}*: ₹${b.revenue.toLocaleString('en-IN')} (*${b.percentage}%*)\n`;
        text += `   • Orders: ${b.orders} | Std: ${b.standardQty} | Prem: ${b.premiumQty}\n`;
      });
      text += `────────────────────────────\n`;
      text += `💰 *Monthly Total*: *₹${m.totalRevenue.toLocaleString('en-IN')}* (100%)\n`;
      text += `📦 Total Orders: ${m.totalOrders} | Boxes: ${m.totalStandardQty + m.totalPremiumQty}\n\n`;
    });

    if (activeSummary) {
      const summaryTitle = selectedFilter === '3months_completed'
        ? `🏆 *3-MONTH SUMMARY (${data.threeMonthSummary.monthLabels.join(' - ')})*`
        : selectedFilter === '3months_recent'
        ? `🏆 *LAST 3 MONTHS SUMMARY (Sep - Nov 2026)*`
        : `🏆 *OVERALL SUMMARY (ALL MONTHS)*`;

      text += `${summaryTitle}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      activeSummary.breakdown.forEach(b => {
        let icon = '🏢';
        if (b.customerType === 'Distributor') icon = '🚚';
        else if (b.customerType === 'Wholesaler') icon = '🏬';
        else if (b.customerType === 'Modern Trade') icon = '🛒';
        else if (b.customerType === 'Retailer') icon = '🏪';
        else if (b.customerType === 'HORECA') icon = '☕';

        text += `${icon} *${b.customerType}*: ₹${b.revenue.toLocaleString('en-IN')} (*${b.percentage}%*)\n`;
        text += `   • Orders: ${b.orders} | Std: ${b.standardQty} | Prem: ${b.premiumQty}\n`;
      });
      text += `────────────────────────────\n`;
      text += `💰 *Grand Total Sales*: *₹${activeSummary.totalRevenue.toLocaleString('en-IN')}* (100%)\n`;
      text += `📦 Grand Total Orders: ${activeSummary.totalOrders}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    text += `_Ogito ERP System • Verified Database Report_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <Card className="shadow-sm border-none ring-1 ring-border overflow-hidden mb-6">
      <CardHeader className="bg-muted/80 border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center text-foreground">
              <Building2 className="h-5 w-5 mr-2 text-primary" />
              Customer Type Sales Split
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue distribution across the 5 ERP customer segments: Distributor, Wholesaler, Modern Trade, Retailer, HORECA
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Select 
              value={selectedFilter} 
              onValueChange={(val: any) => setSelectedFilter(val)}
            >
              <SelectTrigger className="h-9 text-xs w-[190px] bg-background">
                <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months (Aug - Nov)</SelectItem>
                <SelectItem value="3months_completed">Completed 3M (Aug - Oct)</SelectItem>
                <SelectItem value="3months_recent">Last 3M (Sep - Nov)</SelectItem>
              </SelectContent>
            </Select>

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={loading || !data}
              className="h-9 text-xs font-medium gap-1.5 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
              title="Export complete split data to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>

            {/* Copy WhatsApp Report Button */}
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyWhatsApp}
              disabled={loading || !data}
              className="h-9 text-xs font-medium gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              title="Copy WhatsApp-friendly text report to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white animate-in zoom-in-50" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>WhatsApp Report</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading customer segment split analysis...</p>
          </div>
        ) : !data || filteredMonths.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No sales data found for the selected period.
          </div>
        ) : (
          <>
            {/* Top Summary Banner for Selected Period */}
            {activeSummary && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/15">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {selectedFilter === '3months_completed'
                        ? '3-Month Completed Period Summary'
                        : selectedFilter === '3months_recent'
                        ? 'Last 3 Months Period Summary'
                        : 'Period Total Summary'}
                    </span>
                    <h3 className="text-2xl font-black text-foreground mt-0.5">
                      {formatCurrency(activeSummary.totalRevenue)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="bg-background/80 px-3 py-1.5 rounded-lg border border-border shadow-2xs">
                      <span className="font-semibold text-foreground">{activeSummary.totalOrders.toLocaleString()}</span> Orders
                    </div>
                    <div className="bg-background/80 px-3 py-1.5 rounded-lg border border-border shadow-2xs">
                      <span className="font-semibold text-foreground">{(activeSummary.totalStandardQty + activeSummary.totalPremiumQty).toLocaleString()}</span> Boxes
                    </div>
                  </div>
                </div>

                {/* Segment Badges Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {activeSummary.breakdown.map((item) => {
                    const theme = getCategoryTheme(item.customerType);
                    const IconComponent = theme.icon;
                    return (
                      <div
                        key={`summary-${item.customerType}`}
                        className={`p-3 rounded-lg border bg-background/90 ${theme.border} shadow-2xs transition-all hover:scale-[1.02]`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`p-1 rounded-md ${theme.bg}`}>
                              <IconComponent className={`h-3.5 w-3.5 ${theme.color}`} />
                            </div>
                            <span className="text-xs font-bold text-foreground truncate">{item.customerType}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-semibold">
                            {item.percentage}%
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatCurrency(item.revenue)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                          <span>{item.orders} orders</span>
                          <span>{item.standardQty + item.premiumQty} boxes</span>
                        </div>
                        {/* Progress visual */}
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className={`h-full ${theme.barColor} transition-all duration-500`}
                            style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Tables Breakdown */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Monthly Performance by Customer Classification
                </h4>
                <span className="text-xs text-muted-foreground">
                  Showing {filteredMonths.length} month{filteredMonths.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredMonths.map((m) => (
                  <div 
                    key={`month-table-${m.month}`}
                    className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs"
                  >
                    {/* Month Header */}
                    <div className="bg-muted/50 px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{m.monthLabel}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {m.month}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          Total: <strong className="text-foreground">{formatCurrency(m.totalRevenue)}</strong>
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">
                          Orders: <strong className="text-foreground">{m.totalOrders}</strong>
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">
                          Boxes: <strong className="text-foreground">{m.totalStandardQty + m.totalPremiumQty}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border">
                          <tr>
                            <th className="py-2.5 px-4">Customer Type</th>
                            <th className="py-2.5 px-3 text-right">Orders</th>
                            <th className="py-2.5 px-3 text-right">Std Boxes</th>
                            <th className="py-2.5 px-3 text-right">Prem Boxes</th>
                            <th className="py-2.5 px-4 text-right">Total Sales</th>
                            <th className="py-2.5 px-4 text-right w-[160px]">Share %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {m.breakdown.map((row) => {
                            const theme = getCategoryTheme(row.customerType);
                            const IconComponent = theme.icon;
                            return (
                              <tr 
                                key={`row-${m.month}-${row.customerType}`}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1 rounded ${theme.bg}`}>
                                      <IconComponent className={`h-3 w-3 ${theme.color}`} />
                                    </div>
                                    <span className="font-semibold text-foreground">{row.customerType}</span>
                                    {row.customerCount > 0 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        ({row.customerCount} active)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                                  {row.orders}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                                  {row.standardQty.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                                  {row.premiumQty.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-foreground font-mono">
                                  {formatCurrency(row.revenue)}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="font-bold font-mono text-xs w-11 text-right">
                                      {row.percentage}%
                                    </span>
                                    <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full ${theme.barColor}`}
                                        style={{ width: `${Math.min(100, Math.max(2, row.percentage))}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-muted/40 font-bold border-t-2 border-border text-foreground">
                          <tr>
                            <td className="py-2.5 px-4">Total ({m.monthLabel})</td>
                            <td className="py-2.5 px-3 text-right font-mono">{m.totalOrders}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{m.totalStandardQty.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{m.totalPremiumQty.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-primary">{formatCurrency(m.totalRevenue)}</td>
                            <td className="py-2.5 px-4 text-right font-mono">100.0%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerTypeSplitCard;
