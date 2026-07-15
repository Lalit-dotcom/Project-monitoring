import { Router, Response } from 'express';
import { pool } from '../db.js';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';
import { parseFilters, buildProjectsQuery, buildPOsQuery, buildInvoicesQuery } from '../lib/reportsHelper.js';

const router = Router();

// GET /api/reports/filters
router.get('/filters', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const typesRes = pool.query("SELECT DISTINCT prj_type FROM projects WHERE prj_type IS NOT NULL AND prj_type != '' ORDER BY prj_type ASC");
    const custsRes = pool.query("SELECT DISTINCT customer_name FROM projects WHERE customer_name IS NOT NULL AND customer_name != '' ORDER BY customer_name ASC");
    const vendsRes = pool.query("SELECT DISTINCT vendor_name FROM (SELECT vendor_name FROM purchase_orders UNION SELECT vendor_name FROM invoices) as v WHERE vendor_name IS NOT NULL AND vendor_name != '' ORDER BY vendor_name ASC");
    const pmsRes = pool.query("SELECT prj_mgr_id, prj_mgr_name FROM project_managers ORDER BY prj_mgr_name ASC");
    const payStatusRes = pool.query(`
      SELECT DISTINCT 
        CASE
          WHEN no_of_inv_billdesk = 0 AND total_invoice_amount = 0 THEN 'No Invoices Yet'
          WHEN total_invoice_amount > 0 AND total_amount_paid >= total_invoice_amount THEN 'Fully Paid'
          ELSE 'Partially Paid'
        END as payment_status 
      FROM projects
      ORDER BY payment_status ASC
    `);
    const invStatusRes = pool.query("SELECT DISTINCT invoice_status FROM bill_desk WHERE invoice_status IS NOT NULL AND invoice_status != '' ORDER BY invoice_status ASC");
    const projsRes = pool.query("SELECT id, project_cd, prj_nm FROM projects ORDER BY project_cd ASC");
    const datesBoundsRes = pool.query(`
      SELECT MIN(min_date) as min_d, MAX(max_date) as max_d 
      FROM (
        SELECT MIN(created_on) as min_date, MAX(created_on) as max_date FROM projects
        UNION 
        SELECT MIN(po_date) as min_date, MAX(po_date) as max_date FROM purchase_orders
        UNION 
        SELECT MIN(invoice_date) as min_date, MAX(invoice_date) as max_date FROM invoices
      ) as dates
    `);

    const [
      types,
      custs,
      vends,
      pms,
      payStatus,
      invStatus,
      projs,
      datesBounds
    ] = await Promise.all([
      typesRes,
      custsRes,
      vendsRes,
      pmsRes,
      payStatusRes,
      invStatusRes,
      projsRes,
      datesBoundsRes
    ]);

    // Parse financial years dynamically from bounds
    const minD = datesBounds.rows[0]?.min_d;
    const maxD = datesBounds.rows[0]?.max_d;
    const getFYStartYear = (dateVal: any): number => {
      if (!dateVal) return 2024;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 2024;
      const y = d.getFullYear();
      const m = d.getMonth();
      return m < 3 ? y - 1 : y;
    };
    const minFY = getFYStartYear(minD);
    const maxFY = getFYStartYear(maxD);
    const financialYears: string[] = [];
    for (let y = Math.min(minFY, 2024); y <= Math.max(maxFY, new Date().getFullYear()); y++) {
      const shortNext = String(y + 1).slice(-2);
      financialYears.push(`${y}-${shortNext}`);
    }

    res.json({
      projectTypes: types.rows.map(r => r.prj_type),
      customers: custs.rows.map(r => r.customer_name),
      vendors: vends.rows.map(r => r.vendor_name),
      projectManagers: pms.rows.map(r => ({ id: r.prj_mgr_id, name: r.prj_mgr_name })),
      paymentStatuses: payStatus.rows.map(r => r.payment_status),
      invoiceStatuses: invStatus.rows.map(r => r.invoice_status),
      projects: projs.rows.map(r => ({ id: r.id, code: r.project_cd, name: r.prj_nm })),
      financialYears
    });
  } catch (error: any) {
    console.error('Error fetching report filters:', error);
    res.status(500).json({ error: 'Failed to retrieve report filter values' });
  }
});

