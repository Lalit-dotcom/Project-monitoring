import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';
import { logAudit } from '../lib/auditLog.js';
import { createNotification } from '../lib/createNotification.js';

const router = Router();

// GET /api/managers
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Role Authorization Check
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Access denied. Super Admin role required.' });
      return;
    }

    const query = `
      SELECT 
        pm.prj_mgr_id as "prjMgrId", 
        pm.prj_mgr_name as "prjMgrName", 
        pm.source, 
        pm.email, 
        pm.mobile_number as "mobileNumber",
        u.username,
        COALESCE(COUNT(p.id), 0)::integer as "projectCount"
      FROM project_managers pm
      LEFT JOIN users u ON pm.prj_mgr_id = u.prj_mgr_id
      LEFT JOIN projects p ON pm.prj_mgr_id = p.prj_mgr_id
      GROUP BY pm.prj_mgr_id, pm.prj_mgr_name, pm.source, pm.email, pm.mobile_number, u.username
      ORDER BY pm.prj_mgr_name ASC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Failed to retrieve project managers.' });
  }
});

// POST /api/managers
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Role Authorization Check
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Access denied. Super Admin role required.' });
      return;
    }

    const { fullName, username, password, email, mobileNumber } = req.body;

    if (!fullName || !username || !password || !email) {
      await logAudit({
        userId: req.user?.userId,
        username: req.user?.username || 'unknown',
        category: 'ADMIN_CHANGE',
        action: 'MANAGER_CREATED',
        status: 'FAILURE',
        ip: req.ip || 'unknown',
        details: {
          error: 'Missing required fields',
          fullName: !!fullName,
          username: !!username,
          password: !!password,
          email: !!email
        }
      });
      res.status(400).json({ error: 'Full Name, Username, Password, and Email are required.' });
      return;
    }

    // 1. Check username uniqueness
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      await logAudit({
        userId: req.user?.userId,
        username: req.user?.username || 'unknown',
        category: 'ADMIN_CHANGE',
        action: 'MANAGER_CREATED',
        status: 'FAILURE',
        ip: req.ip || 'unknown',
        details: {
          error: 'Username is already taken',
          requestedUsername: username
        }
      });
      res.status(409).json({ error: 'Username is already taken.' });
      return;
    }

    // 2. Generate new prj_mgr_id
    // Manual PM IDs start at 90000 to avoid colliding with ERP-synced IDs; 
    // revisit if NICSI's Oracle export ever uses this range.
    const idQuery = `
      SELECT MAX(prj_mgr_id) as max_id 
      FROM project_managers 
      WHERE prj_mgr_id >= 90000
    `;
    const idResult = await pool.query(idQuery);
    let newPrjMgrId = 90000;
    if (idResult.rows[0].max_id !== null) {
      newPrjMgrId = Number(idResult.rows[0].max_id) + 1;
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Begin transaction
    await pool.query('BEGIN');

    // Insert into project_managers
    const pmInsertQuery = `
      INSERT INTO project_managers (prj_mgr_id, prj_mgr_name, source, email, mobile_number)
      VALUES ($1, $2, 'manual', $3, $4)
      RETURNING prj_mgr_id, prj_mgr_name, source, email, mobile_number
    `;
    const pmInsertResult = await pool.query(pmInsertQuery, [
      newPrjMgrId,
      fullName,
      email || null,
      mobileNumber || null
    ]);

    // Insert into users
    const userInsertQuery = `
      INSERT INTO users (username, password_hash, role, prj_mgr_id, email, must_change_password)
      VALUES ($1, $2, 'project_manager', $3, $4, TRUE)
      RETURNING id, username, role, prj_mgr_id
    `;
    const userInsertResult = await pool.query(userInsertQuery, [
      username,
      passwordHash,
      newPrjMgrId,
      email
    ]);

    await pool.query('COMMIT');

    const createdPm = pmInsertResult.rows[0];
    const createdUser = userInsertResult.rows[0];

    await logAudit({
      userId: req.user?.userId,
      username: req.user?.username || 'unknown',
      category: 'ADMIN_CHANGE',
      action: 'MANAGER_CREATED',
      status: 'SUCCESS',
      ip: req.ip || 'unknown',
      details: {
        prj_mgr_id: createdPm.prj_mgr_id,
        name: createdPm.prj_mgr_name,
        username: createdUser.username,
        email: createdPm.email
      }
    });

    await createNotification({
      category: 'ADMIN',
      type: 'MANAGER_CREATED',
      title: 'New Manager Created',
      message: `Project manager ${createdPm.prj_mgr_name} (username: ${createdUser.username}) has been successfully created.`,
      severity: 'INFO'
    });

    res.status(201).json({
      prjMgrId: createdPm.prj_mgr_id,
      prjMgrName: createdPm.prj_mgr_name,
      source: createdPm.source,
      email: createdPm.email,
      mobileNumber: createdPm.mobile_number,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        role: createdUser.role
      }
    });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error creating manager:', error);
    await logAudit({
      userId: req.user?.userId,
      username: req.user?.username || 'unknown',
      category: 'ADMIN_CHANGE',
      action: 'MANAGER_CREATED',
      status: 'FAILURE',
      ip: req.ip || 'unknown',
      details: {
        error: error.message
      }
    });
    res.status(500).json({ error: 'Failed to create project manager.' });
  }
});

function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// POST /api/managers/:prjMgrId/reset-password
router.post('/:prjMgrId/reset-password', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const prjMgrId = parseInt(String(req.params.prjMgrId), 10);
  const { password } = req.body;

  try {
    // Role Authorization Check
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Access denied. Super Admin role required.' });
      return;
    }

    if (isNaN(prjMgrId)) {
      res.status(400).json({ error: 'Invalid Project Manager ID.' });
      return;
    }

    // 1. Check if user account exists for this prjMgrId
    const userCheck = await pool.query('SELECT id, username FROM users WHERE prj_mgr_id = $1', [prjMgrId]);
    if (userCheck.rows.length === 0) {
      await logAudit({
        userId: req.user?.userId,
        username: req.user?.username || 'unknown',
        category: 'ADMIN_CHANGE',
        action: 'PASSWORD_RESET_BY_ADMIN',
        status: 'FAILURE',
        ip: req.ip || 'unknown',
        details: {
          prj_mgr_id: prjMgrId,
          error: 'No user account found for this manager'
        }
      });
      res.status(404).json({ error: 'No user account found for this Project Manager.' });
      return;
    }

    const targetUser = userCheck.rows[0];
    const newPassword = password && typeof password === 'string' && password.trim().length >= 6
      ? password.trim()
      : generateSecurePassword();

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 2. Update password_hash and set must_change_password = TRUE
    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE prj_mgr_id = $2`,
      [passwordHash, prjMgrId]
    );

    // 3. Invalidate active sessions
    await pool.query(
      `UPDATE sessions SET revoked = true WHERE user_id = $1`,
      [targetUser.id]
    );

    // 4. Log audit entry
    await logAudit({
      userId: req.user?.userId,
      username: req.user?.username || 'unknown',
      category: 'ADMIN_CHANGE',
      action: 'PASSWORD_RESET_BY_ADMIN',
      status: 'SUCCESS',
      ip: req.ip || 'unknown',
      details: {
        prj_mgr_id: prjMgrId,
        target_username: targetUser.username,
        target_user_id: targetUser.id
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      password: newPassword
    });
  } catch (error: any) {
    console.error('Error resetting manager password:', error);
    await logAudit({
      userId: req.user?.userId,
      username: req.user?.username || 'unknown',
      category: 'ADMIN_CHANGE',
      action: 'PASSWORD_RESET_BY_ADMIN',
      status: 'FAILURE',
      ip: req.ip || 'unknown',
      details: {
        prj_mgr_id: prjMgrId,
        error: error.message
      }
    });
    res.status(500).json({ error: 'Failed to reset manager password.' });
  }
});

export default router;
