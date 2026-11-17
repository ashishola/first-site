import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Smartphone,
  Tag,
} from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { Address, Coupon, Order, PaymentMethod, PaymentSettings } from '../types.ts';

export function CheckoutPage() {
  const {
    user,
    openAuthModal,
    refreshUser,
    cart,
    cartCount,
    cartSubtotal,
    clearCartLocal,
    navigate,
    currentPath,
    showToast,
  } = useStore();

  const searchParams = new URLSearchParams(currentPath.split('?')[1] || '');
  const initialCoupon = searchParams.get('coupon') || '';

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    label: 'Home' as 'Home' | 'Work' | 'Other',
  });

  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    coupon: Coupon;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('09/29');
  const [cardCvv, setCardCvv] = useState('842');

  const [placingOrder, setPlacingOrder] = useState(false);
  const [razorpayModal, setRazorpayModal] = useState<{
    order: Order;
    razorpayOrderId: string;
    keyId: string;
  } | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    apiRequest<{ paymentSettings: PaymentSettings }>('/api/payments/settings')
      .then((res) => {
        setPaymentSettings(res.paymentSettings);
        const enabledMethods = (['UPI', 'CARD', 'RAZORPAY', 'COD'] as PaymentMethod[]).filter(
          (m) => res.paymentSettings.methods[m]?.enabled
        );
        if (enabledMethods.length > 0) {
          setPaymentMethod((prev) =>
            res.paymentSettings.methods[prev]?.enabled ? prev : enabledMethods[0]
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.addresses.length) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setSelectedAddressId((prev) => prev || def.id);
    } else if (user) {
      setShowNewAddress(true);
      setNewAddr((prev) => ({
        ...prev,
        fullName: user.name,
        phone: user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (initialCoupon && cartSubtotal > 0 && !appliedCoupon) {
      apiRequest<{ coupon: Coupon; discount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: initialCoupon, subtotal: cartSubtotal }),
      })
        .then((res) => setAppliedCoupon(res))
        .catch(() => {});
    }
  }, [initialCoupon, cartSubtotal, appliedCoupon]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ addresses: Address[]; address: Address }>(
        '/api/auth/addresses',
        {
          method: 'POST',
          body: JSON.stringify({ ...newAddr, isDefault: true }),
        }
      );
      await refreshUser();
      setSelectedAddressId(res.address.id);
      setShowNewAddress(false);
      showToast('Delivery address saved');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) return;
    try {
      const res = await apiRequest<{ coupon: Coupon; discount: number }>(
        '/api/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: couponCode.trim(), subtotal: cartSubtotal }),
        }
      );
      setAppliedCoupon(res);
      showToast(`Applied ${res.coupon.code}`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError((err as Error).message);
    }
  };

  const discount = appliedCoupon?.discount || 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discount);
  const freeThreshold = paymentSettings?.freeShippingThreshold ?? 499;
  const stdShipping = paymentSettings?.standardShippingFee ?? 49;
  const baseShippingFee =
    cart.length === 0 || freeThreshold <= 0 || discountedSubtotal >= freeThreshold
      ? 0
      : stdShipping;
  const codHandlingFee =
    paymentMethod === 'COD' ? paymentSettings?.methods.COD?.handlingFee || 0 : 0;
  const shippingFee = baseShippingFee + codHandlingFee;
  const total = discountedSubtotal + shippingFee;
  const codMaxLimit = paymentSettings?.methods.COD?.maxOrderAmount || 0;
  const codExceeded = paymentMethod === 'COD' && codMaxLimit > 0 && total > codMaxLimit;

  const handlePlaceOrder = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    const shippingAddress = user.addresses.find((a) => a.id === selectedAddressId);
    if (!shippingAddress) {
      showToast('Please select or save a delivery address', 'error');
      return;
    }

    if (paymentMethod === 'UPI' && !upiId.includes('@')) {
      showToast('Please enter a valid UPI ID (e.g. name@bank)', 'error');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderRes = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            variant: c.variant,
          })),
          shippingAddress,
          paymentMethod,
          couponCode: appliedCoupon?.coupon.code,
        }),
      });

      const createdOrder = orderRes.order;

      if (paymentMethod === 'COD') {
        clearCartLocal();
        await refreshUser();
        navigate(`/payment/success/${createdOrder.id}`);
        return;
      }

      const rzpRes = await apiRequest<{
        razorpayOrderId: string;
        keyId: string;
      }>('/api/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ orderId: createdOrder.id }),
      });

      setRazorpayModal({
        order: createdOrder,
        razorpayOrderId: rzpRes.razorpayOrderId,
        keyId: rzpRes.keyId,
      });
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleRazorpayAction = async (simulateFailure: boolean) => {
    if (!razorpayModal) return;
    setVerifyingPayment(true);
    try {
      const res = await apiRequest<{ verified: boolean; order: Order }>(
        '/api/payments/razorpay/verify',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId: razorpayModal.order.id,
            razorpayOrderId: razorpayModal.razorpayOrderId,
            simulateFailure,
          }),
        }
      );

      if (res.verified) {
        clearCartLocal();
        await refreshUser();
        setRazorpayModal(null);
        navigate(`/payment/success/${res.order.id}`);
      }
    } catch (err) {
      const failedOrderId = razorpayModal.order.id;
      setRazorpayModal(null);
      navigate(
        `/payment/failure?orderId=${encodeURIComponent(failedOrderId)}&reason=${encodeURIComponent(
          (err as Error).message
        )}`
      );
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (!user) {
    return (
      <main className="max-w-[1000px] mx-auto px-4 py-14">
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-md mx-auto">
          <Lock className="w-10 h-10 text-[#2874F0] mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Sign In to Checkout
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Sign in or create an account to select your delivery address and complete your order securely.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-6 px-6 py-2.5 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white font-semibold text-sm"
          >
            Sign In / Sign Up
          </button>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="max-w-[1000px] mx-auto px-4 py-14 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-10 max-w-md mx-auto">
          <h1 className="font-display text-xl font-bold text-slate-900">
            No Items Ready for Checkout
          </h1>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="mt-5 px-5 py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
          >
            Browse Products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Steps */}
        <div className="lg:col-span-8 space-y-5">
          {/* Step 1: Delivery Address */}
          <section className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 bg-[#2874F0] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-white text-[#2874F0] text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="font-display text-base font-bold">Delivery Address</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAddress((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFE500] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewAddress ? 'Cancel' : 'Add New Address'}</span>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {user.addresses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {user.addresses.map((addr) => {
                    const selected = addr.id === selectedAddressId;
                    return (
                      <label
                        key={addr.id}
                        className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                          selected
                            ? 'border-[#2874F0] bg-blue-50/40'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="deliveryAddress"
                            checked={selected}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 accent-[#2874F0]"
                          />
                          <div className="text-sm">
                            <p className="font-bold text-slate-900">
                              {addr.fullName}{' '}
                              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                                ({addr.label})
                              </span>
                            </p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {addr.line1}
                              {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} -{' '}
                              <span className="font-mono-num font-semibold">{addr.postalCode}</span>
                            </p>
                            <p className="text-xs text-slate-600 mt-1 font-mono-num">
                              Phone: {addr.phone}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {showNewAddress && (
                <form
                  onSubmit={handleSaveAddress}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <input
                    required
                    placeholder="Full Name"
                    value={newAddr.fullName}
                    onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="Mobile Number"
                    value={newAddr.phone}
                    onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="Address Line 1 (House No, Street)"
                    value={newAddr.line1}
                    onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                    className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    placeholder="Landmark / Apartment (Optional)"
                    value={newAddr.line2}
                    onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })}
                    className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="City"
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="State"
                    value={newAddr.state}
                    onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="Postal Code"
                    value={newAddr.postalCode}
                    onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono-num"
                  />
                  <select
                    value={newAddr.label}
                    onChange={(e) =>
                      setNewAddr({
                        ...newAddr,
                        label: e.target.value as 'Home' | 'Work' | 'Other',
                      })
                    }
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
                    >
                      Save & Deliver Here
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* Step 2: Payment Options */}
          <section className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 bg-[#2874F0] text-white flex items-center gap-2.5">
              <span className="w-6 h-6 rounded bg-white text-[#2874F0] text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="font-display text-base font-bold">Payment Method</h2>
            </div>

            <div className="p-5 sm:p-6 divide-y divide-slate-100">
              {/* UPI */}
              {(paymentSettings?.methods.UPI?.enabled ?? true) && (
                <label className="py-3.5 first:pt-0 block cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'UPI'}
                      onChange={() => setPaymentMethod('UPI')}
                      className="accent-[#2874F0]"
                    />
                    <Smartphone className="w-5 h-5 text-[#2874F0]" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {paymentSettings?.methods.UPI.label || 'UPI (GPay, PhonePe, Paytm)'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paymentSettings?.methods.UPI.description ||
                          'Instant zero-fee verification via Razorpay'}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'UPI' && (
                    <div className="mt-3 pl-7 max-w-sm space-y-1.5">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okaxis"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                      />
                      {paymentSettings?.methods.UPI.merchantUpiId && (
                        <p className="text-[11px] text-slate-500">
                          Merchant VPA:{' '}
                          <span className="font-mono-num font-semibold text-slate-700">
                            {paymentSettings.methods.UPI.merchantUpiId}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </label>
              )}

              {/* Credit / Debit Card */}
              {(paymentSettings?.methods.CARD?.enabled ?? true) && (
                <label className="py-3.5 first:pt-0 block cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'CARD'}
                      onChange={() => setPaymentMethod('CARD')}
                      className="accent-[#2874F0]"
                    />
                    <CreditCard className="w-5 h-5 text-[#2874F0]" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {paymentSettings?.methods.CARD.label || 'Credit / Debit / ATM Card'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paymentSettings?.methods.CARD.description ||
                          'Visa, Mastercard, RuPay supported'}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'CARD' && (
                    <div className="mt-3 pl-7 grid grid-cols-2 gap-2.5 max-w-md">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Card Number"
                        className="col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                      />
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                      />
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="CVV"
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                      />
                    </div>
                  )}
                </label>
              )}

              {/* Razorpay All-in-One Gateway */}
              {(paymentSettings?.methods.RAZORPAY?.enabled ?? true) && (
                <label className="py-3.5 first:pt-0 block cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'RAZORPAY'}
                      onChange={() => setPaymentMethod('RAZORPAY')}
                      className="accent-[#2874F0]"
                    />
                    <ShieldCheck className="w-5 h-5 text-[#2874F0]" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {paymentSettings?.methods.RAZORPAY.label ||
                          'Razorpay Checkout (NetBanking & Wallets)'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paymentSettings?.methods.RAZORPAY.description ||
                          'Pay securely via HDFC, ICICI, SBI, Axis & digital wallets'}
                      </p>
                    </div>
                  </div>
                </label>
              )}

              {/* Cash on Delivery */}
              {(paymentSettings?.methods.COD?.enabled ?? true) && (
                <label className="py-3.5 first:pt-0 last:pb-0 block cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-[#2874F0]"
                    />
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {paymentSettings?.methods.COD.label || 'Cash on Delivery (COD)'}
                        {(paymentSettings?.methods.COD.handlingFee || 0) > 0 && (
                          <span className="ml-2 text-xs font-mono-num font-semibold text-amber-700">
                            (+{formatINR(paymentSettings!.methods.COD.handlingFee || 0)} fee)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paymentSettings?.methods.COD.description ||
                          'Pay in cash or UPI scan upon doorstep delivery'}
                        {codMaxLimit > 0 && ` · Up to ${formatINR(codMaxLimit)}`}
                      </p>
                    </div>
                  </div>
                  {codExceeded && (
                    <p className="mt-2 pl-7 text-xs font-semibold text-rose-600">
                      COD is limited to {formatINR(codMaxLimit)}. Choose UPI, Card, or Razorpay to proceed.
                    </p>
                  )}
                </label>
              )}
            </div>
          </section>
        </div>

        {/* Right Order Summary */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-32">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100">
              Order Summary ({cartCount} items)
            </h2>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {cart.map((item) => {
                const p = item.product;
                if (!p) return null;
                return (
                  <div
                    key={`${item.productId}_${item.variant || ''}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-slate-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-900 shrink-0">
                      {formatINR(p.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <form onSubmit={handleApplyCoupon} className="pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon (VELO10)"
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded font-mono-num uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-rose-600 mt-1">{couponError}</p>}
            </form>

            {/* Totals */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono-num">{formatINR(cartSubtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon ({appliedCoupon?.coupon.code})</span>
                  <span className="font-mono-num">-{formatINR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping{codHandlingFee > 0 ? ' + COD Fee' : ''}</span>
                <span className="font-mono-num text-emerald-700">
                  {shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-200 flex justify-between text-lg font-bold text-slate-900">
                <span>Total Payable</span>
                <span className="font-mono-num">{formatINR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={placingOrder || !selectedAddressId || codExceeded}
              onClick={handlePlaceOrder}
              className="w-full py-3 px-4 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {placingOrder
                ? 'Processing...'
                : paymentMethod === 'COD'
                  ? `Confirm COD Order (${formatINR(total)})`
                  : `Pay ${formatINR(total)} Securely`}
            </button>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2874F0] shrink-0" />
              <span>Free returns within 7 days of delivery.</span>
            </p>
          </div>
        </aside>
      </div>

      {/* Interactive Razorpay Payment Verification Modal */}
      {razorpayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#172337] text-white p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFE500]">
                  Razorpay Secure Checkout
                </p>
                <h3 className="font-display text-lg font-bold mt-0.5">
                  ShopKart Marketplace
                </h3>
                <p className="text-xs text-slate-300 font-mono-num mt-0.5">
                  {razorpayModal.razorpayOrderId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-300">Amount</p>
                <p className="font-mono-num text-xl font-bold text-[#FFE500]">
                  {formatINR(razorpayModal.order.total)}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">
                  Selected Method: {razorpayModal.order.paymentMethod}
                </p>
                <p>
                  Order Reference:{' '}
                  <span className="font-mono-num font-semibold">
                    {razorpayModal.order.orderNumber}
                  </span>
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => void handleRazorpayAction(false)}
                  className="w-full py-3 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {verifyingPayment
                      ? 'Verifying Signature...'
                      : `Authorize & Pay ${formatINR(razorpayModal.order.total)}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => void handleRazorpayAction(true)}
                  className="w-full py-2.5 px-4 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors"
                >
                  Simulate Bank Decline (Test Failure Flow)
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                256-bit TLS encrypted · HMAC-SHA256 verified on server
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
