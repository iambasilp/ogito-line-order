import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, User, Truck, MapPin } from 'lucide-react';
import api from '@/lib/api';
import type { Order, Customer, User as UserType } from '@/types';
import { VEHICLES } from '@/types';
import confetti from 'canvas-confetti';

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
  salesUsers,
  isDriverOrAdmin,
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

  const resetForm = useCallback(() => {
    setFormData({
      date: defaultDate,
      route: '',
      customerId: '',
      vehicle: '',
      standardQty: 0,
      premiumQty: 0,
      salesExecutive: currentUser?.username || ''
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setErrorMessage('');
    setCustomers([]);
    setCustomerPage(1);
    setHasMoreCustomers(false);
  }, [defaultDate, currentUser]);

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

  const triggerReward = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#D92638', '#E07012', '#FACC15']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#D92638', '#E07012', '#FACC15']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

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
      <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 gap-6">
        <DialogHeader>
          <DialogTitle>{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
                  </DialogHeader>
        <div className="">
          <form onSubmit={handleSubmitOrder} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Delivery Date</Label>
                  <div className="relative">
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="pl-9"
                    />
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="customer">Customer Search *</Label>
                  <div className="relative">
                    <Input
                      id="customer"
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomerSearch(e.target.value)}
                      onFocus={() => {
                        if (customerSearch.length >= 2) {
                          setShowCustomerDropdown(true);
                          fetchCustomers(customerSearch, formData.route, 1);
                        }
                      }}
                      className={`pl-9 ${selectedCustomer ? 'pr-10 border-green-500 bg-green-50/50' : ''}`}
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
                  {selectedCustomer && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      ✓ Customer selected: <span className="font-medium">{selectedCustomer.name}</span>
                    </p>
                  )}

                  {showCustomerDropdown && customerSearch.length >= 2 && (
                    <div className="customer-dropdown absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-auto">
                      {loadingCustomers && customers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          Searching customers...
                        </div>
                      ) : customers.length > 0 ? (
                        <ul className="py-1">
                          {customers.map((customer) => (
                            <li
                              key={customer._id}
                              className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b last:border-0 transition-colors"
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
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" />{typeof customer.route === 'string' ? customer.route : (customer.route as any)?.name}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-medium text-emerald-600">₹{customer.greenPrice} / ₹{customer.orangePrice}</div>
                                </div>
                              </div>
                            </li>
                          ))}
                          {hasMoreCustomers && (
                            <li className="p-2 border-t">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-xs h-8"
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
                          No customers found matching "{customerSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="bg-gray-50 p-4 rounded-lg border text-sm space-y-2 mt-4 transition-all">
                    <h4 className="font-semibold text-gray-700 flex items-center mb-3">
                      <User className="h-4 w-4 mr-2" />
                      Customer Details
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div className="text-gray-600">Route:</div>
                      <div className="font-medium">{typeof selectedCustomer.route === 'string' ? selectedCustomer.route : (selectedCustomer.route as any)?.name}</div>
                      
                      <div className="text-gray-600">Pricing (Std/Prem):</div>
                      <div className="font-medium text-primary">₹{selectedCustomer.greenPrice} / ₹{selectedCustomer.orangePrice}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center text-sm text-gray-600 mt-2 pt-2 border-t">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium mr-2">Executive:</span> {selectedCustomer.salesExecutive}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedCustomer ? (
                  <>
                    {isDriverOrAdmin && (
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="salesExecutive">Sales Executive</Label>
                        <Select
                          value={formData.salesExecutive}
                          onValueChange={(val: string) => setFormData({ ...formData, salesExecutive: val })}
                        >
                          <SelectTrigger id="salesExecutive">
                            <SelectValue placeholder="Select Executive" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesUsers.map((u) => (
                              <SelectItem key={u.username} value={u.username}>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                  {u.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="vehicle">Delivery Vehicle</Label>
                      <Select value={formData.vehicle} onValueChange={(value: string) => setFormData({ ...formData, vehicle: value })} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLES.map((vehicle: string) => (
                            <SelectItem key={vehicle} value={vehicle}>
                              <div className="flex items-center">
                                <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                                {vehicle}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="standardQty" style={{ color: 'darkgreen' }}>Standard Qty</Label>
                        <div className="relative">
                          <Input
                            id="standardQty"
                            type="number"
                            min="0"
                            className="focus-visible:ring-1"
                            style={{ borderColor: 'darkgreen', color: 'darkgreen' }}
                            value={formData.standardQty === 0 ? '' : formData.standardQty}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, standardQty: parseFloat(e.target.value) || 0 })}
                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">₹{selectedCustomer.greenPrice}/unit • Total: ₹{totals.standardTotal.toFixed(2)}</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="premiumQty" style={{ color: 'darkorange' }}>Premium Qty</Label>
                        <div className="relative">
                          <Input
                            id="premiumQty"
                            type="number"
                            min="0"
                            className="focus-visible:ring-1"
                            style={{ borderColor: 'darkorange', color: 'darkorange' }}
                            value={formData.premiumQty === 0 ? '' : formData.premiumQty}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, premiumQty: parseFloat(e.target.value) || 0 })}
                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">₹{selectedCustomer.orangePrice}/unit • Total: ₹{totals.premiumTotal.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Grand Total</span>
                        <span className="text-2xl font-bold text-primary">₹{totals.total.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-right text-muted-foreground mt-1">Including all taxes</p>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <User className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Select a customer first</p>
                    <p className="text-sm text-gray-400 mt-1">Pricing details will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                {errorMessage}
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedCustomer || isSubmitting} className="min-w-[120px]">
                {isSubmitting ? 'Submitting...' : (editingOrder ? 'Update Order' : 'Submit Order')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
