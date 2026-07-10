import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    role: string;
    prjMgrId: number | null;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';

  try {
    const decoded = jwt.verify(token, secret) as {
      userId: number;
      username: string;
      role: string;
      prjMgrId: number | null;
    };
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      prjMgrId: decoded.prjMgrId
    };
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Authentication failed. Invalid or expired token.' });
  }
}
