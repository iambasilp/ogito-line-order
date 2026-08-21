import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Search, Truck, MapPin, Phone, Calendar, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import type { Order, Customer, User as UserType } from '@/types';
import { VEHICLES, formatVehicleName } from '@/types';
import { triggerReward } from '@/lib/utils';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingOrder: Order | null;
  salesUsers: any[];
  isDriverOrAdmin: boolean;
  isAdmin: boolean;
  onSaveSuccess: (date: string) => void;
  defaultDate: string;
  currentUser: UserType | null;
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  editingOrder,
  // salesUsers not used anymore since we removed the dropdown
  // salesUsers,
  // isDriverOrAdmin not used anymore
  // isDriverOrAdmin,
  isAdmin,
  onSaveSuccess,
  defaultDate,
  currentUser
}) => {
  const [formData, setFormData] = useState({
    date: defaultDate,
    route: '',
    customerId: '',
    vehicle: '',
    standardQty: 0,
    premiumQty: 0,
    salesExecutive: currentUser?.username || ''
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerPage, setCustomerPage] = useState(1);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const standardQtyRef = useRef<HTMLInputElement>(null);

  const getDefaultVehicle = useCallback((salesExecutiveName: string, dateString: string) => {
    if (!salesExecutiveName || !dateString) return '';
    const date = new Date(dateString);
    const day = date.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    const isMonWed = day === 1 || day === 3;
    const isTueThu = day === 2 || day === 4;
    const isFriSat = day === 5 || day === 6;

    const execLower = salesExecutiveName.toLowerCase();

    let vehicleLetter = '';

    if (execLower.includes('shibin')) {
      if (isMonWed) vehicleLetter = 'A';
      else if (isTueThu) vehicleLetter = 'D';
      else if (isFriSat) vehicleLetter = 'E';
    } else if (execLower.includes('naseef')) {
      if (isMonWed) vehicleLetter = 'B';
      else if (isTueThu) vehicleLetter = 'C';
      else if (isFriSat) vehicleLetter = 'E';
    } else if (execLower.includes('dileep')) {
      if (isMonWed) vehicleLetter = 'B';
      else if (isFriSat) vehicleLetter = 'E';
    }

    if (vehicleLetter) {
      return VEHICLES.find((v: string) => v.startsWith(vehicleLetter)) || '';
    }
    return '';
  }, []);

  const resetForm = useCallback(() => {
    const initialExecutive = currentUser?.username || '';
    setFormData({
      date: defaultDate,
      route: '',
      customerId: '',
      vehicle: getDefaultVehicle(initialExecutive, defaultDate),
      standardQty: 0,
      premiumQty: 0,
      salesExecutive: initialExecutive
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setErrorMessage('');
    setCustomers([]);
    setCustomerPage(1);
    setHasMoreCustomers(false);
    setSelectedIndex(-1);
  }, [defaultDate, currentUser, getDefaultVehicle]);

  useEffect(() => {
    if (!editingOrder && isOpen) {
      setFormData(prev => {
        const newVehicle = getDefaultVehicle(prev.salesExecutive, prev.date);
        if (prev.vehicle !== newVehicle && newVehicle !== '') {
          return { ...prev, vehicle: newVehicle };
        } else if (prev.vehicle !== newVehicle && newVehicle === '') {
          // If no default vehicle pattern is found, we can clear it or leave it
          return { ...prev, vehicle: '' };
        }
        return prev;
      });
    }
  }, [formData.date, formData.salesExecutive, editingOrder, isOpen, getDefaultVehicle]);

  const fetchCustomers = async (searchTerm: string = '', routeName: string = '', page: number = 1) => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      if (routeName) params.append('route', routeName);
      params.append('page', page.toString());
      params.append('limit', '50');
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/customers?${params.toString()}`);
      const { customers: fetchedCustomers, pagination } = response.data;

      if (page === 1) {
        setCustomers(fetchedCustomers);
      } else {
        setCustomers(prev => [...prev, ...fetchedCustomers]);
      }

      setHasMoreCustomers(pagination.page < pagination.totalPages);
      setCustomerPage(page);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      if (page === 1) setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingOrder) {
        setFormData({
          date: new Date(editingOrder.date).toISOString().split('T')[0],
          route: typeof editingOrder.route === 'string' ? editingOrder.route : (editingOrder.route as any)?.name || '',
          customerId: editingOrder.customerId,
          vehicle: editingOrder.vehicle,
          standardQty: editingOrder.standardQty,
          premiumQty: editingOrder.premiumQty,
          salesExecutive: editingOrder.salesExecutive || ''
        });
        // Construct a mock selected customer for the UI
        setSelectedCustomer({
          _id: editingOrder.customerId,
          name: editingOrder.customerName,
          phone: editingOrder.customerPhone || '',
          locationUrl: editingOrder.locationUrl,
          greenPrice: editingOrder.greenPrice,
          orangePrice: editingOrder.orangePrice,
          route: typeof editingOrder.route === 'string' ? editingOrder.route : (editingOrder.route as any)?.name || '',
          salesExecutive: editingOrder.salesExecutive || '',
        });
        setCustomerSearch(editingOrder.customerName);
        fetchCustomers('', editingOrder.route, 1);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingOrder, resetForm]);

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);

    // Clear selection when search is modified
    if (selectedCustomer) {
      if (value.length === 0) {
        setSelectedCustomer(null);
        setFormData(prev => ({ ...prev, customerId: '', route: '' }));
      } else if (value !== selectedCustomer.name &&
        !selectedCustomer.name.toLowerCase().startsWith(value.toLowerCase()) &&
        !value.toLowerCase().includes(selectedCustomer.name.toLowerCase().slice(0, 3))) {
        setSelectedCustomer(null);
        setFormData(prev => ({ ...prev, customerId: '', route: '' }));
      }
    }

    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      if (value.length >= 2) {
        setShowCustomerDropdown(true);
        fetchCustomers(value, formData.route, 1);
      } else if (value.length === 0) {
        setCustomers([]);
        setShowCustomerDropdown(false);
      }
    }, 400);

    setSearchDebounce(timeout);
    setSelectedIndex(-1);
  };

    const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerDropdown || customers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < customers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < customers.length) {
        const customer = customers[selectedIndex];
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
        setFormData(prev => ({
          ...prev,
          customerId: customer._id,
          route: typeof customer.route === 'string' ? customer.route : customer.route?.name || '',
          salesExecutive: customer.salesExecutive || prev.salesExecutive
        }));
        setShowCustomerDropdown(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        
        setTimeout(() => {
          if (formData.date) {
            standardQtyRef.current?.focus();
          } else {
            dateInputRef.current?.focus();
          }
        }, 50);
      }
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter')) {
      e.preventDefault();
      if (selectedCustomer) {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmitOrder(fakeEvent);
      }
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.vehicle || !formData.route) {
      setErrorMessage('Please fill in all required fields (Route, Customer and Vehicle)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      if (editingOrder) {
        await api.put(`/orders/${editingOrder._id}`, formData);
      } else {
        await api.post('/orders', formData);
      }

      triggerReward();
      onSaveSuccess(formData.date);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to save order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotals = useCallback(() => {
    if (!selectedCustomer) return { standardTotal: 0, premiumTotal: 0, total: 0 };

    const standardTotal = formData.standardQty * selectedCustomer.greenPrice;
    const premiumTotal = formData.premiumQty * selectedCustomer.orangePrice;
    const total = standardTotal + premiumTotal;

    return { standardTotal, premiumTotal, total };
  }, [selectedCustomer, formData.standardQty, formData.premiumQty]);

  const totals = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`w-[95vw] sm:w-full sm:max-w-3xl max-h-[90vh] p-3 pb-2 sm:p-5 sm:pb-4 gap-3 sm:gap-4 ${!selectedCustomer ? '!overflow-visible' : 'overflow-y-auto'}`}>
        <DialogHeader className="!pt-3 !pb-2 px-3 sm:!pt-4 sm:!pb-3 sm:px-5">
          <DialogTitle className="text-base sm:text-lg">{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
        </DialogHeader>
        <div className="">
          <form onSubmit={handleSubmitOrder} onKeyDown={handleFormKeyDown} className="space-y-2.5 sm:space-y-3">
            {!selectedCustomer ? (
              <div className="space-y-1 relative py-2">
                <div className="relative">
                  <Input
                    id="customer"
                    type="text"
                    autoFocus
                    placeholder="Search customer by name or phone"
                    value={customerSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomerSearch(e.target.value)}
                    onKeyDown={handleCustomerKeyDown}
                    onFocus={() => {
                      if (customerSearch.length >= 2) {
                        setShowCustomerDropdown(true);
                        fetchCustomers(customerSearch, formData.route, 1);
                      }
                    }}
                    className={`pl-9 pr-10 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 focus-visible:ring-offset-0 transition-colors ${selectedCustomer ? 'border-green-500 bg-green-50/50 dark:bg-emerald-950/20' : ''}`}
                    required
                    autoComplete="off"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />

                  {selectedCustomer && (
                    <div className="absolute right-3 top-2.5 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
                {customerSearch.length > 0 && customerSearch.length < 2 && (
                  <p className="text-xs text-amber-600">
                    Type at least 2 characters to search
                  </p>
                )}

                {showCustomerDropdown && customerSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-background text-foreground border border-border/60 rounded-md shadow-md overflow-hidden flex flex-col">
                    {loadingCustomers && customers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2"></div>
                        Searching...
                      </div>
                    ) : customers.length > 0 ? (
                      <ul className="py-1 max-h-60 overflow-y-auto overscroll-contain">
                        {customers.map((customer, index) => (
                          <li
                            key={customer._id}
                            className={`px-3 py-2 hover:bg-muted cursor-pointer border-b border-border/40 last:border-0 transition-colors ${selectedIndex === index ? "bg-accent" : ""}`}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearch(customer.name);
                              setFormData(prev => ({
                                ...prev,
                                customerId: customer._id,
                                route: typeof customer.route === 'string' ? customer.route : customer.route?.name || '',
                                salesExecutive: customer.salesExecutive || prev.salesExecutive
                              }));
                              setShowCustomerDropdown(false);
                              if (document.activeElement instanceof HTMLElement) {
                                document.activeElement.blur();
                              }
                            }}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-foreground truncate">{customer.name}</div>
                              </div>
                              <div className="text-right shrink-0 mt-0.5">
                                <div className="text-[11px] font-medium text-muted-foreground">{customer.phone || 'No Phone'}</div>
                              </div>
                            </div>
                          </li>
                        ))}
                        {hasMoreCustomers && (
                          <li className="p-1 border-t border-border/40">
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
                              disabled={loadingCustomers}
                              onClick={() => fetchCustomers(customerSearch, formData.route, customerPage + 1)}
                            >
                              {loadingCustomers ? 'Loading...' : 'Load more results'}
                            </Button>
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No customers found
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-3">
                  <div className="bg-background h-10 px-3 rounded-md border border-input flex justify-between items-center shadow-sm">
                    <div className="text-sm font-medium text-foreground truncate mr-2">{selectedCustomer.name}</div>
                    <div className="flex items-center shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${selectedCustomer.locationUrl ? 'text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedCustomer.locationUrl) {
                            window.open(selectedCustomer.locationUrl, '_blank');
                          } else {
                            const url = window.prompt(`Enter Google Maps Link for ${selectedCustomer.name}:`);
                            if (url && url.trim() !== '') {
                              try {
                                await api.put(`/customers/${selectedCustomer._id}`, { ...selectedCustomer, locationUrl: url.trim() });
                                setSelectedCustomer({ ...selectedCustomer, locationUrl: url.trim() });
                              } catch (err) {
                                console.error('Failed to update location:', err);
                                alert('Failed to update location');
                              }
                            }
                          }
                        }}
                        title={selectedCustomer.locationUrl ? "Open location in Google Maps" : "Add location link"}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${selectedCustomer.phone ? 'text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedCustomer.phone) {
                            window.location.href = `tel:${selectedCustomer.phone}`;
                          }
                        }}
                        disabled={!selectedCustomer.phone}
                        title={selectedCustomer.phone ? "Call customer" : "No phone number available"}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between bg-card px-4 rounded-lg border border-input shadow-sm h-[68px] focus-within:ring-1 focus-within:ring-amber-500 focus-within:border-amber-500 overflow-hidden hover:border-amber-500/50 transition-colors">
                    <div className="flex items-center gap-3 pointer-events-none">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base font-semibold text-foreground">
                        {formData.date ? formData.date.split('-').reverse().join('/') : 'Select Date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-none">
                      <span className="text-[13px] font-medium text-muted-foreground">Delivery Date</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    
                    <Input
                      id="date"
                      type="date"
                      ref={dateInputRef}
                      value={formData.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-muted/40 p-2.5 sm:p-3 rounded-lg border border-border/50 transition-all">
                    <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-3 divide-x divide-border/50`}>
                      <div className="overflow-hidden pl-0">
                        <div className="text-[10px] font-semibold text-muted-foreground mb-1">Route</div>
                        <div className="text-sm font-medium text-foreground truncate">{typeof selectedCustomer.route === 'string' ? selectedCustomer.route : (selectedCustomer.route as any)?.name}</div>
                      </div>

                      {isAdmin && (
                        <div className="overflow-hidden pl-3">
                          <div className="text-[10px] font-semibold text-muted-foreground mb-1">Executive</div>
                          <div className="text-sm font-medium text-foreground truncate">{selectedCustomer.salesExecutive}</div>
                        </div>
                      )}

                      <div className="overflow-hidden pl-3 flex flex-col justify-end">
                        <div className="text-[10px] font-semibold text-muted-foreground mb-1">Vehicle</div>
                        <Select value={formData.vehicle} onValueChange={(value: string) => setFormData({ ...formData, vehicle: value })} required>
                          <SelectTrigger tabIndex={-1} className="h-6 px-1.5 py-0 bg-background hover:bg-accent border-border focus:ring-1 focus:ring-amber-500 focus:ring-offset-0 focus:border-amber-500 shadow-sm rounded-sm text-xs font-medium w-full transition-colors">
                            <div className="flex items-center text-foreground w-full">
                              <Truck className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
                              <span className="truncate">{formData.vehicle ? formData.vehicle.split('-')[0].trim() : 'Select'}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {VEHICLES.map((vehicle: string) => (
                              <SelectItem key={vehicle} value={vehicle}>
                                <div className="flex items-center w-full overflow-hidden text-sm">
                                  <Truck className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                  <span className="truncate">{formatVehicleName(vehicle)}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 mt-1.5">
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Input
                          id="standardQty"
                          type="number"
                          ref={standardQtyRef}
                          min="0"
                          className="font-medium text-base sm:text-lg text-emerald-950 dark:text-emerald-100 border-emerald-200 dark:border-emerald-900/50 focus-visible:ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 transition-all shadow-sm"
                          value={formData.standardQty === 0 ? '' : formData.standardQty}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, standardQty: parseFloat(e.target.value) || 0 })}
                          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                          placeholder="Standard Qty"
                        />
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground mt-1">₹{selectedCustomer.greenPrice}/unit <span className="mx-1 opacity-50">•</span> <span className="text-foreground">₹{totals.standardTotal.toFixed(2)}</span></p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative">
                        <Input
                          id="premiumQty"
                          type="number"
                          min="0"
                          className="font-medium text-base sm:text-lg text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-500 bg-amber-50/30 dark:bg-amber-950/20 transition-all shadow-sm"
                          value={formData.premiumQty === 0 ? '' : formData.premiumQty}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, premiumQty: parseFloat(e.target.value) || 0 })}
                          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                          placeholder="Premium Qty"
                        />
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground mt-1">₹{selectedCustomer.orangePrice}/unit <span className="mx-1 opacity-50">•</span> <span className="text-foreground">₹{totals.premiumTotal.toFixed(2)}</span></p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5 p-3 sm:p-4 rounded-xl border border-primary/20 mt-2 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-sm font-bold text-foreground">Grand Total</div>
                      <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground mt-0.5">Including all taxes</div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">₹{totals.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                {errorMessage}
              </div>
            )}

            {selectedCustomer && (
              <div className="flex justify-end gap-3 pt-1.5 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                  {isSubmitting ? 'Submitting...' : (editingOrder ? 'Update Order' : 'Submit Order')}
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
