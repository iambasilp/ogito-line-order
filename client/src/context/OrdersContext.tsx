import React, { createContext, useReducer, useContext } from 'react';
import type { Order } from '@/types';

export type StockInfo = {
  initial: number;
  current: number;
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
    };

const initialState: OrdersState = {
  orders: [],
  standardStock: {
    initial: 0,
    current: 0,
  },
  premiumStock: {
    initial: 0,
    current: 0,
  },
};

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SET_ORDERS': {
      const { orders: newOrders, totalStandardQty, totalPremiumQty, totalDeliveredStandardQty, totalDeliveredPremiumQty } = action.payload;
      
      // initial = total assigned qty (from server summary)
      // current = total assigned - total delivered = qty still to deliver
      const newStandardInitial = totalStandardQty !== undefined ? totalStandardQty : state.standardStock.initial;
      const newPremiumInitial  = totalPremiumQty  !== undefined ? totalPremiumQty  : state.premiumStock.initial;

      const newStandardCurrent = totalDeliveredStandardQty !== undefined
        ? newStandardInitial - totalDeliveredStandardQty
        : state.standardStock.current;

      const newPremiumCurrent = totalDeliveredPremiumQty !== undefined
        ? newPremiumInitial - totalDeliveredPremiumQty
        : state.premiumStock.current;

      return {
        ...state,
        orders: newOrders,
        standardStock: { initial: newStandardInitial, current: newStandardCurrent },
        premiumStock:  { initial: newPremiumInitial,  current: newPremiumCurrent }
      };
    }
    case 'MARK_ORDER_DELIVERED': {
      const { orderId, newStatus } = action.payload;
      const order = state.orders.find(o => o._id === orderId);

      if (!order) return state;

      const stdQty = order.standardQty || 0;
      const premQty = order.premiumQty || 0;
      
      let newStandardCurrent = state.standardStock.current;
      let newPremiumCurrent = state.premiumStock.current;
      
      // If marking as delivered, deduct stock
      if (newStatus === 'Delivered' && order.deliveryStatus !== 'Delivered') {
        newStandardCurrent -= stdQty;
        newPremiumCurrent -= premQty;
      } 
      // If marking as pending (undo), add stock back
      else if (newStatus === 'Pending' && order.deliveryStatus === 'Delivered') {
        newStandardCurrent += stdQty;
        newPremiumCurrent += premQty;
      }

      return {
        ...state,
        standardStock: { ...state.standardStock, current: newStandardCurrent },
        premiumStock: { ...state.premiumStock, current: newPremiumCurrent },
        orders: state.orders.map(o => 
          o._id === orderId ? { ...o, deliveryStatus: newStatus } : o
        )
      };
    }
    case 'REVERT_ORDER_DELIVERED': {
      const { orderId, currentStatus, standardQty, premiumQty } = action.payload;
      let newStandardCurrent = state.standardStock.current;
      let newPremiumCurrent = state.premiumStock.current;
      
      if (currentStatus === 'Pending') {
        // We tried to deliver but failed, so add back the stock
        newStandardCurrent += standardQty;
        newPremiumCurrent += premiumQty;
      } else {
        // We tried to undo delivery but failed, so deduct stock again
        newStandardCurrent -= standardQty;
        newPremiumCurrent -= premiumQty;
      }

      return {
        ...state,
        standardStock: { ...state.standardStock, current: newStandardCurrent },
        premiumStock: { ...state.premiumStock, current: newPremiumCurrent },
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
