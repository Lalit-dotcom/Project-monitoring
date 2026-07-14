import { Router, Response } from 'express';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/audit-logs
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Role Authorization Check: Super Admin only
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Access denied. Super Admin role required.' });
      return;
    }

    const { category, status, username, dateFrom, dateTo, search, page, pageSize } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const size = parseInt(pageSize as string) || 50;
    const offset = (pageNum - 1) * size;

    let queryText = 'SELECT * FROM audit_logs';
    let countQueryText = 'SELECT COUNT(*) FROM audit_logs';
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category.trim() !== '' && category !== 'All') {
      conditions.push(`category = $${paramIndex}`);
      values.push(category.trim());
      paramIndex++;
    }

    if (status && typeof status === 'string' && status.trim() !== '' && status !== 'All') {
      conditions.push(`status = $${paramIndex}`);
      values.push(status.trim());
      paramIndex++;
    }

    if (username && typeof username === 'string' && username.trim() !== '') {
      conditions.push(`username ILIKE $${paramIndex}`);
      values.push(`%${username.trim()}%`);
      paramIndex++;
    }

    if (dateFrom && typeof dateFrom === 'string' && dateFrom.trim() !== '') {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(`${dateFrom.trim()} 00:00:00`);
      paramIndex++;
    }

    if (dateTo && typeof dateTo === 'string' && dateTo.trim() !== '') {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(`${dateTo.trim()} 23:59:59`);
      paramIndex++;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(`(action ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      queryText += whereClause;
      countQueryText += whereClause;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryValues = [...values, size, offset];

    const dataResult = await pool.query(queryText, queryValues);
    const countResult = await pool.query(countQueryText, values);
    const count = parseInt(countResult.rows[0].count, 10);

    // Fetch summary counts for cards
    const summaryQuery = `
      SELECT 
        COUNT(CASE WHEN category = 'LOGIN' AND status = 'FAILURE' THEN 1 END)::integer as failed_logins,
        COUNT(CASE WHEN category = 'ADMIN_CHANGE' THEN 1 END)::integer as admin_changes,
        COUNT(CASE WHEN category = 'REPORT_DOWNLOAD' THEN 1 END)::integer as report_downloads
      FROM audit_logs
    `;
    const summaryRes = await pool.query(summaryQuery);
    const summary = summaryRes.rows[0];

    res.json({
      data: dataResult.rows,
      count,
      summary: {
        failedLogins: summary.failed_logins,
        adminChanges: summary.admin_changes,
        reportDownloads: summary.report_downloads
      }
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

export default router;
