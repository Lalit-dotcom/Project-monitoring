import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { Project } from '../types/project.js';
import { 
  getProjectsVendorOverpaidSql, 
  getProjectsBillingAheadSql, 
  getProjectsStalledSql 
} from '../lib/riskFlags.js';

const router = Router();

// Shared SQL CASE fragment to determine the payment status of a project
const paymentStatusCaseSql = `
  CASE
    WHEN no_of_inv_billdesk = 0 AND total_invoice_amount = 0 THEN 'No Invoices Yet'
    WHEN total_invoice_amount > 0 AND total_amount_paid >= total_invoice_amount THEN 'Fully Paid'
    ELSE 'Partially Paid'
  END
`.trim();

// Convert snake_case database fields to camelCase properties for client JSON payload
function mapRowToProject(row: any): Project {
  let createdOnStr: string | null = null;
  if (row.created_on) {
    if (row.created_on instanceof Date) {
      createdOnStr = row.created_on.toISOString().split('T')[0];
    } else {
      createdOnStr = String(row.created_on);
    }
  }

  // Use the database-computed status if present, otherwise fall back to Javascript computation
  let paymentStatus: 'Fully Paid' | 'Partially Paid' | 'No Invoices Yet' = row.computed_payment_status;
  if (!paymentStatus) {
    const noOfInv = Number(row.no_of_inv_billdesk);
    const totalInv = Number(row.total_invoice_amount);
    const paid = Number(row.total_amount_paid);

    if (noOfInv === 0 && totalInv === 0) {
      paymentStatus = 'No Invoices Yet';
    } else if (totalInv > 0 && paid >= totalInv) {
      paymentStatus = 'Fully Paid';
    } else {
      paymentStatus = 'Partially Paid';
    }
  }

  return {
    headerId: Number(row.header_id),
    projectId: Number(row.project_id),
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
    prjMgrName: row.prj_mgr_name || null,
    projectCd: row.project_cd,
    prjNm: row.prj_nm,
    customerName: row.customer_name,
    prjBudgetNo: row.prj_budget_no ? Number(row.prj_budget_no) : null,
    amountReceived: row.amount_received ? Number(row.amount_received) : null,
    noOfPo: Number(row.no_of_po),
    poAmount: row.po_amount ? Number(row.po_amount) : null,
    noOfInvBilldesk: Number(row.no_of_inv_billdesk),
    noOfExpInvoice: Number(row.no_of_exp_invoice),
    totalInvoiceAmount: Number(row.total_invoice_amount),
    totalAmountPaid: Number(row.total_amount_paid),
    noOfTaxInvoice: Number(row.no_of_tax_invoice),
    totalTaxInvoiceAmount: Number(row.total_tax_invoice_amount),
    projectAbp: row.project_abp ? Number(row.project_abp) : null,
    createdOn: createdOnStr,
    custId: row.cust_id ? Number(row.cust_id) : null,
    prjType: row.prj_type,
    userEmail: row.user_email,
    mobileNumber: row.mobile_number,
    hodEmail: row.hod_email,
    nicCordEmailId: row.nic_cord_emailid,
    staffEmailId: row.staff_email_id,
    paymentStatus
  };
}

// Get distinct project types
router.get('/types', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT prj_type FROM projects WHERE prj_type IS NOT NULL AND prj_type != '' ORDER BY prj_type ASC"
    );
    const types = result.rows.map(row => row.prj_type);
    res.json(types);
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving project types.'
    });
  }
});

// Get project managers
router.get('/managers', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT prj_mgr_id, prj_mgr_name FROM project_managers ORDER BY prj_mgr_name ASC"
    );
    res.json(result.rows.map(row => ({ prjMgrId: row.prj_mgr_id, prjMgrName: row.prj_mgr_name })));
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving project managers.'
    });
  }
});

