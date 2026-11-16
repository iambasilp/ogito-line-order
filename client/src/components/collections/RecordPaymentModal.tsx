import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import api from '../../lib/api';
import type { PaymentCollection } from '../../types';
import { 
  Banknote, 
  Search, 
  X, 
  Check, 
  Building2, 
  MapPin, 
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialCustomerName?: string;
  initialOrderId?: string;
  orderInfo?: {
    route?: string;
    vehicle?: string;
    standardQty?: number;
    premiumQty?: number;
    standardTotal?: number;
    premiumTotal?: number;
    totalAmount?: number;
  };
  allCustomers?: any[];
  onSuccess: (collection: PaymentCollection) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  initialCustomerName,
  initialOrderId,
  orderInfo,
  allCustomers = [],
  onSuccess,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const paymentMode = 'Cash';
  const [notes, setNotes] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Search state when choosing "Other Customer"
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState<boolean>(false);
  const [fetchedCustomers, setFetchedCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setAmount('');
      setNotes('');
      setCollectionDate(new Date().toISOString().split('T')[0]);
      setCustomerSearch('');

      if (initialCustomerId) {
        setSelectedCustomerId(initialCustomerId);
        setSelectedCustomerName(initialCustomerName || '');
        setIsSearchingCustomer(false);

        // Pre-fill amount with order total if available
        if (orderInfo?.totalAmount && orderInfo.totalAmount > 0) {
          setAmount(orderInfo.totalAmount.toString());
        }
      } else {
        setSelectedCustomerId('');
        setSelectedCustomerName('');
        setIsSearchingCustomer(true);
      }

      // If allCustomers wasn't passed or is empty, fetch customers for search
      if (!allCustomers || allCustomers.length === 0) {
        loadCustomers();
      }
    }
  }, [isOpen, initialCustomerId, initialCustomerName, orderInfo]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await api.get('/customers?limit=1000');
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.customers)
        ? res.data.customers
        : [];
      setFetchedCustomers(list);
    } catch (err) {
      console.error('Failed to load customers for payment modal', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const customerList = allCustomers.length > 0 ? allCustomers : fetchedCustomers;

  // Filtered customers for autocomplete search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) {
      return customerList.slice(0, 50);
    }
    const q = customerSearch.toLowerCase().trim();
    return customerList
      .filter((c) => {
        const name = (c.name || '').toLowerCase();
        const shop = (c.shopName || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const routeName = (typeof c.route === 'object' ? c.route?.name : c.route || '').toLowerCase();
        return name.includes(q) || shop.includes(q) || phone.includes(q) || routeName.includes(q);
      })
      .slice(0, 50);
  }, [customerList, customerSearch]);

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomerId(cust._id);
    setSelectedCustomerName(cust.shopName || cust.name);
    setIsSearchingCustomer(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId) {
      setError('Please select a customer to record payment.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        customerId: selectedCustomerId,
        amount: numAmount,
        paymentMode,
        date: collectionDate,
        notes: notes.trim(),
      };

      if (initialOrderId) {
        payload.orderId = initialOrderId;
      }
      if (orderInfo?.vehicle) {
        payload.vehicle = orderInfo.vehicle;
      }

      const res = await api.post('/collections', payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment collection', err);
      setError(err.response?.data?.error || 'Failed to save payment collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] w-[96vw] p-3.5 sm:p-4 max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Banknote className="h-4 w-4" />
            </div>
            <span>Record Cash Collection</span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-2.5 my-1 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {/* Customer Selection / Display */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Customer *
              </Label>
              {selectedCustomerId && !initialCustomerId && (
                <button
                  type="button"
                  onClick={() => setIsSearchingCustomer(true)}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Change
                </button>
              )}
            </div>

            {selectedCustomerId && !isSearchingCustomer ? (
              <div className="p-2.5 bg-muted/40 rounded-xl border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate text-foreground leading-tight">
                      {selectedCustomerName}
                    </p>
                    {orderInfo?.route && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>Route: {orderInfo.route}</span>
                      </p>
                    )}
                  </div>
                </div>
                {!initialCustomerId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setSelectedCustomerName('');
                      setIsSearchingCustomer(true);
                    }}
                    className="h-7 px-2 text-[11px] text-primary hover:underline"
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 border rounded-xl p-2.5 bg-muted/20">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search customer name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-8 pr-7 h-9 bg-background text-xs"
                    autoFocus
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-0.5 rounded-lg border bg-background p-1 divide-y divide-border/50">
                  {loadingCustomers ? (
                    <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading customers...
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No matching customer found.
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const cName = cust.shopName || cust.name;
                      const rName = typeof cust.route === 'object' ? cust.route?.name : cust.route;
                      const isSelected = selectedCustomerId === cust._id;

                      return (
                        <div
                          key={cust._id}
                          onClick={() => handleSelectCustomer(cust)}
                          className={`p-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold truncate text-xs">{cName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {rName ? `Route: ${rName}` : ''} {cust.phone ? `• ${cust.phone}` : ''}
                            </p>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Collection Amount */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Collection Amount (₹) *
              </Label>
              {orderInfo?.totalAmount && orderInfo.totalAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(orderInfo.totalAmount!.toString())}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Bill Total: ₹{orderInfo.totalAmount.toLocaleString('en-IN')}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                step="any"
                min="1"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-11 text-xl font-bold tracking-tight bg-background border-2 focus-visible:border-primary"
                autoFocus={Boolean(selectedCustomerId && !isSearchingCustomer)}
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {[500, 1000, 2000, 5000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(quick.toString())}
                  className="px-2 py-0.5 rounded text-xs font-semibold border bg-muted/50 hover:bg-muted transition-colors text-foreground"
                >
                  ₹{quick}
                </button>
              ))}
            </div>
          </div>

          {/* 2-Column Split: Collection Date & Remarks */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Date *
              </Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  required
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Remarks (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. Previous dues"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 bg-background text-xs"
              />
            </div>
          </div>

          {/* Action Buttons: 2-Button Split */}
          <div className="pt-2.5 border-t grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-10 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedCustomerId || !amount}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm truncate"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin shrink-0" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="truncate">Record ₹{amount ? Number(amount).toLocaleString('en-IN') : '0'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default RecordPaymentModal;
