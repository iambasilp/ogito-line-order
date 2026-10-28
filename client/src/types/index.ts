export interface User {
  id: string;
  username: string;
  name?: string;
  role: 'admin' | 'user' | 'driver' | 'ceo';
  profileImage?: string;
}

export interface IOrderMessage {
  _id: string;
  text: string;
  role: 'admin' | 'user' | 'driver' | 'ceo';
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
  customerType?: "Distributor" | "Wholesaler" | "Modern Trade" | "Retailer" | "HORECA";
  customerStatus?: "active" | "inactive";
  customerSeason?: "seasonal" | "offSeason" | "both";
  greenPrice: number;
  orangePrice: number;
  preOctGreenPrice?: number;
  preOctOrangePrice?: number;
  phone: string;
  locationUrl?: string;
  customerSince?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  _id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  locationUrl?: string;
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
  deliveredAt?: string;
  orderMessages?: IOrderMessage[];
  deliverySequence?: number;
}

export const VEHICLES = [
  'A - (Ponnani / Valancheri)',
  'B - (Thirur / Cheruppalasery)',
  'C - (Nilambur / Areekod)',
  'D - (Karuvarakundu / Calicut)',
  'E - (Pandikad+Mannarkad / Malappuram+Chelary)'
] as const;

export const formatVehicleName = (vehicle: string): string => {
  if (vehicle === 'E - (Pandikad+Mannarkad / Malappuram+Chelary)') {
    return 'E - (PDK+MKD / MLP+CHE)';
  }
  return vehicle;
};

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

export interface MarketStudyCatalogueItem {
  _id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketStudyObservation {
  _id?: string;
  catalogueProductId?: string;
  catalogueProductName: string;
  brandName: string;
  variant?: string; // Flavour / label / variant
  weight?: string;
  packagingType?: string;
  landingPrice: number;
  sellingPrice: number;
  mrp: number;
  promotionNotes?: string;
  notes?: string;
  createdAt?: string;
}

export interface MarketStudySurvey {
  _id: string;
  customerId?: string;
  customerName: string;
  customerType?: string;
  marketLocation?: string;
  routeId?: string;
  surveyDate: string;
  surveyorId?: string;
  collectedBy: string;
  notes?: string;
  status: 'draft' | 'completed';
  observations: MarketStudyObservation[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketStudyObservationView {
  _id: string;
  surveyId: string;
  customerId?: string;
  customerName: string;
  customerType: string;
  marketLocation: string;
  routeId?: string;
  surveyDate: string;
  collectedBy: string;
  surveyNotes?: string;
  surveyStatus?: 'draft' | 'completed';
  catalogueProductId?: string;
  catalogueProductName: string;
  brandName: string;
  variant: string;
  weight: string;
  packagingType: string;
  landingPrice: number;
  sellingPrice: number;
  mrp: number;
  retailerProfit: number;
  marginPercent: number;
  mrpDiscount: number;
  mrpDiscountPercent: number;
  promotionNotes?: string;
  notes?: string;
  createdAt: string;
}

// Backwards-compatible interface
export interface MarketStudy {
  _id: string;
  productName: string;
  labels?: string[];
  customerName: string;
  customerType?: string;
  collectedBy: string;
  brandName: string;
  weight?: string;
  packagingType?: string;
  landingPrice: number;
  sellingPrice: number;
  mrp: number;
  marketLocation?: string;
  notes?: string;
  collectionDate?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}


