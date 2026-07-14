import { pool } from '../db.js';

export interface AuditLogParams {
  userId?: number | null;
  username: string;
  category: 'LOGIN' | 'LOGOUT' | 'USER_ACTIVITY' | 'SYNC' | 'REPORT_DOWNLOAD' | 'ADMIN_CHANGE';
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  ip?: string | null;
  details?: Record<string, any> | null;
}

export async function logAudit({
  userId,
  username,
  category,
  action,
  status,
  ip,
  details
}: AuditLogParams): Promise<void> {
  const timestamp = new Date().toISOString();
  // Keep real-time console visibility during development
  console.log(`[${timestamp}] AUDIT EVENT: category="${category}", action="${action}", status="${status}", username="${username}", ip="${ip}", details=${JSON.stringify(details)}`);

  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, category, action, status, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId !== undefined ? userId : null,
        username,
        category,
        action,
        status,
        ip !== undefined ? ip : null,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (err) {
    console.error(`[${timestamp}] FAILED TO WRITE TO AUDIT LOG:`, err);
  }
}
