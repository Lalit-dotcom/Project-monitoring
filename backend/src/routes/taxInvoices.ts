import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { TaxInvoice } from '../types/modules.js';
import { getTaxInvoicesMissingIrnSql } from '../lib/riskFlags.js';

const router = Router();

function formatDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
}

function mapRowToTaxInvoice(row: any): TaxInvoice {
  return {
    id: Number(row.id),
    headerId: row.header_id ? Number(row.header_id) : null,
    projectId: row.project_id ? Number(row.project_id) : null,
    projectNo: row.project_no,
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
    prjMgrName: row.prj_mgr_name || null,
    custId: row.cust_id ? Number(row.cust_id) : null,
    custGstinNo: row.cust_gstin_no,
    prjGstnNo: row.prj_gstn_no,
    poNo: row.po_no,
    ampono: row.ampono,
    userBillNo: row.user_bill_no,
    billDate: formatDate(row.bill_date),
    billStatus: row.bill_status,
    billingPeriodFrom: row.billing_period_from,
    billingPeriodTo: row.billing_period_to,
    suppInvNum: row.supp_inv_num,
    totalAmount: row.total_amount ? Number(row.total_amount) : null,
    billType: row.bill_type,
    stateDescription: row.state_description,
    irnNo: row.irn_no,
    createdDate: formatDate(row.created_date)
  };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check distinctValues request
    if (req.query.distinctValues === 'true') {
      const statusResult = await pool.query(
        "SELECT DISTINCT bill_status FROM tax_invoices WHERE bill_status IS NOT NULL AND bill_status != '' ORDER BY bill_status ASC"
      );
      const stateResult = await pool.query(
        "SELECT DISTINCT state_description FROM tax_invoices WHERE state_description IS NOT NULL AND state_description != '' ORDER BY state_description ASC"
      );
      const typeResult = await pool.query(
        "SELECT DISTINCT bill_type FROM tax_invoices WHERE bill_type IS NOT NULL AND bill_type != '' ORDER BY bill_type ASC"
      );
      res.json({
        billStatuses: statusResult.rows.map(row => row.bill_status),
        states: stateResult.rows.map(row => row.state_description),
        billTypes: typeResult.rows.map(row => row.bill_type)
      });
      return;
    }

    // 2. Parse filters
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const { search, billStatus, state, billType, missingIrn, projectNo, minAmount, maxAmount, billDateFrom, billDateTo, sortBy, sortOrder, prjMgrId } = req.query;

    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(`(user_bill_no ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR cust_gstin_no ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
      const pmId = Number(prjMgrId);
      if (!isNaN(pmId)) {
        conditions.push(`tax_invoices.prj_mgr_id = $${paramIndex}`);
        values.push(pmId);
        paramIndex++;
      }
    }

    if (billStatus && typeof billStatus === 'string' && billStatus !== 'All') {
      conditions.push(`bill_status = $${paramIndex}`);
      values.push(billStatus.trim());
      paramIndex++;
    }

    if (state && typeof state === 'string' && state !== 'All') {
      conditions.push(`state_description = $${paramIndex}`);
      values.push(state.trim());
      paramIndex++;
    }

    if (billType && typeof billType === 'string' && billType !== 'All') {
      conditions.push(`bill_type = $${paramIndex}`);
      values.push(billType.trim());
      paramIndex++;
    }

    if (missingIrn === 'true') {
      conditions.push(`irn_no IS NULL OR irn_no = ''`);
    }

    // Risk & Compliance Flags
    const riskMissingIrn = req.query.riskMissingIrn;
    if (riskMissingIrn === 'true') {
      conditions.push(getTaxInvoicesMissingIrnSql());
    }

    if (projectNo && typeof projectNo === 'string' && projectNo.trim() !== '') {
      conditions.push(`project_no = $${paramIndex}`);
      values.push(projectNo.trim());
      paramIndex++;
    }

    if (minAmount !== undefined && minAmount !== '') {
      const minVal = parseFloat(minAmount as string);
      if (!isNaN(minVal)) {
        conditions.push(`total_amount >= $${paramIndex}`);
        values.push(minVal);
        paramIndex++;
      }
    }

    if (maxAmount !== undefined && maxAmount !== '') {
      const maxVal = parseFloat(maxAmount as string);
      if (!isNaN(maxVal)) {
        conditions.push(`total_amount <= $${paramIndex}`);
        values.push(maxVal);
        paramIndex++;
      }
    }

    if (billDateFrom && typeof billDateFrom === 'string' && billDateFrom.trim() !== '') {
      conditions.push(`bill_date >= $${paramIndex}`);
      values.push(billDateFrom.trim());
      paramIndex++;
    }

    if (billDateTo && typeof billDateTo === 'string' && billDateTo.trim() !== '') {
      conditions.push(`bill_date <= $${paramIndex}`);
      values.push(billDateTo.trim());
      paramIndex++;
    }

    // 3. Sorting
    const allowedSortFields = ['total_amount', 'bill_date'];
    const activeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'id';
    const activeSortOrder = (sortOrder as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let queryText = `
      SELECT tax_invoices.*, project_managers.prj_mgr_name 
      FROM tax_invoices 
      LEFT JOIN project_managers ON tax_invoices.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ` ORDER BY ${activeSortBy} ${activeSortOrder}, id ASC`;

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToTaxInvoice);

    res.json({
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Database query error in tax-invoices:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving tax invoices.'
    });
  }
});

export default router;
