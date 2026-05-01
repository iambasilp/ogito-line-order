import React, { createContext, useReducer, useContext } from 'react';
import type { Order } from '@/types';

export type Stock = {
  initialStock: number;
  currentStock: number;
};

interface OrdersState {
  orders: Order[];
  stock: Stock;
}

type OrdersAction = 
  | { type: 'SET_ORDERS'; payload: { orders: Order[], totalDeliveredQty?: number } }
  | { type: 'MARK_ORDER_DELIVERED'; payload: { orderId: string, newStatus: 'Pending' | 'Delivered' } }
  | { type: 'REVERT_ORDER_DELIVERED'; payload: { orderId: string, currentStatus: 'Pending' | 'Delivered', quantity: number } };

const initialState: OrdersState = {
  orders: [],
  stock: {
    initialStock: 500, // Mock initial stock as requested
    currentStock: 500,
  },
};

function calculateCurrentStock(orders: Order[], initialStock: number): number {
  let deducted = 0;
  orders.forEach(o => {
    if (o.deliveryStatus === 'Delivered' && !o.isCancelled) {
      deducted += (o.standardQty + o.premiumQty);
    }
  });
  return initialStock - deducted;
}

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SET_ORDERS': {
      const { orders: newOrders, totalDeliveredQty } = action.payload;
      
      let newCurrentStock = state.stock.currentStock;
      
      // ONLY update stock from totalDeliveredQty if it's provided.
      // We NEVER calculate stock from the 'newOrders' array here because 
      // it is paginated and would give incorrect partial results.
      if (totalDeliveredQty !== undefined) {
        newCurrentStock = state.stock.initialStock - totalDeliveredQty;
      }

      return {
        ...state,
        orders: newOrders,
        stock: {
          ...state.stock,
          currentStock: newCurrentStock
        }
      };
    }
    case 'MARK_ORDER_DELIVERED': {
      const { orderId, newStatus } = action.payload;
      const order = state.orders.find(o => o._id === orderId);

      if (!order) return state;

      // Calculate quantity to add or remove from stock
      const quantity = order.standardQty + order.premiumQty;
      
      let newCurrentStock = state.stock.currentStock;
      
      // If marking as delivered, deduct stock
      if (newStatus === 'Delivered' && order.deliveryStatus !== 'Delivered') {
        newCurrentStock -= quantity;
      } 
      // If marking as pending (undo), add stock back
      else if (newStatus === 'Pending' && order.deliveryStatus === 'Delivered') {
        newCurrentStock += quantity;
      }

      return {
        ...state,
        stock: {
          ...state.stock,
          currentStock: newCurrentStock
        },
        orders: state.orders.map(o => 
          o._id === orderId ? { ...o, deliveryStatus: newStatus } : o
        )
      };
    }
    case 'REVERT_ORDER_DELIVERED': {
      const { orderId, currentStatus, quantity } = action.payload;
      let newCurrentStock = state.stock.currentStock;
      
      if (currentStatus === 'Pending') {
        // We tried to deliver but failed, so add back the stock
        newCurrentStock += quantity;
      } else {
        // We tried to undo delivery but failed, so deduct stock again
        newCurrentStock -= quantity;
      }

      return {
        ...state,
        stock: {
          ...state.stock,
          currentStock: newCurrentStock
        },
        orders: state.orders.map(o => 
          o._id === orderId ? { ...o, deliveryStatus: currentStatus } : o
        )
      };
    }
    default:
      return state;
  }
}

const OrdersContext = createContext<{
  state: OrdersState;
  dispatch: React.Dispatch<OrdersAction>;
} | null>(null);

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  return (
    <OrdersContext.Provider value={{ state, dispatch }}>
      {children}
    </OrdersContext.Provider>
  );
};
