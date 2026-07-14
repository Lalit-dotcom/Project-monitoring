import { Router, Response } from 'express';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';
import {
  getProjectsVendorOverpaidSql,
  getProjectsBillingAheadSql,
  getProjectsStalledSql,
  getPurchaseOrdersExpiringLowCollectionSql,
  getPurchaseOrdersExpiredUncollectedSql,
  getPurchaseOrdersStalledSql,
  getInvoicesOverdueUnpaidSql,
  getInvoicesDisputedUnpaidSql,
  getTaxInvoicesMissingIrnSql
} from '../lib/riskFlags.js';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;

    const vendorOverpaidSql = getProjectsVendorOverpaidSql();
    const billingAheadSql = getProjectsBillingAheadSql();
    const stalledSql = getProjectsStalledSql();

    // Query 1: Extended stats and risk splits from projects
    const projectsQuery = `
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(prj_budget_no), 0) as total_budget,
        COALESCE(SUM(po_amount), 0) as total_po,
        COALESCE(SUM(amount_received), 0) as total_received,
        COUNT(*) FILTER (WHERE ${vendorOverpaidSql} OR ${billingAheadSql} OR ${stalledSql}) as at_risk,
        COUNT(*) FILTER (WHERE NOT (${vendorOverpaidSql} OR ${billingAheadSql} OR ${stalledSql})) as healthy
      FROM projects
      WHERE ($1::integer IS NULL OR prj_mgr_id = $1::integer)
    `;
    const projectsRes = await pool.query(projectsQuery, [pmId]);
    const { total_projects, total_budget, total_po, total_received, at_risk, healthy } = projectsRes.rows[0];

    // Query 2: Invoice stats from invoices
    const invoicesQuery = `
      SELECT
        COALESCE(SUM(invoice_amount), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(unpaid), 0) as total_outstanding
      FROM invoices
      WHERE ($1::integer IS NULL OR prj_mgr_id = $1::integer)
    `;
    const invoicesRes = await pool.query(invoicesQuery, [pmId]);
    const { total_invoiced, total_paid, total_outstanding } = invoicesRes.rows[0];

    res.json({
      totalReceived: Number(total_received),
      totalPO: Number(total_po),
      totalInvoiced: Number(total_invoiced),
      totalPaid: Number(total_paid),
      totalOutstanding: Number(total_outstanding),
      totalProjects: Number(total_projects),
      totalBudget: Number(total_budget),
      riskBreakdown: {
        healthy: Number(healthy),
        atRisk: Number(at_risk)
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard summary metrics' });
  }
});

// GET /api/dashboard/charts
router.get('/charts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;

    // Group invoices by month
    const chartsQuery = `
      SELECT 
        TO_CHAR(invoice_date, 'Mon') as month_name,
        EXTRACT(MONTH FROM invoice_date) as month_num,
        EXTRACT(YEAR FROM invoice_date) as year,
        COALESCE(SUM(invoice_amount), 0) / 10000000.0 as received,
        COALESCE(SUM(amount_paid), 0) / 10000000.0 as paid
      FROM invoices
      WHERE invoice_date IS NOT NULL
        AND ($1::integer IS NULL OR prj_mgr_id = $1::integer)
      GROUP BY TO_CHAR(invoice_date, 'Mon'), EXTRACT(MONTH FROM invoice_date), EXTRACT(YEAR FROM invoice_date)
      ORDER BY year ASC, month_num ASC
    `;
    const result = await pool.query(chartsQuery, [pmId]);

    const fallbackData = [
      { name: 'Mar', Received: 2.1, Paid: 1.8 },
      { name: 'Apr', Received: 3.8, Paid: 2.5 },
      { name: 'May', Received: 3.2, Paid: 2.8 },
      { name: 'Jun', Received: 4.5, Paid: 3.1 },
      { name: 'Jul', Received: 4.1, Paid: 3.2 },
      { name: 'Aug', Received: 5.2, Paid: 3.8 },
    ];

    if (result.rows.length === 0) {
      res.json(fallbackData);
      return;
    }

    const data = result.rows.map(row => ({
      name: row.month_name,
      Received: parseFloat(Number(row.received).toFixed(2)),
      Paid: parseFloat(Number(row.paid).toFixed(2))
    }));

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching dashboard charts:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard chart metrics' });
  }
});

