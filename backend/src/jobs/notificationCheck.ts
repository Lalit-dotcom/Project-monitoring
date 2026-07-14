import { pool } from '../db.js';
import { createNotification } from '../lib/createNotification.js';
import {
  getPurchaseOrdersExpiringLowCollectionSql,
  getPurchaseOrdersExpiredUncollectedSql,
  getProjectsVendorOverpaidSql,
  getProjectsStalledSql,
  getTaxInvoicesMissingIrnSql
} from '../lib/riskFlags.js';

export async function runNotificationCheck(): Promise<void> {
  console.log('[JOBS] Starting notification periodic check...');

  try {
    // 1. Fetch all active RISK_FLAG notifications to check for resolution
    const activeResult = await pool.query(
      `SELECT id, type, dedup_key FROM notifications WHERE category = 'RISK_FLAG' AND resolved_at IS NULL`
    );
    const activeNotifications = activeResult.rows;

    const triggeredKeys = new Set<string>();

    // 2. Scan: PO Expiring Soon + Low Collection
    const expiringSoonRes = await pool.query(
      `SELECT final_po_no, project_no FROM purchase_orders WHERE ${getPurchaseOrdersExpiringLowCollectionSql('3')}`
    );
    for (const po of expiringSoonRes.rows) {
      const poKey = po.final_po_no;
      if (!poKey) continue;
      const key = `PO_EXPIRING_SOON:${poKey}`;
      triggeredKeys.add(key);

      await createNotification({
        category: 'RISK_FLAG',
        type: 'PO_EXPIRING_SOON',
        projectNo: po.project_no,
        title: `PO Expiring Soon: ${poKey}`,
        message: `Purchase order ${poKey} for project ${po.project_no} is expiring within 3 months and collection is low.`,
        severity: 'WARNING',
        dedupKey: key
      });
    }

    // 3. Scan: PO Expired + Uncollected
    const expiredRes = await pool.query(
      `SELECT final_po_no, project_no FROM purchase_orders WHERE ${getPurchaseOrdersExpiredUncollectedSql()}`
    );
    for (const po of expiredRes.rows) {
      const poKey = po.final_po_no;
      if (!poKey) continue;
      const key = `PO_EXPIRED_UNCOLLECTED:${poKey}`;
      triggeredKeys.add(key);

      await createNotification({
        category: 'RISK_FLAG',
        type: 'PO_EXPIRED_UNCOLLECTED',
        projectNo: po.project_no,
        title: `PO Expired & Uncollected: ${poKey}`,
        message: `Purchase order ${poKey} for project ${po.project_no} has expired but has uncollected funds.`,
        severity: 'WARNING',
        dedupKey: key
      });
    }

    // 4. Scan: Vendor Paid More Than Collected
    const overpaidRes = await pool.query(
      `SELECT project_cd FROM projects WHERE ${getProjectsVendorOverpaidSql()}`
    );
    for (const p of overpaidRes.rows) {
      const key = `VENDOR_OVERPAID:${p.project_cd}`;
      triggeredKeys.add(key);

      await createNotification({
        category: 'RISK_FLAG',
        type: 'VENDOR_OVERPAID',
        projectNo: p.project_cd,
        title: `Vendor Overpaid: ${p.project_cd}`,
        message: `Total payments to vendors exceed the amount received from the client for project ${p.project_cd}.`,
        severity: 'CRITICAL',
        dedupKey: key
      });
    }

    // 5. Scan: Stalled Project
    const stalledRes = await pool.query(
      `SELECT project_cd FROM projects WHERE ${getProjectsStalledSql()}`
    );
    for (const p of stalledRes.rows) {
      const key = `STALLED_PROJECT:${p.project_cd}`;
      triggeredKeys.add(key);

      await createNotification({
        category: 'RISK_FLAG',
        type: 'STALLED_PROJECT',
        projectNo: p.project_cd,
        title: `Stalled Project: ${p.project_cd}`,
        message: `Project ${p.project_cd} has a purchase order older than 60 days but has no billed invoices.`,
        severity: 'WARNING',
        dedupKey: key
      });
    }

    // 6. Scan: Missing IRN Aging
    const missingIrnRes = await pool.query(
      `SELECT id, user_bill_no, project_no FROM tax_invoices WHERE ${getTaxInvoicesMissingIrnSql()}`
    );
    for (const ti of missingIrnRes.rows) {
      const key = `MISSING_IRN_AGING:${ti.id}`;
      triggeredKeys.add(key);

      await createNotification({
        category: 'RISK_FLAG',
        type: 'MISSING_IRN_AGING',
        projectNo: ti.project_no,
        title: `Missing IRN: ${ti.user_bill_no}`,
        message: `Tax invoice ${ti.user_bill_no} for project ${ti.project_no} is older than 90 days and lacks a GST e-invoice IRN.`,
        severity: 'WARNING',
        dedupKey: key
      });
    }

    // 7. Resolve inactive notifications
    for (const active of activeNotifications) {
      if (active.dedup_key && !triggeredKeys.has(active.dedup_key)) {
        console.log(`[JOBS] Resolving inactive notification: ${active.dedup_key}`);
        await pool.query(
          `UPDATE notifications SET resolved_at = now() WHERE id = $1`,
          [active.id]
        );
      }
    }

    console.log('[JOBS] Notification periodic check completed.');
  } catch (error: any) {
    console.error('[JOBS] Error running notification check job:', error);
  }
}
