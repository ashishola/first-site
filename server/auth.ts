import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from './db.ts';
import type { StoredUser } from './seed.ts';

const JWT_SECRET =
  process.env.JWT_SECRET?.trim() || 'shopkart_dev_jwt_secret_change_in_production';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}

export function signToken(user: StoredUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = header.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    return;
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === decoded.userId);
  if (!user) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const decoded = verifyToken(header.slice(7));
    if (decoded) {
      const db = getDb();
      req.user = db.users.find((u) => u.id === decoded.userId);
    }
  }
  next();
}

export function requireAdminOrSeller(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'admin' && req.user.role !== 'seller') {
    res.status(403).json({ error: 'Admin or Seller privileges required.' });
    return;
  }
  next();
}
