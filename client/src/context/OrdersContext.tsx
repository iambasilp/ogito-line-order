import React, { createContext, useReducer, useContext } from 'react';
import type { Order } from '@/types';

export type StockInfo = {
  initial: number;
  delivered: number; // tracks how many units have been marked as delivered
};

interface OrdersState {
  orders: Order[];
  standardStock: StockInfo;
  premiumStock: StockInfo;
}

type OrdersAction = 
  | { 
      type: 'SET_ORDERS'; 
      payload: { 
        orders: Order[], 
        totalStandardQty?: number,
        totalPremiumQty?: number,
        totalDeliveredStandardQty?: number,
        totalDeliveredPremiumQty?: number 
      } 
    }
  | { type: 'MARK_ORDER_DELIVERED'; payload: { orderId: string, newStatus: 'Pending' | 'Delivered' } }
  | { 
      type: 'REVERT_ORDER_DELIVERED'; 
      payload: { 
        orderId: string, 
        currentStatus: 'Pending' | 'Delivered', 
        standardQty: number,
        premiumQty: number 
      } 
    }
  | { type: 'CANCEL_ORDER'; payload: { orderId: string, isCancelled: boolean } };

const initialState: OrdersState = {
  orders: [],
  standardStock: {
    initial: 0,
    delivered: 0,
  },
  premiumStock: {
    initial: 0,
    delivered: 0,
  },
};

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SET_ORDERS': {
      const { orders: newOrders, totalStandardQty, totalPremiumQty, totalDeliveredStandardQty, totalDeliveredPremiumQty } = action.payload;
      
      const newStandardInitial = totalStandardQty !== undefined ? totalStandardQty : state.standardStock.initial;
      const newPremiumInitial  = totalPremiumQty  !== undefined ? totalPremiumQty  : state.premiumStock.initial;

      const newStandardDelivered = totalDeliveredStandardQty !== undefined
        ? totalDeliveredStandardQty
        : state.standardStock.delivered;

      const newPremiumDelivered = totalDeliveredPremiumQty !== undefined
        ? totalDeliveredPremiumQty
        : state.premiumStock.delivered;

      return {
        ...state,
        orders: newOrders,
        standardStock: { initial: newStandardInitial, delivered: newStandardDelivered },
        premiumStock:  { initial: newPremiumInitial,  delivered: newPremiumDelivered }
      };
    }
    case 'MARK_ORDER_DELIVERED': {
      const { orderId, newStatus } = action.payload;
      const order = state.orders.find(o => o._id === orderId);

      if (!order) return state;

      const stdQty = order.standardQty || 0;
      const premQty = order.premiumQty || 0;
      
      let newStandardDelivered = state.standardStock.delivered;
      let newPremiumDelivered = state.premiumStock.delivered;
      
      if (newStatus === 'Delivered' && order.deliveryStatus !== 'Delivered') {
        newStandardDelivered += stdQty;
        newPremiumDelivered += premQty;
      } 
      else if (newStatus === 'Pending' && order.deliveryStatus === 'Delivered') {
        newStandardDelivered -= stdQty;
        newPremiumDelivered -= premQty;
      }

      return {
        ...state,
        standardStock: { ...state.standardStock, delivered: newStandardDelivered },
        premiumStock: { ...state.premiumStock, delivered: newPremiumDelivered },
        orders: state.orders.map(o => 
          o._id === orderId ? { ...o, deliveryStatus: newStatus } : o
        )
      };
    }
    case 'REVERT_ORDER_DELIVERED': {
      const { orderId, currentStatus, standardQty, premiumQty } = action.payload;
      let newStandardDelivered = state.standardStock.delivered;
      let newPremiumDelivered = state.premiumStock.delivered;
      
      if (currentStatus === 'Pending') {
        // We tried to mark as delivered but failed, so remove from delivered count
        newStandardDelivered -= standardQty;
        newPremiumDelivered -= premiumQty;
      } else {
        // We tried to undo delivery but failed, so add back to delivered count
        newStandardDelivered += standardQty;
        newPremiumDelivered += premiumQty;
      }

      return {
        ...state,
        standardStock: { ...state.standardStock, delivered: newStandardDelivered },
        premiumStock: { ...state.premiumStock, delivered: newPremiumDelivered },
        orders: state.orders.map(o => 
          o._id === orderId ? { ...o, deliveryStatus: currentStatus } : o
        )
      };
    }
    case 'CANCEL_ORDER': {
      const { orderId, isCancelled } = action.payload;
      const order = state.orders.find(o => o._id === orderId);
      if (!order) return state;

      const stdQty = order.standardQty || 0;
      const premQty = order.premiumQty || 0;

      let newStandardInitial = state.standardStock.initial;
      let newPremiumInitial  = state.premiumStock.initial;

      if (isCancelled) {
        // Just cancelled — remove from assigned totals
        newStandardInitial -= stdQty;
        newPremiumInitial  -= premQty;
      } else {
        // Restored — add back to assigned totals
        newStandardInitial += stdQty;
        newPremiumInitial  += premQty;
      }

      return {
        ...state,
        standardStock: { ...state.standardStock, initial: newStandardInitial },
        premiumStock:  { ...state.premiumStock,  initial: newPremiumInitial },
        orders: state.orders.map(o => 
          o._id === orderId ? { ...o, isCancelled } : o
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
