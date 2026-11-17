import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Store,
  User as UserIcon,
  X,
} from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image: string;
}

export function Navbar() {
  const {
    currentPath,
    navigate,
    user,
    openAuthModal,
    logout,
    categories,
    cartCount,
    setCartDrawerOpen,
    notifications,
    unreadCount,
    markNotificationsRead,
  } = useStore();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!showSuggestions) return;
      try {
        const res = await apiRequest<{ suggestions: Suggestion[] }>(
          `/api/products/suggestions?q=${encodeURIComponent(query)}`
        );
        if (active) setSuggestions(res.suggestions);
      } catch {
        // ignore
      }
    }, 160);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, showSuggestions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const trimmed = query.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
  };

  const isAdminRoute = currentPath.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      {/* Primary Royal Blue Header */}
      <div className="bg-[#2874F0] text-white">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white rounded"
            >
              <span className="w-8 h-8 rounded-lg bg-[#FFE500] text-[#172337] flex items-center justify-center shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14.26l.03-.12L8.1 12h7.45c.75 0 1.41-.41 1.75-1.03L21 4.96 19.25 4l-3.7 6H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.26-.24z" />
                </svg>
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                ShopKart
              </span>
            </button>
          </div>

          {/* Center: Large Search Bar with Live Product Suggestions */}
          <div ref={searchBoxRef} className="relative flex-1 max-w-2xl hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={query}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search for smartphones, laptops, fashion, appliances..."
                className="w-full h-10 pl-4 pr-11 rounded-md bg-white text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFE500]"
              />
              <button
                type="submit"
                aria-label="Search products"
                className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-[#2874F0] hover:text-blue-700"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-11 bg-white text-slate-900 rounded-md shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  {query.trim() ? 'Matching Products' : 'Popular Searches'}
                </div>
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setShowSuggestions(false);
                      setQuery('');
                      navigate(`/product/${item.slug}`);
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50/70 transition-colors text-left"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded object-cover bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category}</p>
                    </div>
                    <span className="text-xs font-semibold font-mono-num text-[#2874F0] shrink-0">
                      {formatINR(item.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            {/* Admin Panel Direct Access */}
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isAdminRoute
                  ? 'bg-[#FFE500] text-[#172337]'
                  : 'bg-white/15 hover:bg-[#FFE500] text-white hover:text-[#172337]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>

            {/* Become a Seller */}
            {(!user || user.role === 'customer') && (
              <button
                type="button"
                onClick={() => openAuthModal('seller')}
                className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium text-white/95 hover:text-[#FFE500] transition-colors whitespace-nowrap shrink-0"
              >
                <Store className="w-4 h-4" />
                <span>Become a Seller</span>
              </button>
            )}

            {/* Notifications */}
            {user && (
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const next = !notifOpen;
                    setNotifOpen(next);
                    if (next && unreadCount > 0) void markNotificationsRead();
                  }}
                  aria-label="Notifications"
                  className="relative p-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FFE500] text-[#172337] text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-md shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-semibold">Notifications</span>
                      <span className="text-xs text-slate-400">{notifications.length} total</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500 text-center">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.link) navigate(n.link);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Login / User Menu */}
            {user ? (
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-md shadow-xl border border-slate-200 py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/account?tab=profile');
                      }}
                      className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2.5"
                    >
                      <UserIcon className="w-4 h-4 text-[#2874F0]" />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/account?tab=orders');
                      }}
                      className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2.5"
                    >
                      <Package className="w-4 h-4 text-[#2874F0]" />
                      <span>My Orders</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/account?tab=wishlist');
                      }}
                      className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2.5"
                    >
                      <Heart className="w-4 h-4 text-[#2874F0]" />
                      <span>Wishlist ({user.wishlist.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/account?tab=addresses');
                      }}
                      className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2.5"
                    >
                      <MapPin className="w-4 h-4 text-[#2874F0]" />
                      <span>Saved Addresses</span>
                    </button>
                    {(user.role === 'admin' || user.role === 'seller') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          navigate('/admin');
                        }}
                        className="w-full px-4 py-2 text-sm font-medium text-[#2874F0] hover:bg-blue-50 flex items-center gap-2.5 border-t border-slate-100"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-4 py-1.5 rounded-md bg-white text-[#2874F0] font-semibold text-sm hover:bg-[#FFE500] hover:text-[#172337] transition-colors whitespace-nowrap shrink-0"
              >
                Login
              </button>
            )}

            {/* Cart */}
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              aria-label="Open shopping cart"
            >
              <span className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FFE500] text-[#172337] text-[11px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-sm font-semibold">Cart</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands & more..."
              className="w-full h-9 pl-3.5 pr-10 rounded-md bg-white text-slate-900 placeholder-slate-500 text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-[#2874F0]"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Category Navigation Strip (Hidden in Admin Console) */}
      {!isAdminRoute && (
        <div className="bg-white border-b border-slate-200">
          <nav
            aria-label="Product Categories"
            className="max-w-[1360px] mx-auto px-4 lg:px-6 flex items-center gap-6 overflow-x-auto no-scrollbar h-11 text-sm font-medium text-slate-700"
          >
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className={`whitespace-nowrap shrink-0 py-2 border-b-2 transition-colors ${
                currentPath === '/shop'
                  ? 'border-[#2874F0] text-[#2874F0] font-semibold'
                  : 'border-transparent hover:text-[#2874F0]'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => {
              const active = currentPath.startsWith(`/category/${cat.slug}`);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className={`whitespace-nowrap shrink-0 py-2 border-b-2 transition-colors ${
                    active
                      ? 'border-[#2874F0] text-[#2874F0] font-semibold'
                      : 'border-transparent hover:text-[#2874F0]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2 text-sm text-slate-800">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/shop');
            }}
            className="block w-full text-left py-2 font-medium"
          >
            Browse All Products
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/cart');
            }}
            className="block w-full text-left py-2 font-medium"
          >
            Shopping Cart ({cartCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/admin');
            }}
            className="block w-full text-left py-2 font-semibold text-[#2874F0]"
          >
            Open Admin Panel
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openAuthModal('seller');
            }}
            className="block w-full text-left py-2 font-medium text-slate-700"
          >
            Become a Seller
          </button>
        </div>
      )}
    </header>
  );
}
