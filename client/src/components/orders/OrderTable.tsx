import React from 'react';
import { Button } from '@/components/ui/button';
import { OrderMessageIcon } from '@/components/OrderMessageIcon';
import type { Order } from '@/types';
import { ExpandableText, CopyButton } from '@/pages/Orders';

interface OrderTableProps {
  filteredOrders: Order[];
  visibleColumns: Record<string, boolean>;
  orderPage: number;
  orderLimit: number;
  isAdmin: boolean;
  isDriver: boolean;
  isDriverOrAdmin: boolean;
  resolveName: (username: string) => string;
  handleToggleBillingStatus: (order: Order) => void;
  handleToggleCancelled: (orderId: string) => void;
  handleToggleDeliveryStatus: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleDeleteOrder: (orderId: string) => void;
  fetchOrders: () => void;
}

const OrderTable: React.FC<OrderTableProps> = ({
  filteredOrders,
  visibleColumns,
  orderPage,
  orderLimit,
  isAdmin,
  isDriver,
  isDriverOrAdmin,
  resolveName,
  handleToggleBillingStatus,
  handleToggleCancelled,
  handleToggleDeliveryStatus,
  handleEditOrder,
  handleDeleteOrder,
  fetchOrders
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200 [&_th]:border [&_th]:border-gray-200 [&_td]:border [&_td]:border-gray-200">
        <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-medium">
          <tr>
            {visibleColumns['sno'] && <th className="text-center px-1.5 py-2.5 w-[45px]">S.No</th>}
            {visibleColumns['date'] && <th className="text-left px-2 py-2.5 w-[85px]">Date</th>}
            {visibleColumns['status'] && <th className="text-center px-1 py-2.5 w-[75px]">Status</th>}
            {visibleColumns['messages'] && <th className="px-1 py-2.5 w-[40px] text-center"></th>}
            {visibleColumns['customer'] && <th className="text-left px-2 py-2.5 min-w-[140px]">Customer</th>}
            {visibleColumns['standardQty'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkgreen' }}>Std Qty</th>}
            {visibleColumns['standardPrice'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkgray' }}>Std ₹</th>}
            {visibleColumns['premiumQty'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkorange' }}>Prem Qty</th>}
            {visibleColumns['premiumPrice'] && <th className="text-right px-2 py-2.5 w-[65px]" style={{ color: 'darkgray' }}>Prem ₹</th>}
            {visibleColumns['route'] && <th className="text-left px-2 py-2.5 w-[100px]">Route</th>}
            {visibleColumns['salesExecutive'] && <th className="text-left px-2 py-2.5 w-[100px]">Exec</th>}
            {visibleColumns['vehicle'] && <th className="text-left px-2 py-2.5 w-[90px]">Vehicle</th>}
            {visibleColumns['phone'] && <th className="text-left px-2 py-2.5 w-[100px]">Phone</th>}
            {visibleColumns['delivery'] && <th className="text-center px-2 py-2.5 w-[85px]">Delivery</th>}
            {visibleColumns['total'] && <th className="text-right px-2 py-2.5 w-[90px]">Total</th>}

            {isDriverOrAdmin && visibleColumns['actions'] && <th className="text-right px-2 py-2.5 w-[70px]">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, index) => (
              <tr key={order._id} className="hover:bg-gray-50/80 transition-colors text-[13px] tracking-tight">
                {visibleColumns['sno'] && (
                  <td className="px-1.5 py-2 text-center text-gray-500 font-medium">
                    {(orderPage - 1) * orderLimit + index + 1}
                  </td>
                )}
                {visibleColumns['date'] && (
                  <td className="px-2 py-2 whitespace-nowrap text-gray-600">
                    <div className="flex flex-col leading-none">
                      <span className="font-semibold text-[12px]">
                        {new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                      </span>
                      {order.deliveryStatus === 'Delivered' && order.deliveredAt && (
                        <span className="text-[9px] text-emerald-600 font-bold mt-1.5 pt-1.5 border-t border-gray-100 uppercase tracking-tighter">
                          Del: {new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns['status'] && (
                  <td className="px-1 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBillingStatus(order);
                        }}
                        disabled={!isAdmin}
                        className={`
                      flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors uppercase tracking-tight
                      ${(order.billed ?? false)
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}
                      ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                      >
                        {(order.billed ?? false) ? 'Billed' : 'Pending'}
                      </button>
                      {order.deliveryStatus !== 'Delivered' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCancelled(order._id);
                          }}
                          disabled={!isDriverOrAdmin}
                          className={`
                        flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-colors uppercase tracking-tight
                        ${(order.isCancelled ?? false)
                              ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                        ${!isDriverOrAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                        >
                          {(order.isCancelled ?? false) ? 'Cancelled' : 'Cancel'}
                        </button>
                      )}
                      {(order.isUpdated && !(order.billed ?? false) && !(order.isCancelled ?? false)) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          Updated
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns['messages'] && (
                  <td className="px-1 py-2 text-center">
                    <OrderMessageIcon
                      orderId={order._id}
                      orderCustomer={order.customerName}
                      messages={order.orderMessages || []}
                      onUpdate={fetchOrders}
                    />
                  </td>
                )}
                {visibleColumns['customer'] && (
                  <td className="px-2 py-2 font-medium text-gray-900 w-[140px] max-w-[140px] whitespace-normal break-words leading-tight text-[12px]">
                    {order.customerName}
                  </td>
                )}
                {visibleColumns['standardQty'] && <td className="px-2 py-2 text-right font-bold text-[15px] font-mono tabular-nums text-emerald-600">{order.standardQty}</td>}
                {visibleColumns['standardPrice'] && <td className="px-2 py-2 text-right text-gray-500 text-xs font-mono tabular-nums">₹{order.greenPrice}</td>}
                {visibleColumns['premiumQty'] && <td className="px-2 py-2 text-right font-bold text-[15px] font-mono tabular-nums text-amber-600">{order.premiumQty}</td>}
                {visibleColumns['premiumPrice'] && <td className="px-2 py-2 text-right text-gray-500 text-xs font-mono tabular-nums">₹{order.orangePrice}</td>}
                {visibleColumns['route'] && <td className="px-2 py-2 text-gray-600 truncate max-w-[100px]" title={order.route}>{order.route}</td>}
                {visibleColumns['salesExecutive'] && (
                  <td className="px-2 py-2 text-gray-600 w-[100px] truncate">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-gray-50 flex items-center justify-center text-[8px] text-gray-400 font-bold border">
                        {order.salesExecutive ? order.salesExecutive.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="truncate max-w-[80px] text-[12px]" title={resolveName(order.salesExecutive)}>
                        {resolveName(order.salesExecutive)}
                      </span>
                    </div>
                  </td>
                )}
                {visibleColumns['vehicle'] && (
                  <td className="px-2 py-2 text-gray-600 w-[90px] max-w-[90px] text-[12px]">
                    <ExpandableText text={order.vehicle} />
                  </td>
                )}
                {visibleColumns['phone'] && (
                  <td className="px-2 py-2 text-gray-600 text-[12px]">
                    {order.customerPhone ? (
                      <div className="flex items-center gap-1">
                        <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600">
                          {order.customerPhone}
                        </a>
                        <CopyButton text={order.customerPhone} />
                      </div>
                    ) : '-'}
                  </td>
                )}

                {visibleColumns['delivery'] && (
                  <td className="px-1.5 py-2 text-center">
                    {order.deliveryStatus === 'Delivered' ? (
                      isDriver ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleDeliveryStatus(order); }}
                          disabled={order.isCancelled}
                          className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-tight border shadow-sm transition-all
                            ${order.isCancelled
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer active:scale-95'
                            }`}
                        >
                          {(order.isCancelled ?? false) ? 'Blocked' : 'Mark Del'}
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-tight border bg-emerald-600 text-white border-emerald-700">
                          DELIVERED
                        </span>
                      )
                    ) : isDriver ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleDeliveryStatus(order); }}
                        disabled={order.isCancelled}
                        className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-tight border shadow-sm transition-all
                            ${order.isCancelled
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer active:scale-95'
                          }`}
                      >
                        {(order.isCancelled ?? false) ? 'Blocked' : 'Mark Del'}
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-tight border bg-gray-50 text-gray-400 border-gray-100">
                        {(order.isCancelled ?? false) ? 'Blocked' : 'Pending'}
                      </span>
                    )}
                  </td>
                )}

                {visibleColumns['total'] && (
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-col items-end leading-tight">
                      <span className="font-bold text-gray-900 text-[14px] font-mono tabular-nums">₹{order.total.toFixed(0)}</span>
                    </div>
                  </td>
                )}



                {isDriverOrAdmin && visibleColumns['actions'] && (
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} className="flex items-center gap-1 h-7 px-1.5 bg-white hover:bg-gray-50 border-gray-200 rounded shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil text-gray-500"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Edit</span>
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order._id)} className="h-7 w-7 p-0 hover:bg-red-50 rounded-full">
                          <div className="sr-only">Delete</div>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 h-4 w-4 text-red-500"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={Object.entries(visibleColumns).filter(([id, visible]) => visible && (id !== 'actions' || isDriverOrAdmin)).length + 1} className="px-4 py-12 text-center text-gray-500">
                No orders found matching your filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
