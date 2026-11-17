import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  createDefaultPaymentSettings,
  createInitialSeed,
  type DatabaseState,
  type StoredUser,
} from './seed.ts';
import type {
  Banner,
  Category,
  Coupon,
  NotificationItem,
  Order,
  Product,
  ProductReview,
} from '../src/types.ts';

const OWNER_ADMIN_EMAIL = 'ashishola2009@gmail.com';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'shopkart-db.json');

// Optional MongoDB Mongoose Schema when MONGODB_URI is provided
const StoreDocSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const StoreDocModel =
  mongoose.models.StoreDoc || mongoose.model('StoreDoc', StoreDocSchema);

let dbCache: DatabaseState | null = null;
let useMongo = false;

function ensurePaymentSettings(state: DatabaseState): boolean {
  const defaults = createDefaultPaymentSettings();
  if (!state.paymentSettings || !state.paymentSettings.methods) {
    state.paymentSettings = defaults;
    return true;
  }

  let changed = false;
  for (const key of ['UPI', 'CARD', 'RAZORPAY', 'COD'] as const) {
    if (!state.paymentSettings.methods[key]) {
      state.paymentSettings.methods[key] = defaults.methods[key];
      changed = true;
    }
  }
  if (typeof state.paymentSettings.freeShippingThreshold !== 'number') {
    state.paymentSettings.freeShippingThreshold = defaults.freeShippingThreshold;
    changed = true;
  }
  if (typeof state.paymentSettings.standardShippingFee !== 'number') {
    state.paymentSettings.standardShippingFee = defaults.standardShippingFee;
    changed = true;
  }
  return changed;
}

function ensureOwnerAdmin(state: DatabaseState): boolean {
  const existing = state.users.find(
    (u) => u.email.toLowerCase() === OWNER_ADMIN_EMAIL
  );
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      existing.storeName = existing.storeName || 'ShopKart Official';
      return true;
    }
    return false;
  }

  state.users.unshift({
    id: 'usr_owner_ashish',
    name: 'Ashish Ola',
    email: OWNER_ADMIN_EMAIL,
    phone: '+91 98110 44210',
    role: 'admin',
    storeName: 'ShopKart Official',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    addresses: [],
    wishlist: [],
    cart: [],
    createdAt: new Date().toISOString(),
  });
  return true;
}

export async function initDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      useMongo = true;
      const doc = await StoreDocModel.findOne({ key: 'shopkart_state' }).lean();
      if (doc && (doc as unknown as { payload: DatabaseState }).payload) {
        dbCache = (doc as unknown as { payload: DatabaseState }).payload;
        const adminUpdated = ensureOwnerAdmin(dbCache);
        const paymentUpdated = ensurePaymentSettings(dbCache);
        if (adminUpdated || paymentUpdated) {
          await saveDb();
        }
      } else {
        dbCache = createInitialSeed();
        ensureOwnerAdmin(dbCache);
        ensurePaymentSettings(dbCache);
        await StoreDocModel.create({ key: 'shopkart_state', payload: dbCache });
      }
      console.log('Connected to MongoDB persistence layer');
      return;
    } catch (err) {
      console.warn(
        'MongoDB connection unavailable, falling back to persistent local JSON store:',
        (err as Error).message
      );
      useMongo = false;
    }
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(raw) as DatabaseState;
      ensureOwnerAdmin(dbCache);
      ensurePaymentSettings(dbCache);
      persistLocal(dbCache);
      return;
    } catch {
      console.warn('Corrupt local DB file detected; regenerating initial seed.');
    }
  }

  dbCache = createInitialSeed();
  ensureOwnerAdmin(dbCache);
  ensurePaymentSettings(dbCache);
  persistLocal(dbCache);
}

function persistLocal(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export async function saveDb(): Promise<void> {
  if (!dbCache) return;
  if (useMongo) {
    await StoreDocModel.findOneAndUpdate(
      { key: 'shopkart_state' },
      { payload: dbCache },
      { upsert: true }
    );
  } else {
    persistLocal(dbCache);
  }
}

export function getDb(): DatabaseState {
  if (!dbCache) {
    dbCache = createInitialSeed();
  }
  return dbCache;
}

export function sanitizeUser(user: StoredUser) {
  const { passwordHash: _ph, resetCode: _rc, cart: _cart, ...safe } = user;
  return safe;
}

export type DbCollections = {
  users: StoredUser[];
  categories: Category[];
  products: Product[];
  reviews: ProductReview[];
  orders: Order[];
  coupons: Coupon[];
  banners: Banner[];
  notifications: NotificationItem[];
};
