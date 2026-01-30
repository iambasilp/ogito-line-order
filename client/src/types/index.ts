export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface Customer {
  _id: string;
  name: string;
  route: string;
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
}

export const VEHICLES = [
  'A - (Ponnani / Valancheri)',
  'B - (Thirur / Cheruppalasery)',
  'C - (Nilambur / Areekod)',
  'D - (Karuvarakundu / Calicut)',
  'E - (Pandikad+Mannarkad / Malappuram+Chelary)'
] as const;
