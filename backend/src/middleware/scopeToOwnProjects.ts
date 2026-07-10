import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './requireAuth.js';

export function scopeToOwnProjects(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role === 'superadmin') {
    next();
    return;
  }

  if (req.user.role === 'project_manager') {
    // Override/force the project manager constraint to their assigned prjMgrId
    req.query.prjMgrId = String(req.user.prjMgrId);
    next();
    return;
  }

  next();
}