// GET /api/reports/:type
router.get('/:type', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const filters = parseFilters(req.query);

    if (type === 'project-summary') {
      const { sql, values } = buildProjectsQuery(filters);
      const query = `
        SELECT 
          p.project_cd,
          p.prj_nm,
          p.customer_name,
          pm.prj_mgr_name,
          p.prj_budget_no,
          p.po_amount,
          p.total_invoice_amount,
          p.amount_received,
          COALESCE(p.total_invoice_amount, 0) - COALESCE(p.total_amount_paid, 0) as outstanding,
          CASE
            WHEN p.no_of_inv_billdesk = 0 AND p.total_invoice_amount = 0 THEN 'No Invoices Yet'
            WHEN p.total_invoice_amount > 0 AND p.total_amount_paid >= p.total_invoice_amount THEN 'Fully Paid'
            ELSE 'Partially Paid'
          END as payment_status
        FROM projects p
        LEFT JOIN project_managers pm ON p.prj_mgr_id = pm.prj_mgr_id
        ${sql}
        ORDER BY p.project_cd ASC
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    if (type === 'financial-summary') {
      const projQuery = buildProjectsQuery(filters);
      const poQuery = buildPOsQuery(filters);
      const invQuery = buildInvoicesQuery(filters);

      const [projectsRes, poRes, invRes] = await Promise.all([
        pool.query(`
          SELECT p.id, p.project_cd, p.prj_nm, p.po_amount, p.prj_budget_no, p.amount_received, p.total_invoice_amount, p.total_amount_paid, p.created_on
          FROM projects p
          ${projQuery.sql}
        `, projQuery.values),
        pool.query(`
          SELECT po.id, po.po_date, po.total, po.project_no
          FROM purchase_orders po
          JOIN projects p ON po.project_no = p.project_cd
          ${poQuery.sql}
        `, poQuery.values),
        pool.query(`
          SELECT inv.id, inv.invoice_date, inv.gl_date, inv.invoice_amount, inv.amount_paid, inv.unpaid, inv.objection, inv.project_no
          FROM invoices inv
          JOIN projects p ON inv.project_no = p.project_cd
          ${invQuery.sql}
        `, invQuery.values),
      ]);

      res.json({
        projects: projectsRes.rows,
        purchaseOrders: poRes.rows,
        invoices: invRes.rows
      });
      return;
    }

    if (type === 'purchase-orders') {
      const { sql, values } = buildPOsQuery(filters);
      const query = `
        SELECT 
          po.id,
          po.final_po_no,
          po.project_no,
          po.vendor_name,
          po.po_date,
          po.valid_from,
          po.valid_to,
          po.total,
          po.approval_status
        FROM purchase_orders po
        JOIN projects p ON po.project_no = p.project_cd
        ${sql}
        ORDER BY po.po_date DESC NULLS LAST
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    if (type === 'vendor-performance') {
      const poQuery = buildPOsQuery(filters);
      const invQuery = buildInvoicesQuery(filters);

      const [poRes, invRes] = await Promise.all([
        pool.query(`
          SELECT po.vendor_name, SUM(po.total) as total_po_value 
          FROM purchase_orders po
          JOIN projects p ON po.project_no = p.project_cd
          ${poQuery.sql}
          GROUP BY po.vendor_name
        `, poQuery.values),
        pool.query(`
          SELECT 
            inv.vendor_name,
            SUM(inv.invoice_amount) as total_invoiced,
            SUM(inv.amount_paid) as total_paid,
            SUM(inv.unpaid) as outstanding,
            AVG(CASE WHEN inv.gl_date IS NOT NULL AND inv.invoice_date IS NOT NULL AND inv.amount_paid > 0 THEN (inv.gl_date - inv.invoice_date) ELSE NULL END) as avg_payment_delay
          FROM invoices inv
          JOIN projects p ON inv.project_no = p.project_cd
          ${invQuery.sql}
          GROUP BY inv.vendor_name
        `, invQuery.values)
      ]);

      const vendorMap = new Map<string, any>();
      for (const row of poRes.rows) {
        const name = row.vendor_name;
        if (!name) continue;
        vendorMap.set(name, {
          vendor_name: name,
          total_po_value: Number(row.total_po_value || 0),
          total_invoiced: 0,
          total_paid: 0,
          outstanding: 0,
          avg_payment_delay: 0,
        });
      }
      for (const row of invRes.rows) {
        const name = row.vendor_name;
        if (!name) continue;
        if (!vendorMap.has(name)) {
          vendorMap.set(name, {
            vendor_name: name,
            total_po_value: 0,
            total_invoiced: Number(row.total_invoiced || 0),
            total_paid: Number(row.total_paid || 0),
            outstanding: Number(row.outstanding || 0),
            avg_payment_delay: Math.round(Number(row.avg_payment_delay || 0)),
          });
        } else {
          const existing = vendorMap.get(name);
          existing.total_invoiced = Number(row.total_invoiced || 0);
          existing.total_paid = Number(row.total_paid || 0);
          existing.outstanding = Number(row.outstanding || 0);
          existing.avg_payment_delay = Math.round(Number(row.avg_payment_delay || 0));
        }
      }
      const result = Array.from(vendorMap.values()).sort((a, b) => a.vendor_name.localeCompare(b.vendor_name));
      res.json(result);
      return;
    }

    if (type === 'invoice-summary') {
      const { sql, values } = buildInvoicesQuery(filters);
      const query = `
        SELECT 
          inv.id,
          inv.invoice_num,
          inv.project_no,
          inv.vendor_name,
          inv.invoice_date,
          inv.invoice_amount,
          inv.amount_paid,
          inv.unpaid,
          CASE WHEN inv.unpaid = 0 THEN 'Paid' WHEN inv.amount_paid > 0 THEN 'Partially Paid' ELSE 'Unpaid' END as status,
          CASE
            WHEN (CURRENT_DATE - inv.invoice_date) <= 30 THEN 'Current (<= 30d)'
            WHEN (CURRENT_DATE - inv.invoice_date) <= 60 THEN '30-60d'
            WHEN (CURRENT_DATE - inv.invoice_date) <= 90 THEN '60-90d'
            ELSE '90+d'
          END as aging_bucket
        FROM invoices inv
        JOIN projects p ON inv.project_no = p.project_cd
        ${sql}
        ORDER BY inv.invoice_date DESC NULLS LAST
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    if (type === 'payment-status') {
      const { sql, values } = buildProjectsQuery(filters);
      const query = `
        SELECT 
          CASE
            WHEN p.no_of_inv_billdesk = 0 AND p.total_invoice_amount = 0 THEN 'No Invoices Yet'
            WHEN p.total_invoice_amount > 0 AND p.total_amount_paid >= p.total_invoice_amount THEN 'Fully Paid'
            ELSE 'Partially Paid'
          END as payment_status,
          COUNT(*) as project_count,
          SUM(p.prj_budget_no) as total_budget,
          SUM(p.po_amount) as total_po_value,
          SUM(p.total_invoice_amount) as total_invoiced,
          SUM(p.total_amount_paid) as total_received,
          SUM(p.total_invoice_amount - p.total_amount_paid) as total_outstanding
        FROM projects p
        ${sql}
        GROUP BY payment_status
        ORDER BY payment_status ASC
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    if (type === 'outstanding-analysis') {
      const { sql, values } = buildInvoicesQuery(filters);
      const whereClause = sql ? `${sql} AND inv.unpaid > 0` : 'WHERE inv.unpaid > 0';
      const query = `
        SELECT 
          inv.id,
          inv.invoice_num,
          inv.project_no,
          inv.vendor_name,
          inv.invoice_date,
          inv.gl_date,
          inv.invoice_amount,
          inv.amount_paid,
          inv.unpaid,
          (CURRENT_DATE - inv.invoice_date) as days_overdue
        FROM invoices inv
        JOIN projects p ON inv.project_no = p.project_cd
        ${whereClause}
        ORDER BY days_overdue DESC
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    if (type === 'customer-wise-projects') {
      const { sql, values } = buildProjectsQuery(filters);
      const query = `
        SELECT 
          p.customer_name,
          COUNT(*) as project_count,
          SUM(p.prj_budget_no) as total_budget,
          SUM(p.amount_received) as total_received,
          SUM(p.total_invoice_amount - p.total_amount_paid) as outstanding
        FROM projects p
        ${sql}
        GROUP BY p.customer_name
        ORDER BY p.customer_name ASC
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    if (type === 'pm-wise-projects') {
      const { sql, values } = buildProjectsQuery(filters);
      const query = `
        SELECT 
          pm.prj_mgr_name,
          COUNT(DISTINCT p.id) as project_count,
          COALESCE(SUM(p.prj_budget_no), 0) as portfolio_value,
          COUNT(inv.id) as total_invoices,
          COUNT(inv.id) FILTER (WHERE inv.unpaid = 0 OR inv.invoice_date >= CURRENT_DATE - INTERVAL '30 days') as on_time_invoices,
          COUNT(inv.id) FILTER (WHERE inv.unpaid > 0 AND inv.invoice_date < CURRENT_DATE - INTERVAL '30 days') as overdue_invoices
        FROM projects p
        JOIN project_managers pm ON p.prj_mgr_id = pm.prj_mgr_id
        LEFT JOIN invoices inv ON p.project_cd = inv.project_no
        ${sql}
        GROUP BY pm.prj_mgr_id, pm.prj_mgr_name
        ORDER BY pm.prj_mgr_name ASC
      `;
      const result = await pool.query(query, values);
      res.json(result.rows);
      return;
    }

    res.status(400).json({ error: 'Invalid report type' });
  } catch (error: any) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ error: 'Failed to retrieve report data' });
  }
});

export default router;