// Get projects with filtering, sorting, tab counts, and pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Search condition: Customer name, project name, or code
    const search = req.query.search;
    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(
        `(customer_name ILIKE $${paramIndex} OR prj_nm ILIKE $${paramIndex} OR project_cd ILIKE $${paramIndex})`
      );
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Project Manager filter
    const prjMgrId = req.query.prjMgrId;
    if (prjMgrId && typeof prjMgrId === 'string' && prjMgrId !== 'All' && prjMgrId.trim() !== '') {
      conditions.push(`projects.prj_mgr_id = $${paramIndex}`);
      values.push(parseInt(prjMgrId));
      paramIndex++;
    }

    // Payment Status condition
    const paymentStatus = req.query.paymentStatus;
    if (paymentStatus === 'no_invoices') {
      conditions.push(`${paymentStatusCaseSql} = $${paramIndex}`);
      values.push('No Invoices Yet');
      paramIndex++;
    } else if (paymentStatus === 'fully_paid') {
      conditions.push(`${paymentStatusCaseSql} = $${paramIndex}`);
      values.push('Fully Paid');
      paramIndex++;
    } else if (paymentStatus === 'partially_paid') {
      conditions.push(`${paymentStatusCaseSql} = $${paramIndex}`);
      values.push('Partially Paid');
      paramIndex++;
    }

    // Project Type condition
    const projectType = req.query.projectType;
    if (projectType && typeof projectType === 'string' && projectType !== 'All' && projectType.trim() !== '') {
      conditions.push(`prj_type = $${paramIndex}`);
      values.push(projectType.trim());
      paramIndex++;
    }

    // Amount Range filtering
    const amountFieldRaw = req.query.amountField;
    const amountField = amountFieldRaw === 'amount_received' ? 'amount_received' : 'po_amount';

    const minAmount = req.query.minAmount;
    if (minAmount !== undefined && minAmount !== '') {
      const minNum = parseFloat(minAmount as string);
      if (!isNaN(minNum)) {
        conditions.push(`${amountField} >= $${paramIndex}`);
        values.push(minNum);
        paramIndex++;
      }
    }

    const maxAmount = req.query.maxAmount;
    if (maxAmount !== undefined && maxAmount !== '') {
      const maxNum = parseFloat(maxAmount as string);
      if (!isNaN(maxNum)) {
        conditions.push(`${amountField} <= $${paramIndex}`);
        values.push(maxNum);
        paramIndex++;
      }
    }

    // Date Range filtering
    const dateFrom = req.query.dateFrom;
    if (dateFrom && typeof dateFrom === 'string' && dateFrom.trim() !== '') {
      conditions.push(`created_on >= $${paramIndex}`);
      values.push(dateFrom.trim());
      paramIndex++;
    }

    const dateTo = req.query.dateTo;
    if (dateTo && typeof dateTo === 'string' && dateTo.trim() !== '') {
      conditions.push(`created_on <= $${paramIndex}`);
      values.push(dateTo.trim());
      paramIndex++;
    }

    // Checkbox toggles
    const noPoYet = req.query.noPoYet;
    if (noPoYet === 'true') {
      conditions.push('no_of_po = 0');
    }

    const taxInvoiceOutstanding = req.query.taxInvoiceOutstanding;
    if (taxInvoiceOutstanding === 'true') {
      conditions.push('no_of_tax_invoice > 0 AND total_amount_paid < total_invoice_amount');
    }

    // Risk & Compliance Flags
    const riskVendorOverpaid = req.query.riskVendorOverpaid;
    if (riskVendorOverpaid === 'true') {
      conditions.push(getProjectsVendorOverpaidSql());
    }

    const riskBillingAhead = req.query.riskBillingAhead;
    if (riskBillingAhead === 'true') {
      conditions.push(getProjectsBillingAheadSql());
    }

    const riskStalled = req.query.riskStalled;
    if (riskStalled === 'true') {
      conditions.push(getProjectsStalledSql());
    }

    // Sorting parameters
    const sortByRaw = req.query.sortBy;
    const allowedSortFields = ['po_amount', 'amount_received', 'total_amount_paid', 'created_on'];
    const sortBy = allowedSortFields.includes(sortByRaw as string) ? sortByRaw : 'created_on';

    const sortOrderRaw = req.query.sortOrder;
    const sortOrder = (sortOrderRaw as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 9;
    const offset = (page - 1) * pageSize;

    // Construct SQL Query projecting computed_payment_status and COUNT(*) OVER()
    let queryText = `
      SELECT projects.*, project_managers.prj_mgr_name, 
             ${paymentStatusCaseSql} AS computed_payment_status,
             COUNT(*) OVER() AS full_count
      FROM projects 
      LEFT JOIN project_managers ON projects.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ` ORDER BY ${sortBy} ${sortOrder}, header_id ASC`;
    queryText += ` LIMIT ${pageSize} OFFSET ${offset}`;

    // Query Postgres
    const result = await pool.query(queryText, values);
    const projects: Project[] = result.rows.map(mapRowToProject);
    const totalCount = result.rows.length > 0 ? Number(result.rows[0].full_count) : 0;

    res.json({
      data: projects,
      count: totalCount
    });
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving projects.'
    });
  }
});

export default router;

