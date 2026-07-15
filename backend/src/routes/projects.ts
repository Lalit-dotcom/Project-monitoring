import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { Project } from '../types/project.js';
import { 
  getProjectsVendorOverpaidSql, 
  getProjectsBillingAheadSql, 
  getProjectsStalledSql,
  getProjectsDueThisWeekSql
} from '../lib/riskFlags.js';
import { 
  validateProject, 
  validatePurchaseOrder, 
  validateInvoice, 
  validateBillDesk, 
  validateTaxInvoice 
} from '../lib/validators.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';

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

// Get projects summary metrics (global counts)
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorOverpaidSql = getProjectsVendorOverpaidSql();
    const billingAheadSql = getProjectsBillingAheadSql();
    const stalledSql = getProjectsStalledSql();
    const dueThisWeekSql = getProjectsDueThisWeekSql();

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE ${vendorOverpaidSql} OR ${billingAheadSql} OR ${stalledSql}) as projects_at_risk,
        COUNT(*) FILTER (WHERE ${vendorOverpaidSql}) as vendor_overpaid,
        COUNT(*) FILTER (WHERE ${billingAheadSql}) as billing_ahead,
        COUNT(*) FILTER (WHERE ${stalledSql}) as stalled,
        COUNT(*) FILTER (WHERE ${dueThisWeekSql}) as due_this_week,
        COUNT(*) FILTER (WHERE (${paymentStatusCaseSql}) != 'Fully Paid') as incomplete_projects
      FROM projects
    `;
    const summaryRes = await pool.query(summaryQuery);
    const row = summaryRes.rows[0];

    const totalProjects = parseInt(row.total_projects, 10) || 0;
    const projectsAtRisk = parseInt(row.projects_at_risk, 10) || 0;
    const vendorOverpaid = parseInt(row.vendor_overpaid, 10) || 0;
    const billingAhead = parseInt(row.billing_ahead, 10) || 0;
    const stalled = parseInt(row.stalled, 10) || 0;
    const dueThisWeek = parseInt(row.due_this_week, 10) || 0;
    const incompleteProjects = parseInt(row.incomplete_projects, 10) || 0;

    const totalManagersResult = await pool.query("SELECT COUNT(*) FROM project_managers");
    const totalManagers = parseInt(totalManagersResult.rows[0].count, 10) || 0;

    res.json({
      totalProjects,
      totalManagers,
      projectsAtRisk,
      dueThisWeek,
      incompleteProjects,
      riskBreakdown: {
        vendorOverpaid,
        billingAhead,
        stalled
      }
    });
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving projects summary.'
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

router.get('/check-unique/:projectCd', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectCd = String(req.params.projectCd || '');
    const result = await pool.query('SELECT 1 FROM projects WHERE project_cd = $1', [projectCd.trim()]);
    res.json({ unique: result.rows.length === 0 });
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while checking uniqueness.'
    });
  }
});

router.get('/:projectCd', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const projectCd = String(req.params.projectCd || '').trim();

    // Query Postgres for the specific project
    const queryText = `
      SELECT projects.*, project_managers.prj_mgr_name, 
             ${paymentStatusCaseSql} AS computed_payment_status
      FROM projects 
      LEFT JOIN project_managers ON projects.prj_mgr_id = project_managers.prj_mgr_id
      WHERE projects.project_cd = $1
    `.trim();

    const result = await pool.query(queryText, [projectCd]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const projectRow = result.rows[0];

    // Enforce own project ownership check for project_manager role if applicable
    if (user && user.role === 'project_manager') {
      if (Number(projectRow.prj_mgr_id) !== user.prjMgrId) {
        res.status(403).json({ error: 'Forbidden: Access to this project is denied' });
        return;
      }
    }

    res.json(mapRowToProject(projectRow));
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving the project.'
    });
  }
});


router.post('/create-with-chain', async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { project, purchaseOrder, invoice, billDesk, taxInvoice } = req.body;

  if (!project) {
    res.status(400).json({ error: 'Project data is required' });
    return;
  }

  // 1. Authorization: check prj_mgr_id for project_manager role
  if (user.role === 'project_manager') {
    const prjMgrId = Number(project.prj_mgr_id);
    if (prjMgrId !== user.prjMgrId) {
      res.status(403).json({
        error: 'Forbidden: Project manager can only assign projects to themselves'
      });
      return;
    }
  }

  // 2. Perform validation across all steps
  const allErrors: any = {};

  const projectResult = await validateProject(pool, project, user);
  if (!projectResult.valid) {
    allErrors.project = projectResult.errors;
  }

  if (purchaseOrder) {
    const poResult = validatePurchaseOrder(purchaseOrder);
    if (!poResult.valid) {
      allErrors.purchaseOrder = poResult.errors;
    }
  }

  if (invoice) {
    const invResult = validateInvoice(invoice);
    if (!invResult.valid) {
      allErrors.invoice = invResult.errors;
    }
  }

  if (billDesk) {
    const bdResult = validateBillDesk(billDesk);
    if (!bdResult.valid) {
      allErrors.billDesk = bdResult.errors;
    }
  }

  if (taxInvoice) {
    const tiResult = validateTaxInvoice(taxInvoice);
    if (!tiResult.valid) {
      allErrors.taxInvoice = tiResult.errors;
    }
  }

  if (Object.keys(allErrors).length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      errors: allErrors
    });
    return;
  }

  // 3. Atomic database operations inside a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate project_id and header_id
    const idRes = await client.query('SELECT COALESCE(MAX(project_id), 100000) as max_pid, COALESCE(MAX(header_id), 200000) as max_hid FROM projects');
    const nextProjectId = Number(idRes.rows[0].max_pid) + 1;
    const nextHeaderId = Number(idRes.rows[0].max_hid) + 1;

    // Retrieve manager name
    const mgrRes = await client.query('SELECT prj_mgr_name FROM project_managers WHERE prj_mgr_id = $1', [Number(project.prj_mgr_id)]);
    const prjMgrName = mgrRes.rows[0]?.prj_mgr_name || null;

    // Compute aggregates
    const noOfPo = purchaseOrder ? 1 : 0;
    const poAmount = purchaseOrder ? Number(purchaseOrder.total) : 0;
    const noOfInvBilldesk = billDesk ? 1 : 0;
    const noOfExpInvoice = invoice ? 1 : 0;
    const totalInvoiceAmount = invoice ? Number(invoice.invoice_amount) : 0;
    const totalAmountPaid = (invoice ? Number(invoice.amount_paid || 0) : 0) + (billDesk ? Number(billDesk.amount_paid || 0) : 0);
    const noOfTaxInvoice = taxInvoice ? 1 : 0;
    const totalTaxInvoiceAmount = taxInvoice ? Number(taxInvoice.total_amount) : 0;

    const createdOn = project.created_on ? new Date(project.created_on) : new Date();

    const insertProjectQuery = `
      INSERT INTO projects (
        header_id, project_id, prj_mgr_id, project_cd, prj_nm, customer_name,
        prj_budget_no, amount_received, no_of_po, po_amount, no_of_inv_billdesk,
        no_of_exp_invoice, total_invoice_amount, total_amount_paid, no_of_tax_invoice,
        total_tax_invoice_amount, created_on, prj_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const projectInsertRes = await client.query(insertProjectQuery, [
      nextHeaderId,
      nextProjectId,
      Number(project.prj_mgr_id),
      String(project.project_cd).trim(),
      String(project.prj_nm).trim(),
      String(project.customer_name).trim(),
      Number(project.prj_budget_no),
      Number(project.amount_received || 0),
      noOfPo,
      poAmount,
      noOfInvBilldesk,
      noOfExpInvoice,
      totalInvoiceAmount,
      totalAmountPaid,
      noOfTaxInvoice,
      totalTaxInvoiceAmount,
      createdOn,
      String(project.prj_type).trim()
    ]);

    const createdProjectRow = projectInsertRes.rows[0];

    let createdPurchaseOrder = null;
    if (purchaseOrder) {
      const poHeaderId = nextHeaderId + 10;
      const insertPoQuery = `
        INSERT INTO purchase_orders (
          header_id, project_id, project_no, prj_mgr_id, vendor_name,
          final_po_no, po_date, valid_from, valid_to, total, approval_status, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const poInsertRes = await client.query(insertPoQuery, [
        poHeaderId,
        nextProjectId,
        createdProjectRow.project_cd,
        createdProjectRow.prj_mgr_id,
        String(purchaseOrder.vendor_name).trim(),
        String(purchaseOrder.final_po_no).trim(),
        new Date(purchaseOrder.po_date),
        new Date(purchaseOrder.valid_from),
        new Date(purchaseOrder.valid_to),
        Number(purchaseOrder.total),
        String(purchaseOrder.approval_status).toUpperCase(),
        new Date()
      ]);
      createdPurchaseOrder = poInsertRes.rows[0];
    }

    let createdInvoice = null;
    if (invoice) {
      const invHeaderId = nextHeaderId + 20;
      const unpaid = Number(invoice.invoice_amount) - Number(invoice.amount_paid || 0);
      const insertInvQuery = `
        INSERT INTO invoices (
          header_id, project_id, project_no, prj_mgr_id, manager_name,
          po_no, vendor_name, invoice_num, invoice_date, gl_date,
          invoice_amount, amount_paid, unpaid, pen_amt, final_unpaid,
          invoice_type, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
      const invInsertRes = await client.query(insertInvQuery, [
        invHeaderId,
        nextProjectId,
        createdProjectRow.project_cd,
        createdProjectRow.prj_mgr_id,
        prjMgrName,
        purchaseOrder ? String(purchaseOrder.final_po_no).trim() : null,
        String(invoice.vendor_name).trim(),
        String(invoice.invoice_num).trim(),
        new Date(invoice.invoice_date),
        new Date(invoice.invoice_date),
        Number(invoice.invoice_amount),
        Number(invoice.amount_paid || 0),
        unpaid,
        0,
        unpaid,
        String(invoice.invoice_type).trim(),
        new Date()
      ]);
      createdInvoice = invInsertRes.rows[0];
    }

    let createdBillDesk = null;
    if (billDesk) {
      const bdHeaderId = nextHeaderId + 30;
      const insertBdQuery = `
        INSERT INTO bill_desk (
          header_id, project_id, project_no, prj_mgr_id, final_po_no,
          bill_month, vendor_name, invoice_no, invoice_date, received_date,
          invoice_amount, invoice_num, invoice_amount_bk, amount_paid, invoice_status,
          status, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
      const bdInsertRes = await client.query(insertBdQuery, [
        bdHeaderId,
        nextProjectId,
        createdProjectRow.project_cd,
        createdProjectRow.prj_mgr_id,
        purchaseOrder ? String(purchaseOrder.final_po_no).trim() : null,
        String(billDesk.bill_month).trim(),
        String(billDesk.vendor_name).trim(),
        String(billDesk.invoice_no).trim(),
        new Date(billDesk.invoice_date),
        new Date(),
        Number(billDesk.invoice_amount),
        String(billDesk.invoice_no).trim(),
        Number(billDesk.invoice_amount),
        Number(billDesk.amount_paid || 0),
        String(billDesk.status).trim(),
        String(billDesk.status).trim(),
        new Date()
      ]);
      createdBillDesk = bdInsertRes.rows[0];
    }

    let createdTaxInvoice = null;
    if (taxInvoice) {
      const tiHeaderId = nextHeaderId + 40;
      const insertTiQuery = `
        INSERT INTO tax_invoices (
          header_id, project_id, project_no, prj_mgr_id, cust_gstin_no,
          po_no, user_bill_no, bill_date, bill_status, total_amount,
          bill_type, state_description, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const tiInsertRes = await client.query(insertTiQuery, [
        tiHeaderId,
        nextProjectId,
        createdProjectRow.project_cd,
        createdProjectRow.prj_mgr_id,
        String(taxInvoice.cust_gstin_no).trim(),
        purchaseOrder ? String(purchaseOrder.final_po_no).trim() : null,
        String(taxInvoice.user_bill_no).trim(),
        new Date(taxInvoice.bill_date),
        'FINAL',
        Number(taxInvoice.total_amount),
        String(taxInvoice.bill_type).trim(),
        String(taxInvoice.state_description).trim(),
        new Date()
      ]);
      createdTaxInvoice = tiInsertRes.rows[0];
    }

    await client.query('COMMIT');

    res.status(201).json({
      project: mapRowToProject(createdProjectRow),
      purchaseOrder: createdPurchaseOrder,
      invoice: createdInvoice,
      billDesk: createdBillDesk,
      taxInvoice: createdTaxInvoice
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Transaction rollback error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while creating the project chain.'
    });
  } finally {
    client.release();
  }
});

export default router;