// GET /api/dashboard/project-comparison
router.get('/project-comparison', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;
    const metric = req.query.metric as string || 'budgetVsReceived';

    let value1Col = 'prj_budget_no';
    let value2Col = 'amount_received';

    if (metric === 'poVsBillPaid') {
      value1Col = 'po_amount';
      value2Col = 'total_amount_paid';
    } else if (metric === 'poVsTaxInvoice') {
      value1Col = 'po_amount';
      value2Col = 'total_tax_invoice_amount';
    }

    const comparisonQuery = `
      SELECT 
        project_cd as "projectCode",
        prj_nm as "projectName",
        COALESCE(${value1Col}, 0) as "value1",
        COALESCE(${value2Col}, 0) as "value2"
      FROM projects
      WHERE ($1::integer IS NULL OR prj_mgr_id = $1::integer)
      ORDER BY COALESCE(${value1Col}, 0) DESC NULLS LAST
      LIMIT 5
    `;
    const result = await pool.query(comparisonQuery, [pmId]);

    const data = result.rows.map(row => ({
      projectCode: row.projectCode,
      projectName: row.projectName,
      value1: Number(row.value1),
      value2: Number(row.value2)
    }));

    res.json({ projectComparison: data });
  } catch (error: any) {
    console.error('Error fetching project comparison:', error);
    res.status(500).json({ error: 'Failed to retrieve project comparison metrics' });
  }
});

// GET /api/dashboard/risks/projects
router.get('/risks/projects', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;
    const type = req.query.type as string;

    let queryText = '';
    let chartType: 'comparison' | 'single' = 'comparison';

    if (type === 'vendorOverpaid') {
      chartType = 'comparison';
      queryText = `
        SELECT 
          COALESCE(projects.prj_nm, projects.project_cd) as label,
          (SELECT COALESCE(SUM(i.amount_paid), 0) FROM invoices i WHERE i.project_no = projects.project_cd) as value1,
          COALESCE(projects.amount_received, 0) as value2
        FROM projects
        WHERE ${getProjectsVendorOverpaidSql()}
          AND ($1::integer IS NULL OR prj_mgr_id = $1::integer)
        ORDER BY ((SELECT COALESCE(SUM(i.amount_paid), 0) FROM invoices i WHERE i.project_no = projects.project_cd) - COALESCE(projects.amount_received, 0)) DESC
        LIMIT 8
      `;
    } else if (type === 'billingAhead') {
      chartType = 'comparison';
      queryText = `
        SELECT 
          COALESCE(projects.prj_nm, projects.project_cd) as label,
          COALESCE(projects.po_amount, 0) as value1,
          COALESCE(projects.amount_received, 0) as value2
        FROM projects
        WHERE ${getProjectsBillingAheadSql()}
          AND ($1::integer IS NULL OR prj_mgr_id = $1::integer)
        ORDER BY (COALESCE(projects.po_amount, 0) - COALESCE(projects.amount_received, 0)) DESC
        LIMIT 8
      `;
    } else if (type === 'stalled') {
      chartType = 'single';
      queryText = `
        SELECT 
          COALESCE(projects.prj_nm, projects.project_cd) as label,
          (CURRENT_DATE - (SELECT MIN(po.po_date) FROM purchase_orders po WHERE po.project_no = projects.project_cd)) as value1,
          NULL::numeric as value2
        FROM projects
        WHERE ${getProjectsStalledSql()}
          AND ($1::integer IS NULL OR prj_mgr_id = $1::integer)
        ORDER BY value1 DESC NULLS LAST
        LIMIT 8
      `;
    } else {
      res.status(400).json({ error: 'Invalid or missing type parameter' });
      return;
    }

    const result = await pool.query(queryText, [pmId]);
    const series = result.rows.map(row => ({
      label: row.label,
      value1: row.value1 !== null ? Number(row.value1) : null,
      value2: row.value2 !== null ? Number(row.value2) : null
    }));

    res.json({ chartType, series });
  } catch (error: any) {
    console.error('Error fetching project risks:', error);
    res.status(500).json({ error: 'Failed to retrieve project risks' });
  }
});

