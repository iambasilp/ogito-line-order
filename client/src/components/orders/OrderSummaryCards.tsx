import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Star, BarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { formatBoxPcs } from '@/utils/formatters';

interface StockSummary {
  initial: number;
  delivered: number;
}

interface User {
  role?: string;
  [key: string]: any;
}

interface SummaryStats {
  totalRevenue: number;
  [key: string]: any;
}

interface OrderSummaryCardsProps {
  showSummary: boolean;
  standardStock: StockSummary;
  premiumStock: StockSummary;
  user: User | null;
  summary: SummaryStats;
}

const OrderSummaryCards: React.FC<OrderSummaryCardsProps> = ({
  showSummary,
  standardStock,
  premiumStock,
  user,
  summary
}) => {
  if (!showSummary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8 animate-slide-up">
      {/* Standard Stock Card */}
      <Card className="rounded-xl sm:rounded-2xl border border-gray-100/80 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wide leading-tight">Standard Stock</span>
          </div>

          <div className="flex items-end gap-1.5 mb-4 sm:mb-6">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
              <AnimatedNumber value={standardStock.initial} />
            </h3>
            <span className="text-[10px] sm:text-sm font-medium text-gray-400 mb-0.5">PKT</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100/80">
            <div className="bg-gray-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-100/50">
              <div className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Delivered</div>
              <div className="text-sm sm:text-base font-bold text-emerald-600">{formatBoxPcs(standardStock.delivered)}</div>
            </div>
            <div className="bg-gray-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-100/50">
              <div className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Remaining</div>
              <div className="text-sm sm:text-base font-bold text-amber-600">{formatBoxPcs(Math.max(0, standardStock.initial - standardStock.delivered))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Stock Card */}
      <Card className="rounded-xl sm:rounded-2xl border border-gray-100/80 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wide leading-tight">Premium Stock</span>
          </div>

          <div className="flex items-end gap-1.5 mb-4 sm:mb-6">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
              <AnimatedNumber value={premiumStock.initial} />
            </h3>
            <span className="text-[10px] sm:text-sm font-medium text-gray-400 mb-0.5">PKT</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100/80">
            <div className="bg-gray-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-100/50">
              <div className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Delivered</div>
              <div className="text-sm sm:text-base font-bold text-indigo-600">{formatBoxPcs(premiumStock.delivered)}</div>
            </div>
            <div className="bg-gray-50/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-100/50">
              <div className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1">Remaining</div>
              <div className="text-sm sm:text-base font-bold text-rose-600">{formatBoxPcs(Math.max(0, premiumStock.initial - premiumStock.delivered))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard CTA Card — 3rd slot */}
      {user?.role !== 'driver' ? (
        <Link to="/dashboard" className="block group h-full">
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full flex flex-col p-3.5 sm:p-5">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-orange-400/20 blur-2xl group-hover:bg-orange-400/40 transition-all duration-500 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 text-orange-600">
                    <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-600 leading-tight">Analytics Dashboard</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">Live</span>
            </div>

            {/* Revenue */}
            <div className="mb-2 sm:mb-3 mt-auto">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                ₹{(summary.totalRevenue || 0).toLocaleString('en-IN')}
              </h3>
            </div>
            
            <p className="text-[10px] sm:text-xs text-gray-500 mb-4 sm:mb-5 leading-tight">
              Route trends, top performers &amp; sales insights
            </p>

            {/* CTA button */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs sm:text-sm rounded-lg sm:rounded-xl shadow shadow-orange-200 group-hover:from-orange-600 group-hover:to-amber-600 transition-all duration-200 w-full mt-auto">
              <BarChart2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>View Full Dashboard</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200 ml-1">&rarr;</span>
            </div>
          </div>
        </Link>
      ) : null}
    </div>
  );
};

export default OrderSummaryCards;
