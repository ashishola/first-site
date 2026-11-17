import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    cartMrpTotal,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQty,
    removeFromCart,
    navigate,
  } = useStore();

  if (!cartDrawerOpen) return null;

  const freeShippingThreshold = 499;
  const shippingFee = cartSubtotal === 0 || cartSubtotal >= freeShippingThreshold ? 0 : 49;
  const totalSavings = Math.max(0, cartMrpTotal - cartSubtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[1px]">
      <div
        className="fixed inset-0"
        onClick={() => setCartDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#2874F0]" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Shopping Cart ({cartCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close cart drawer"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        {cart.length > 0 && (
          <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-xs text-slate-700">
            {cartSubtotal >= freeShippingThreshold ? (
              <span className="font-medium text-emerald-700">
                Your order qualifies for FREE standard delivery.
              </span>
            ) : (
              <span>
                Add{' '}
                <strong className="font-mono-num text-[#2874F0]">
                  {formatINR(freeShippingThreshold - cartSubtotal)}
                </strong>{' '}
                more for FREE delivery.
              </span>
            )}
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <p className="font-display text-base font-semibold text-slate-900">
                Your cart is empty
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Explore flagship tech, fashion, and home essentials to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/shop');
                }}
                className="mt-5 px-5 py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Explore Products
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const p = item.product;
              if (!p) return null;
              return (
                <div key={`${item.productId}_${item.variant || ''}`} className="py-4 flex gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCartDrawerOpen(false);
                      navigate(`/product/${p.slug}`);
                    }}
                    className="w-20 h-20 rounded-md bg-slate-100 overflow-hidden shrink-0"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCartDrawerOpen(false);
                        navigate(`/product/${p.slug}`);
                      }}
                      className="text-sm font-semibold text-slate-900 hover:text-[#2874F0] text-left line-clamp-2"
                    >
                      {p.name}
                    </button>
                    {item.variant && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.variant}</p>
                    )}
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-sm font-bold font-mono-num text-slate-900">
                        {formatINR(p.price * item.quantity)}
                      </span>
                      {p.mrp > p.price && (
                        <span className="text-xs font-mono-num text-slate-400 line-through">
                          {formatINR(p.mrp * item.quantity)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center border border-slate-200 rounded-md">
                        <button
                          type="button"
                          onClick={() =>
                            void updateCartQty(item.productId, item.quantity - 1, item.variant)
                          }
                          aria-label="Decrease quantity"
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold font-mono-num">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void updateCartQty(item.productId, item.quantity + 1, item.variant)
                          }
                          disabled={item.quantity >= p.stock}
                          aria-label="Increase quantity"
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeFromCart(item.productId, item.variant)}
                        aria-label="Remove item"
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono-num font-medium text-slate-900">
                  {formatINR(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span className="font-mono-num font-medium text-emerald-700">
                  {shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}
                </span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>Total Product Savings</span>
                  <span className="font-mono-num">-{formatINR(totalSavings)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                <span>Estimated Total</span>
                <span className="font-mono-num">{formatINR(cartSubtotal + shippingFee)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/cart');
                }}
                className="py-2.5 px-4 rounded-md border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/checkout');
                }}
                className="py-2.5 px-4 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white text-sm font-semibold transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
