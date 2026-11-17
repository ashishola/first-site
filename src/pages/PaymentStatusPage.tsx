import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, RotateCcw, XCircle } from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { Order } from '../types.ts';

interface PaymentStatusPageProps {
  mode: 'success' | 'failure';
  orderId?: string;
}

export function PaymentStatusPage({ mode, orderId }: PaymentStatusPageProps) {
  const { navigate, currentPath } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(mode === 'success' && Boolean(orderId));

  const searchParams = new URLSearchParams(currentPath.split('?')[1] || '');
  const failureReason =
    searchParams.get('reason') ||
    'The payment could not be authorized by your bank or payment provider.';

  useEffect(() => {
    if (mode === 'success' && orderId) {
      apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}`)
        .then((res) => setOrder(res.order))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [mode, orderId]);

  if (mode === 'failure') {
    return (
      <main className="max-w-xl mx-auto px-4 py-14">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-9 h-9" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Payment Failed
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{failureReason}</p>
          <p className="text-xs text-slate-400 mt-2">
            No amount has been deducted. If debited, it will be auto-refunded within 3–5 business days.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="px-5 py-2.5 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Payment</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-md border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Return Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="text-center pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Order Confirmed
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {order
              ? `Order ${order.orderNumber} has been placed and is being prepared for shipment.`
              : 'Your order has been placed successfully.'}
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading receipt...</div>
        ) : order ? (
          <div className="py-6 space-y-5 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Order No</p>
                <p className="font-mono-num font-bold text-slate-900 mt-0.5">
                  {order.orderNumber}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Payment</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {order.paymentMethod} · {order.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Status</p>
                <p className="font-semibold text-emerald-700 mt-0.5">{order.status}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400">Total</p>
                <p className="font-mono-num font-bold text-slate-900 mt-0.5">
                  {formatINR(order.total)}
                </p>
              </div>
            </div>

            {(order.razorpayPaymentId || order.razorpayOrderId) && (
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#172337]">
                  Razorpay Transaction Verified
                </span>
                <div className="flex flex-wrap gap-3 font-mono-num text-slate-700">
                  {order.razorpayPaymentId && (
                    <span>Pay ID: {order.razorpayPaymentId}</span>
                  )}
                  {order.razorpayOrderId && (
                    <span>RZP Order: {order.razorpayOrderId}</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Items Ordered
              </h2>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {order.items.map((item) => (
                  <div
                    key={`${item.productId}_${item.variant || ''}`}
                    className="p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          Qty {item.quantity} {item.variant ? `· ${item.variant}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-900 shrink-0">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Shipping to:</span>{' '}
              {order.shippingAddress.fullName}, {order.shippingAddress.line1},{' '}
              {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
              {order.shippingAddress.postalCode}
            </div>
          </div>
        ) : null}

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate('/account?tab=orders')}
            className="px-5 py-2.5 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Track My Order</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 rounded-md border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </main>
  );
}
