import { pool } from '../db.js';

export interface CreateNotificationParams {
  category: 'RISK_FLAG' | 'SECURITY' | 'ADMIN';
  type: string;
  projectNo?: string | null;
  targetUserId?: number | null;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  dedupKey?: string | null;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { category, type, projectNo, targetUserId, title, message, severity, dedupKey } = params;
  try {
    await pool.query(
      `INSERT INTO notifications (
        category, type, project_no, target_user_id, title, message, severity, dedup_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (dedup_key) WHERE resolved_at IS NULL AND dedup_key IS NOT NULL DO NOTHING`,
      [category, type, projectNo || null, targetUserId || null, title, message, severity, dedupKey || null]
    );
  } catch (error: any) {
    console.error('Error creating notification in DB:', error);
  }
}
