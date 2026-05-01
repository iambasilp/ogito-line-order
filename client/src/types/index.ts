export interface User {
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'user' | 'driver';
}

export interface IOrderMessage {
  _id: string;
  text: string;
  role: 'admin' | 'user' | 'driver';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
  createdByUsername: string;
}

export interface Route {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  route: string | { _id: string; name: string };
  salesExecutive: string;
  greenPrice: number;
  orangePrice: number;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  _id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  route: string;
  salesExecutive: string;
  vehicle: string;
  standardQty: number;
  premiumQty: number;
  greenPrice: number;
  orangePrice: number;
  standardTotal: number;
  premiumTotal: number;
  total: number;
  createdBy: string;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
  billed?: boolean;
  isUpdated?: boolean;
  isCancelled?: boolean;
  deliveryStatus?: 'Pending' | 'Delivered';
  orderMessages?: IOrderMessage[];
}

export const VEHICLES = [
  'A - (Ponnani / Valancheri)',
  'B - (Thirur / Cheruppalasery)',
  'C - (Nilambur / Areekod)',
  'D - (Karuvarakundu / Calicut)',
  'E - (Pandikad+Mannarkad / Malappuram+Chelary)'
] as const;

export interface PaginationResponse<T> {
  customers: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerCache {
  data: Customer[];
  timestamp: number;
  route: string;
}

export type PaymentType = 'Cash' | 'UPI / PhonePe / GPay' | 'Check' | 'Other';

export interface ReceiptRecord {
  id?: string; // MongoDB _id
  _id?: string; // MongoDB _id
  orderId?: string;
  customerId?: string;
  isCustom?: boolean;
  orderCustomer: string;
  orderRoute: string;
  orderTotal?: number;
  amount: number;
  paymentType: PaymentType;
  transactionRef?: string;
  collectedBy: string;
  collectedAt: string | Date;
}
