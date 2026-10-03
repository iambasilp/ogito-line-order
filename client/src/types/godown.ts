export interface Godown {
  _id: string;
  name: string;
}

export interface GodownTransfer {
  _id: string;
  date: string;
  vehicleNumber: string;
  driverName?: string;
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
