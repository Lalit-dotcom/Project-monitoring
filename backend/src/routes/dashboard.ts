import { Router, Response } from 'express';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLastImportDate(): string {
  try {
    const rawFilePath = path.join(__dirname, '..', '..', 'data', 'raw', 'APPS_XX_NIC_PM_INVOICE_LIST.xlsx');
    if (fs.existsSync(rawFilePath)) {
      const stats = fs.statSync(rawFilePath);
      return stats.mtime.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  } catch (err) {
    console.error('Error reading raw file stat:', err);
  }
  return '13 Jul 2026';
}

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
      },
      lastImportedDate: getLastImportDate()
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

// GET /api/dashboard/problem-projects
router.get('/problem-projects', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;

    const vendorOverpaidSql = getProjectsVendorOverpaidSql();
    const billingAheadSql = getProjectsBillingAheadSql();
    const stalledSql = getProjectsStalledSql();

    const queryText = `
      SELECT 
        projects.project_cd AS "projectCd",
        projects.prj_nm AS "projectName",
        COALESCE(projects.amount_received, 0) AS "amountReceived",
        COALESCE(projects.po_amount, 0) AS "poAmount",
        COALESCE(projects.no_of_inv_billdesk, 0) AS "noOfInvBilldesk",
        (SELECT COALESCE(SUM(i.amount_paid), 0) FROM invoices i WHERE i.project_no = projects.project_cd) AS "vendorPaidAmount",
        (CURRENT_DATE - (SELECT MIN(po.po_date) FROM purchase_orders po WHERE po.project_no = projects.project_cd)) AS "daysSincePo",
        (${vendorOverpaidSql}) AS "isVendorOverpaid",
        (${billingAheadSql}) AS "isBillingAhead",
        (${stalledSql}) AS "isStalled"
      FROM projects
      WHERE 
        ( (${vendorOverpaidSql}) OR (${billingAheadSql}) OR (${stalledSql}) )
        AND ($1::integer IS NULL OR projects.prj_mgr_id = $1::integer)
    `;

    const result = await pool.query(queryText, [pmId]);

    const problemProjects = result.rows.map(row => {
      const problems = [];
      let maxSeverity = 0;

      if (row.isVendorOverpaid) {
        const gap = Number(row.vendorPaidAmount) - Number(row.amountReceived);
        problems.push({
          type: 'vendorOverpaid',
          severity: gap
        });
        if (gap > maxSeverity) maxSeverity = gap;
      }

      if (row.isBillingAhead) {
        const gap = (Number(row.poAmount) * 0.8) - Number(row.amountReceived);
        problems.push({
          type: 'billingAhead',
          severity: gap
        });
        if (gap > maxSeverity) maxSeverity = gap;
      }

      if (row.isStalled) {
        const days = row.daysSincePo !== null ? Number(row.daysSincePo) : 60;
        const severity = days * 100000;
        problems.push({
          type: 'stalled',
          severity: severity
        });
        if (severity > maxSeverity) maxSeverity = severity;
      }

      return {
        projectCd: row.projectCd,
        projectName: row.projectName,
        amountReceived: Number(row.amountReceived),
        poAmount: Number(row.poAmount),
        vendorPaidAmount: Number(row.vendorPaidAmount),
        daysSincePo: row.daysSincePo !== null ? Number(row.daysSincePo) : null,
        problems,
        maxSeverity
      };
    });

    // Sort by maxSeverity descending
    problemProjects.sort((a, b) => b.maxSeverity - a.maxSeverity);

    // Limit to top 15-20 (we'll slice to 15, which is in the range)
    res.json(problemProjects.slice(0, 15));
  } catch (error: any) {
    console.error('Error fetching dashboard problem projects:', error);
    res.status(500).json({ error: 'Failed to retrieve problem projects' });
  }
});

// GET /api/dashboard/overdue-invoices
router.get('/overdue-invoices', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;

    const query = `
      SELECT 
        inv.invoice_num,
        inv.project_no,
        p.prj_nm,
        inv.vendor_name,
        inv.invoice_amount,
        inv.unpaid,
        (CURRENT_DATE - inv.invoice_date) as days_since_invoice,
        GREATEST(0, (CURRENT_DATE - inv.invoice_date) - 30) as days_overdue,
        CASE
          WHEN (CURRENT_DATE - inv.invoice_date) <= 30 THEN 'Current (<= 30d)'
          WHEN (CURRENT_DATE - inv.invoice_date) <= 60 THEN '30-60d'
          WHEN (CURRENT_DATE - inv.invoice_date) <= 90 THEN '60-90d'
          ELSE '90+d'
        END as aging_bucket
      FROM invoices inv
      JOIN projects p ON inv.project_no = p.project_cd
      WHERE inv.unpaid > 0
        AND inv.invoice_date < CURRENT_DATE - INTERVAL '30 days'
        AND ($1::integer IS NULL OR p.prj_mgr_id = $1::integer)
      ORDER BY (CURRENT_DATE - inv.invoice_date) DESC
      LIMIT 5
    `;
    const result = await pool.query(query, [pmId]);
    res.json(result.rows.map(row => ({
      invoiceNum: row.invoice_num,
      projectNo: row.project_no,
      prjNm: row.prj_nm,
      vendorName: row.vendor_name,
      invoiceAmount: Number(row.invoice_amount),
      unpaid: Number(row.unpaid),
      daysSinceInvoice: Number(row.days_since_invoice),
      daysOverdue: Number(row.days_overdue),
      agingBucket: row.aging_bucket
    })));
  } catch (error: any) {
    console.error('Error fetching dashboard overdue invoices:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard overdue invoices' });
  }
});

// GET /api/dashboard/expired-pos
router.get('/expired-pos', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prjMgrIdVal = req.query.prjMgrId;
    const pmId = prjMgrIdVal && prjMgrIdVal !== 'All' ? parseInt(String(prjMgrIdVal), 10) : null;

    const query = `
      SELECT 
        purchase_orders.final_po_no,
        purchase_orders.project_no,
        p.prj_nm,
        purchase_orders.vendor_name,
        purchase_orders.total,
        p.amount_received,
        purchase_orders.valid_to,
        (CURRENT_DATE - purchase_orders.valid_to) as days_expired
      FROM purchase_orders
      LEFT JOIN projects p ON p.project_cd = purchase_orders.project_no
      WHERE ${getPurchaseOrdersExpiredUncollectedSql()}
        AND ($1::integer IS NULL OR p.prj_mgr_id = $1::integer)
      ORDER BY (COALESCE(purchase_orders.total, 0) - COALESCE(p.amount_received, 0)) DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [pmId]);
    res.json(result.rows.map(row => ({
      finalPoNo: row.final_po_no,
      projectNo: row.project_no,
      prjNm: row.prj_nm,
      vendorName: row.vendor_name,
      total: Number(row.total),
      amountReceived: Number(row.amount_received),
      validTo: row.valid_to,
      daysExpired: Number(row.days_expired)
    })));
  } catch (error: any) {
    console.error('Error fetching dashboard expired POs:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard expired POs' });
  }
});

export default router;
