import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { Invoice } from '../types/modules.js';
import { 
  getInvoicesOverdueUnpaidSql, 
  getInvoicesDisputedUnpaidSql 
} from '../lib/riskFlags.js';

const router = Router();

function formatDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
}

function mapRowToInvoice(row: any): Invoice {
  return {
    id: Number(row.id),
    headerId: row.header_id ? Number(row.header_id) : null,
    projectId: row.project_id ? Number(row.project_id) : null,
    projectNo: row.project_no,
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
    prjMgrName: row.prj_mgr_name || null,
    managerName: row.manager_name,
    poNo: row.po_no,
    vendorId: row.vendor_id ? Number(row.vendor_id) : null,
    vendorName: row.vendor_name,
    invoiceNum: row.invoice_num,
    invoiceDate: formatDate(row.invoice_date),
    glDate: formatDate(row.gl_date),
    invoiceAmount: row.invoice_amount ? Number(row.invoice_amount) : null,
    amountPaid: row.amount_paid ? Number(row.amount_paid) : null,
    unpaid: row.unpaid ? Number(row.unpaid) : null,
    penAmt: row.pen_amt ? Number(row.pen_amt) : null,
    objection: row.objection,
    finalUnpaid: row.final_unpaid ? Number(row.final_unpaid) : null,
    invoiceType: row.invoice_type,
    projectAbp: row.project_abp ? Number(row.project_abp) : null,
    gemFlag: row.gem_flag,
    msmeVendorName: row.msme_vendor_name,
    createdDate: formatDate(row.created_date)
  };
}

// Lightweight exists endpoint to check if invoices exist for a projectNo
router.get('/exists', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectNo } = req.query;
    if (!projectNo || typeof projectNo !== 'string') {
      res.status(400).json({ error: 'projectNo parameter is required' });
      return;
    }
    const query = 'SELECT EXISTS(SELECT 1 FROM invoices WHERE project_no = $1)';
    const result = await pool.query(query, [projectNo]);
    res.json({ exists: result.rows[0].exists });
  } catch (error: any) {
    console.error('Error checking invoice existence:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check distinctValues request
    if (req.query.distinctValues === 'true') {
      const typesResult = await pool.query(
        "SELECT DISTINCT invoice_type FROM invoices WHERE invoice_type IS NOT NULL AND invoice_type != '' ORDER BY invoice_type ASC"
      );
      const vendorsResult = await pool.query(
        "SELECT DISTINCT vendor_id, vendor_name FROM invoices WHERE vendor_id IS NOT NULL ORDER BY vendor_name ASC"
      );
      const managersResult = await pool.query(
        "SELECT DISTINCT prj_mgr_id, manager_name FROM invoices WHERE prj_mgr_id IS NOT NULL ORDER BY manager_name ASC"
      );
      res.json({
        invoiceTypes: typesResult.rows.map(row => row.invoice_type),
        vendors: vendorsResult.rows.map(row => ({
          vendorId: Number(row.vendor_id),
          vendorName: row.vendor_name
        })),
        managers: managersResult.rows.map(row => ({
          managerId: Number(row.prj_mgr_id),
          managerName: row.manager_name
        }))
      });
      return;
    }

    // 2. Parse filters
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const { search, invoiceType, hasObjection, unpaidOnly, prjMgrId, vendorId, projectNo, minAmount, maxAmount, invoiceDateFrom, invoiceDateTo, sortBy, sortOrder } = req.query;

    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(`(invoice_num ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (invoiceType && typeof invoiceType === 'string' && invoiceType !== 'All') {
      conditions.push(`invoice_type = $${paramIndex}`);
      values.push(invoiceType.trim());
      paramIndex++;
    }

    if (hasObjection === 'true') {
      conditions.push(`objection IS NOT NULL AND objection != ''`);
    }

    if (unpaidOnly === 'true') {
      conditions.push(`unpaid > 0`);
    }

    // Risk & Compliance Flags
    const riskOverdueUnpaid = req.query.riskOverdueUnpaid;
    if (riskOverdueUnpaid === 'true') {
      conditions.push(getInvoicesOverdueUnpaidSql());
    }

    const riskDisputedUnpaid = req.query.riskDisputedUnpaid;
    if (riskDisputedUnpaid === 'true') {
      conditions.push(getInvoicesDisputedUnpaidSql());
    }

    if (prjMgrId && prjMgrId !== 'All') {
      const pmId = Number(prjMgrId);
      if (!isNaN(pmId)) {
        conditions.push(`invoices.prj_mgr_id = $${paramIndex}`);
        values.push(pmId);
        paramIndex++;
      }
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

    // 3. Sorting
    const allowedSortFields = ['invoice_amount', 'amount_paid', 'unpaid', 'invoice_date'];
    const activeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'id';
    const activeSortOrder = (sortOrder as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let queryText = `
      SELECT invoices.*, project_managers.prj_mgr_name 
      FROM invoices 
      LEFT JOIN project_managers ON invoices.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ` ORDER BY ${activeSortBy} ${activeSortOrder}, id ASC`;

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToInvoice);

    res.json({
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Database query error in invoices:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving invoices.'
    });
  }
});

export default router;
