import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { pool } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

// In-memory store for rate limiting attempts (login usernames)
const failedAttempts = new Map<string, { count: number; lockoutUntil?: number }>();

// Security Audit Event Logger
function logAuthEvent(username: string, ip: string, outcome: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] AUTH EVENT: username="${username}", ip="${ip}", outcome="${outcome}"`);
}

// Helper to hash token using SHA-256
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper to generate a secure random refresh token
function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

// User-agent parsing logic browser + OS
function parseUserAgent(ua: string | undefined): string {
  if (!ua) return 'Unknown Device';
  
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  return `${browser} on ${os}`;
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
      `SELECT u.id, u.username, u.password_hash, u.role, u.prj_mgr_id, u.totp_enabled, pm.prj_mgr_name
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

      // Check if TOTP is enabled (superadmin only)
      if (userRow.totp_enabled && userRow.role === 'superadmin') {
        const mfaSecret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
        const mfaToken = jwt.sign(
          { userId: userRow.id, purpose: 'mfa_verify' },
          mfaSecret,
          { expiresIn: '2m' }
        );
        logAuthEvent(username, ip, 'MFA_REQUIRED');
        res.json({ mfaRequired: true, mfaToken });
        return;
      }

      // Proceed with normal token issuance
      const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
      const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';

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

      const rawRefreshToken = generateRefreshToken();
      const hashedRefreshToken = hashToken(rawRefreshToken);
      const deviceLabel = parseUserAgent(req.headers['user-agent']);

      // Save session in DB
      await pool.query(
        `INSERT INTO sessions (user_id, refresh_token_hash, device_label, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userRow.id, hashedRefreshToken, deviceLabel, ip]
      );

      // Set httpOnly cookie
      res.cookie('npms_refresh', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      logAuthEvent(userRow.username, ip, 'SUCCESS');

      res.json({
        accessToken,
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  try {
    const userResult = await pool.query(
      `SELECT email FROM users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].email) {
      // Generic success message to prevent user enumeration
      res.json({ message: 'If an account exists with that username and has an email associated, a reset OTP has been sent.' });
      return;
    }

    const email = userResult.rows[0].email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    
    // Simulate sending email
    console.log(`[SIMULATED EMAIL] Sending Password Reset OTP to ${email}: ${otp}`);

    res.json({ message: 'If an account exists with that username and has an email associated, a reset OTP has been sent.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/2fa/verify
router.post('/2fa/verify', async (req: Request, res: Response): Promise<void> => {
  const { mfaToken, code } = req.body;
  const ip = req.ip || 'unknown';

  if (!mfaToken || !code) {
    res.status(400).json({ error: 'MFA token and verification code are required' });
    return;
  }

  const mfaSecret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';

  try {
    const decoded = jwt.verify(mfaToken, mfaSecret) as { userId: number; purpose: string };
    if (decoded.purpose !== 'mfa_verify') {
      res.status(401).json({ error: 'Invalid MFA verification token purpose' });
      return;
    }

    const userId = decoded.userId;
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.role, u.prj_mgr_id, u.totp_secret, u.totp_backup_codes, pm.prj_mgr_name
       FROM users u
       LEFT JOIN project_managers pm ON u.prj_mgr_id = pm.prj_mgr_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    const userRow = userResult.rows[0];

    // Verify code
    let isCodeValid = false;
    let isBackupUsed = false;
    let backupCodesList: string[] = userRow.totp_backup_codes || [];

    if (userRow.totp_secret && code.length === 6) {
      const verified = await verify({
        token: code,
        secret: userRow.totp_secret
      });
      isCodeValid = verified.valid;
    }

    if (!isCodeValid && backupCodesList.length > 0) {
      // Check backup codes
      for (let i = 0; i < backupCodesList.length; i++) {
        const matches = await bcrypt.compare(code, backupCodesList[i]);
        if (matches) {
          isCodeValid = true;
          isBackupUsed = true;
          // Consume backup code
          backupCodesList.splice(i, 1);
          break;
        }
      }
    }

    if (isCodeValid) {
      if (isBackupUsed) {
        // Save updated backup codes
        await pool.query('UPDATE users SET totp_backup_codes = $1 WHERE id = $2', [backupCodesList, userId]);
      }

      // Proceed with normal token issuance
      const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
      const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';

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

      const rawRefreshToken = generateRefreshToken();
      const hashedRefreshToken = hashToken(rawRefreshToken);
      const deviceLabel = parseUserAgent(req.headers['user-agent']);

      // Save session in DB
      await pool.query(
        `INSERT INTO sessions (user_id, refresh_token_hash, device_label, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userRow.id, hashedRefreshToken, deviceLabel, ip]
      );

      // Set httpOnly cookie
      res.cookie('npms_refresh', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      logAuthEvent(userRow.username, ip, 'MFA_SUCCESS');

      res.json({
        accessToken,
        user: {
          username: userRow.username,
          role: userRow.role,
          prjMgrId: userRow.prj_mgr_id,
          prjMgrName: userRow.prj_mgr_name || null
        }
      });
    } else {
      logAuthEvent(userRow.username, ip, 'MFA_FAILURE');
      res.status(401).json({ error: 'Invalid MFA verification code' });
    }
  } catch (err: any) {
    console.error('MFA verify error:', err);
    res.status(401).json({ error: 'MFA token expired or invalid' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies.npms_refresh;
  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token is required' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';

  try {
    const hashedToken = hashToken(refreshToken);

    // Look up session
    const sessionResult = await pool.query(
      `SELECT s.id, s.user_id, s.refresh_token_hash, s.previous_token_hash, s.rotated_at, u.username, u.role, u.prj_mgr_id 
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE (s.refresh_token_hash = $1 OR s.previous_token_hash = $1) AND s.revoked = FALSE`,
      [hashedToken]
    );

    if (sessionResult.rows.length === 0) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const session = sessionResult.rows[0];

    // Check reuse detection
    if (session.previous_token_hash === hashedToken) {
      const rotatedAt = new Date(session.rotated_at).getTime();
      const now = Date.now();
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      if (now - rotatedAt <= 10000) { // 10 second grace window
        // Legitimate retry/race. Issue a new access token, but skip rotating the refresh token.
        // We omit the Set-Cookie, so the browser keeps the new refresh token issued by the first request.
        const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
        const accessToken = jwt.sign(
          { userId: session.user_id, username: session.username, role: session.role, prjMgrId: session.prj_mgr_id },
          secret,
          { expiresIn: accessExpiry as any }
        );
        res.json({ accessToken });
        return;
      } else {
        // Token reuse outside grace window - SECURITY ALERT
        await pool.query('UPDATE sessions SET revoked = TRUE WHERE id = $1', [session.id]);
        logAuthEvent(session.username, ip as string, 'SECURITY: refresh token reuse detected outside grace window, session revoked');
        res.status(401).json({ error: 'Session revoked due to token reuse' });
        return;
      }
    }

    // Normal rotation flow
    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const accessToken = jwt.sign(
      {
        userId: session.user_id,
        username: session.username,
        role: session.role,
        prjMgrId: session.prj_mgr_id
      },
      secret,
      { expiresIn: accessExpiry as any }
    );

    // Rotate refresh token
    const newRawRefreshToken = generateRefreshToken();
    const newHashedRefreshToken = hashToken(newRawRefreshToken);

    await pool.query(
      `UPDATE sessions 
       SET previous_token_hash = refresh_token_hash,
           rotated_at = now(),
           refresh_token_hash = $1, 
           last_active_at = now() 
       WHERE id = $2`,
      [newHashedRefreshToken, session.id]
    );

    // Set cookie
    res.cookie('npms_refresh', newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies.npms_refresh;
  if (refreshToken) {
    try {
      const hashedToken = hashToken(refreshToken);
      await pool.query(
        `UPDATE sessions SET revoked = TRUE WHERE refresh_token_hash = $1`,
        [hashedToken]
      );
    } catch (err) {
      console.error('Error revoking session on logout:', err);
    }
  }

  // Clear cookie
  res.clearCookie('npms_refresh', {
    path: '/api/auth',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.json({ success: true });
});

// GET /api/auth/sessions (authenticated)
router.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const currentRefreshToken = req.cookies.npms_refresh;
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    const result = await pool.query(
      `SELECT id, device_label, ip_address, created_at, last_active_at, refresh_token_hash
       FROM sessions 
       WHERE user_id = $1 AND revoked = FALSE
       ORDER BY last_active_at DESC`,
      [userId]
    );

    const sessions = result.rows.map(row => ({
      id: row.id,
      deviceLabel: row.device_label,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      isCurrent: currentHash !== null && row.refresh_token_hash === currentHash
    }));

    res.json(sessions);
  } catch (error: any) {
    console.error('Failed to get sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/sessions/:id (authenticated)
router.delete('/sessions/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const sessionId = parseInt(req.params.id as string);

  if (!userId || isNaN(sessionId)) {
    res.status(400).json({ error: 'Invalid session ID' });
    return;
  }

  try {
    // Must belong to requesting user
    const checkResult = await pool.query(
      `SELECT id FROM sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await pool.query(
      `UPDATE sessions SET revoked = TRUE WHERE id = $1`,
      [sessionId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to revoke session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/sessions/others (authenticated)
router.delete('/sessions/others', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const currentRefreshToken = req.cookies.npms_refresh;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    if (currentHash) {
      await pool.query(
        `UPDATE sessions SET revoked = TRUE WHERE user_id = $1 AND refresh_token_hash <> $2`,
        [userId, currentHash]
      );
    } else {
      await pool.query(
        `UPDATE sessions SET revoked = TRUE WHERE user_id = $1`,
        [userId]
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to revoke other sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 2FA (TOTP) SETUP FLOW ====================

// POST /api/auth/2fa/setup (authenticated, superadmin only)
router.post('/2fa/setup', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Access denied. Superadmin only.' });
    return;
  }

  const userId = req.user.userId;

  try {
    const secret = generateSecret();
    const otpauth = generateURI({
      issuer: 'NICSI NPMS',
      label: req.user.username,
      secret: secret
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Save temporarily
    await pool.query(
      `UPDATE users SET totp_temp_secret = $1 WHERE id = $2`,
      [secret, userId]
    );

    res.json({ secret, qrCodeDataUrl });
  } catch (error: any) {
    console.error('Failed to generate 2FA setup:', error);
    res.status(500).json({ error: 'Internal server error setting up 2FA' });
  }
});

// POST /api/auth/2fa/confirm (authenticated, superadmin only)
router.post('/2fa/confirm', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Access denied. Superadmin only.' });
    return;
  }

  const userId = req.user.userId;
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Verification code is required' });
    return;
  }

  try {
    // Get temporary secret
    const result = await pool.query(
      `SELECT totp_temp_secret FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].totp_temp_secret) {
      res.status(400).json({ error: 'No pending 2FA setup found' });
      return;
    }

    const tempSecret = result.rows[0].totp_temp_secret;
    const verified = await verify({
      token: code,
      secret: tempSecret
    });

    if (!verified.valid) {
      res.status(400).json({ error: 'Invalid code, please try again.' });
      return;
    }

    // Generate 8 backup recovery codes
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const rawCode = crypto.randomBytes(5).toString('hex'); // 10 alphanumeric chars
      backupCodes.push(rawCode);
      const hashed = await bcrypt.hash(rawCode, 10);
      hashedBackupCodes.push(hashed);
    }

    // Save and commit 2FA to user row
    await pool.query(
      `UPDATE users 
       SET totp_secret = $1, totp_enabled = TRUE, totp_backup_codes = $2, totp_temp_secret = NULL
       WHERE id = $3`,
      [tempSecret, hashedBackupCodes, userId]
    );

    res.json({ backupCodes });
  } catch (error: any) {
    console.error('Failed to confirm 2FA setup:', error);
    res.status(500).json({ error: 'Internal server error confirming 2FA' });
  }
});

// POST /api/auth/2fa/disable (authenticated, superadmin only)
router.post('/2fa/disable', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Access denied. Superadmin only.' });
    return;
  }

  const userId = req.user.userId;
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Current password is required to disable 2FA' });
    return;
  }

  try {
    // Fetch password hash
    const userResult = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const matches = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!matches) {
      res.status(401).json({ error: 'Invalid password. Cannot disable 2FA.' });
      return;
    }

    // Disable 2FA
    await pool.query(
      `UPDATE users 
       SET totp_secret = NULL, totp_enabled = FALSE, totp_backup_codes = NULL, totp_temp_secret = NULL 
       WHERE id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to disable 2FA:', error);
    res.status(500).json({ error: 'Internal server error disabling 2FA' });
  }
});

// GET /api/auth/2fa/status (authenticated)
router.get('/2fa/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT totp_enabled FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ enabled: result.rows[0].totp_enabled || false });
  } catch (error: any) {
    console.error('Failed to fetch 2FA status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
