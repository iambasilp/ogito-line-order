export interface Godown {
  _id: string;
  name: string;
  location?: string;
}

export interface GodownTransfer {
  _id: string;
  date: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  locationLink?: string;
  source: string;
  destination: string;
  product: 'Standard' | 'Premium' | 'Alhaj';
  quantity: number;
  dispatchTime: string;
  deliveryTime?: string;
  status: 'Dispatched' | 'Delivered' | 'Cancelled';
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
}
