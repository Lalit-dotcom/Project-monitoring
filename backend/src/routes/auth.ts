import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const router = Router();

// In-memory store for refresh tokens
const refreshTokens = new Map<string, string>(); // username -> refresh token

// In-memory store for rate limiting attempts
const failedAttempts = new Map<string, { count: number; lockoutUntil?: number }>();

// Single logging function for security audits
function logAuthEvent(username: string, ip: string, outcome: 'SUCCESS' | 'FAILURE' | 'LOCKED_OUT') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] AUTH EVENT: username="${username}", ip="${ip}", outcome="${outcome}"`);
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const ip = req.ip || 'unknown';

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const rateLimitKey = username;

  // 1. Lockout Check
  const attempt = failedAttempts.get(rateLimitKey);
  const now = Date.now();
  if (attempt && attempt.lockoutUntil && attempt.lockoutUntil > now) {
    logAuthEvent(username, ip, 'LOCKED_OUT');
    res.status(429).json({ error: 'Too many failed attempts, try again later' });
    return;
  }

  try {
    // 2. Validate Credentials against DB
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.prj_mgr_id, pm.prj_mgr_name
       FROM users u
       LEFT JOIN project_managers pm ON u.prj_mgr_id = pm.prj_mgr_id
       WHERE u.username = $1`,
      [username]
    );

    let isSuccess = false;
    let userRow: any = null;

    if (userResult.rows.length > 0) {
      userRow = userResult.rows[0];
      isSuccess = await bcrypt.compare(password, userRow.password_hash);
    }

    if (isSuccess && userRow) {
      // Reset rate limiter on successful login
      failedAttempts.delete(rateLimitKey);

      const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
      const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
      const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

      // Issue access and refresh tokens with correct payload
      const accessToken = jwt.sign(
        {
          userId: userRow.id,
          username: userRow.username,
          role: userRow.role,
          prjMgrId: userRow.prj_mgr_id
        },
        secret,
        { expiresIn: accessExpiry as any }
      );

      const refreshToken = jwt.sign(
        { username: userRow.username },
        secret,
        { expiresIn: refreshExpiry as any }
      );

      // Save refresh token server-side
      refreshTokens.set(userRow.username, refreshToken);

      logAuthEvent(userRow.username, ip, 'SUCCESS');

      res.json({
        accessToken,
        refreshToken,
        user: {
          username: userRow.username,
          role: userRow.role,
          prjMgrId: userRow.prj_mgr_id,
          prjMgrName: userRow.prj_mgr_name || null
        }
      });
    } else {
      // Register Failure
      let curAttempt = failedAttempts.get(rateLimitKey) || { count: 0 };
      curAttempt.count += 1;
      if (curAttempt.count >= 5) {
        curAttempt.lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 mins lockout
      }
      failedAttempts.set(rateLimitKey, curAttempt);

      // Auto-clean count after 15 mins if not locked out
      if (curAttempt.count < 5) {
        setTimeout(() => {
          const check = failedAttempts.get(rateLimitKey);
          if (check && check.count === curAttempt.count && !check.lockoutUntil) {
            failedAttempts.delete(rateLimitKey);
          }
        }, 15 * 60 * 1000);
      }

      logAuthEvent(username, ip, 'FAILURE');

      if (curAttempt.count >= 5) {
        res.status(429).json({ error: 'Too many failed attempts, try again later' });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    }
  } catch (error: any) {
    console.error('Database query error in login:', error);
    res.status(500).json({ error: 'An internal server error occurred during login.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';

  try {
    const decoded = jwt.verify(refreshToken, secret) as { username: string };
    const username = decoded.username;

    const storedToken = refreshTokens.get(username);
    if (!storedToken || storedToken !== refreshToken) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Retrieve full details from DB to make sure role & prjMgrId are up-to-date in new access token
    const userResult = await pool.query(
      'SELECT id, role, prj_mgr_id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    const userRow = userResult.rows[0];

    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const accessToken = jwt.sign(
      {
        userId: userRow.id,
        username,
        role: userRow.role,
        prjMgrId: userRow.prj_mgr_id
      },
      secret,
      { expiresIn: accessExpiry as any }
    );

    // Rotate refresh token
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    const newRefreshToken = jwt.sign(
      { username },
      secret,
      { expiresIn: refreshExpiry as any }
    );
    refreshTokens.set(username, newRefreshToken);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
    try {
      const decoded = jwt.verify(refreshToken, secret) as { username: string };
      refreshTokens.delete(decoded.username);
    } catch (err) {
      // Ignore verifying errors on logout
    }
  }
  res.json({ success: true });
});

export default router;
