import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLES } from '../config/constants';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      username: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireAdminOrDriver = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== ROLES.ADMIN && req.user?.role !== ROLES.DRIVER) {
    return res.status(403).json({ error: 'Admin or Driver access required' });
  }
  next();
};

// Roles that have global visibility (can see all orders)
export const isGlobalViewer = (user: { role: string } | undefined) => {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.DRIVER;
};
