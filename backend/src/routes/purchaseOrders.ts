import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { PurchaseOrder } from '../types/modules.js';
import { 
  getPurchaseOrdersExpiringLowCollectionSql, 
  getPurchaseOrdersExpiredUncollectedSql, 
  getPurchaseOrdersStalledSql 
} from '../lib/riskFlags.js';

const router = Router();

function formatDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
}

function mapRowToPurchaseOrder(row: any): PurchaseOrder {
  return {
    id: Number(row.id),
    headerId: row.header_id ? Number(row.header_id) : null,
    projectId: row.project_id ? Number(row.project_id) : null,
    projectNo: row.project_no,
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
    prjMgrName: row.prj_mgr_name || null,
    vendorId: row.vendor_id ? Number(row.vendor_id) : null,
    vendorName: row.vendor_name,
    finalPoNo: row.final_po_no,
    poDate: formatDate(row.po_date),
    validFrom: formatDate(row.valid_from),
    validTo: formatDate(row.valid_to),
    total: row.total ? Number(row.total) : null,
    approvalStatus: row.approval_status,
    createdDate: formatDate(row.created_date)
  };
}

// GET /api/purchase-orders/statuses
router.get('/statuses', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT approval_status FROM purchase_orders WHERE approval_status IS NOT NULL AND approval_status != '' ORDER BY approval_status ASC"
    );
    const statuses = result.rows.map(row => row.approval_status);
    res.json(statuses);
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving purchase order statuses.'
    });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check distinctValues request
    if (req.query.distinctValues === 'true') {
      const statusesResult = await pool.query(
        "SELECT DISTINCT approval_status FROM purchase_orders WHERE approval_status IS NOT NULL AND approval_status != '' ORDER BY approval_status ASC"
      );
      const vendorsResult = await pool.query(
        "SELECT DISTINCT vendor_id, vendor_name FROM purchase_orders WHERE vendor_id IS NOT NULL ORDER BY vendor_name ASC"
      );
      res.json({
        approvalStatuses: statusesResult.rows.map(row => row.approval_status),
        vendors: vendorsResult.rows.map(row => ({
          vendorId: Number(row.vendor_id),
          vendorName: row.vendor_name
        }))
      });
      return;
    }

    // 2. Parse filter conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const { search, approvalStatus, vendorId, projectNo, minTotal, maxTotal, poDateFrom, poDateTo, validity, sortBy, sortOrder, prjMgrId } = req.query;

    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(`(final_po_no ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
      const pmId = Number(prjMgrId);
      if (!isNaN(pmId)) {
        conditions.push(`purchase_orders.prj_mgr_id = $${paramIndex}`);
        values.push(pmId);
        paramIndex++;
      }
    }

    if (approvalStatus && typeof approvalStatus === 'string' && approvalStatus !== 'All') {
      conditions.push(`approval_status = $${paramIndex}`);
      values.push(approvalStatus.trim());
      paramIndex++;
    }

    if (vendorId && vendorId !== 'All') {
      const vId = Number(vendorId);
      if (!isNaN(vId)) {
        conditions.push(`vendor_id = $${paramIndex}`);
        values.push(vId);
        paramIndex++;
      }
    }

    if (projectNo && typeof projectNo === 'string' && projectNo.trim() !== '') {
      conditions.push(`project_no = $${paramIndex}`);
      values.push(projectNo.trim());
      paramIndex++;
    }

    if (minTotal !== undefined && minTotal !== '') {
      const minVal = parseFloat(minTotal as string);
      if (!isNaN(minVal)) {
        conditions.push(`total >= $${paramIndex}`);
        values.push(minVal);
        paramIndex++;
      }
    }

    if (maxTotal !== undefined && maxTotal !== '') {
      const maxVal = parseFloat(maxTotal as string);
      if (!isNaN(maxVal)) {
        conditions.push(`total <= $${paramIndex}`);
        values.push(maxVal);
        paramIndex++;
      }
    }

    if (poDateFrom && typeof poDateFrom === 'string' && poDateFrom.trim() !== '') {
      conditions.push(`po_date >= $${paramIndex}`);
      values.push(poDateFrom.trim());
      paramIndex++;
    }

    if (poDateTo && typeof poDateTo === 'string' && poDateTo.trim() !== '') {
      conditions.push(`po_date <= $${paramIndex}`);
      values.push(poDateTo.trim());
      paramIndex++;
    }

    if (validity === 'active') {
      conditions.push(`valid_to >= CURRENT_DATE`);
    } else if (validity === 'expired') {
      conditions.push(`valid_to < CURRENT_DATE`);
    }

    const expiringInMonths = req.query.expiringInMonths;
    if (expiringInMonths && typeof expiringInMonths === 'string') {
      const months = parseInt(expiringInMonths, 10);
      if (!isNaN(months)) {
        conditions.push(`valid_to >= CURRENT_DATE AND valid_to <= CURRENT_DATE + ($${paramIndex} * INTERVAL '1 month')`);
        values.push(months);
        paramIndex++;
      }
    }

    // Risk & Compliance Flags
    const riskExpiringLowCollection = req.query.riskExpiringLowCollection === 'true';
    if (riskExpiringLowCollection) {
      let months = 3;
      if (expiringInMonths && typeof expiringInMonths === 'string') {
        const m = parseInt(expiringInMonths, 10);
        if (!isNaN(m)) {
          months = m;
        }
      }
      conditions.push(getPurchaseOrdersExpiringLowCollectionSql(`$${paramIndex}`));
      values.push(months);
      paramIndex++;
    }

    const riskExpiredUncollected = req.query.riskExpiredUncollected === 'true';
    if (riskExpiredUncollected) {
      conditions.push(getPurchaseOrdersExpiredUncollectedSql());
    }

    const riskStalled = req.query.riskStalled;
    if (riskStalled === 'true') {
      conditions.push(getPurchaseOrdersStalledSql());
    }

    // 3. Sorting
    const allowedSortFields = ['final_po_no', 'total', 'po_date', 'valid_to'];
    const activeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'id';
    const activeSortOrder = (sortOrder as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let queryText = `
      SELECT purchase_orders.*, project_managers.prj_mgr_name 
      FROM purchase_orders 
      LEFT JOIN project_managers ON purchase_orders.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ` ORDER BY ${activeSortBy} ${activeSortOrder}, id ASC`;

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToPurchaseOrder);

    // Compute active and expired counts on the database side
    let countQueryText = `
      SELECT 
        COUNT(*) FILTER (WHERE valid_to >= CURRENT_DATE) as active_count,
        COUNT(*) FILTER (WHERE valid_to < CURRENT_DATE) as expired_count
      FROM purchase_orders
    `.trim();
    if (conditions.length > 0) {
      countQueryText += ' WHERE ' + conditions.join(' AND ');
    }
    const countsResult = await pool.query(countQueryText, values);
    const activeCount = Number(countsResult.rows[0].active_count);
    const expiredCount = Number(countsResult.rows[0].expired_count);

    res.json({
      data,
      count: data.length,
      activeCount,
      expiredCount
    });
  } catch (error: any) {
    console.error('Database query error in purchase-orders:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving purchase orders.'
    });
  }
});

export default router;
