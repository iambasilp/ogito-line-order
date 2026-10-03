export interface GodownTransfer {
  _id: string;
  date: string;
  vehicleNumber: string;
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
