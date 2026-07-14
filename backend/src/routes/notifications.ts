import { Router, Response } from 'express';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/notifications
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const prjMgrId = req.user?.prjMgrId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { unreadOnly, category, page, pageSize } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const size = parseInt(pageSize as string) || 50;
    const offset = (pageNum - 1) * size;

    let queryText = `
      SELECT n.*, 
             (nr.user_id IS NOT NULL) AS "isRead"
      FROM notifications n
      LEFT JOIN projects p ON n.project_no = p.project_cd
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = $1
    `;
    let countQueryText = `
      SELECT COUNT(*)
      FROM notifications n
      LEFT JOIN projects p ON n.project_no = p.project_cd
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = $1
    `;

    const conditions: string[] = [];
    const values: any[] = [userId]; // $1
    let paramIndex = 2;

    // Apply role-based visibility conditions
    if (role === 'project_manager') {
      conditions.push(`((n.target_user_id = $${paramIndex}) OR (n.project_no IS NOT NULL AND p.prj_mgr_id = $${paramIndex + 1}))`);
      values.push(userId); // $2
      values.push(prjMgrId); // $3
      paramIndex += 2;
    }

    // Apply unreadOnly filter
    if (unreadOnly === 'true') {
      conditions.push('nr.user_id IS NULL');
    }

    // Apply category filter
    if (category && typeof category === 'string' && category.trim() !== '' && category !== 'All') {
      conditions.push(`n.category = $${paramIndex}`);
      values.push(category.trim());
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    
    // Construct final queries
    const dataQueryText = queryText + whereClause + ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const totalCountQueryText = countQueryText + whereClause;

    const dataRes = await pool.query(dataQueryText, [...values, size, offset]);
    const countRes = await pool.query(totalCountQueryText, values);
    const count = parseInt(countRes.rows[0].count, 10);

    // Compute unreadCount across all pages/categories for the badge
    let unreadConditions: string[] = ['nr.user_id IS NULL'];
    const unreadValues: any[] = [userId];
    if (role === 'project_manager') {
      unreadConditions.push(`((n.target_user_id = $2) OR (n.project_no IS NOT NULL AND p.prj_mgr_id = $3))`);
      unreadValues.push(userId, prjMgrId);
    }
    const unreadWhere = ' WHERE ' + unreadConditions.join(' AND ');
    const unreadQueryText = `
      SELECT COUNT(*)::integer as count
      FROM notifications n
      LEFT JOIN projects p ON n.project_no = p.project_cd
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = $1
      ${unreadWhere}
    `;
    const unreadRes = await pool.query(unreadQueryText, unreadValues);
    const unreadCount = unreadRes.rows[0].count;

    res.json({
      data: dataRes.rows.map(row => ({
        id: String(row.id),
        title: row.title,
        description: row.message,
        timestamp: row.created_at,
        type: row.severity === 'CRITICAL' || row.severity === 'WARNING' ? 'warning' : 'info',
        read: !!row.isRead
      })),
      count,
      unreadCount
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications feed' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const prjMgrId = req.user?.prjMgrId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notificationId = parseInt(req.params.id as string, 10);
    if (isNaN(notificationId)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    // Verify visibility before marking read
    let visibilityQuery = `
      SELECT n.id 
      FROM notifications n
      LEFT JOIN projects p ON n.project_no = p.project_cd
      WHERE n.id = $1
    `;
    const checkValues: any[] = [notificationId];

    if (role === 'project_manager') {
      visibilityQuery += ` AND ((n.target_user_id = $2) OR (n.project_no IS NOT NULL AND p.prj_mgr_id = $3))`;
      checkValues.push(userId, prjMgrId);
    }

    const checkRes = await pool.query(visibilityQuery, checkValues);
    if (checkRes.rows.length === 0) {
      res.status(403).json({ error: 'Access denied or notification not found' });
      return;
    }

    // Mark as read
    await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (notification_id, user_id) DO NOTHING`,
      [notificationId, userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const prjMgrId = req.user?.prjMgrId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let readAllQuery = `
      INSERT INTO notification_reads (notification_id, user_id)
      SELECT n.id, $1
      FROM notifications n
      LEFT JOIN projects p ON n.project_no = p.project_cd
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = $1
      WHERE nr.user_id IS NULL
    `;
    const qValues: any[] = [userId];

    if (role === 'project_manager') {
      readAllQuery += ` AND ((n.target_user_id = $1) OR (n.project_no IS NOT NULL AND p.prj_mgr_id = $2))`;
      qValues.push(prjMgrId);
    }

    readAllQuery += ` ON CONFLICT DO NOTHING`;

    await pool.query(readAllQuery, qValues);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router;
