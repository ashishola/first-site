import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  BarChart3,
  Boxes,
  CreditCard,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  PackageCheck,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Tag,
  Trash2,
  Upload,
  Users,
  Edit3,
  X,
} from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import type {
  AdminAnalytics,
  Banner,
  Category,
  Coupon,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentSettings,
  Product,
  User,
} from '../types.ts';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'coupons'
  | 'banners'
  | 'payments'
  | 'users';

const ORDER_STATUSES: OrderStatus[] = [
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export function AdminDashboardPage() {
  const { user, login, openAuthModal, navigate, refreshStoreMeta, showToast } = useStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [demoSigningIn, setDemoSigningIn] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [confirmResetCustomers, setConfirmResetCustomers] = useState(false);
  const [resettingCustomers, setResettingCustomers] = useState(false);

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [razorpayMode, setRazorpayMode] = useState<'live' | 'sandbox'>('sandbox');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [paymentMethodStats, setPaymentMethodStats] = useState<
    Record<PaymentMethod, { count: number; revenue: number }>
  >({
    UPI: { count: 0, revenue: 0 },
    CARD: { count: 0, revenue: 0 },
    RAZORPAY: { count: 0, revenue: 0 },
    COD: { count: 0, revenue: 0 },
  });
  const [savingPayments, setSavingPayments] = useState(false);
  const [loading, setLoading] = useState(true);

  // Product Form Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    brand: '',
    category: 'Electronics',
    description: '',
    price: '',
    mrp: '',
    stock: '25',
    sku: '',
    imageUrl: '',
    variants: 'Standard',
    isTopDeal: false,
    isBestSeller: false,
    isTrending: false,
    isFlashSale: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Coupon Form
  const [cpnForm, setCpnForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'flat',
    discountValue: '10',
    minOrderAmount: '1000',
    maxDiscount: '1500',
  });

  // Banner Form
  const [banForm, setBanForm] = useState({
    title: '',
    subtitle: '',
    ctaLabel: 'Shop Now',
    targetPath: '/shop',
    image: '',
    badgeText: 'Limited Offer',
  });

  const loadAdminData = useCallback(async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'seller')) return;
    setLoading(true);
    try {
      const [anRes, prRes, catRes, ordRes, cpnRes, banRes, usrRes, payRes] =
        await Promise.all([
          apiRequest<{ analytics: AdminAnalytics }>('/api/admin/analytics'),
          apiRequest<{ products: Product[] }>('/api/products'),
          apiRequest<{ categories: Category[] }>('/api/categories'),
          apiRequest<{ orders: Order[] }>('/api/admin/orders'),
          apiRequest<{ coupons: Coupon[] }>('/api/admin/coupons'),
          apiRequest<{ banners: Banner[] }>('/api/admin/banners'),
          apiRequest<{ users: User[] }>('/api/admin/users'),
          apiRequest<{
            paymentSettings: PaymentSettings;
            razorpayMode: 'live' | 'sandbox';
            razorpayKeyId: string;
            methodStats: Record<PaymentMethod, { count: number; revenue: number }>;
          }>('/api/admin/payment-settings'),
        ]);
      setAnalytics(anRes.analytics);
      setProducts(prRes.products);
      setCategories(catRes.categories);
      setOrders(ordRes.orders);
      setCoupons(cpnRes.coupons);
      setBanners(banRes.banners);
      setUsers(usrRes.users);
      setPaymentSettings(payRes.paymentSettings);
      setRazorpayMode(payRes.razorpayMode);
      setRazorpayKeyId(payRes.razorpayKeyId);
      setPaymentMethodStats(payRes.methodStats);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleDemoAdminSignIn = async () => {
    setDemoSigningIn(true);
    try {
      await login('ashishola2009@gmail.com', 'Admin@123');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setDemoSigningIn(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <LayoutDashboard className="w-10 h-10 text-[#2874F0] mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-slate-900">
            ShopKart Admin Panel
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Manage store analytics, products, inventory stock, customer orders, categories, coupons, and homepage banners.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={demoSigningIn}
              onClick={() => void handleDemoAdminSignIn()}
              className="w-full py-2.5 px-5 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white text-sm font-bold transition-colors disabled:opacity-60"
            >
              {demoSigningIn
                ? 'Opening Admin Panel...'
                : 'Sign In as Admin (ashishola2009@gmail.com)'}
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="py-2.5 px-4 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold"
              >
                Sign In Manually
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="py-2.5 px-4 rounded-md border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50"
              >
                Back to Store
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const handleImageUpload = async (
    file: File,
    target: 'product' | 'banner'
  ) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiRequest<{ url: string }>('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (target === 'product') {
        setProdForm((prev) => ({ ...prev, imageUrl: res.url }));
      } else {
        setBanForm((prev) => ({ ...prev, image: res.url }));
      }
      showToast('Image uploaded successfully');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      brand: '',
      category: categories[0]?.name || 'Electronics',
      description: '',
      price: '',
      mrp: '',
      stock: '25',
      sku: '',
      imageUrl: '/src/assets/images/prod_smartphone_pro_1794932425046.jpg',
      variants: 'Standard',
      isTopDeal: false,
      isBestSeller: false,
      isTrending: false,
      isFlashSale: false,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm({
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      price: String(p.price),
      mrp: String(p.mrp),
      stock: String(p.stock),
      sku: p.sku,
      imageUrl: p.images[0] || '',
      variants: p.variants.join(', '),
      isTopDeal: p.isTopDeal,
      isBestSeller: p.isBestSeller,
      isTrending: p.isTrending,
      isFlashSale: p.isFlashSale,
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: prodForm.name,
      brand: prodForm.brand,
      category: prodForm.category,
      description: prodForm.description,
      price: Number(prodForm.price),
      mrp: Number(prodForm.mrp || prodForm.price),
      stock: Number(prodForm.stock),
      sku: prodForm.sku,
      images: prodForm.imageUrl ? [prodForm.imageUrl] : undefined,
      variants: prodForm.variants
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      isTopDeal: prodForm.isTopDeal,
      isBestSeller: prodForm.isBestSeller,
      isTrending: prodForm.isTrending,
      isFlashSale: prodForm.isFlashSale,
    };

    try {
      if (editingProduct) {
        await apiRequest(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Product updated');
      } else {
        await apiRequest('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product created');
      }
      setProductModalOpen(false);
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleQuickStock = async (p: Product, nextStock: number) => {
    try {
      await apiRequest(`/api/admin/products/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ stock: Math.max(0, nextStock) }),
      });
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, stock: Math.max(0, nextStock) } : item
        )
      );
      showToast('Stock updated');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' });
      showToast('Product removed', 'info');
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      setCatName('');
      setCatDesc('');
      showToast('Category added');
      await Promise.all([loadAdminData(), refreshStoreMeta()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' });
      showToast('Category deleted', 'info');
      await Promise.all([loadAdminData(), refreshStoreMeta()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      showToast(`Order marked ${status}`);
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: cpnForm.code,
          description: cpnForm.description,
          discountType: cpnForm.discountType,
          discountValue: Number(cpnForm.discountValue),
          minOrderAmount: Number(cpnForm.minOrderAmount),
          maxDiscount: cpnForm.maxDiscount ? Number(cpnForm.maxDiscount) : undefined,
        }),
      });
      setCpnForm({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '10',
        minOrderAmount: '1000',
        maxDiscount: '1500',
      });
      showToast('Coupon created');
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      await apiRequest(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !coupon.active }),
      });
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await apiRequest(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      await loadAdminData();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify(banForm),
      });
      setBanForm({
        title: '',
        subtitle: '',
        ctaLabel: 'Shop Now',
        targetPath: '/shop',
        image: '',
        badgeText: 'Limited Offer',
      });
      showToast('Banner published');
      await Promise.all([loadAdminData(), refreshStoreMeta()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleToggleBanner = async (banner: Banner) => {
    try {
      await apiRequest(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !banner.active }),
      });
      await Promise.all([loadAdminData(), refreshStoreMeta()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await apiRequest(`/api/admin/banners/${id}`, { method: 'DELETE' });
      await Promise.all([loadAdminData(), refreshStoreMeta()]);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSettings) return;
    setSavingPayments(true);
    try {
      const res = await apiRequest<{ paymentSettings: PaymentSettings }>(
        '/api/admin/payment-settings',
        {
          method: 'PUT',
          body: JSON.stringify(paymentSettings),
        }
      );
      setPaymentSettings(res.paymentSettings);
      showToast('Payment methods & shipping settings saved');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSavingPayments(false);
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Analytics Overview', icon: BarChart3 },
    { id: 'products', label: 'Products & Inventory', icon: Boxes },
    { id: 'orders', label: 'Customer Orders', icon: PackageCheck },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
    { id: 'banners', label: 'Homepage Banners', icon: ImageIcon },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
  ];

  const maxCatRev = Math.max(
    1,
    ...(analytics?.revenueByCategory.map((c) => c.revenue) || [1])
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F1F3F6] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#172337] text-slate-300 shrink-0">
        <div className="p-5 border-b border-slate-700/70">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFE500]">
            ShopKart Console
          </p>
          <p className="font-display text-base font-bold text-white mt-0.5 truncate">
            {user.storeName || 'Marketplace Admin'}
          </p>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2.5 rounded-md flex items-center gap-3 font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#2874F0] text-white font-semibold'
                    : 'hover:bg-white/10 text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 p-5 lg:p-8 space-y-6">
        {/* Contextual Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500">
              Admin Console / {navItems.find((n) => n.id === activeTab)?.label}
            </p>
            <h1 className="font-display text-2xl font-bold text-slate-900 mt-0.5">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              View Live Storefront
            </button>
            <button
              type="button"
              onClick={openAddProduct}
              className="px-4 py-2 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {loading && !analytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 rounded-lg bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && analytics && (
              <div className="space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Total Revenue
                    </p>
                    <p className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
                      {formatINR(analytics.totalRevenue)}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">
                      Avg Order: {formatINR(analytics.averageOrderValue)}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Total Orders
                    </p>
                    <p className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
                      {analytics.totalOrders}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {analytics.ordersByStatus['Delivered'] || 0} delivered
                    </p>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Registered Users
                    </p>
                    <p className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
                      {analytics.totalUsers}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Active accounts</p>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Catalog & Stock
                    </p>
                    <p className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
                      {analytics.totalProducts} SKUs
                    </p>
                    <p className="text-xs text-amber-700 font-medium mt-1">
                      {analytics.lowStockCount} low-stock alerts (≤20)
                    </p>
                  </div>
                </div>

                {/* Revenue by Category + Recent Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5">
                    <h2 className="font-display text-base font-bold text-slate-900 mb-4">
                      Revenue by Category
                    </h2>
                    {analytics.revenueByCategory.length === 0 ? (
                      <p className="text-sm text-slate-500">No sales recorded yet.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {analytics.revenueByCategory.map((item) => (
                          <div key={item.category} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700">
                                {item.category} ({item.orders} units)
                              </span>
                              <span className="font-mono-num font-bold text-slate-900">
                                {formatINR(item.revenue)}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-[#2874F0] rounded-full"
                                style={{
                                  width: `${Math.max(8, (item.revenue / maxCatRev) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Recent Orders
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="text-xs font-semibold text-[#2874F0] hover:underline"
                      >
                        Manage All
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Order</th>
                            <th className="py-2.5 px-4 font-semibold">Customer</th>
                            <th className="py-2.5 px-4 font-semibold">Status</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analytics.recentOrders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono-num font-semibold text-slate-900">
                                {o.orderNumber}
                              </td>
                              <td className="py-2.5 px-4 text-slate-700">{o.customerName}</td>
                              <td className="py-2.5 px-4 font-semibold text-[#2874F0]">
                                {o.status}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono-num font-bold text-slate-900">
                                {formatINR(o.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS & INVENTORY TAB */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by name, brand, or SKU..."
                    className="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                  <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(e) => setLowStockOnly(e.target.checked)}
                      className="accent-[#2874F0]"
                    />
                    <span>Low Stock Only (≤20)</span>
                  </label>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Product</th>
                          <th className="py-3 px-4 font-semibold">Category</th>
                          <th className="py-3 px-4 font-semibold text-right">Price</th>
                          <th className="py-3 px-4 font-semibold text-center">Stock</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products
                          .filter((p) => {
                            const q = productSearch.trim().toLowerCase();
                            const matchText =
                              !q ||
                              p.name.toLowerCase().includes(q) ||
                              p.brand.toLowerCase().includes(q) ||
                              p.sku.toLowerCase().includes(q);
                            const matchStock = !lowStockOnly || p.stock <= 20;
                            return matchText && matchStock;
                          })
                          .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="w-11 h-9 rounded object-cover bg-slate-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate max-w-xs">
                                  {p.name}
                                </p>
                                <p className="text-xs text-slate-400 font-mono-num">{p.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{p.category}</td>
                          <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900">
                            {formatINR(p.price)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleQuickStock(p, p.stock - 1)}
                                className="w-6 h-6 rounded border border-slate-300 text-xs hover:bg-slate-100"
                              >
                                -
                              </button>
                              <span
                                className={`w-10 text-center font-mono-num font-bold text-xs ${
                                  p.stock <= 10 ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {p.stock}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleQuickStock(p, p.stock + 1)}
                                className="w-6 h-6 rounded border border-slate-300 text-xs hover:bg-slate-100"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditProduct(p)}
                                aria-label="Edit product"
                                className="p-1.5 rounded text-slate-500 hover:text-[#2874F0] hover:bg-blue-50"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteProduct(p.id)}
                                aria-label="Delete product"
                                className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {(['ALL', ...ORDER_STATUSES] as const).map((statusOpt) => (
                    <button
                      key={statusOpt}
                      type="button"
                      onClick={() => setOrderStatusFilter(statusOpt)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        orderStatusFilter === statusOpt
                          ? 'bg-[#2874F0] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {statusOpt === 'ALL' ? `All Orders (${orders.length})` : statusOpt}
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Order #</th>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Payment</th>
                          <th className="py-3 px-4 font-semibold text-right">Total</th>
                          <th className="py-3 px-4 font-semibold">Fulfillment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders
                          .filter(
                            (o) =>
                              orderStatusFilter === 'ALL' || o.status === orderStatusFilter
                          )
                          .map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-mono-num font-bold text-slate-900">
                              {order.orderNumber}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{order.customerName}</p>
                            <p className="text-xs text-slate-500">{order.customerEmail}</p>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className="font-semibold text-slate-800">
                              {order.paymentMethod}
                            </span>{' '}
                            · {order.paymentStatus}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                            {formatINR(order.total)}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                void handleUpdateOrderStatus(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-md bg-white focus:border-[#2874F0]"
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleAddCategory}
                  className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 space-y-3"
                >
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Add Category
                  </h2>
                  <input
                    required
                    placeholder="Category Name (e.g. Gaming)"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <input
                    placeholder="Short Description"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
                  >
                    Create Category
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-10 rounded object-cover bg-slate-100"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{cat.name}</p>
                          <p className="text-xs text-slate-500">{cat.description}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COUPONS TAB */}
            {activeTab === 'coupons' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleCreateCoupon}
                  className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 space-y-3"
                >
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Create Coupon
                  </h2>
                  <input
                    required
                    placeholder="Code (e.g. MEGA15)"
                    value={cpnForm.code}
                    onChange={(e) =>
                      setCpnForm({ ...cpnForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num uppercase"
                  />
                  <input
                    required
                    placeholder="Description"
                    value={cpnForm.description}
                    onChange={(e) => setCpnForm({ ...cpnForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={cpnForm.discountType}
                      onChange={(e) =>
                        setCpnForm({
                          ...cpnForm,
                          discountType: e.target.value as 'percentage' | 'flat',
                        })
                      }
                      className="px-3 py-2 text-sm border border-slate-300 rounded-md"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat (₹)</option>
                    </select>
                    <input
                      required
                      type="number"
                      placeholder="Value"
                      value={cpnForm.discountValue}
                      onChange={(e) =>
                        setCpnForm({ ...cpnForm, discountValue: e.target.value })
                      }
                      className="px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min Order (₹)"
                      value={cpnForm.minOrderAmount}
                      onChange={(e) =>
                        setCpnForm({ ...cpnForm, minOrderAmount: e.target.value })
                      }
                      className="px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                    />
                    <input
                      type="number"
                      placeholder="Max Discount (₹)"
                      value={cpnForm.maxDiscount}
                      onChange={(e) =>
                        setCpnForm({ ...cpnForm, maxDiscount: e.target.value })
                      }
                      className="px-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
                  >
                    Publish Coupon
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {coupons.map((cpn) => (
                    <div
                      key={cpn.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-mono-num text-sm font-bold text-[#2874F0]">
                          {cpn.code} ·{' '}
                          <span className="text-slate-900 font-sans">
                            {cpn.discountType === 'percentage'
                              ? `${cpn.discountValue}% off`
                              : `${formatINR(cpn.discountValue)} off`}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{cpn.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleCoupon(cpn)}
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            cpn.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {cpn.active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCoupon(cpn.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BANNERS TAB */}
            {activeTab === 'banners' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleCreateBanner}
                  className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 space-y-3"
                >
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Add Homepage Banner
                  </h2>
                  <input
                    required
                    placeholder="Headline Title"
                    value={banForm.title}
                    onChange={(e) => setBanForm({ ...banForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <input
                    placeholder="Subtitle"
                    value={banForm.subtitle}
                    onChange={(e) => setBanForm({ ...banForm, subtitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="CTA Label"
                      value={banForm.ctaLabel}
                      onChange={(e) => setBanForm({ ...banForm, ctaLabel: e.target.value })}
                      className="px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                    <input
                      placeholder="Target (/shop)"
                      value={banForm.targetPath}
                      onChange={(e) =>
                        setBanForm({ ...banForm, targetPath: e.target.value })
                      }
                      className="px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <input
                    required
                    placeholder="Image URL"
                    value={banForm.image}
                    onChange={(e) => setBanForm({ ...banForm, image: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-dashed border-slate-300 text-xs font-semibold text-[#2874F0] cursor-pointer hover:bg-blue-50">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Banner Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageUpload(file, 'banner');
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
                  >
                    Publish Banner
                  </button>
                </form>

                <div className="lg:col-span-8 space-y-4">
                  {banners.map((ban) => (
                    <div
                      key={ban.id}
                      className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={ban.image}
                          alt={ban.title}
                          referrerPolicy="no-referrer"
                          className="w-28 h-16 rounded object-cover bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {ban.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{ban.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleToggleBanner(ban)}
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            ban.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ban.active ? 'Visible' : 'Hidden'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteBanner(ban.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAYMENT METHODS TAB */}
            {activeTab === 'payments' && paymentSettings && (
              <form onSubmit={handleSavePaymentSettings} className="space-y-6">
                {/* Gateway Status & Method Revenue Strip */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-[#2874F0]" />
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Checkout Payment Gateway & Methods
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          razorpayMode === 'live'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Razorpay {razorpayMode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Active Gateway Key:{' '}
                      <span className="font-mono-num font-semibold text-slate-700">
                        {razorpayKeyId}
                      </span>{' '}
                      · Changes reflect immediately on customer Checkout.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPayments}
                    className="px-5 py-2.5 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingPayments ? 'Saving...' : 'Save Payment Settings'}</span>
                  </button>
                </div>

                {/* Per-Method Analytics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(
                    [
                      { key: 'UPI', title: 'UPI Collections', icon: Smartphone },
                      { key: 'CARD', title: 'Card Payments', icon: CreditCard },
                      { key: 'RAZORPAY', title: 'Razorpay Gateway', icon: ShieldCheck },
                      { key: 'COD', title: 'Cash on Delivery', icon: Banknote },
                    ] as const
                  ).map(({ key, title, icon: Icon }) => {
                    const stats = paymentMethodStats[key] || { count: 0, revenue: 0 };
                    const enabled = paymentSettings.methods[key]?.enabled;
                    return (
                      <div key={key} className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">{title}</span>
                          <Icon className="w-4 h-4 text-[#2874F0]" />
                        </div>
                        <p className="font-mono-num text-xl font-bold text-slate-900 mt-2">
                          {formatINR(stats.revenue)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">{stats.count} orders</span>
                          <span
                            className={`font-semibold ${
                              enabled ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {enabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment Methods Configuration Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(
                    [
                      {
                        key: 'UPI',
                        badge: 'Instant UPI',
                        icon: Smartphone,
                        accent: 'text-[#2874F0]',
                      },
                      {
                        key: 'CARD',
                        badge: 'Cards',
                        icon: CreditCard,
                        accent: 'text-[#2874F0]',
                      },
                      {
                        key: 'RAZORPAY',
                        badge: 'NetBanking & Wallets',
                        icon: ShieldCheck,
                        accent: 'text-[#2874F0]',
                      },
                      {
                        key: 'COD',
                        badge: 'Pay on Delivery',
                        icon: Banknote,
                        accent: 'text-emerald-600',
                      },
                    ] as const
                  ).map(({ key, badge, icon: Icon, accent }) => {
                    const cfg = paymentSettings.methods[key];
                    const updateMethod = (
                      patch: Partial<PaymentSettings['methods'][PaymentMethod]>
                    ) => {
                      setPaymentSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              methods: {
                                ...prev.methods,
                                [key]: { ...prev.methods[key], ...patch },
                              },
                            }
                          : prev
                      );
                    };

                    return (
                      <div
                        key={key}
                        className={`bg-white rounded-lg border p-5 space-y-4 transition-colors ${
                          cfg.enabled ? 'border-slate-200' : 'border-slate-200/70 bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${accent}`} />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {key} · {badge}
                              </span>
                              <p className="text-sm font-bold text-slate-900">{cfg.label}</p>
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={(e) => updateMethod({ enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#2874F0] relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                            <span className="text-xs font-semibold text-slate-700">
                              {cfg.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Checkout Display Label
                            </label>
                            <input
                              type="text"
                              required
                              value={cfg.label}
                              onChange={(e) => updateMethod({ label: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Checkout Subtitle / Instructions
                            </label>
                            <input
                              type="text"
                              required
                              value={cfg.description}
                              onChange={(e) => updateMethod({ description: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                            />
                          </div>

                          {key === 'UPI' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Store Merchant UPI ID (VPA)
                              </label>
                              <input
                                type="text"
                                value={cfg.merchantUpiId || ''}
                                onChange={(e) => updateMethod({ merchantUpiId: e.target.value })}
                                placeholder="shopkart@okicici"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-mono-num"
                              />
                            </div>
                          )}

                          {key === 'COD' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Max COD Order Limit (₹, 0 = none)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={cfg.maxOrderAmount ?? 0}
                                  onChange={(e) =>
                                    updateMethod({ maxOrderAmount: Number(e.target.value) })
                                  }
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-mono-num"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  COD Handling Fee (₹)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={cfg.handlingFee ?? 0}
                                  onChange={(e) =>
                                    updateMethod({ handlingFee: Number(e.target.value) })
                                  }
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white font-mono-num"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery & Shipping Fee Rules */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Delivery & Shipping Fee Rules
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure the minimum cart value for free delivery and standard shipping charge.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm max-w-xl">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Free Shipping Above (₹, 0 = always free)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={paymentSettings.freeShippingThreshold}
                        onChange={(e) =>
                          setPaymentSettings((prev) =>
                            prev
                              ? { ...prev, freeShippingThreshold: Number(e.target.value) }
                              : prev
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Standard Shipping Fee (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={paymentSettings.standardShippingFee}
                        onChange={(e) =>
                          setPaymentSettings((prev) =>
                            prev
                              ? { ...prev, standardShippingFee: Number(e.target.value) }
                              : prev
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono-num"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {user.role === 'admin' && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        User & Customer Management ({users.length} total)
                      </p>
                      <p className="text-xs text-slate-500">
                        Resetting customers removes all customer accounts, their orders, and notifications while keeping Admin accounts intact.
                      </p>
                    </div>
                    {!confirmResetCustomers ? (
                      <button
                        type="button"
                        onClick={() => setConfirmResetCustomers(true)}
                        className="px-4 py-2 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold whitespace-nowrap shrink-0"
                      >
                        Reset All Customers
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={resettingCustomers}
                          onClick={async () => {
                            setResettingCustomers(true);
                            try {
                              const res = await apiRequest<{ removedCount: number }>(
                                '/api/admin/customers/reset',
                                { method: 'POST' }
                              );
                              setConfirmResetCustomers(false);
                              showToast(
                                `Reset complete (${res.removedCount} customer accounts cleared)`,
                                'info'
                              );
                              await loadAdminData();
                            } catch (err) {
                              showToast((err as Error).message, 'error');
                            } finally {
                              setResettingCustomers(false);
                            }
                          }}
                          className="px-3.5 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          {resettingCustomers ? 'Resetting...' : 'Confirm Reset'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetCustomers(false)}
                          className="px-3 py-2 rounded-md border border-slate-300 text-slate-700 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Name</th>
                          <th className="py-3 px-4 font-semibold">Email</th>
                          <th className="py-3 px-4 font-semibold">Role</th>
                          <th className="py-3 px-4 font-semibold">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                            <td className="py-3 px-4 text-slate-600">{u.email}</td>
                            <td className="py-3 px-4">
                              {user.role === 'admin' ? (
                                <select
                                  value={u.role}
                                  onChange={async (e) => {
                                    const nextRole = e.target.value as 'customer' | 'seller' | 'admin';
                                    try {
                                      await apiRequest(`/api/admin/users/${u.id}/role`, {
                                        method: 'PUT',
                                        body: JSON.stringify({ role: nextRole }),
                                      });
                                      setUsers((prev) =>
                                        prev.map((item) =>
                                          item.id === u.id ? { ...item, role: nextRole } : item
                                        )
                                      );
                                      showToast(`Updated ${u.email} role to ${nextRole}`);
                                    } catch (err) {
                                      showToast((err as Error).message, 'error');
                                    }
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded bg-white uppercase text-[#2874F0]"
                                >
                                  <option value="customer">customer</option>
                                  <option value="seller">seller</option>
                                  <option value="admin">admin</option>
                                </select>
                              ) : (
                                <span className="uppercase text-xs font-bold text-[#2874F0]">
                                  {u.role}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {new Date(u.createdAt).toLocaleDateString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Product Name"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-md"
                />
                <input
                  required
                  placeholder="Brand"
                  value={prodForm.brand}
                  onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <select
                  value={prodForm.category}
                  onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="number"
                  placeholder="Selling Price (₹)"
                  value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md font-mono-num"
                />
                <input
                  required
                  type="number"
                  placeholder="MRP (₹)"
                  value={prodForm.mrp}
                  onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md font-mono-num"
                />
                <input
                  required
                  type="number"
                  placeholder="Stock Quantity"
                  value={prodForm.stock}
                  onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md font-mono-num"
                />
                <input
                  placeholder="SKU"
                  value={prodForm.sku}
                  onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md font-mono-num"
                />
              </div>

              <textarea
                rows={3}
                required
                placeholder="Product Description"
                value={prodForm.description}
                onChange={(e) =>
                  setProdForm({ ...prodForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />

              <input
                placeholder="Variants (comma separated, e.g. 128GB, 256GB)"
                value={prodForm.variants}
                onChange={(e) => setProdForm({ ...prodForm, variants: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />

              <div className="space-y-2">
                <input
                  placeholder="Image URL"
                  value={prodForm.imageUrl}
                  onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
                <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-dashed border-slate-300 text-xs font-semibold text-[#2874F0] cursor-pointer hover:bg-blue-50">
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingImage
                      ? 'Uploading to Storage...'
                      : 'Upload Product Photo (Cloudinary / Local)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file, 'product');
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodForm.isTopDeal}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, isTopDeal: e.target.checked })
                    }
                    className="accent-[#2874F0]"
                  />
                  <span>Feature in Top Deals</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodForm.isBestSeller}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, isBestSeller: e.target.checked })
                    }
                    className="accent-[#2874F0]"
                  />
                  <span>Best Selling</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodForm.isTrending}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, isTrending: e.target.checked })
                    }
                    className="accent-[#2874F0]"
                  />
                  <span>Trending Now</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prodForm.isFlashSale}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, isFlashSale: e.target.checked })
                    }
                    className="accent-[#2874F0]"
                  />
                  <span>Flash Sale Deal</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white font-semibold"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
