import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  optionalAuth,
  requireAdminOrSeller,
  requireAuth,
  signToken,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { getDb, initDatabase, sanitizeUser, saveDb } from './server/db.ts';
import type {
  Address,
  AdminAnalytics,
  Banner,
  Category,
  Coupon,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentSettings,
  Product,
  ProductReview,
} from './src/types.ts';

dotenv.config();

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `vc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const isLive = Boolean(keyId && keySecret);
  return {
    keyId: keyId || 'rzp_test_shopkart_sandbox',
    keySecret: keySecret || 'shopkart_sandbox_hmac_secret',
    isLive,
  };
}

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'shopkart-api', timestamp: new Date().toISOString() });
  });

  // =========================================================================
  // AUTHENTICATION & ACCOUNT ROUTES
  // =========================================================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone } = req.body as {
        name?: string;
        email?: string;
        password?: string;
        phone?: string;
      };

      if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
        res.status(400).json({
          error: 'Name, valid email, and password (minimum 6 characters) are required.',
        });
        return;
      }

      const db = getDb();
      const normalizedEmail = email.trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: makeId('usr'),
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || '',
        role: 'customer' as const,
        passwordHash,
        addresses: [],
        wishlist: [],
        cart: [],
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      db.notifications.unshift({
        id: makeId('notif'),
        userId: newUser.id,
        title: 'Welcome to ShopKart',
        message: 'Use code WELCOME200 for flat ₹200 off your first order above ₹999.',
        type: 'offer',
        read: false,
        link: '/shop',
        createdAt: new Date().toISOString(),
      });
      await saveDb();

      const token = signToken(newUser);
      res.status(201).json({ token, user: sanitizeUser(newUser) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email?.trim() || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const db = getDb();
      const user = db.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const token = signToken(user);
      res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: 'Please enter your registered email address.' });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user) {
      res.status(404).json({ error: 'No account found with that email address.' });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    await saveDb();

    // Return verification code in dev/demo response so flow can be completed end-to-end without SMTP server
    res.json({
      message: 'Verification code generated for your account.',
      verificationCode: code,
    });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email?.trim() || !code?.trim() || !newPassword || newPassword.length < 6) {
      res.status(400).json({
        error: 'Email, verification code, and a new password (min 6 chars) are required.',
      });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user || user.resetCode !== code.trim()) {
      res.status(400).json({ error: 'Invalid verification code or email.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    delete user.resetCode;
    await saveDb();

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { name, phone } = req.body as { name?: string; phone?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Name is required.' });
      return;
    }
    req.user!.name = name.trim();
    if (phone !== undefined) req.user!.phone = phone.trim();
    await saveDb();
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.post('/api/auth/become-seller', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { storeName, phone } = req.body as { storeName?: string; phone?: string };
    if (!storeName?.trim()) {
      res.status(400).json({ error: 'Store name is required.' });
      return;
    }
    if (req.user!.role === 'customer') {
      req.user!.role = 'seller';
    }
    req.user!.storeName = storeName.trim();
    if (phone?.trim()) req.user!.phone = phone.trim();
    await saveDb();
    const token = signToken(req.user!);
    res.json({ token, user: sanitizeUser(req.user!) });
  });

  // Saved Addresses CRUD
  app.post('/api/auth/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
    const body = req.body as Partial<Address>;
    if (!body.fullName || !body.phone || !body.line1 || !body.city || !body.state || !body.postalCode) {
      res.status(400).json({ error: 'All required address fields must be filled.' });
      return;
    }

    const newAddr: Address = {
      id: makeId('addr'),
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      line1: body.line1.trim(),
      line2: body.line2?.trim() || '',
      city: body.city.trim(),
      state: body.state.trim(),
      postalCode: body.postalCode.trim(),
      label: body.label || 'Home',
      isDefault: Boolean(body.isDefault) || req.user!.addresses.length === 0,
    };

    if (newAddr.isDefault) {
      req.user!.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }
    req.user!.addresses.push(newAddr);
    await saveDb();
    res.status(201).json({ addresses: req.user!.addresses, address: newAddr });
  });

  app.put('/api/auth/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const addr = req.user!.addresses.find((a) => a.id === req.params.id);
    if (!addr) {
      res.status(404).json({ error: 'Address not found.' });
      return;
    }
    const body = req.body as Partial<Address>;
    Object.assign(addr, {
      fullName: body.fullName ?? addr.fullName,
      phone: body.phone ?? addr.phone,
      line1: body.line1 ?? addr.line1,
      line2: body.line2 ?? addr.line2,
      city: body.city ?? addr.city,
      state: body.state ?? addr.state,
      postalCode: body.postalCode ?? addr.postalCode,
      label: body.label ?? addr.label,
    });
    if (body.isDefault) {
      req.user!.addresses.forEach((a) => {
        a.isDefault = a.id === addr.id;
      });
    }
    await saveDb();
    res.json({ addresses: req.user!.addresses });
  });

  app.delete('/api/auth/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    req.user!.addresses = req.user!.addresses.filter((a) => a.id !== req.params.id);
    if (req.user!.addresses.length > 0 && !req.user!.addresses.some((a) => a.isDefault)) {
      req.user!.addresses[0].isDefault = true;
    }
    await saveDb();
    res.json({ addresses: req.user!.addresses });
  });

  // Wishlist toggle
  app.post('/api/auth/wishlist/:productId', requireAuth, async (req: AuthenticatedRequest, res) => {
    const productId = String(req.params.productId);
    const idx = req.user!.wishlist.indexOf(productId);
    let added = false;
    if (idx >= 0) {
      req.user!.wishlist.splice(idx, 1);
    } else {
      req.user!.wishlist.push(productId);
      added = true;
    }
    await saveDb();
    res.json({ wishlist: req.user!.wishlist, added });
  });

  // =========================================================================
  // CATALOG, SEARCH, CATEGORIES, BANNERS & REVIEWS
  // =========================================================================
  app.get('/api/categories', (_req, res) => {
    const db = getDb();
    res.json({ categories: db.categories });
  });

  app.get('/api/banners', (_req, res) => {
    const db = getDb();
    const active = db.banners
      .filter((b) => b.active)
      .sort((a, b) => a.order - b.order);
    res.json({ banners: active });
  });

  app.get('/api/products/suggestions', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const db = getDb();
    if (!q) {
      res.json({
        suggestions: db.products.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
          price: p.price,
          image: p.images[0],
        })),
      });
      return;
    }

    const matches = db.products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 7)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price,
        image: p.images[0],
      }));
    res.json({ suggestions: matches });
  });

  app.get('/api/products', (req, res) => {
    const db = getDb();
    let list = [...db.products];

    const category = String(req.query.category || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const section = String(req.query.section || '').trim().toLowerCase();
    const minPrice = Number(req.query.minPrice || 0);
    const maxPrice = Number(req.query.maxPrice || 0);
    const minRating = Number(req.query.minRating || 0);
    const minDiscount = Number(req.query.minDiscount || 0);
    const inStockOnly = req.query.inStock === 'true';
    const sort = String(req.query.sort || 'popularity');

    if (category && category !== 'all') {
      list = list.filter(
        (p) =>
          p.categorySlug.toLowerCase() === category ||
          p.category.toLowerCase() === category
      );
    }

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (section === 'top-deals') list = list.filter((p) => p.isTopDeal);
    if (section === 'best-selling') list = list.filter((p) => p.isBestSeller);
    if (section === 'trending') list = list.filter((p) => p.isTrending);
    if (section === 'flash-sale') list = list.filter((p) => p.isFlashSale);

    if (minPrice > 0) list = list.filter((p) => p.price >= minPrice);
    if (maxPrice > 0) list = list.filter((p) => p.price <= maxPrice);
    if (minRating > 0) list = list.filter((p) => p.rating >= minRating);
    if (minDiscount > 0) list = list.filter((p) => p.discountPercent >= minDiscount);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'popularity':
      default:
        list.sort((a, b) => b.soldCount - a.soldCount);
        break;
    }

    res.json({ products: list, total: list.length });
  });

  app.get('/api/products/:slugOrId', (req, res) => {
    const db = getDb();
    const key = req.params.slugOrId;
    const product = db.products.find((p) => p.id === key || p.slug === key);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const reviews = db.reviews
      .filter((r) => r.productId === product.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const related = db.products
      .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
      .slice(0, 4);

    const fallbackRelated =
      related.length < 4
        ? [
            ...related,
            ...db.products
              .filter(
                (p) => p.id !== product.id && !related.some((r) => r.id === p.id)
              )
              .slice(0, 4 - related.length),
          ]
        : related;

    res.json({ product, reviews, related: fallbackRelated });
  });

  app.post(
    '/api/products/:id/reviews',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const product = db.products.find((p) => p.id === req.params.id);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const { rating, title, comment } = req.body as {
        rating?: number;
        title?: string;
        comment?: string;
      };

      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5 || !comment?.trim()) {
        res.status(400).json({ error: 'Rating (1-5) and review comment are required.' });
        return;
      }

      const hasBought = db.orders.some(
        (o) =>
          o.userId === req.user!.id &&
          o.items.some((item) => item.productId === product.id)
      );

      const review: ProductReview = {
        id: makeId('rev'),
        productId: product.id,
        userId: req.user!.id,
        userName: req.user!.name,
        rating: numRating,
        title: title?.trim() || 'Customer Review',
        comment: comment.trim(),
        verifiedPurchase: hasBought,
        createdAt: new Date().toISOString(),
      };

      db.reviews.unshift(review);

      const productReviews = db.reviews.filter((r) => r.productId === product.id);
      const totalScore =
        product.rating * product.reviewCount + numRating;
      product.reviewCount += 1;
      product.rating = Number((totalScore / product.reviewCount).toFixed(1));
      if (productReviews.length > 0 && product.reviewCount < productReviews.length) {
        product.reviewCount = productReviews.length;
      }

      await saveDb();
      res.status(201).json({ review, product });
    }
  );

  // =========================================================================
  // CART & COUPONS
  // =========================================================================
  app.get('/api/cart', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const hydrated = req.user!.cart
      .map((item) => {
        const product = db.products.find((p) => p.id === item.productId);
        return product ? { ...item, product } : null;
      })
      .filter(Boolean);
    res.json({ items: hydrated });
  });

  app.post('/api/cart', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { productId, quantity = 1, variant } = req.body as {
      productId?: string;
      quantity?: number;
      variant?: string;
    };
    const db = getDb();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const existing = req.user!.cart.find(
      (c) => c.productId === productId && (c.variant || '') === (variant || '')
    );
    if (existing) {
      existing.quantity = Math.min(product.stock, existing.quantity + Number(quantity));
    } else {
      req.user!.cart.push({
        productId: product.id,
        quantity: Math.min(product.stock, Math.max(1, Number(quantity))),
        variant: variant || product.variants[0],
      });
    }

    await saveDb();
    const hydrated = req.user!.cart
      .map((item) => {
        const p = db.products.find((prod) => prod.id === item.productId);
        return p ? { ...item, product: p } : null;
      })
      .filter(Boolean);
    res.json({ items: hydrated });
  });

  app.put('/api/cart/:productId', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { quantity, variant } = req.body as { quantity?: number; variant?: string };
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.productId);
    const item = req.user!.cart.find(
      (c) =>
        c.productId === req.params.productId &&
        (variant === undefined || (c.variant || '') === variant)
    );
    if (!item) {
      res.status(404).json({ error: 'Cart item not found.' });
      return;
    }

    const qty = Number(quantity);
    if (qty <= 0) {
      req.user!.cart = req.user!.cart.filter((c) => c !== item);
    } else {
      item.quantity = product ? Math.min(product.stock, qty) : qty;
    }
    await saveDb();

    const hydrated = req.user!.cart
      .map((c) => {
        const p = db.products.find((prod) => prod.id === c.productId);
        return p ? { ...c, product: p } : null;
      })
      .filter(Boolean);
    res.json({ items: hydrated });
  });

  app.delete('/api/cart/:productId', requireAuth, async (req: AuthenticatedRequest, res) => {
    const variant = req.query.variant ? String(req.query.variant) : undefined;
    req.user!.cart = req.user!.cart.filter(
      (c) =>
        !(
          c.productId === req.params.productId &&
          (variant === undefined || (c.variant || '') === variant)
        )
    );
    await saveDb();
    const db = getDb();
    const hydrated = req.user!.cart
      .map((c) => {
        const p = db.products.find((prod) => prod.id === c.productId);
        return p ? { ...c, product: p } : null;
      })
      .filter(Boolean);
    res.json({ items: hydrated });
  });

  app.post('/api/cart/merge', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { items } = req.body as {
      items?: Array<{ productId: string; quantity: number; variant?: string }>;
    };
    const db = getDb();
    if (Array.isArray(items)) {
      for (const incoming of items) {
        const product = db.products.find((p) => p.id === incoming.productId);
        if (!product || product.stock <= 0) continue;
        const existing = req.user!.cart.find(
          (c) =>
            c.productId === incoming.productId &&
            (c.variant || '') === (incoming.variant || '')
        );
        if (existing) {
          existing.quantity = Math.min(
            product.stock,
            Math.max(existing.quantity, incoming.quantity)
          );
        } else {
          req.user!.cart.push({
            productId: product.id,
            quantity: Math.min(product.stock, Math.max(1, incoming.quantity)),
            variant: incoming.variant || product.variants[0],
          });
        }
      }
      await saveDb();
    }
    const hydrated = req.user!.cart
      .map((c) => {
        const p = db.products.find((prod) => prod.id === c.productId);
        return p ? { ...c, product: p } : null;
      })
      .filter(Boolean);
    res.json({ items: hydrated });
  });

  app.get('/api/coupons/active', (_req, res) => {
    const db = getDb();
    const now = new Date().toISOString();
    res.json({
      coupons: db.coupons.filter((c) => c.active && c.expiresAt >= now),
    });
  });

  app.post('/api/coupons/validate', (req, res) => {
    const { code, subtotal } = req.body as { code?: string; subtotal?: number };
    const db = getDb();
    const normalized = String(code || '').trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === normalized);

    if (!coupon || !coupon.active) {
      res.status(404).json({ error: 'Invalid or inactive coupon code.' });
      return;
    }

    if (new Date(coupon.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: 'This coupon has expired.' });
      return;
    }

    const orderAmount = Number(subtotal || 0);
    if (orderAmount < coupon.minOrderAmount) {
      res.status(400).json({
        error: `Minimum order value of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for ${coupon.code}.`,
      });
      return;
    }

    let discount =
      coupon.discountType === 'percentage'
        ? Math.round((orderAmount * coupon.discountValue) / 100)
        : coupon.discountValue;

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    res.json({ coupon, discount });
  });

  // =========================================================================
  // ORDERS & RAZORPAY PAYMENT GATEWAY
  // =========================================================================
  app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { items, shippingAddress, paymentMethod, couponCode } = req.body as {
        items?: Array<{ productId: string; quantity: number; variant?: string }>;
        shippingAddress?: Address;
        paymentMethod?: PaymentMethod;
        couponCode?: string;
      };

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Your cart is empty.' });
        return;
      }

      if (
        !shippingAddress ||
        !shippingAddress.fullName ||
        !shippingAddress.phone ||
        !shippingAddress.line1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.postalCode
      ) {
        res.status(400).json({ error: 'Complete shipping address is required.' });
        return;
      }

      const db = getDb();
      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const reqItem of items) {
        const prod = db.products.find((p) => p.id === reqItem.productId);
        if (!prod) {
          res.status(404).json({ error: `Product not found (${reqItem.productId}).` });
          return;
        }
        if (prod.stock < reqItem.quantity) {
          res.status(400).json({
            error: `Only ${prod.stock} units left for ${prod.name}.`,
          });
          return;
        }

        subtotal += prod.price * reqItem.quantity;
        orderItems.push({
          productId: prod.id,
          name: prod.name,
          slug: prod.slug,
          image: prod.images[0] || '',
          price: prod.price,
          mrp: prod.mrp,
          quantity: reqItem.quantity,
          variant: reqItem.variant || prod.variants[0],
        });
      }

      let discount = 0;
      let appliedCode: string | undefined;
      if (couponCode?.trim()) {
        const coupon = db.coupons.find(
          (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active
        );
        if (coupon && subtotal >= coupon.minOrderAmount) {
          discount =
            coupon.discountType === 'percentage'
              ? Math.round((subtotal * coupon.discountValue) / 100)
              : coupon.discountValue;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
          appliedCode = coupon.code;
        }
      }

      const paymentSettings = db.paymentSettings;
      const method: PaymentMethod = paymentMethod || 'COD';
      const methodConfig = paymentSettings.methods[method];
      if (!methodConfig || !methodConfig.enabled) {
        res.status(400).json({
          error: `${methodConfig?.label || method} is currently disabled by the store administrator.`,
        });
        return;
      }

      const discountedSubtotal = Math.max(0, subtotal - discount);
      const baseShippingFee =
        paymentSettings.freeShippingThreshold <= 0 ||
        discountedSubtotal >= paymentSettings.freeShippingThreshold
          ? 0
          : paymentSettings.standardShippingFee;
      const codFee =
        method === 'COD' && methodConfig.handlingFee && methodConfig.handlingFee > 0
          ? methodConfig.handlingFee
          : 0;
      const shippingFee = baseShippingFee + codFee;
      const total = discountedSubtotal + shippingFee;

      if (
        method === 'COD' &&
        methodConfig.maxOrderAmount &&
        methodConfig.maxOrderAmount > 0 &&
        total > methodConfig.maxOrderAmount
      ) {
        res.status(400).json({
          error: `Cash on Delivery is available only for orders up to ₹${methodConfig.maxOrderAmount.toLocaleString('en-IN')}. Please use UPI, Card, or Razorpay.`,
        });
        return;
      }

      const now = new Date().toISOString();
      const orderNum = `SK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const order: Order = {
        id: makeId('ord'),
        orderNumber: orderNum,
        userId: req.user!.id,
        customerName: req.user!.name,
        customerEmail: req.user!.email,
        items: orderItems,
        shippingAddress,
        subtotal,
        discount,
        couponCode: appliedCode,
        shippingFee,
        total,
        paymentMethod: method,
        paymentStatus: 'Pending',
        status: 'Confirmed',
        timeline: [
          {
            status: 'Confirmed',
            timestamp: now,
            note:
              method === 'COD'
                ? 'Cash on Delivery order confirmed'
                : 'Order initiated — awaiting online payment confirmation',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      // For COD, finalize immediately: decrement stock and clear cart
      if (method === 'COD') {
        for (const item of orderItems) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            prod.stock = Math.max(0, prod.stock - item.quantity);
            prod.soldCount += item.quantity;
          }
        }
        req.user!.cart = [];
        db.notifications.unshift({
          id: makeId('notif'),
          userId: req.user!.id,
          title: `Order ${order.orderNumber} Confirmed`,
          message: `Your COD order of ₹${order.total.toLocaleString('en-IN')} is confirmed and being prepared.`,
          type: 'order',
          read: false,
          link: `/payment/success/${order.id}`,
          createdAt: now,
        });
      }

      db.orders.unshift(order);
      await saveDb();

      res.status(201).json({ order });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/payments/settings', (_req, res) => {
    const db = getDb();
    const rzp = getRazorpayConfig();
    res.json({
      paymentSettings: db.paymentSettings,
      razorpayMode: rzp.isLive ? 'live' : 'sandbox',
    });
  });

  app.post(
    '/api/payments/razorpay/order',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { orderId } = req.body as { orderId?: string };
        const db = getDb();
        const order = db.orders.find(
          (o) => o.id === orderId && o.userId === req.user!.id
        );
        if (!order) {
          res.status(404).json({ error: 'Order not found.' });
          return;
        }

        const rzp = getRazorpayConfig();
        let razorpayOrderId = `order_rzp_${crypto.randomBytes(6).toString('hex')}`;

        if (rzp.isLive) {
          const authHeader = Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString(
            'base64'
          );
          const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Math.round(order.total * 100),
              currency: 'INR',
              receipt: order.orderNumber,
            }),
          });
          if (response.ok) {
            const data = (await response.json()) as { id: string };
            razorpayOrderId = data.id;
          }
        }

        order.razorpayOrderId = razorpayOrderId;
        await saveDb();

        res.json({
          razorpayOrderId,
          amount: Math.round(order.total * 100),
          currency: 'INR',
          keyId: rzp.keyId,
          isLive: rzp.isLive,
        });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  app.post(
    '/api/payments/razorpay/verify',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const {
          orderId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          simulateFailure,
        } = req.body as {
          orderId?: string;
          razorpayOrderId?: string;
          razorpayPaymentId?: string;
          razorpaySignature?: string;
          simulateFailure?: boolean;
        };

        const db = getDb();
        const order = db.orders.find(
          (o) => o.id === orderId && o.userId === req.user!.id
        );
        if (!order) {
          res.status(404).json({ error: 'Order not found.' });
          return;
        }

        const now = new Date().toISOString();
        if (simulateFailure) {
          order.paymentStatus = 'Failed';
          order.updatedAt = now;
          await saveDb();
          res.status(402).json({
            verified: false,
            error: 'Payment declined by issuing bank. Please try another payment method.',
            order,
          });
          return;
        }

        const rzp = getRazorpayConfig();
        const rzpOrder = razorpayOrderId || order.razorpayOrderId || '';
        const rzpPayment =
          razorpayPaymentId || `pay_rzp_${crypto.randomBytes(6).toString('hex')}`;

        // Verify cryptographic HMAC signature if live Razorpay or provided signature
        if (rzp.isLive && razorpaySignature) {
          const expected = crypto
            .createHmac('sha256', rzp.keySecret)
            .update(`${rzpOrder}|${rzpPayment}`)
            .digest('hex');
          if (expected !== razorpaySignature) {
            order.paymentStatus = 'Failed';
            order.updatedAt = now;
            await saveDb();
            res.status(400).json({ verified: false, error: 'Payment signature verification failed.' });
            return;
          }
        }

        if (order.paymentStatus !== 'Paid') {
          for (const item of order.items) {
            const prod = db.products.find((p) => p.id === item.productId);
            if (prod) {
              prod.stock = Math.max(0, prod.stock - item.quantity);
              prod.soldCount += item.quantity;
            }
          }
          req.user!.cart = [];
        }

        order.paymentStatus = 'Paid';
        order.razorpayOrderId = rzpOrder;
        order.razorpayPaymentId = rzpPayment;
        order.timeline[0] = {
          status: 'Confirmed',
          timestamp: now,
          note: `Online payment verified (${order.paymentMethod}) · Ref ${rzpPayment}`,
        };
        order.updatedAt = now;

        db.notifications.unshift({
          id: makeId('notif'),
          userId: req.user!.id,
          title: `Payment Successful · ${order.orderNumber}`,
          message: `₹${order.total.toLocaleString('en-IN')} paid successfully. Your items are being packed.`,
          type: 'order',
          read: false,
          link: `/payment/success/${order.id}`,
          createdAt: now,
        });

        await saveDb();
        res.json({ verified: true, order });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  app.get('/api/orders/my', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const myOrders = db.orders
      .filter((o) => o.userId === req.user!.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ orders: myOrders });
  });

  app.get('/api/orders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const order = db.orders.find(
      (o) =>
        o.id === req.params.id &&
        (o.userId === req.user!.id || req.user!.role === 'admin' || req.user!.role === 'seller')
    );
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order });
  });

  app.post('/api/orders/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const order = db.orders.find(
      (o) => o.id === req.params.id && o.userId === req.user!.id
    );
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      res.status(400).json({ error: `Order cannot be cancelled once ${order.status}.` });
      return;
    }

    const now = new Date().toISOString();
    order.status = 'Cancelled';
    if (order.paymentStatus === 'Paid') {
      order.paymentStatus = 'Refunded';
    }
    order.timeline.push({
      status: 'Cancelled',
      timestamp: now,
      note: 'Cancelled by customer — stock restored',
    });
    order.updatedAt = now;

    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
        prod.soldCount = Math.max(0, prod.soldCount - item.quantity);
      }
    }

    await saveDb();
    res.json({ order });
  });

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  app.get('/api/notifications', optionalAuth, (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.json({ notifications: [], unreadCount: 0 });
      return;
    }
    const db = getDb();
    const list = db.notifications
      .filter((n) => n.userId === req.user!.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
    });
  });

  app.post('/api/notifications/read', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.notifications
      .filter((n) => n.userId === req.user!.id)
      .forEach((n) => {
        n.read = true;
      });
    await saveDb();
    res.json({ ok: true });
  });

  // =========================================================================
  // IMAGE UPLOAD (CLOUDINARY + LOCAL STORAGE FALLBACK)
  // =========================================================================
  app.post(
    '/api/upload',
    requireAuth,
    requireAdminOrSeller,
    upload.single('image'),
    async (req, res) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'No image file provided.' });
          return;
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
        const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
        const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

        if (cloudName && apiKey && apiSecret) {
          const timestamp = Math.floor(Date.now() / 1000);
          const signature = crypto
            .createHash('sha1')
            .update(`timestamp=${timestamp}${apiSecret}`)
            .digest('hex');

          const fileBuffer = fs.readFileSync(req.file.path);
          const form = new FormData();
          form.append('file', new Blob([fileBuffer]), req.file.originalname);
          form.append('api_key', apiKey);
          form.append('timestamp', String(timestamp));
          form.append('signature', signature);

          const cloudRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: form }
          );

          if (cloudRes.ok) {
            const cloudData = (await cloudRes.json()) as { secure_url: string };
            fs.unlinkSync(req.file.path);
            res.json({ url: cloudData.secure_url, provider: 'cloudinary' });
            return;
          }
        }

        res.json({ url: `/uploads/${req.file.filename}`, provider: 'local' });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  // =========================================================================
  // ADMIN DASHBOARD APIS
  // =========================================================================
  app.get(
    '/api/admin/analytics',
    requireAuth,
    requireAdminOrSeller,
    (_req, res) => {
      const db = getDb();
      const validOrders = db.orders.filter((o) => o.status !== 'Cancelled');
      const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = db.orders.length;
      const totalUsers = db.users.length;
      const totalProducts = db.products.length;
      const lowStockCount = db.products.filter((p) => p.stock <= 20).length;
      const averageOrderValue =
        validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

      const catMap = new Map<string, { revenue: number; orders: number }>();
      for (const order of validOrders) {
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          const catName = prod?.category || 'Other';
          const prev = catMap.get(catName) || { revenue: 0, orders: 0 };
          prev.revenue += item.price * item.quantity;
          prev.orders += item.quantity;
          catMap.set(catName, prev);
        }
      }

      const revenueByCategory = Array.from(catMap.entries())
        .map(([category, stats]) => ({ category, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

      const ordersByStatus: Record<string, number> = {};
      for (const order of db.orders) {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      }

      const analytics: AdminAnalytics = {
        totalRevenue,
        totalOrders,
        totalUsers,
        totalProducts,
        lowStockCount,
        averageOrderValue,
        revenueByCategory,
        ordersByStatus,
        recentOrders: db.orders.slice(0, 8),
      };

      res.json({ analytics });
    }
  );

  app.get('/api/admin/users', requireAuth, requireAdminOrSeller, (_req, res) => {
    const db = getDb();
    res.json({ users: db.users.map(sanitizeUser) });
  });

  app.put(
    '/api/admin/users/:id/role',
    requireAuth,
    requireAdminOrSeller,
    async (req: AuthenticatedRequest, res) => {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Only admins can update user roles.' });
        return;
      }
      const { role } = req.body as { role?: 'customer' | 'seller' | 'admin' };
      if (!role || !['customer', 'seller', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Valid role (customer, seller, admin) is required.' });
        return;
      }
      const db = getDb();
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      target.role = role;
      await saveDb();
      res.json({ user: sanitizeUser(target) });
    }
  );

  app.post(
    '/api/admin/customers/reset',
    requireAuth,
    requireAdminOrSeller,
    async (req: AuthenticatedRequest, res) => {
      if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Only admins can reset customer records.' });
        return;
      }

      const db = getDb();
      const removedIds = new Set(
        db.users.filter((u) => u.role === 'customer').map((u) => u.id)
      );

      db.users = db.users.filter((u) => u.role !== 'customer');
      db.orders = db.orders.filter((o) => !removedIds.has(o.userId));
      db.notifications = db.notifications.filter((n) => !removedIds.has(n.userId));
      db.reviews = db.reviews.filter((r) => !removedIds.has(r.userId));

      await saveDb();
      res.json({
        removedCount: removedIds.size,
        users: db.users.map(sanitizeUser),
      });
    }
  );

  // Admin Products CRUD
  app.post('/api/admin/products', requireAuth, requireAdminOrSeller, async (req, res) => {
    const body = req.body as Partial<Product>;
    if (!body.name?.trim() || !body.category?.trim() || !body.price) {
      res.status(400).json({ error: 'Product name, category, and price are required.' });
      return;
    }

    const db = getDb();
    const price = Number(body.price);
    const mrp = Math.max(price, Number(body.mrp || price));
    const discountPercent =
      mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

    const newProduct: Product = {
      id: makeId('prod'),
      name: body.name.trim(),
      slug: `${slugify(body.name)}-${crypto.randomBytes(2).toString('hex')}`,
      brand: body.brand?.trim() || 'ShopKart Select',
      category: body.category.trim(),
      categorySlug: slugify(body.category),
      description: body.description?.trim() || 'Quality verified marketplace product.',
      price,
      mrp,
      discountPercent,
      stock: Number(body.stock ?? 25),
      sku: body.sku?.trim() || `VC-${Date.now().toString().slice(-6)}`,
      images:
        Array.isArray(body.images) && body.images.length > 0
          ? body.images
          : ['/src/assets/images/prod_smartphone_pro_1794932425046.jpg'],
      variants:
        Array.isArray(body.variants) && body.variants.length > 0
          ? body.variants
          : ['Standard'],
      specifications: Array.isArray(body.specifications) ? body.specifications : [],
      rating: 4.5,
      reviewCount: 0,
      soldCount: 0,
      isTopDeal: Boolean(body.isTopDeal),
      isBestSeller: Boolean(body.isBestSeller),
      isTrending: Boolean(body.isTrending),
      isFlashSale: Boolean(body.isFlashSale),
      createdAt: new Date().toISOString(),
    };

    db.products.unshift(newProduct);
    await saveDb();
    res.status(201).json({ product: newProduct });
  });

  app.put('/api/admin/products/:id', requireAuth, requireAdminOrSeller, async (req, res) => {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const body = req.body as Partial<Product>;
    const price = body.price !== undefined ? Number(body.price) : product.price;
    const mrp = body.mrp !== undefined ? Math.max(price, Number(body.mrp)) : product.mrp;
    const discountPercent =
      mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

    Object.assign(product, {
      name: body.name ?? product.name,
      brand: body.brand ?? product.brand,
      category: body.category ?? product.category,
      categorySlug: body.category ? slugify(body.category) : product.categorySlug,
      description: body.description ?? product.description,
      price,
      mrp,
      discountPercent,
      stock: body.stock !== undefined ? Math.max(0, Number(body.stock)) : product.stock,
      sku: body.sku ?? product.sku,
      images:
        Array.isArray(body.images) && body.images.length > 0
          ? body.images
          : product.images,
      variants:
        Array.isArray(body.variants) && body.variants.length > 0
          ? body.variants
          : product.variants,
      specifications: body.specifications ?? product.specifications,
      isTopDeal: body.isTopDeal ?? product.isTopDeal,
      isBestSeller: body.isBestSeller ?? product.isBestSeller,
      isTrending: body.isTrending ?? product.isTrending,
      isFlashSale: body.isFlashSale ?? product.isFlashSale,
    });

    await saveDb();
    res.json({ product });
  });

  app.delete(
    '/api/admin/products/:id',
    requireAuth,
    requireAdminOrSeller,
    async (req, res) => {
      const db = getDb();
      db.products = db.products.filter((p) => p.id !== req.params.id);
      await saveDb();
      res.json({ ok: true });
    }
  );

  // Admin Categories CRUD
  app.post('/api/admin/categories', requireAuth, requireAdminOrSeller, async (req, res) => {
    const body = req.body as Partial<Category>;
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const db = getDb();
    const cat: Category = {
      id: makeId('cat'),
      name: body.name.trim(),
      slug: slugify(body.name),
      description: body.description?.trim() || `${body.name.trim()} collection`,
      image: body.image?.trim() || '/src/assets/images/prod_laptop_ultra_1794932425670.jpg',
      featured: body.featured ?? true,
    };
    db.categories.push(cat);
    await saveDb();
    res.status(201).json({ category: cat });
  });

  app.delete(
    '/api/admin/categories/:id',
    requireAuth,
    requireAdminOrSeller,
    async (req, res) => {
      const db = getDb();
      db.categories = db.categories.filter((c) => c.id !== req.params.id);
      await saveDb();
      res.json({ ok: true });
    }
  );

  // Admin Orders Management
  app.get('/api/admin/orders', requireAuth, requireAdminOrSeller, (_req, res) => {
    const db = getDb();
    const sorted = [...db.orders].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    res.json({ orders: sorted });
  });

  app.put(
    '/api/admin/orders/:id/status',
    requireAuth,
    requireAdminOrSeller,
    async (req, res) => {
      const { status, note } = req.body as { status?: OrderStatus; note?: string };
      const db = getDb();
      const order = db.orders.find((o) => o.id === req.params.id);
      if (!order || !status) {
        res.status(404).json({ error: 'Order or valid status not found.' });
        return;
      }

      const now = new Date().toISOString();
      order.status = status;
      if (status === 'Delivered' && order.paymentMethod === 'COD') {
        order.paymentStatus = 'Paid';
      }
      order.timeline.push({
        status,
        timestamp: now,
        note: note?.trim() || `Order status updated to ${status}`,
      });
      order.updatedAt = now;

      db.notifications.unshift({
        id: makeId('notif'),
        userId: order.userId,
        title: `Order ${order.orderNumber} · ${status}`,
        message: note?.trim() || `Your order is now ${status}.`,
        type: 'order',
        read: false,
        link: '/account?tab=orders',
        createdAt: now,
      });

      await saveDb();
      res.json({ order });
    }
  );

  // Admin Coupons CRUD
  app.get('/api/admin/coupons', requireAuth, requireAdminOrSeller, (_req, res) => {
    res.json({ coupons: getDb().coupons });
  });

  app.post('/api/admin/coupons', requireAuth, requireAdminOrSeller, async (req, res) => {
    const body = req.body as Partial<Coupon>;
    if (!body.code?.trim() || !body.discountValue) {
      res.status(400).json({ error: 'Coupon code and discount value are required.' });
      return;
    }
    const db = getDb();
    const coupon: Coupon = {
      id: makeId('cpn'),
      code: body.code.trim().toUpperCase(),
      description: body.description?.trim() || 'Promotional discount',
      discountType: body.discountType || 'percentage',
      discountValue: Number(body.discountValue),
      minOrderAmount: Number(body.minOrderAmount || 0),
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : undefined,
      active: body.active ?? true,
      expiresAt: body.expiresAt || '2027-12-31T23:59:59.000Z',
    };
    db.coupons.unshift(coupon);
    await saveDb();
    res.status(201).json({ coupon });
  });

  app.put('/api/admin/coupons/:id', requireAuth, requireAdminOrSeller, async (req, res) => {
    const db = getDb();
    const coupon = db.coupons.find((c) => c.id === req.params.id);
    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    Object.assign(coupon, req.body);
    await saveDb();
    res.json({ coupon });
  });

  app.delete('/api/admin/coupons/:id', requireAuth, requireAdminOrSeller, async (req, res) => {
    const db = getDb();
    db.coupons = db.coupons.filter((c) => c.id !== req.params.id);
    await saveDb();
    res.json({ ok: true });
  });

  // Admin Banners CRUD
  app.get('/api/admin/banners', requireAuth, requireAdminOrSeller, (_req, res) => {
    res.json({ banners: getDb().banners });
  });

  app.post('/api/admin/banners', requireAuth, requireAdminOrSeller, async (req, res) => {
    const body = req.body as Partial<Banner>;
    if (!body.title?.trim() || !body.image?.trim()) {
      res.status(400).json({ error: 'Banner title and image URL are required.' });
      return;
    }
    const db = getDb();
    const banner: Banner = {
      id: makeId('ban'),
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || '',
      ctaLabel: body.ctaLabel?.trim() || 'Shop Now',
      targetPath: body.targetPath?.trim() || '/shop',
      image: body.image.trim(),
      badgeText: body.badgeText?.trim() || 'Featured Campaign',
      active: body.active ?? true,
      order: Number(body.order ?? db.banners.length + 1),
    };
    db.banners.push(banner);
    await saveDb();
    res.status(201).json({ banner });
  });

  app.put('/api/admin/banners/:id', requireAuth, requireAdminOrSeller, async (req, res) => {
    const db = getDb();
    const banner = db.banners.find((b) => b.id === req.params.id);
    if (!banner) {
      res.status(404).json({ error: 'Banner not found.' });
      return;
    }
    Object.assign(banner, req.body);
    await saveDb();
    res.json({ banner });
  });

  app.delete('/api/admin/banners/:id', requireAuth, requireAdminOrSeller, async (req, res) => {
    const db = getDb();
    db.banners = db.banners.filter((b) => b.id !== req.params.id);
    await saveDb();
    res.json({ ok: true });
  });

  // Admin Payment Methods & Shipping Settings
  app.get(
    '/api/admin/payment-settings',
    requireAuth,
    requireAdminOrSeller,
    (_req, res) => {
      const db = getDb();
      const rzp = getRazorpayConfig();
      const methodStats: Record<PaymentMethod, { count: number; revenue: number }> = {
        UPI: { count: 0, revenue: 0 },
        CARD: { count: 0, revenue: 0 },
        RAZORPAY: { count: 0, revenue: 0 },
        COD: { count: 0, revenue: 0 },
      };

      for (const order of db.orders) {
        if (order.status === 'Cancelled') continue;
        if (methodStats[order.paymentMethod]) {
          methodStats[order.paymentMethod].count += 1;
          methodStats[order.paymentMethod].revenue += order.total;
        }
      }

      res.json({
        paymentSettings: db.paymentSettings,
        razorpayMode: rzp.isLive ? 'live' : 'sandbox',
        razorpayKeyId: rzp.keyId,
        methodStats,
      });
    }
  );

  app.put(
    '/api/admin/payment-settings',
    requireAuth,
    requireAdminOrSeller,
    async (req, res) => {
      const body = req.body as Partial<PaymentSettings>;
      if (!body.methods) {
        res.status(400).json({ error: 'Payment methods configuration is required.' });
        return;
      }

      const db = getDb();
      const current = db.paymentSettings;
      const nextMethods = { ...current.methods };

      for (const key of ['UPI', 'CARD', 'RAZORPAY', 'COD'] as PaymentMethod[]) {
        const incoming = body.methods[key];
        if (!incoming) continue;
        nextMethods[key] = {
          enabled: Boolean(incoming.enabled),
          label: incoming.label?.trim() || current.methods[key].label,
          description: incoming.description?.trim() || current.methods[key].description,
          ...(key === 'UPI'
            ? {
                merchantUpiId:
                  incoming.merchantUpiId?.trim() ||
                  current.methods.UPI.merchantUpiId ||
                  'shopkart@okicici',
              }
            : {}),
          ...(key === 'COD'
            ? {
                maxOrderAmount: Math.max(0, Number(incoming.maxOrderAmount ?? 0)),
                handlingFee: Math.max(0, Number(incoming.handlingFee ?? 0)),
              }
            : {}),
        };
      }

      const anyEnabled = Object.values(nextMethods).some((m) => m.enabled);
      if (!anyEnabled) {
        res.status(400).json({
          error: 'At least one payment method must remain enabled for checkout.',
        });
        return;
      }

      db.paymentSettings = {
        methods: nextMethods,
        freeShippingThreshold: Math.max(
          0,
          Number(body.freeShippingThreshold ?? current.freeShippingThreshold)
        ),
        standardShippingFee: Math.max(
          0,
          Number(body.standardShippingFee ?? current.standardShippingFee)
        ),
      };

      await saveDb();
      res.json({ paymentSettings: db.paymentSettings });
    }
  );

  // =========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC DIST SERVING (PROD)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShopKart full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