// GET /api/dashboard/risks/purchase-orders
router.get('/risks/purchase-orders', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;
    const type = req.query.type as string;

    let queryText = '';
    let chartType: 'comparison' | 'single' = 'comparison';

    if (type === 'expiringSoon') {
      chartType = 'comparison';
      queryText = `
        SELECT 
          COALESCE(purchase_orders.final_po_no, purchase_orders.project_no) as label,
          COALESCE(purchase_orders.total, 0) as value1,
          COALESCE(p.amount_received, 0) as value2
        FROM purchase_orders
        LEFT JOIN projects p ON p.project_cd = purchase_orders.project_no
        WHERE ${getPurchaseOrdersExpiringLowCollectionSql('1')}
          AND ($1::integer IS NULL OR p.prj_mgr_id = $1::integer)
        ORDER BY (purchase_orders.valid_to - CURRENT_DATE) ASC
        LIMIT 8
      `;
    } else if (type === 'expiredUncollected') {
      chartType = 'comparison';
      queryText = `
        SELECT 
          COALESCE(purchase_orders.final_po_no, purchase_orders.project_no) as label,
          COALESCE(purchase_orders.total, 0) as value1,
          COALESCE(p.amount_received, 0) as value2
        FROM purchase_orders
        LEFT JOIN projects p ON p.project_cd = purchase_orders.project_no
        WHERE ${getPurchaseOrdersExpiredUncollectedSql()}
          AND ($1::integer IS NULL OR p.prj_mgr_id = $1::integer)
        ORDER BY (COALESCE(purchase_orders.total, 0) - COALESCE(p.amount_received, 0)) DESC
        LIMIT 8
      `;
    } else if (type === 'stalled') {
      chartType = 'single';
      queryText = `
        SELECT 
          COALESCE(purchase_orders.final_po_no, purchase_orders.project_no) as label,
          (CURRENT_DATE - purchase_orders.po_date) as value1,
          NULL::numeric as value2
        FROM purchase_orders
        LEFT JOIN projects p ON p.project_cd = purchase_orders.project_no
        WHERE ${getPurchaseOrdersStalledSql()}
          AND ($1::integer IS NULL OR p.prj_mgr_id = $1::integer)
        ORDER BY value1 DESC NULLS LAST
        LIMIT 8
      `;
    } else {
      res.status(400).json({ error: 'Invalid or missing type parameter' });
      return;
    }

    const result = await pool.query(queryText, [pmId]);
    const series = result.rows.map(row => ({
      label: row.label,
      value1: row.value1 !== null ? Number(row.value1) : null,
      value2: row.value2 !== null ? Number(row.value2) : null
    }));

    res.json({ chartType, series });
  } catch (error: any) {
    console.error('Error fetching PO risks:', error);
    res.status(500).json({ error: 'Failed to retrieve PO risks' });
  }
});

// GET /api/dashboard/risks/invoices
router.get('/risks/invoices', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;
    const type = req.query.type as string;

    let queryText = '';
    const chartType = 'comparison';

    if (type === 'overdueUnpaid') {
      queryText = `
        SELECT 
          invoices.invoice_num as label,
          COALESCE(invoices.invoice_amount, 0) as value1,
          COALESCE(invoices.unpaid, 0) as value2
        FROM invoices
        WHERE ${getInvoicesOverdueUnpaidSql()}
          AND ($1::integer IS NULL OR prj_mgr_id = $1::integer)
        ORDER BY unpaid DESC
        LIMIT 8
      `;
    } else if (type === 'disputedUnpaid') {
      queryText = `
        SELECT 
          invoices.invoice_num as label,
          COALESCE(invoices.invoice_amount, 0) as value1,
          COALESCE(invoices.unpaid, 0) as value2
        FROM invoices
        WHERE ${getInvoicesDisputedUnpaidSql()}
          AND ($1::integer IS NULL OR prj_mgr_id = $1::integer)
        ORDER BY unpaid DESC
        LIMIT 8
      `;
    } else {
      res.status(400).json({ error: 'Invalid or missing type parameter' });
      return;
    }

    const result = await pool.query(queryText, [pmId]);
    const series = result.rows.map(row => ({
      label: row.label,
      value1: row.value1 !== null ? Number(row.value1) : null,
      value2: row.value2 !== null ? Number(row.value2) : null
    }));

    res.json({ chartType, series });
  } catch (error: any) {
    console.error('Error fetching invoice risks:', error);
    res.status(500).json({ error: 'Failed to retrieve invoice risks' });
  }
});

export default router;
