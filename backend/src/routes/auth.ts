import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { pool } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';
import { logAudit } from '../lib/auditLog.js';
import { createNotification } from '../lib/createNotification.js';

const router = Router();

// In-memory store for rate limiting attempts (login usernames)
const failedAttempts = new Map<string, { count: number; lockoutUntil?: number }>();

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
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const userId = userCheck.rows[0]?.id || null;
    await logAudit({
      userId,
      username,
      category: 'LOGIN',
      action: 'LOGIN_LOCKED_OUT',
      status: 'FAILURE',
      ip,
      details: { lockoutUntil: new Date(attempt.lockoutUntil).toISOString() }
    });
    res.status(429).json({ error: 'Too many failed attempts, try again later' });
    return;
  }

  try {
    // 2. Validate Credentials against DB
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.prj_mgr_id, u.totp_enabled, u.must_change_password, pm.prj_mgr_name
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
        await logAudit({
          userId: userRow.id,
          username,
          category: 'LOGIN',
          action: 'MFA_CHALLENGE_ISSUED',
          status: 'SUCCESS',
          ip,
          details: {}
        });
        res.json({ mfaRequired: true, mfaToken });
        return;
      }

      // Check if password change is required
      if (userRow.must_change_password) {
        const tempSecret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
        const tempToken = jwt.sign(
          { userId: userRow.id, username: userRow.username, purpose: 'required_password_change' },
          tempSecret,
          { expiresIn: '10m' }
        );
        await logAudit({
          userId: userRow.id,
          username: userRow.username,
          category: 'LOGIN',
          action: 'REQUIRED_PASSWORD_CHANGE_CHALLENGE',
          status: 'SUCCESS',
          ip,
          details: {}
        });
        res.json({ requiresPasswordChange: true, tempToken, username: userRow.username });
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

      await logAudit({
        userId: userRow.id,
        username: userRow.username,
        category: 'LOGIN',
        action: 'LOGIN_SUCCESS',
        status: 'SUCCESS',
        ip,
        details: { device: deviceLabel }
      });

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

      const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      const userId = userCheck.rows[0]?.id || null;

      if (curAttempt.count >= 5 && userId) {
        await createNotification({
          category: 'SECURITY',
          type: 'LOGIN_LOCKED_OUT',
          targetUserId: userId,
          title: 'Account Locked Out',
          message: `Account for username "${username}" has been temporarily locked due to 5 consecutive login failures.`,
          severity: 'WARNING'
        });
      }

      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'LOGIN_FAILURE',
        status: 'FAILURE',
        ip,
        details: { attemptCount: curAttempt.count, lockedOut: curAttempt.count >= 5 }
      });

      if (curAttempt.count >= 5) {
        res.status(429).json({ error: 'Too many failed attempts, try again later' });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    }
  } catch (error: any) {
    console.error('Database query error in login:', error);
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]).catch(() => ({ rows: [] }));
    const userId = userCheck.rows[0]?.id || null;
    await logAudit({
      userId,
      username,
      category: 'LOGIN',
      action: 'LOGIN_FAILURE',
      status: 'FAILURE',
      ip,
      details: { error: error.message }
    });
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
      `SELECT id, email, role FROM users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].email) {
      // Generic success message to prevent user enumeration
      res.json({ message: 'If an account exists with that username and has an email associated, a reset OTP has been sent.' });
      return;
    }

    const userRow = userResult.rows[0];

    if (userRow.role === 'superadmin') {
      await logAudit({
        userId: userRow.id || null,
        username,
        category: 'LOGIN',
        action: 'FORGOT_PASSWORD_BLOCKED_SUPERADMIN',
        status: 'FAILURE',
        ip: req.ip || 'unknown',
        details: { reason: 'superadmin_otp_reset_blocked' }
      });

      res.json({ message: 'If an account exists with that username and has an email associated, a reset OTP has been sent.' });
      return;
    }

    const email = userRow.email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    
    // Invalidate any existing unused OTPs for this user
    await pool.query(
      `UPDATE password_reset_otps SET used = true WHERE username = $1 AND used = false`,
      [username]
    );

    // Save the new OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await pool.query(
      `INSERT INTO password_reset_otps (username, code, expires_at) VALUES ($1, $2, $3)`,
      [username, otp, expiresAt]
    );

    // SMTP Sending Logic
    if (process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false, // Port 587 uses STARTTLS, secure must be false
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });

        const mailOptions = {
          from: process.env.SMTP_FROM || `"NPMS" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'NPMS Password Reset OTP',
          text: `Your password reset one-time passcode (OTP) is: ${otp}. It will expire in 5 minutes.`,
          html: `<p>Your password reset one-time passcode (OTP) is: <strong>${otp}</strong>.</p><p>It will expire in 5 minutes.</p>`
        };

        console.log(`[SMTP] Attempting real SMTP send to ${email} via ${process.env.SMTP_HOST}...`);
        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Real SMTP email sent successfully to ${email}`);
      } catch (smtpErr: any) {
        console.error(`SMTP send failed: ${smtpErr.message}`, smtpErr);
      }
    } else {
      console.log(`[DEV MODE] [SIMULATED EMAIL] Sending Password Reset OTP to ${email}: ${otp}`);
    }

    res.json({ message: 'If an account exists with that username and has an email associated, a reset OTP has been sent.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { username, code } = req.body;
  const ip = req.ip || 'unknown';

  if (!username || !code) {
    res.status(400).json({ error: 'Username and OTP code are required' });
    return;
  }

  try {
    // Resolve user ID & role if exists
    const userCheck = await pool.query('SELECT id, role FROM users WHERE username = $1', [username]);
    const userRow = userCheck.rows[0];
    const userId = userRow?.id || null;

    if (userRow?.role === 'superadmin') {
      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'OTP_VERIFY_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'superadmin_otp_verify_blocked' }
      });
      res.status(400).json({ error: 'Invalid username or OTP code.' });
      return;
    }

    // Look up the latest OTP row for this username
    const otpResult = await pool.query(
      `SELECT id, code, expires_at, used, attempt_count FROM password_reset_otps 
       WHERE username = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [username]
    );

    const otpRow = otpResult.rows[0];

    if (!otpRow) {
      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'OTP_VERIFY_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'no_otp_found' }
      });
      res.status(400).json({ error: 'Invalid username or OTP code.' });
      return;
    }

    if (otpRow.used) {
      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'OTP_VERIFY_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'otp_already_used' }
      });
      res.status(400).json({ error: 'OTP code has already been used or locked. Please request a new code.' });
      return;
    }

    const isExpired = new Date(otpRow.expires_at).getTime() < Date.now();
    if (isExpired) {
      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'OTP_VERIFY_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'otp_expired' }
      });
      res.status(400).json({ error: 'OTP code has expired. Please request a new code.' });
      return;
    }

    // Check attempt limit BEFORE checking code
    if (otpRow.attempt_count >= 5) {
      await pool.query('UPDATE password_reset_otps SET used = true WHERE id = $1', [otpRow.id]);
      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'OTP_VERIFY_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'locked_out_pre_check' }
      });
      res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }

    // Increment attempt count
    const newAttemptCount = otpRow.attempt_count + 1;
    await pool.query(
      `UPDATE password_reset_otps SET attempt_count = $1 WHERE id = $2`,
      [newAttemptCount, otpRow.id]
    );

    // Verify code
    if (otpRow.code === code) {
      // Code is correct, mark as used and check user role
      await pool.query('UPDATE password_reset_otps SET used = true WHERE id = $1', [otpRow.id]);
      
      const userResult = await pool.query(
        `SELECT u.id, u.username, u.role, u.prj_mgr_id, pm.prj_mgr_name
         FROM users u
         LEFT JOIN project_managers pm ON u.prj_mgr_id = pm.prj_mgr_id
         WHERE u.username = $1`,
        [username]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userRow = userResult.rows[0];

      if (userRow.role === 'superadmin') {
        const resetSecret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
        const resetToken = jwt.sign(
          { username, purpose: 'password_reset' },
          resetSecret,
          { expiresIn: '5m' } // Short-lived reset token
        );

        await logAudit({
          userId,
          username,
          category: 'LOGIN',
          action: 'OTP_VERIFY_SUCCESS',
          status: 'SUCCESS',
          ip,
          details: { type: 'password_reset_initiated' }
        });
        res.json({ resetToken });
      } else {
        // Project Manager - log in directly
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

        await logAudit({
          userId: userRow.id,
          username,
          category: 'LOGIN',
          action: 'OTP_VERIFY_SUCCESS',
          status: 'SUCCESS',
          ip,
          details: { type: 'otp_based_login', device: deviceLabel }
        });

        res.json({
          accessToken,
          user: {
            username: userRow.username,
            role: userRow.role,
            prjMgrId: userRow.prj_mgr_id,
            prjMgrName: userRow.prj_mgr_name || null
          }
        });
      }
    } else {
      // Code is incorrect
      await logAudit({
        userId,
        username,
        category: 'LOGIN',
        action: 'OTP_VERIFY_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'incorrect_code', attempt: newAttemptCount }
      });

      if (newAttemptCount >= 5) {
        // Lock out
        await pool.query('UPDATE password_reset_otps SET used = true WHERE id = $1', [otpRow.id]);
        res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      } else {
        res.status(400).json({ error: 'Invalid OTP code.' });
      }
    }
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { resetToken, newPassword } = req.body;
  const ip = req.ip || 'unknown';

  if (!resetToken || !newPassword) {
    res.status(400).json({ error: 'Reset token and new password are required' });
    return;
  }

  try {
    const resetSecret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
    let decoded: { username: string; purpose: string };
    
    try {
      decoded = jwt.verify(resetToken, resetSecret) as { username: string; purpose: string };
    } catch (tokenErr) {
      res.status(400).json({ error: 'Invalid or expired reset token. Please request a new code.' });
      return;
    }

    if (decoded.purpose !== 'password_reset') {
      res.status(400).json({ error: 'Invalid token purpose' });
      return;
    }

    // Role check defense-in-depth: block superadmin reset
    const userCheck = await pool.query('SELECT id, role FROM users WHERE username = $1', [decoded.username]);
    const userRow = userCheck.rows[0];
    const userId = userRow?.id || null;

    if (!userRow || userRow.role === 'superadmin') {
      await logAudit({
        userId,
        username: decoded.username,
        category: 'LOGIN',
        action: 'RESET_PASSWORD_FAILED',
        status: 'FAILURE',
        ip,
        details: { reason: 'superadmin_reset_password_blocked' }
      });
      res.status(400).json({ error: 'Invalid or expired reset token. Please request a new code.' });
      return;
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE username = $2`,
      [passwordHash, decoded.username]
    );

    // Invalidate all active sessions for this user
    await pool.query(
      `UPDATE sessions SET revoked = true WHERE user_id = (SELECT id FROM users WHERE username = $1)`,
      [decoded.username]
    );

    await logAudit({
      userId,
      username: decoded.username,
      category: 'LOGIN',
      action: 'PASSWORD_RESET_SUCCESS',
      status: 'SUCCESS',
      ip,
      details: {}
    });
    res.json({ success: true, message: 'Password updated successfully. Please log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-required-password
router.post('/change-required-password', async (req: Request, res: Response): Promise<void> => {
  const { tempToken, newPassword } = req.body;
  const ip = req.ip || 'unknown';

  if (!tempToken || !newPassword) {
    res.status(400).json({ error: 'Temporary token and new password are required' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_placeholder_change_me';
    let decoded: { userId: number; username: string; purpose: string };

    try {
      decoded = jwt.verify(tempToken, secret) as any;
    } catch (tokenErr) {
      res.status(400).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }

    if (decoded.purpose !== 'required_password_change') {
      res.status(400).json({ error: 'Invalid token purpose' });
      return;
    }

    // Fetch user details
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.role, u.prj_mgr_id, pm.prj_mgr_name
       FROM users u
       LEFT JOIN project_managers pm ON u.prj_mgr_id = pm.prj_mgr_id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userRow = userResult.rows[0];
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    // Update password and clear must_change_password flag
    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2`,
      [passwordHash, userRow.id]
    );

    // Issue session tokens
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

    await logAudit({
      userId: userRow.id,
      username: userRow.username,
      category: 'LOGIN',
      action: 'REQUIRED_PASSWORD_CHANGE_SUCCESS',
      status: 'SUCCESS',
      ip,
      details: { device: deviceLabel }
    });

    res.json({
      accessToken,
      user: {
        username: userRow.username,
        role: userRow.role,
        prjMgrId: userRow.prj_mgr_id,
        prjMgrName: userRow.prj_mgr_name || null
      }
    });
  } catch (err: any) {
    console.error('Change required password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
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

      await logAudit({
        userId: userRow.id,
        username: userRow.username,
        category: 'LOGIN',
        action: 'MFA_VERIFIED',
        status: 'SUCCESS',
        ip,
        details: { device: deviceLabel }
      });

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
      await logAudit({
        userId: userRow.id,
        username: userRow.username,
        category: 'LOGIN',
        action: 'MFA_FAILED',
        status: 'FAILURE',
        ip,
        details: {}
      });
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
        // Token reuse outside grace window - SECURITY ALERT
        await pool.query('UPDATE sessions SET revoked = TRUE WHERE id = $1', [session.id]);
        await logAudit({
          userId: session.user_id,
          username: session.username,
          category: 'LOGIN',
          action: 'REFRESH_TOKEN_REUSE_DETECTED',
          status: 'FAILURE',
          ip: ip as string,
          details: {
            note: 'SECURITY: refresh token reuse detected outside grace window, session revoked',
            sessionId: session.id
          }
        });
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
  let username = 'unknown';
  let userId: number | null = null;
  const ip = req.ip || 'unknown';

  if (refreshToken) {
    try {
      const hashedToken = hashToken(refreshToken);
      const sessionResult = await pool.query(
        `SELECT s.user_id, u.username 
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.refresh_token_hash = $1`,
        [hashedToken]
      );
      if (sessionResult.rows.length > 0) {
        userId = sessionResult.rows[0].user_id;
        username = sessionResult.rows[0].username;
      }

      await pool.query(
        `UPDATE sessions SET revoked = TRUE WHERE refresh_token_hash = $1`,
        [hashedToken]
      );

      await logAudit({
        userId,
        username,
        category: 'LOGOUT',
        action: 'LOGOUT_SUCCESS',
        status: 'SUCCESS',
        ip,
        details: { method: 'cookie' }
      });
    } catch (err: any) {
      console.error('Error revoking session on logout:', err);
      await logAudit({
        userId,
        username,
        category: 'LOGOUT',
        action: 'LOGOUT_FAILURE',
        status: 'FAILURE',
        ip,
        details: { error: err.message }
      });
    }
  } else {
    await logAudit({
      userId: null,
      username: 'unknown',
      category: 'LOGOUT',
      action: 'LOGOUT_SUCCESS',
      status: 'SUCCESS',
      ip,
      details: { note: 'no refresh token cookie found' }
    });
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
      `SELECT id, device_label, ip_address FROM sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const sessionToRevoke = checkResult.rows[0];

    await pool.query(
      `UPDATE sessions SET revoked = TRUE WHERE id = $1`,
      [sessionId]
    );

    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'SESSION_REVOKED',
      status: 'SUCCESS',
      ip: req.ip || 'unknown',
      details: { sessionId, device: sessionToRevoke.device_label, sessionIp: sessionToRevoke.ip_address }
    });

    await createNotification({
      category: 'SECURITY',
      type: 'SESSION_REVOKED',
      targetUserId: userId,
      title: 'Session Revoked',
      message: `Active session on device "${sessionToRevoke.device_label || 'Unknown Device'}" was revoked.`,
      severity: 'WARNING'
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to revoke session:', error);
    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'SESSION_REVOKED',
      status: 'FAILURE',
      ip: req.ip || 'unknown',
      details: { sessionId, error: error.message }
    });
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
    let revokedSessions: any[] = [];

    if (currentHash) {
      const sessResult = await pool.query(
        `SELECT id, device_label, ip_address FROM sessions WHERE user_id = $1 AND refresh_token_hash <> $2 AND revoked = FALSE`,
        [userId, currentHash]
      );
      revokedSessions = sessResult.rows;

      await pool.query(
        `UPDATE sessions SET revoked = TRUE WHERE user_id = $1 AND refresh_token_hash <> $2`,
        [userId, currentHash]
      );
    } else {
      const sessResult = await pool.query(
        `SELECT id, device_label, ip_address FROM sessions WHERE user_id = $1 AND revoked = FALSE`,
        [userId]
      );
      revokedSessions = sessResult.rows;

      await pool.query(
        `UPDATE sessions SET revoked = TRUE WHERE user_id = $1`,
        [userId]
      );
    }

    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'SESSION_REVOKED',
      status: 'SUCCESS',
      ip: req.ip || 'unknown',
      details: {
        target: 'others',
        revokedCount: revokedSessions.length,
        revokedSessions: revokedSessions.map(s => ({ id: s.id, device: s.device_label, ip: s.ip_address }))
      }
    });

    await createNotification({
      category: 'SECURITY',
      type: 'SESSION_REVOKED',
      targetUserId: userId,
      title: 'Other Sessions Revoked',
      message: `Revoked ${revokedSessions.length} other active session(s) on your account.`,
      severity: 'WARNING'
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to revoke other sessions:', error);
    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'SESSION_REVOKED',
      status: 'FAILURE',
      ip: req.ip || 'unknown',
      details: { target: 'others', error: error.message }
    });
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
  const forceRegenerate = req.body?.regenerate === true || req.query?.regenerate === 'true';

  try {
    // Check if user already has a pending setup secret
    const existingResult = await pool.query(
      `SELECT totp_temp_secret FROM users WHERE id = $1`,
      [userId]
    );

    let secret = '';
    if (!forceRegenerate && existingResult.rows.length > 0 && existingResult.rows[0].totp_temp_secret) {
      secret = existingResult.rows[0].totp_temp_secret;
    } else {
      secret = generateSecret();
      // Save temporarily
      await pool.query(
        `UPDATE users SET totp_temp_secret = $1 WHERE id = $2`,
        [secret, userId]
      );
    }

    const otpauth = generateURI({
      issuer: 'NICSI NPMS',
      label: req.user.username,
      secret: secret
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

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
      await logAudit({
        userId,
        username: req.user?.username || 'unknown',
        category: 'USER_ACTIVITY',
        action: 'MFA_ENABLED',
        status: 'FAILURE',
        ip: req.ip || 'unknown',
        details: { reason: 'invalid_code' }
      });
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

    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'MFA_ENABLED',
      status: 'SUCCESS',
      ip: req.ip || 'unknown',
      details: { method: 'totp' }
    });

    await createNotification({
      category: 'SECURITY',
      type: 'MFA_ENABLED',
      targetUserId: userId,
      title: 'MFA Enabled',
      message: 'Multi-factor authentication has been enabled on your account.',
      severity: 'INFO'
    });

    res.json({ backupCodes });
  } catch (error: any) {
    console.error('Failed to confirm 2FA setup:', error);
    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'MFA_ENABLED',
      status: 'FAILURE',
      ip: req.ip || 'unknown',
      details: { error: error.message }
    });
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
      await logAudit({
        userId,
        username: req.user?.username || 'unknown',
        category: 'USER_ACTIVITY',
        action: 'MFA_DISABLED',
        status: 'FAILURE',
        ip: req.ip || 'unknown',
        details: { reason: 'invalid_password' }
      });
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

    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'MFA_DISABLED',
      status: 'SUCCESS',
      ip: req.ip || 'unknown',
      details: {}
    });

    await createNotification({
      category: 'SECURITY',
      type: 'MFA_DISABLED',
      targetUserId: userId,
      title: 'MFA Disabled',
      message: 'Multi-factor authentication has been disabled on your account.',
      severity: 'INFO'
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to disable 2FA:', error);
    await logAudit({
      userId,
      username: req.user?.username || 'unknown',
      category: 'USER_ACTIVITY',
      action: 'MFA_DISABLED',
      status: 'FAILURE',
      ip: req.ip || 'unknown',
      details: { error: error.message }
    });
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

// GET /api/auth/users
router.get('/users', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Access denied. Super Admin role required.' });
      return;
    }
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.email, 
        pm.prj_mgr_name as "name"
      FROM users u
      LEFT JOIN project_managers pm ON u.prj_mgr_id = pm.prj_mgr_id
      ORDER BY u.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

export default router;
