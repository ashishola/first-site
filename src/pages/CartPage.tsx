import React, { useEffect, useState } from 'react';
import { Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { Coupon, PaymentSettings } from '../types.ts';

export function CartPage() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    cartMrpTotal,
    updateCartQty,
    removeFromCart,
    navigate,
    showToast,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discount: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState('');
  const [validating, setValidating] = useState(false);
  const [shippingConfig, setShippingConfig] = useState<{
    freeShippingThreshold: number;
    standardShippingFee: number;
  }>({ freeShippingThreshold: 499, standardShippingFee: 49 });

  useEffect(() => {
    apiRequest<{ paymentSettings: PaymentSettings }>('/api/payments/settings')
      .then((res) => {
        setShippingConfig({
          freeShippingThreshold: res.paymentSettings.freeShippingThreshold,
          standardShippingFee: res.paymentSettings.standardShippingFee,
        });
      })
      .catch(() => {});
  }, []);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;
    setValidating(true);
    try {
      const res = await apiRequest<{ coupon: Coupon; discount: number }>(
        '/api/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: couponInput.trim(), subtotal: cartSubtotal }),
        }
      );
      setAppliedCoupon(res);
      showToast(`Coupon ${res.coupon.code} applied (-${formatINR(res.discount)})`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError((err as Error).message);
    } finally {
      setValidating(false);
    }
  };

  const discount = appliedCoupon?.discount || 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discount);
  const shippingFee =
    cart.length === 0 ||
    shippingConfig.freeShippingThreshold <= 0 ||
    discountedSubtotal >= shippingConfig.freeShippingThreshold
      ? 0
      : shippingConfig.standardShippingFee;
  const finalTotal = discountedSubtotal + shippingFee;
  const totalSavings = Math.max(0, cartMrpTotal - cartSubtotal) + discount;

  return (
    <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-6">
      {cart.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2874F0] flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Your Shopping Cart is Empty
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Add electronics, fashion, or home essentials to your cart to proceed.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="mt-6 px-6 py-2.5 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Shop Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Cart Items */}
          <section className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h1 className="font-display text-xl font-bold text-slate-900">
                My Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </h1>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="text-xs sm:text-sm font-semibold text-[#2874F0] hover:underline"
              >
                Continue Shopping
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.map((item) => {
                const p = item.product;
                if (!p) return null;
                return (
                  <div
                    key={`${item.productId}_${item.variant || ''}`}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/product/${p.slug}`)}
                      className="w-28 h-24 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {p.brand}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${p.slug}`)}
                        className="text-base font-semibold text-slate-900 hover:text-[#2874F0] text-left mt-0.5"
                      >
                        {p.name}
                      </button>
                      {item.variant && (
                        <p className="text-xs text-slate-500 mt-1">Option: {item.variant}</p>
                      )}

                      <div className="mt-2.5 flex items-baseline gap-2.5">
                        <span className="text-lg font-bold font-mono-num text-slate-900">
                          {formatINR(p.price * item.quantity)}
                        </span>
                        {p.mrp > p.price && (
                          <>
                            <span className="text-xs font-mono-num text-slate-400 line-through">
                              {formatINR(p.mrp * item.quantity)}
                            </span>
                            <span className="text-xs font-semibold text-emerald-700">
                              {p.discountPercent}% off
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-4">
                        <div className="inline-flex items-center border border-slate-300 rounded-md">
                          <button
                            type="button"
                            onClick={() =>
                              void updateCartQty(item.productId, item.quantity - 1, item.variant)
                            }
                            aria-label="Decrease quantity"
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold font-mono-num">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void updateCartQty(item.productId, item.quantity + 1, item.variant)
                            }
                            disabled={item.quantity >= p.stock}
                            aria-label="Increase quantity"
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => void removeFromCart(item.productId, item.variant)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Order Summary */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-32">
            {/* Coupon Box */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
                <Tag className="w-4 h-4 text-[#2874F0]" />
                <span>Apply Coupon Code</span>
              </div>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="VELO10, FLASH20, WELCOME200"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-md uppercase font-mono-num focus:outline-none focus:border-[#2874F0]"
                />
                <button
                  type="submit"
                  disabled={validating}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Apply
                </button>
              </form>
              {couponError && (
                <p className="text-xs text-rose-600 mt-2">{couponError}</p>
              )}
              {appliedCoupon && (
                <p className="text-xs text-emerald-700 font-medium mt-2">
                  Code {appliedCoupon.coupon.code} applied! Saved {formatINR(discount)}.
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100">
                Price Details
              </h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-700">
                  <span>Price ({cartCount} items)</span>
                  <span className="font-mono-num">{formatINR(cartMrpTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Catalog Discount</span>
                  <span className="font-mono-num">-{formatINR(cartMrpTotal - cartSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({appliedCoupon?.coupon.code})</span>
                    <span className="font-mono-num">-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Delivery Charges</span>
                  <span className="font-mono-num text-emerald-700">
                    {shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="font-mono-num">{formatINR(finalTotal)}</span>
                </div>
              </div>

              {totalSavings > 0 && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  You will save {formatINR(totalSavings)} on this order.
                </p>
              )}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    appliedCoupon
                      ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.coupon.code)}`
                      : '/checkout'
                  )
                }
                className="w-full py-3 px-4 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white font-bold text-sm transition-colors"
              >
                PLACE ORDER
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#2874F0] shrink-0" />
                <span>Safe and secure payments. 100% authentic products.</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
