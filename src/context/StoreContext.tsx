import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getAuthToken, setAuthToken } from '../lib/api.ts';
import type {
  Banner,
  CartItem,
  Category,
  NotificationItem,
  Product,
  User,
} from '../types.ts';

const GUEST_CART_KEY = 'shopkart_guest_cart';
const RECENTLY_VIEWED_KEY = 'shopkart_recently_viewed';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  currentPath: string;
  navigate: (path: string) => void;
  user: User | null;
  authLoading: boolean;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  loginModalMode: 'login' | 'register' | 'forgot' | 'seller';
  setLoginModalMode: (mode: 'login' | 'register' | 'forgot' | 'seller') => void;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot' | 'seller') => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  categories: Category[];
  banners: Banner[];
  refreshStoreMeta: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartMrpTotal: number;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, variant?: string, openDrawer?: boolean) => Promise<void>;
  updateCartQty: (productId: string, quantity: number, variant?: string) => Promise<void>;
  removeFromCart: (productId: string, variant?: string) => Promise<void>;
  clearCartLocal: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  recentlyViewed: Product[];
  trackProductView: (product: Product) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationsRead: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState<string>(
    () => window.location.pathname + window.location.search
  );
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<
    'login' | 'register' | 'forgot' | 'seller'
  >('login');

  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      return raw ? (JSON.parse(raw) as Product[]) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshStoreMeta = useCallback(async () => {
    try {
      const [catRes, banRes] = await Promise.all([
        apiRequest<{ categories: Category[] }>('/api/categories'),
        apiRequest<{ banners: Banner[] }>('/api/banners'),
      ]);
      setCategories(catRes.categories);
      setBanners(banRes.banners);
    } catch (err) {
      console.error('Failed to load store metadata:', err);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!getAuthToken()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await apiRequest<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>('/api/notifications');
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  }, []);

  const loadGuestCart = useCallback(async () => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      if (!raw) {
        setCart([]);
        return;
      }
      const items = JSON.parse(raw) as CartItem[];
      const prodRes = await apiRequest<{ products: Product[] }>('/api/products');
      const hydrated = items
        .map((item) => {
          const p = prodRes.products.find((pr) => pr.id === item.productId);
          return p ? { ...item, product: p } : null;
        })
        .filter(Boolean) as CartItem[];
      setCart(hydrated);
    } catch {
      setCart([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      await loadGuestCart();
      return;
    }
    try {
      const [meRes, cartRes] = await Promise.all([
        apiRequest<{ user: User }>('/api/auth/me'),
        apiRequest<{ items: CartItem[] }>('/api/cart'),
      ]);
      setUser(meRes.user);
      setCart(cartRes.items);
      await loadNotifications();
    } catch {
      setAuthToken(null);
      setUser(null);
      await loadGuestCart();
    } finally {
      setAuthLoading(false);
    }
  }, [loadGuestCart, loadNotifications]);

  useEffect(() => {
    void refreshStoreMeta();
    void refreshUser();
  }, [refreshStoreMeta, refreshUser]);

  const openAuthModal = useCallback(
    (mode: 'login' | 'register' | 'forgot' | 'seller' = 'login') => {
      setLoginModalMode(mode);
      setLoginModalOpen(true);
    },
    []
  );

  const mergeGuestCartIfAny = async () => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      if (raw) {
        const guestItems = JSON.parse(raw) as CartItem[];
        if (guestItems.length > 0) {
          const res = await apiRequest<{ items: CartItem[] }>('/api/cart/merge', {
            method: 'POST',
            body: JSON.stringify({
              items: guestItems.map((g) => ({
                productId: g.productId,
                quantity: g.quantity,
                variant: g.variant,
              })),
            }),
          });
          setCart(res.items);
          localStorage.removeItem(GUEST_CART_KEY);
          return;
        }
      }
      const cartRes = await apiRequest<{ items: CartItem[] }>('/api/cart');
      setCart(cartRes.items);
    } catch {
      // ignore
    }
  };

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    setUser(res.user);
    await mergeGuestCartIfAny();
    await loadNotifications();
    showToast(`Welcome back, ${res.user.name}`);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone: string
  ) => {
    const res = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    });
    setAuthToken(res.token);
    setUser(res.user);
    await mergeGuestCartIfAny();
    await loadNotifications();
    showToast('Account created successfully');
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setCart([]);
    setNotifications([]);
    setUnreadCount(0);
    showToast('Signed out', 'info');
    if (currentPath.startsWith('/admin') || currentPath.startsWith('/account')) {
      navigate('/');
    }
  };

  const persistGuestCart = (next: CartItem[]) => {
    try {
      localStorage.setItem(
        GUEST_CART_KEY,
        JSON.stringify(
          next.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            variant: c.variant,
          }))
        )
      );
    } catch {
      // ignore
    }
  };

  const addToCart = async (
    product: Product,
    quantity = 1,
    variant?: string,
    openDrawer = true
  ) => {
    if (product.stock <= 0) {
      showToast('This item is currently out of stock', 'error');
      return;
    }

    const chosenVariant = variant || product.variants[0];

    if (user) {
      const res = await apiRequest<{ items: CartItem[] }>('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity, variant: chosenVariant }),
      });
      setCart(res.items);
    } else {
      setCart((prev) => {
        const existing = prev.find(
          (i) => i.productId === product.id && (i.variant || '') === (chosenVariant || '')
        );
        let next: CartItem[];
        if (existing) {
          next = prev.map((i) =>
            i === existing
              ? { ...i, quantity: Math.min(product.stock, i.quantity + quantity) }
              : i
          );
        } else {
          next = [
            ...prev,
            {
              productId: product.id,
              quantity: Math.min(product.stock, quantity),
              variant: chosenVariant,
              product,
            },
          ];
        }
        persistGuestCart(next);
        return next;
      });
    }

    showToast(`Added ${product.name.slice(0, 32)}... to cart`);
    if (openDrawer) setCartDrawerOpen(true);
  };

  const updateCartQty = async (productId: string, quantity: number, variant?: string) => {
    if (user) {
      const res = await apiRequest<{ items: CartItem[] }>(
        `/api/cart/${encodeURIComponent(productId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ quantity, variant }),
        }
      );
      setCart(res.items);
    } else {
      setCart((prev) => {
        const next =
          quantity <= 0
            ? prev.filter(
                (i) =>
                  !(
                    i.productId === productId &&
                    (variant === undefined || (i.variant || '') === variant)
                  )
              )
            : prev.map((i) =>
                i.productId === productId &&
                (variant === undefined || (i.variant || '') === variant)
                  ? { ...i, quantity }
                  : i
              );
        persistGuestCart(next);
        return next;
      });
    }
  };

  const removeFromCart = async (productId: string, variant?: string) => {
    if (user) {
      const qs = variant ? `?variant=${encodeURIComponent(variant)}` : '';
      const res = await apiRequest<{ items: CartItem[] }>(
        `/api/cart/${encodeURIComponent(productId)}${qs}`,
        { method: 'DELETE' }
      );
      setCart(res.items);
    } else {
      setCart((prev) => {
        const next = prev.filter(
          (i) =>
            !(
              i.productId === productId &&
              (variant === undefined || (i.variant || '') === variant)
            )
        );
        persistGuestCart(next);
        return next;
      });
    }
    showToast('Item removed from cart', 'info');
  };

  const clearCartLocal = () => {
    setCart([]);
    localStorage.removeItem(GUEST_CART_KEY);
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      openAuthModal('login');
      showToast('Please sign in to save items to your wishlist', 'info');
      return;
    }
    try {
      const res = await apiRequest<{ wishlist: string[]; added: boolean }>(
        `/api/auth/wishlist/${encodeURIComponent(productId)}`,
        { method: 'POST' }
      );
      setUser((prev) => (prev ? { ...prev, wishlist: res.wishlist } : prev));
      showToast(res.added ? 'Saved to wishlist' : 'Removed from wishlist', 'info');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const trackProductView = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const markNotificationsRead = async () => {
    if (!user) return;
    try {
      await apiRequest('/api/notifications/read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );
  const cartMrpTotal = cart.reduce(
    (sum, item) => sum + (item.product?.mrp || item.product?.price || 0) * item.quantity,
    0
  );

  return (
    <StoreContext.Provider
      value={{
        currentPath,
        navigate,
        user,
        authLoading,
        loginModalOpen,
        setLoginModalOpen,
        loginModalMode,
        setLoginModalMode,
        openAuthModal,
        login,
        register,
        logout,
        refreshUser,
        categories,
        banners,
        refreshStoreMeta,
        cart,
        cartCount,
        cartSubtotal,
        cartMrpTotal,
        cartDrawerOpen,
        setCartDrawerOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCartLocal,
        toggleWishlist,
        recentlyViewed,
        trackProductView,
        notifications,
        unreadCount,
        markNotificationsRead,
        toasts,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
