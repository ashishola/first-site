export type UserRole = 'customer' | 'seller' | 'admin';

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  label: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  storeName?: string;
  addresses: Address[];
  wishlist: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  featured: boolean;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  categorySlug: string;
  description: string;
  price: number;
  mrp: number;
  discountPercent: number;
  stock: number;
  sku: string;
  images: string[];
  variants: string[];
  specifications: ProductSpec[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  isTopDeal: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isFlashSale: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  variant?: string;
  product?: Product;
}

export type OrderStatus =
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'RAZORPAY';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  mrp: number;
  quantity: number;
  variant?: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  active: boolean;
  expiresAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  targetPath: string;
  image: string;
  badgeText: string;
  active: boolean;
  order: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'offer' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface PaymentMethodItemConfig {
  enabled: boolean;
  label: string;
  description: string;
  merchantUpiId?: string;
  maxOrderAmount?: number;
  handlingFee?: number;
}

export interface PaymentSettings {
  methods: Record<PaymentMethod, PaymentMethodItemConfig>;
  freeShippingThreshold: number;
  standardShippingFee: number;
}

export interface AdminAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  lowStockCount: number;
  averageOrderValue: number;
  revenueByCategory: Array<{ category: string; revenue: number; orders: number }>;
  ordersByStatus: Record<string, number>;
  recentOrders: Order[];
}
