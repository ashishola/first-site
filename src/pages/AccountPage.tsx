import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Heart,
  MapPin,
  Package,
  Plus,
  Trash2,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Order, OrderStatus, Product } from '../types.ts';

const TRACKING_STAGES: OrderStatus[] = [
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export function AccountPage() {
  const {
    user,
    openAuthModal,
    refreshUser,
    currentPath,
    navigate,
    showToast,
  } = useStore();

  const searchParams = new URLSearchParams(currentPath.split('?')[1] || '');
  const tabParam = (searchParams.get('tab') || 'orders') as
    | 'profile'
    | 'orders'
    | 'wishlist'
    | 'addresses';

  const [activeTab, setActiveTab] = useState(tabParam);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    label: 'Home' as 'Home' | 'Work' | 'Other',
  });

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
    setProfilePhone(user.phone || '');

    setLoadingOrders(true);
    apiRequest<{ orders: Order[] }>('/api/orders/my')
      .then((res) => setOrders(res.orders))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));

    apiRequest<{ products: Product[] }>('/api/products')
      .then((res) => {
        setWishlistProducts(res.products.filter((p) => user.wishlist.includes(p.id)));
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-14 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <UserIcon className="w-10 h-10 text-[#2874F0] mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Your ShopKart Account
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Sign in to view your orders, track deliveries, manage addresses, and access your wishlist.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-5 px-6 py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  const switchTab = (tab: 'profile' | 'orders' | 'wishlist' | 'addresses') => {
    setActiveTab(tab);
    navigate(`/account?tab=${tab}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      await refreshUser();
      showToast('Profile updated');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await apiRequest<{ order: Order }>(
        `/api/orders/${encodeURIComponent(orderId)}/cancel`,
        { method: 'POST' }
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      showToast('Order cancelled and stock restored', 'info');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...addrForm, isDefault: user.addresses.length === 0 }),
      });
      await refreshUser();
      setShowAddAddress(false);
      setAddrForm({
        fullName: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        label: 'Home',
      });
      showToast('Address added');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await apiRequest(`/api/auth/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await refreshUser();
      showToast('Address removed', 'info');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 bg-[#2874F0] text-white">
            <p className="text-xs text-blue-100">Hello,</p>
            <h1 className="font-display text-lg font-bold truncate">{user.name}</h1>
            <p className="text-xs text-blue-100 truncate mt-0.5">{user.email}</p>
          </div>
          <nav className="p-2 space-y-1 text-sm">
            {[
              { id: 'orders' as const, label: 'My Orders', icon: Package },
              { id: 'wishlist' as const, label: `Wishlist (${user.wishlist.length})`, icon: Heart },
              { id: 'addresses' as const, label: 'Saved Addresses', icon: MapPin },
              { id: 'profile' as const, label: 'Profile Settings', icon: UserIcon },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-lg flex items-center gap-3 font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-[#2874F0] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Panel */}
        <section className="lg:col-span-9 bg-white rounded-xl border border-slate-200/80 p-5 sm:p-7">
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-slate-900">
                My Orders & Live Tracking
              </h2>
              {loadingOrders ? (
                <p className="text-sm text-slate-500">Loading your orders...</p>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-500">You have not placed any orders yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="mt-4 px-5 py-2 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {orders.map((order) => {
                    const currentStageIdx = TRACKING_STAGES.indexOf(order.status);
                    const isCancelled = order.status === 'Cancelled';
                    return (
                      <div
                        key={order.id}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex flex-wrap items-center gap-4">
                            <div>
                              <span className="text-slate-400">ORDER #</span>
                              <span className="font-mono-num font-bold text-slate-900 ml-1">
                                {order.orderNumber}
                              </span>
                            </div>
                            <span className="text-slate-400">
                              Placed {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {order.paymentMethod} · {order.paymentStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono-num text-sm font-bold text-slate-900">
                              {formatINR(order.total)}
                            </span>
                            {!isCancelled && order.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => void handleCancelOrder(order.id)}
                                className="px-2.5 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-5 space-y-5">
                          {/* Items */}
                          <div className="space-y-3">
                            {order.items.map((item) => (
                              <div
                                key={`${item.productId}_${item.variant || ''}`}
                                className="flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-12 rounded object-cover bg-slate-100 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/product/${item.slug}`)}
                                      className="text-sm font-semibold text-slate-900 hover:text-[#2874F0] truncate block text-left"
                                    >
                                      {item.name}
                                    </button>
                                    <p className="text-xs text-slate-500">
                                      Qty: {item.quantity} {item.variant ? `· ${item.variant}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-mono-num text-sm font-semibold text-slate-900 shrink-0">
                                  {formatINR(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* 5-Stage Tracking Stepper */}
                          {isCancelled ? (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                              Order Cancelled — {order.timeline[order.timeline.length - 1]?.note}
                            </div>
                          ) : (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-3">
                                <span className="inline-flex items-center gap-1.5 text-[#2874F0]">
                                  <Truck className="w-4 h-4" />
                                  <span>Shipment Status: {order.status}</span>
                                </span>
                                <span className="text-slate-400">
                                  {order.timeline[order.timeline.length - 1]?.note}
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                {TRACKING_STAGES.map((stage, idx) => {
                                  const completed = idx <= currentStageIdx;
                                  return (
                                    <div key={stage} className="space-y-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          completed ? 'bg-emerald-500' : 'bg-slate-200'
                                        }`}
                                      />
                                      <div className="flex items-center gap-1">
                                        {completed && (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 hidden sm:block" />
                                        )}
                                        <span
                                          className={`text-[11px] truncate ${
                                            completed
                                              ? 'font-semibold text-slate-900'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {stage}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">
                My Wishlist ({wishlistProducts.length})
              </h2>
              {wishlistProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">Your wishlist is currently empty.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="mt-4 px-5 py-2 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
                  >
                    Discover Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {wishlistProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Saved Addresses
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddAddress((v) => !v)}
                  className="px-3.5 py-2 rounded-md bg-[#2874F0] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddAddress ? 'Cancel' : 'Add Address'}</span>
                </button>
              </div>

              {showAddAddress && (
                <form
                  onSubmit={handleAddAddress}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <input
                    required
                    placeholder="Full Name"
                    value={addrForm.fullName}
                    onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="Phone"
                    value={addrForm.phone}
                    onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="Address Line 1"
                    value={addrForm.line1}
                    onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                    className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    placeholder="Landmark / Line 2"
                    value={addrForm.line2}
                    onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
                    className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="City"
                    value={addrForm.city}
                    onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="State"
                    value={addrForm.state}
                    onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    placeholder="Postal Code"
                    value={addrForm.postalCode}
                    onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                    className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono-num"
                  />
                  <select
                    value={addrForm.label}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
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
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-lg border border-slate-200 flex justify-between items-start gap-3"
                  >
                    <div className="text-sm">
                      <p className="font-bold text-slate-900">
                        {addr.fullName}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          · {addr.label} {addr.isDefault ? '(Default)' : ''}
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} -{' '}
                        {addr.postalCode}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono-num">{addr.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAddress(addr.id)}
                      aria-label="Delete address"
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Profile Information
              </h2>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
