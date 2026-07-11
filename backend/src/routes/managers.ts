import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';

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
      res.status(400).json({ error: 'Full Name, Username, Password, and Email are required.' });
      return;
    }

    // 1. Check username uniqueness
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
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
      INSERT INTO users (username, password_hash, role, prj_mgr_id, email)
      VALUES ($1, $2, 'project_manager', $3, $4)
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
    res.status(500).json({ error: 'Failed to create project manager.' });
  }
});

export default router;
