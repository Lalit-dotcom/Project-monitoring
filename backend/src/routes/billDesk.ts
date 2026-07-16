import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { BillDeskRecord } from '../types/modules.js';

const router = Router();

function formatDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
}

function mapRowToBillDesk(row: any): BillDeskRecord {
  return {
    id: Number(row.id),
    headerId: row.header_id ? Number(row.header_id) : null,
    projectId: row.project_id ? Number(row.project_id) : null,
    projectNo: row.project_no,
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
    prjMgrName: row.prj_mgr_name || null,
    finalPoNo: row.final_po_no,
    billMonth: row.bill_month,
    vendorId: row.vendor_id ? Number(row.vendor_id) : null,
    vendorName: row.vendor_name,
    invoiceNo: row.invoice_no,
    invoiceDate: formatDate(row.invoice_date),
    receivedDate: formatDate(row.received_date),
    invoiceAmount: row.invoice_amount ? Number(row.invoice_amount) : null,
    invoiceNum: row.invoice_num,
    invoiceAmountBk: row.invoice_amount_bk ? Number(row.invoice_amount_bk) : null,
    amountPaid: row.amount_paid ? Number(row.amount_paid) : null,
    invoiceStatus: row.invoice_status,
    objectionRemarks: row.objection_remarks,
    status: row.status,
    createdDate: formatDate(row.created_date)
  };
}

// GET /api/bill-desk/statuses
router.get('/statuses', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT status FROM bill_desk WHERE status IS NOT NULL AND status != '' ORDER BY status ASC"
    );
    const statuses = result.rows.map(row => row.status);
    res.json(statuses);
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving bill desk statuses.'
    });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check distinctValues request
    if (req.query.distinctValues === 'true') {
      const statusResult = await pool.query(
        "SELECT DISTINCT status FROM bill_desk WHERE status IS NOT NULL AND status != '' ORDER BY status ASC"
      );
      const invStatusResult = await pool.query(
        "SELECT DISTINCT invoice_status FROM bill_desk WHERE invoice_status IS NOT NULL AND invoice_status != '' ORDER BY invoice_status ASC"
      );
      const monthsResult = await pool.query(
        `SELECT bill_month FROM (
          SELECT DISTINCT bill_month FROM bill_desk 
          WHERE bill_month IS NOT NULL AND bill_month != ''
        ) sub 
        ORDER BY TO_DATE(sub.bill_month, 'FMMonth YYYY') ASC`
      );
      res.json({
        statuses: statusResult.rows.map(row => row.status),
        invoiceStatuses: invStatusResult.rows.map(row => row.invoice_status),
        billMonths: monthsResult.rows.map(row => row.bill_month)
      });
      return;
    }

    // 2. Parse filters
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const { search, status, invoiceStatus, billMonth, hasObjectionRemarks, projectNo, minAmount, maxAmount, invoiceDateFrom, invoiceDateTo, receivedDateFrom, receivedDateTo, sortBy, sortOrder, prjMgrId } = req.query;

    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(`(invoice_no ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
      const pmId = Number(prjMgrId);
      if (!isNaN(pmId)) {
        conditions.push(`bill_desk.prj_mgr_id = $${paramIndex}`);
        values.push(pmId);
        paramIndex++;
      }
    }

    if (status && typeof status === 'string' && status !== 'All') {
      conditions.push(`status = $${paramIndex}`);
      values.push(status.trim());
      paramIndex++;
    }

    if (invoiceStatus && typeof invoiceStatus === 'string' && invoiceStatus !== 'All') {
      conditions.push(`invoice_status = $${paramIndex}`);
      values.push(invoiceStatus.trim());
      paramIndex++;
    }

    if (billMonth && typeof billMonth === 'string' && billMonth !== 'All') {
      conditions.push(`bill_month = $${paramIndex}`);
      values.push(billMonth.trim());
      paramIndex++;
    }

    if (hasObjectionRemarks === 'true') {
      conditions.push(`objection_remarks IS NOT NULL AND objection_remarks != ''`);
    }

    if (projectNo && typeof projectNo === 'string' && projectNo.trim() !== '') {
      conditions.push(`project_no = $${paramIndex}`);
      values.push(projectNo.trim());
      paramIndex++;
    }

    if (minAmount !== undefined && minAmount !== '') {
      const minVal = parseFloat(minAmount as string);
      if (!isNaN(minVal)) {
        conditions.push(`invoice_amount >= $${paramIndex}`);
        values.push(minVal);
        paramIndex++;
      }
    }

    if (maxAmount !== undefined && maxAmount !== '') {
      const maxVal = parseFloat(maxAmount as string);
      if (!isNaN(maxVal)) {
        conditions.push(`invoice_amount <= $${paramIndex}`);
        values.push(maxVal);
        paramIndex++;
      }
    }

    if (invoiceDateFrom && typeof invoiceDateFrom === 'string' && invoiceDateFrom.trim() !== '') {
      conditions.push(`invoice_date >= $${paramIndex}`);
      values.push(invoiceDateFrom.trim());
      paramIndex++;
    }

    if (invoiceDateTo && typeof invoiceDateTo === 'string' && invoiceDateTo.trim() !== '') {
      conditions.push(`invoice_date <= $${paramIndex}`);
      values.push(invoiceDateTo.trim());
      paramIndex++;
    }

    if (receivedDateFrom && typeof receivedDateFrom === 'string' && receivedDateFrom.trim() !== '') {
      conditions.push(`received_date >= $${paramIndex}`);
      values.push(receivedDateFrom.trim());
      paramIndex++;
    }

    if (receivedDateTo && typeof receivedDateTo === 'string' && receivedDateTo.trim() !== '') {
      conditions.push(`received_date <= $${paramIndex}`);
      values.push(receivedDateTo.trim());
      paramIndex++;
    }

    // 3. Sorting
    const allowedSortFields = ['invoice_amount', 'amount_paid', 'invoice_date', 'received_date'];
    const activeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'id';
    const activeSortOrder = (sortOrder as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let queryText = `
      SELECT bill_desk.*, project_managers.prj_mgr_name 
      FROM bill_desk 
      LEFT JOIN project_managers ON bill_desk.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ` ORDER BY ${activeSortBy} ${activeSortOrder}, id ASC`;

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToBillDesk);

    res.json({
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Database query error in bill-desk:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving bill desk records.'
    });
  }
});

export default router;
