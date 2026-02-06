import axios from 'axios';
import Cookies from 'js-cookie';
import type { Order } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Order message API functions
export const orderMessageApi = {
  create: (orderId: string, text: string) =>
    api.post<Order>(`/orders/${orderId}/messages`, { text }),

  edit: (orderId: string, messageId: string, text: string) =>
    api.patch<Order>(`/orders/${orderId}/messages/${messageId}`, { text }),

  delete: (orderId: string, messageId: string) =>
    api.delete<Order>(`/orders/${orderId}/messages/${messageId}`),

  updateStatus: (orderId: string, messageId: string, status: 'approved' | 'rejected') =>
    api.patch<Order>(`/orders/${orderId}/messages/${messageId}/status`, { status })
};

// Mock API for Order Billing Status
export const updateOrderBillingStatus = async (orderId: string, billed: boolean): Promise<void> => {
  // Simulating API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[Mock API] Updated order ${orderId} billing status to: ${billed}`);
      resolve();
    }, 500);
  });
};

export default api;
