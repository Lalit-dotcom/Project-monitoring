import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { AuthenticatedRequest } from '../middleware/requireAuth.js';
import { logAudit } from '../lib/auditLog.js';
import { 
  getProjectsVendorOverpaidSql, 
  getProjectsBillingAheadSql, 
  getProjectsStalledSql,
  getProjectsDueThisWeekSql,
  getPurchaseOrdersExpiringLowCollectionSql,
  getPurchaseOrdersExpiredUncollectedSql,
  getPurchaseOrdersStalledSql,
  getInvoicesOverdueUnpaidSql,
  getInvoicesDisputedUnpaidSql,
  getTaxInvoicesMissingIrnSql
} from '../lib/riskFlags.js';
import { drawPdfTable } from '../lib/pdfTable.js';
import { parseFilters, buildProjectsQuery, buildPOsQuery, buildInvoicesQuery } from '../lib/reportsHelper.js';

const router = Router();

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'Rs. 0.00';
  return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// Shared payment status case statement
const paymentStatusCaseSql = `
  CASE
    WHEN no_of_inv_billdesk = 0 AND total_invoice_amount = 0 THEN 'No Invoices Yet'
    WHEN total_invoice_amount > 0 AND total_amount_paid >= total_invoice_amount THEN 'Fully Paid'
    ELSE 'Partially Paid'
  END
`.trim();

function formatDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
}

function formatFullINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Map helper functions
function mapRowToProject(row: any) {
  let createdOnStr: string | null = null;
  if (row.created_on) {
    if (row.created_on instanceof Date) {
      createdOnStr = row.created_on.toISOString().split('T')[0];
    } else {
      createdOnStr = String(row.created_on);
    }
  }

  let paymentStatus = 'No Invoices Yet';
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

  return {
    projectCd: row.project_cd,
    prjNm: row.prj_nm,
    customerName: row.customer_name,
    prjBudgetNo: row.prj_budget_no ? Number(row.prj_budget_no) : null,
    amountReceived: row.amount_received ? Number(row.amount_received) : null,
    noOfPo: Number(row.no_of_po),
    poAmount: row.po_amount ? Number(row.po_amount) : null,
    noOfInvBilldesk: Number(row.no_of_inv_billdesk),
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
    prjMgrName: row.prj_mgr_name || null,
    paymentStatus
  };
}

function mapRowToPurchaseOrder(row: any) {
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

function mapRowToInvoice(row: any) {
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

function mapRowToBillDesk(row: any) {
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

function mapRowToTaxInvoice(row: any) {
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

async function logExport(req: Request, action: string, status: 'SUCCESS' | 'FAILURE', details: any) {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  await logAudit({
    userId: user?.userId,
    username: user?.username || 'unknown',
    category: 'REPORT_DOWNLOAD',
    action,
    status,
    ip: req.ip || 'unknown',
    details
  });
}

// 1. GET /project/:code/excel
router.get('/project/:code/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { code } = req.params;

    const prjRes = await pool.query(
      `SELECT projects.*, project_managers.prj_mgr_name 
       FROM projects 
       LEFT JOIN project_managers ON projects.prj_mgr_id = project_managers.prj_mgr_id 
       WHERE project_cd = $1`,
      [code]
    );

    if (prjRes.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const prjRow = prjRes.rows[0];
    if (user?.role === 'project_manager' && prjRow.prj_mgr_id !== user.prjMgrId) {
      res.status(403).json({ error: 'Forbidden: Access denied to this project' });
      return;
    }

    const project = mapRowToProject(prjRow);

    // Fetch related tables
    const poRes = await pool.query('SELECT * FROM purchase_orders WHERE project_no = $1 ORDER BY id ASC', [code]);
    const invRes = await pool.query('SELECT * FROM invoices WHERE project_no = $1 ORDER BY id ASC', [code]);
    const bdRes = await pool.query('SELECT * FROM bill_desk WHERE project_no = $1 ORDER BY id ASC', [code]);
    const tiRes = await pool.query('SELECT * FROM tax_invoices WHERE project_no = $1 ORDER BY id ASC', [code]);

    const pos = poRes.rows.map(mapRowToPurchaseOrder);
    const invs = invRes.rows.map(mapRowToInvoice);
    const bds = bdRes.rows.map(mapRowToBillDesk);
    const tis = tiRes.rows.map(mapRowToTaxInvoice);

    // Create workbook
    const wb = xlsx.utils.book_new();

    // Sheet 1: Overview
    const overviewData = [{
      'Project Code': project.projectCd,
      'Project Name': project.prjNm,
      'Customer Name': project.customerName,
      'Budget Number': project.prjBudgetNo,
      'Amount Received': project.amountReceived,
      'No. of PO': project.noOfPo,
      'PO Amount': project.poAmount,
      'No. of Invoices (Bill Desk)': project.noOfInvBilldesk,
      'Total Invoice Amount': project.totalInvoiceAmount,
      'Total Amount Paid': project.totalAmountPaid,
      'No. of Tax Invoices': project.noOfTaxInvoice,
      'Total Tax Invoice Amount': project.totalTaxInvoiceAmount,
      'Project ABP': project.projectAbp,
      'Created Date': project.createdOn,
      'Customer ID': project.custId,
      'Project Type': project.prjType,
      'User Email': project.userEmail,
      'Mobile Number': project.mobileNumber,
      'HOD Email': project.hodEmail,
      'NIC Coordinator Email': project.nicCordEmailId,
      'Staff Email': project.staffEmailId,
      'Payment Status': project.paymentStatus
    }];
    const wsOverview = xlsx.utils.json_to_sheet(overviewData);
    xlsx.utils.book_append_sheet(wb, wsOverview, 'Overview');

    // Sheet 2: Purchase Orders
    const wsPOs = xlsx.utils.json_to_sheet(pos);
    xlsx.utils.book_append_sheet(wb, wsPOs, 'Purchase Orders');

    // Sheet 3: Invoices
    const wsInvs = xlsx.utils.json_to_sheet(invs);
    xlsx.utils.book_append_sheet(wb, wsInvs, 'Invoices');

    // Sheet 4: Bill Desk
    const wsBds = xlsx.utils.json_to_sheet(bds);
    xlsx.utils.book_append_sheet(wb, wsBds, 'Bill Desk');

    // Sheet 5: Tax Invoices
    const wsTis = xlsx.utils.json_to_sheet(tis);
    xlsx.utils.book_append_sheet(wb, wsTis, 'Tax Invoices');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${code}-export.xlsx"`);
    await logExport(req, 'DOWNLOAD_PROJECT_EXCEL', 'SUCCESS', { projectCode: code, filters: req.query });
    res.send(buffer);

  } catch (error: any) {
    console.error('Error exporting single project excel:', error);
    await logExport(req, 'DOWNLOAD_PROJECT_EXCEL', 'FAILURE', { projectCode: req.params.code, filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

// PO Conditions Helper
function buildPurchaseOrdersConditions(req: Request, user: any) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const { search, approvalStatus, vendorId, projectNo, minTotal, maxTotal, poDateFrom, poDateTo, validity, prjMgrId } = req.query;

  if (user?.role === 'project_manager') {
    conditions.push(`purchase_orders.prj_mgr_id = $${paramIndex}`);
    values.push(user.prjMgrId);
    paramIndex++;
  } else if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
    const pmId = Number(prjMgrId);
    if (!isNaN(pmId)) {
      conditions.push(`purchase_orders.prj_mgr_id = $${paramIndex}`);
      values.push(pmId);
      paramIndex++;
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    conditions.push(`(final_po_no ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`);
    values.push(`%${search.trim()}%`);
    paramIndex++;
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

  if (req.query.riskExpiringLowCollection === 'true') {
    let months = 3;
    if (expiringInMonths && typeof expiringInMonths === 'string') {
      const m = parseInt(expiringInMonths, 10);
      if (!isNaN(m)) months = m;
    }
    conditions.push(getPurchaseOrdersExpiringLowCollectionSql(`$${paramIndex}`));
    values.push(months);
    paramIndex++;
  }

  if (req.query.riskExpiredUncollected === 'true') {
    conditions.push(getPurchaseOrdersExpiredUncollectedSql());
  }

  if (req.query.riskStalled === 'true') {
    conditions.push(getPurchaseOrdersStalledSql());
  }

  return { conditions, values };
}

// Invoice Conditions Helper
function buildInvoicesConditions(req: Request, user: any) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const { search, invoiceType, hasObjection, unpaidOnly, prjMgrId, vendorId, projectNo, minAmount, maxAmount, invoiceDateFrom, invoiceDateTo } = req.query;

  if (user?.role === 'project_manager') {
    conditions.push(`invoices.prj_mgr_id = $${paramIndex}`);
    values.push(user.prjMgrId);
    paramIndex++;
  } else if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
    const pmId = Number(prjMgrId);
    if (!isNaN(pmId)) {
      conditions.push(`invoices.prj_mgr_id = $${paramIndex}`);
      values.push(pmId);
      paramIndex++;
    }
  }

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

  if (req.query.riskOverdueUnpaid === 'true') {
    conditions.push(getInvoicesOverdueUnpaidSql());
  }

  if (req.query.riskDisputedUnpaid === 'true') {
    conditions.push(getInvoicesDisputedUnpaidSql());
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

  return { conditions, values };
}

// Bill Desk Conditions Helper
function buildBillDeskConditions(req: Request, user: any) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const { search, status, invoiceStatus, billMonth, hasObjectionRemarks, projectNo, minAmount, maxAmount, invoiceDateFrom, invoiceDateTo, receivedDateFrom, receivedDateTo, prjMgrId } = req.query;

  if (user?.role === 'project_manager') {
    conditions.push(`bill_desk.prj_mgr_id = $${paramIndex}`);
    values.push(user.prjMgrId);
    paramIndex++;
  } else if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
    const pmId = Number(prjMgrId);
    if (!isNaN(pmId)) {
      conditions.push(`bill_desk.prj_mgr_id = $${paramIndex}`);
      values.push(pmId);
      paramIndex++;
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    conditions.push(`(invoice_no ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR vendor_name ILIKE $${paramIndex})`);
    values.push(`%${search.trim()}%`);
    paramIndex++;
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

  return { conditions, values };
}

// Tax Invoice Conditions Helper
function buildTaxInvoicesConditions(req: Request, user: any) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const { search, billStatus, state, billType, missingIrn, projectNo, minAmount, maxAmount, billDateFrom, billDateTo, prjMgrId } = req.query;

  if (user?.role === 'project_manager') {
    conditions.push(`tax_invoices.prj_mgr_id = $${paramIndex}`);
    values.push(user.prjMgrId);
    paramIndex++;
  } else if (prjMgrId && prjMgrId !== 'All' && String(prjMgrId).trim() !== '') {
    const pmId = Number(prjMgrId);
    if (!isNaN(pmId)) {
      conditions.push(`tax_invoices.prj_mgr_id = $${paramIndex}`);
      values.push(pmId);
      paramIndex++;
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    conditions.push(`(user_bill_no ILIKE $${paramIndex} OR project_no ILIKE $${paramIndex} OR cust_gstin_no ILIKE $${paramIndex})`);
    values.push(`%${search.trim()}%`);
    paramIndex++;
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

  if (req.query.riskMissingIrn === 'true') {
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

  return { conditions, values };
}

// 2. GET /project/:code/pdf
router.get('/project/:code/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { code } = req.params;

    const prjRes = await pool.query(
      `SELECT projects.*, project_managers.prj_mgr_name 
       FROM projects 
       LEFT JOIN project_managers ON projects.prj_mgr_id = project_managers.prj_mgr_id 
       WHERE project_cd = $1`,
      [code]
    );

    if (prjRes.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const prjRow = prjRes.rows[0];
    if (user?.role === 'project_manager' && prjRow.prj_mgr_id !== user.prjMgrId) {
      res.status(403).json({ error: 'Forbidden: Access denied to this project' });
      return;
    }

    const project = mapRowToProject(prjRow);

    // Fetch related tables
    const poRes = await pool.query('SELECT * FROM purchase_orders WHERE project_no = $1 ORDER BY id ASC', [code]);
    const invRes = await pool.query('SELECT * FROM invoices WHERE project_no = $1 ORDER BY id ASC', [code]);
    const bdRes = await pool.query('SELECT * FROM bill_desk WHERE project_no = $1 ORDER BY id ASC', [code]);
    const tiRes = await pool.query('SELECT * FROM tax_invoices WHERE project_no = $1 ORDER BY id ASC', [code]);

    const pos = poRes.rows.map(mapRowToPurchaseOrder);
    const invs = invRes.rows.map(mapRowToInvoice);
    const bds = bdRes.rows.map(mapRowToBillDesk);
    const tis = tiRes.rows.map(mapRowToTaxInvoice);

    // Build PDF
    const doc = new PDFDocument({ margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${code}-report.pdf"`);
    doc.pipe(res);

    // Header bar
    doc.rect(40, 40, 532, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Project: ${project.prjNm} (${code})`, 55, 68);

    // Financial summary block
    doc.fillColor('#000000').moveDown(3);
    doc.fontSize(11).font('Helvetica-Bold').text('Financial Summary', 40, 110);
    doc.rect(40, 125, 532, 75).stroke('#E5E7EB');

    doc.fontSize(8).font('Helvetica').fillColor('#6B7280');
    doc.text('Budget Amount:', 50, 133);
    doc.text('PO Amount:', 220, 133);
    doc.text('Total Invoice Amount:', 390, 133);

    doc.text('Amount Received:', 50, 163);
    doc.text('Total Amount Paid:', 220, 163);
    doc.text('Outstanding / Status:', 390, 163);

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9);
    doc.text(formatCurrency(project.prjBudgetNo || 0), 50, 145);
    doc.text(formatCurrency(project.poAmount || 0), 220, 145);
    doc.text(formatCurrency(project.totalInvoiceAmount || 0), 390, 145);

    const outstanding = Math.max(0, (project.totalInvoiceAmount || 0) - (project.totalAmountPaid || 0));
    doc.text(formatCurrency(project.amountReceived || 0), 50, 175);
    doc.text(formatCurrency(project.totalAmountPaid || 0), 220, 175);
    doc.text(`${formatCurrency(outstanding)} (${project.paymentStatus})`, 390, 175);

    let nextY = 220;

    // Draw Purchase Orders
    if (pos.length > 0) {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Purchase Orders', 40, nextY);
      const poCols = [
        { label: 'PO Number', key: 'finalPoNo', width: 75 },
        { label: 'PO Date', key: 'poDate', width: 60 },
        { label: 'Vendor Name', key: 'vendorName', width: 165 },
        { label: 'PO Amount', key: 'total', width: 80 },
        { label: 'Valid To', key: 'validTo', width: 70 },
        { label: 'Status', key: 'approvalStatus', width: 82 }
      ];
      const poRows = pos.map(po => ({
        finalPoNo: po.finalPoNo,
        poDate: po.poDate || '-',
        vendorName: po.vendorName,
        total: formatCurrency(po.total),
        validTo: po.validTo || '-',
        approvalStatus: po.approvalStatus
      }));
      nextY = drawPdfTable(doc, poCols, poRows, { startY: nextY + 15, margin: 40, landscape: false }) + 20;
    } else {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Purchase Orders', 40, nextY);
      doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica-Oblique').text('No purchase orders recorded for this project.', 40, nextY + 18, { align: 'center', width: 532 });
      nextY += 45;
    }

    // Draw Invoices
    if (invs.length > 0) {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Invoices', 40, nextY);
      const invCols = [
        { label: 'Invoice No', key: 'invoiceNum', width: 70 },
        { label: 'Date', key: 'invoiceDate', width: 60 },
        { label: 'Vendor Name', key: 'vendorName', width: 140 },
        { label: 'Type', key: 'invoiceType', width: 70 },
        { label: 'Amount', key: 'invoiceAmount', width: 65 },
        { label: 'Paid', key: 'amountPaid', width: 65 },
        { label: 'Unpaid', key: 'unpaid', width: 62 }
      ];
      const invRows = invs.map(inv => ({
        invoiceNum: inv.invoiceNum,
        invoiceDate: inv.invoiceDate || '-',
        vendorName: inv.vendorName,
        invoiceType: inv.invoiceType,
        invoiceAmount: formatCurrency(inv.invoiceAmount),
        amountPaid: formatCurrency(inv.amountPaid),
        unpaid: formatCurrency(inv.unpaid)
      }));
      nextY = drawPdfTable(doc, invCols, invRows, { startY: nextY + 15, margin: 40, landscape: false }) + 20;
    } else {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Invoices', 40, nextY);
      doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica-Oblique').text('No invoices recorded for this project.', 40, nextY + 18, { align: 'center', width: 532 });
      nextY += 45;
    }

    // Draw Bill Desk
    if (bds.length > 0) {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Bill Desk', 40, nextY);
      const bdCols = [
        { label: 'Bill No', key: 'invoiceNo', width: 70 },
        { label: 'Date', key: 'invoiceDate', width: 60 },
        { label: 'Vendor Name', key: 'vendorName', width: 150 },
        { label: 'Month', key: 'billMonth', width: 60 },
        { label: 'Amount', key: 'invoiceAmount', width: 70 },
        { label: 'Paid', key: 'amountPaid', width: 60 },
        { label: 'Status', key: 'status', width: 62 }
      ];
      const bdRows = bds.map(bd => ({
        invoiceNo: bd.invoiceNo,
        invoiceDate: bd.invoiceDate || '-',
        vendorName: bd.vendorName,
        billMonth: bd.billMonth,
        invoiceAmount: formatCurrency(bd.invoiceAmount),
        amountPaid: formatCurrency(bd.amountPaid),
        status: bd.status
      }));
      nextY = drawPdfTable(doc, bdCols, bdRows, { startY: nextY + 15, margin: 40, landscape: false }) + 20;
    } else {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Bill Desk', 40, nextY);
      doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica-Oblique').text('No bill desk entries recorded for this project.', 40, nextY + 18, { align: 'center', width: 532 });
      nextY += 45;
    }

    // Draw Tax Invoices
    if (tis.length > 0) {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Tax Invoices', 40, nextY);
      const tiCols = [
        { label: 'Bill No', key: 'userBillNo', width: 70 },
        { label: 'Bill Date', key: 'billDate', width: 60 },
        { label: 'GSTIN', key: 'custGstinNo', width: 140 },
        { label: 'Bill Type', key: 'billType', width: 80 },
        { label: 'State', key: 'stateDescription', width: 110 },
        { label: 'Amount', key: 'totalAmount', width: 72 }
      ];
      const tiRows = tis.map(ti => ({
        userBillNo: ti.userBillNo,
        billDate: ti.billDate || '-',
        custGstinNo: ti.custGstinNo,
        billType: ti.billType,
        stateDescription: ti.stateDescription,
        totalAmount: formatCurrency(ti.totalAmount)
      }));
      drawPdfTable(doc, tiCols, tiRows, { startY: nextY + 15, margin: 40, landscape: false });
    } else {
      doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Tax Invoices', 40, nextY);
      doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica-Oblique').text('No tax invoices recorded for this project.', 40, nextY + 18, { align: 'center', width: 532 });
    }

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_PROJECT_PDF', 'SUCCESS', { projectCode: code, filters: req.query });
    doc.end();

  } catch (error: any) {
    console.error('Error exporting single project pdf:', error);
    await logExport(req, 'DOWNLOAD_PROJECT_PDF', 'FAILURE', { projectCode: req.params.code, filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Reusable filter query constructor for multiple projects
async function getFilteredProjects(req: Request, user: any) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Enforce scoping via prjMgrId for project managers
  if (user?.role === 'project_manager') {
    conditions.push(`projects.prj_mgr_id = $${paramIndex}`);
    values.push(user.prjMgrId);
    paramIndex++;
  } else {
    // Standard PM Filter
    const prjMgrId = req.query.prjMgrId;
    if (prjMgrId && typeof prjMgrId === 'string' && prjMgrId !== 'All' && prjMgrId.trim() !== '') {
      conditions.push(`projects.prj_mgr_id = $${paramIndex}`);
      values.push(parseInt(prjMgrId));
      paramIndex++;
    }
  }

  // Search
  const search = req.query.search;
  if (search && typeof search === 'string' && search.trim() !== '') {
    conditions.push(
      `(customer_name ILIKE $${paramIndex} OR prj_nm ILIKE $${paramIndex} OR project_cd ILIKE $${paramIndex})`
    );
    values.push(`%${search.trim()}%`);
    paramIndex++;
  }

  // Payment Status
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

  // Project Type
  const projectType = req.query.projectType;
  if (projectType && typeof projectType === 'string' && projectType !== 'All' && projectType.trim() !== '') {
    conditions.push(`prj_type = $${paramIndex}`);
    values.push(projectType.trim());
    paramIndex++;
  }

  // Amount Range
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

  // Date Range
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

  // Checkboxes
  const noPoYet = req.query.noPoYet;
  if (noPoYet === 'true') {
    conditions.push('no_of_po = 0');
  }

  const taxInvoiceOutstanding = req.query.taxInvoiceOutstanding;
  if (taxInvoiceOutstanding === 'true') {
    conditions.push('no_of_tax_invoice > 0 AND total_amount_paid < total_invoice_amount');
  }

  // Risk flags
  if (req.query.riskVendorOverpaid === 'true') {
    conditions.push(getProjectsVendorOverpaidSql());
  }
  if (req.query.riskBillingAhead === 'true') {
    conditions.push(getProjectsBillingAheadSql());
  }
  if (req.query.riskStalled === 'true') {
    conditions.push(getProjectsStalledSql());
  }

  // Sorting
  const sortByRaw = req.query.sortBy;
  const allowedSortFields = ['po_amount', 'amount_received', 'total_amount_paid', 'created_on'];
  const sortBy = allowedSortFields.includes(sortByRaw as string) ? sortByRaw : 'created_on';

  const sortOrderRaw = req.query.sortOrder;
  const sortOrder = (sortOrderRaw as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let queryText = `
    SELECT projects.*, project_managers.prj_mgr_name, 
           ${paymentStatusCaseSql} AS computed_payment_status
    FROM projects 
    LEFT JOIN project_managers ON projects.prj_mgr_id = project_managers.prj_mgr_id
  `.trim();

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }
  queryText += ` ORDER BY ${sortBy} ${sortOrder}, header_id ASC`;

  const res = await pool.query(queryText, values);
  return res.rows.map(mapRowToProject);
}

// 3. GET /projects/excel
router.get('/projects/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    const projects = await getFilteredProjects(req, user);

    const sheetRows = projects.map(p => ({
      'Project Code': p.projectCd,
      'Customer Name': p.customerName,
      'Budget Number': p.prjBudgetNo,
      'Project ABP': p.projectAbp,
      'PO Amount': p.poAmount,
      'Amount Received': p.amountReceived,
      'Payment Status': p.paymentStatus,
      'PM Name': p.prjMgrName,
      'Number of PO': p.noOfPo,
      'Number of Invoices': p.noOfInvBilldesk,
      'Total Invoice Amount': p.totalInvoiceAmount,
      'Total Amount Paid': p.totalAmountPaid,
      'Number of Tax Invoice': p.noOfTaxInvoice,
      'Total Tax Invoice Amount': p.totalTaxInvoiceAmount,
      'Created Date': p.createdOn
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sheetRows);
    xlsx.utils.book_append_sheet(wb, ws, 'Projects Summary');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="projects-export.xlsx"');
    await logExport(req, 'DOWNLOAD_PROJECTS_EXCEL', 'SUCCESS', { filters: req.query });
    res.send(buffer);

  } catch (error: any) {
    console.error('Error exporting projects excel:', error);
    await logExport(req, 'DOWNLOAD_PROJECTS_EXCEL', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel summary' });
  }
});

// 4. GET /projects/pdf
// 4. GET /projects/pdf
router.get('/projects/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    // Parse filters
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Enforce scoping via prjMgrId for project managers
    if (user?.role === 'project_manager') {
      conditions.push(`projects.prj_mgr_id = $${paramIndex}`);
      values.push(user.prjMgrId);
      paramIndex++;
    } else {
      const prjMgrId = req.query.prjMgrId;
      if (prjMgrId && typeof prjMgrId === 'string' && prjMgrId !== 'All' && prjMgrId.trim() !== '') {
        conditions.push(`projects.prj_mgr_id = $${paramIndex}`);
        values.push(parseInt(prjMgrId));
        paramIndex++;
      }
    }

    // Search
    const search = req.query.search;
    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push(
        `(customer_name ILIKE $${paramIndex} OR prj_nm ILIKE $${paramIndex} OR project_cd ILIKE $${paramIndex})`
      );
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Payment Status
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

    // Project Type
    const projectType = req.query.projectType;
    if (projectType && typeof projectType === 'string' && projectType !== 'All' && projectType.trim() !== '') {
      conditions.push(`prj_type = $${paramIndex}`);
      values.push(projectType.trim());
      paramIndex++;
    }

    // Amount Range
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

    // Date Range
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

    // Checkboxes
    const noPoYet = req.query.noPoYet;
    if (noPoYet === 'true') {
      conditions.push('no_of_po = 0');
    }

    const taxInvoiceOutstanding = req.query.taxInvoiceOutstanding;
    if (taxInvoiceOutstanding === 'true') {
      conditions.push('total_tax_invoice_amount > total_amount_paid');
    }

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

    // Build filter display text
    const filterDescParts: string[] = [];
    if (search) filterDescParts.push(`Search="${search}"`);
    if (paymentStatus) filterDescParts.push(`Status=${paymentStatus}`);
    if (projectType && projectType !== 'All') filterDescParts.push(`Type=${projectType}`);
    if (minAmount) filterDescParts.push(`MinAmount=${minAmount}`);
    if (maxAmount) filterDescParts.push(`MaxAmount=${maxAmount}`);
    if (dateFrom) filterDescParts.push(`From=${dateFrom}`);
    if (dateTo) filterDescParts.push(`To=${dateTo}`);
    if (user?.role === 'project_manager') filterDescParts.push(`PM_Scope=Own`);

    const filterText = filterDescParts.length > 0 ? `Filtered by: ${filterDescParts.join(', ')}` : 'Filtered by: None';

    // 1. Single SQL Query for KPI aggregates
    let statsQueryText = `
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(prj_budget_no), 0) as total_budget,
        COALESCE(SUM(po_amount), 0) as total_po,
        COALESCE(SUM(amount_received), 0) as total_received,
        COALESCE(SUM(COALESCE(po_amount, 0) - COALESCE(amount_received, 0)), 0) as total_outstanding,
        COUNT(*) FILTER (WHERE no_of_inv_billdesk = 0 AND total_invoice_amount = 0) as no_invoices_count,
        COUNT(*) FILTER (WHERE total_invoice_amount > 0 AND total_amount_paid >= total_invoice_amount) as fully_paid_count,
        COUNT(*) FILTER (WHERE NOT (no_of_inv_billdesk = 0 AND total_invoice_amount = 0) AND NOT (total_invoice_amount > 0 AND total_amount_paid >= total_invoice_amount)) as partially_paid_count
      FROM projects
    `.trim();

    if (conditions.length > 0) {
      statsQueryText += ' WHERE ' + conditions.join(' AND ');
    }

    const statsRes = await pool.query(statsQueryText, values);
    const stats = statsRes.rows[0];

    // 2. Fetch projects sorted by outstanding_amount DESC
    let listQueryText = `
      SELECT 
        projects.*, 
        project_managers.prj_mgr_name,
        (COALESCE(projects.po_amount, 0) - COALESCE(projects.amount_received, 0)) as outstanding_amount
      FROM projects
      LEFT JOIN project_managers ON projects.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();

    if (conditions.length > 0) {
      listQueryText += ' WHERE ' + conditions.join(' AND ');
    }
    listQueryText += ' ORDER BY outstanding_amount DESC, project_cd ASC';

    const listRes = await pool.query(listQueryText, values);

    // Initialize landscape document
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="projects-report.pdf"');
    doc.pipe(res);

    // Title Block
    doc.rect(40, 40, 762, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Portfolio Summary Report — ${filterText}`, 55, 68);

    // KPI Summary Block
    doc.rect(40, 105, 762, 45).stroke('#E5E7EB');
    
    doc.fontSize(6).font('Helvetica').fillColor('#6B7280');
    doc.text('TOTAL PROJECTS', 50, 112);
    doc.text('TOTAL BUDGET', 140, 112);
    doc.text('TOTAL PO VALUE', 260, 112);
    doc.text('TOTAL RECEIVED', 380, 112);
    doc.text('TOTAL OUTSTANDING', 500, 112);
    doc.text('STATUS BREAKDOWN', 620, 112);

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8);
    doc.text(String(stats.total_projects), 50, 125);
    doc.text(formatCurrency(Number(stats.total_budget)), 140, 125);
    doc.text(formatCurrency(Number(stats.total_po)), 260, 125);
    doc.text(formatCurrency(Number(stats.total_received)), 380, 125);
    doc.text(formatCurrency(Number(stats.total_outstanding)), 500, 125);

    const statusStr = `Fully Paid: ${stats.fully_paid_count} | Part Paid: ${stats.partially_paid_count} | No Inv: ${stats.no_invoices_count}`;
    doc.text(statusStr, 620, 125);

    // Draw Portfolio Table
    const cols = [
      { label: 'Project Code', key: 'projectCd', width: 90 },
      { label: 'Customer Name', key: 'customerName', width: 130 },
      { label: 'PM Name', key: 'prjMgrName', width: 90 },
      { label: 'Budget Amount', key: 'prjBudgetNo', width: 95 },
      { label: 'PO Amount', key: 'poAmount', width: 95 },
      { label: 'Amount Received', key: 'amountReceived', width: 95 },
      { label: 'Outstanding Amount', key: 'outstandingAmount', width: 95 },
      { label: 'Payment Status', key: 'paymentStatus', width: 72 }
    ];

    const tableRows = listRes.rows.map(row => {
      const p = mapRowToProject(row);
      return {
        projectCd: p.projectCd,
        customerName: p.customerName || '-',
        prjMgrName: p.prjMgrName || '-',
        prjBudgetNo: formatCurrency(p.prjBudgetNo),
        poAmount: formatCurrency(p.poAmount),
        amountReceived: formatCurrency(p.amountReceived),
        outstandingAmount: formatCurrency(row.outstanding_amount ? Number(row.outstanding_amount) : 0),
        paymentStatus: p.paymentStatus
      };
    });

    drawPdfTable(doc, cols, tableRows, { startY: 165, margin: 40, landscape: true });

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_PROJECTS_PDF', 'SUCCESS', { filters: req.query });
    doc.end();

  } catch (error: any) {
    console.error('Error exporting projects pdf:', error);
    await logExport(req, 'DOWNLOAD_PROJECTS_PDF', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF summary' });
  }
});

// 5. GET /api/exports/purchase-orders/excel
router.get('/purchase-orders/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildPurchaseOrdersConditions(req, user);

    let queryText = `
      SELECT purchase_orders.*, project_managers.prj_mgr_name 
      FROM purchase_orders 
      LEFT JOIN project_managers ON purchase_orders.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToPurchaseOrder);

    const worksheetData = data.map(po => ({
      'ID': po.id,
      'PO Number': po.finalPoNo,
      'Project Code': po.projectNo,
      'PM Name': po.prjMgrName || '-',
      'Vendor Name': po.vendorName,
      'PO Date': po.poDate,
      'Valid From': po.validFrom,
      'Valid To': po.validTo,
      'Total Amount': po.total,
      'Status': po.approvalStatus,
      'Created Date': po.createdDate
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase-orders-export.xlsx"');
    await logExport(req, 'DOWNLOAD_PURCHASE_ORDERS_EXCEL', 'SUCCESS', { filters: req.query });
    res.send(buffer);
  } catch (error: any) {
    console.error('Error PO excel:', error);
    await logExport(req, 'DOWNLOAD_PURCHASE_ORDERS_EXCEL', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel sheet' });
  }
});

// 6. GET /api/exports/purchase-orders/pdf
router.get('/purchase-orders/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildPurchaseOrdersConditions(req, user);

    let queryText = `
      SELECT purchase_orders.*, project_managers.prj_mgr_name 
      FROM purchase_orders 
      LEFT JOIN project_managers ON purchase_orders.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToPurchaseOrder);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase-orders-report.pdf"');
    doc.pipe(res);

    // Title Block
    doc.rect(40, 40, 762, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Purchase Orders Report — Total Records: ${data.length}`, 55, 68);

    const cols = [
      { label: 'PO Number', key: 'finalPoNo', width: 100 },
      { label: 'Project Code', key: 'projectNo', width: 90 },
      { label: 'PM Name', key: 'prjMgrName', width: 90 },
      { label: 'Vendor Name', key: 'vendorName', width: 160 },
      { label: 'PO Date', key: 'poDate', width: 72 },
      { label: 'Valid To', key: 'validTo', width: 70 },
      { label: 'Total Amount', key: 'total', width: 90 },
      { label: 'Status', key: 'approvalStatus', width: 90 }
    ];

    const rows = data.map(po => ({
      finalPoNo: po.finalPoNo,
      projectNo: po.projectNo,
      prjMgrName: po.prjMgrName || '-',
      vendorName: po.vendorName,
      poDate: po.poDate || '-',
      validTo: po.validTo || '-',
      total: formatCurrency(po.total),
      approvalStatus: po.approvalStatus
    }));

    drawPdfTable(doc, cols, rows, { startY: 105, margin: 40, landscape: true });

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_PURCHASE_ORDERS_PDF', 'SUCCESS', { filters: req.query });
    doc.end();
  } catch (error: any) {
    console.error('Error PO PDF:', error);
    await logExport(req, 'DOWNLOAD_PURCHASE_ORDERS_PDF', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF summary' });
  }
});

// 7. GET /api/exports/invoices/excel
router.get('/invoices/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildInvoicesConditions(req, user);

    let queryText = `
      SELECT invoices.*, project_managers.prj_mgr_name 
      FROM invoices 
      LEFT JOIN project_managers ON invoices.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToInvoice);

    const worksheetData = data.map(inv => ({
      'ID': inv.id,
      'Invoice Number': inv.invoiceNum,
      'Project Code': inv.projectNo,
      'PM Name': inv.prjMgrName || '-',
      'Vendor Name': inv.vendorName,
      'Invoice Date': inv.invoiceDate,
      'GL Date': inv.glDate,
      'Invoice Amount': inv.invoiceAmount,
      'Amount Paid': inv.amountPaid,
      'Unpaid Amount': inv.unpaid,
      'Penalty Amount': inv.penAmt,
      'Objection': inv.objection || '-',
      'Invoice Type': inv.invoiceType,
      'MSME Vendor': inv.msmeVendorName || '-'
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices-export.xlsx"');
    await logExport(req, 'DOWNLOAD_INVOICES_EXCEL', 'SUCCESS', { filters: req.query });
    res.send(buffer);
  } catch (error: any) {
    console.error('Error Invoice excel:', error);
    await logExport(req, 'DOWNLOAD_INVOICES_EXCEL', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel sheet' });
  }
});

// 8. GET /api/exports/invoices/pdf
router.get('/invoices/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildInvoicesConditions(req, user);

    let queryText = `
      SELECT invoices.*, project_managers.prj_mgr_name 
      FROM invoices 
      LEFT JOIN project_managers ON invoices.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToInvoice);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices-report.pdf"');
    doc.pipe(res);

    // Title Block
    doc.rect(40, 40, 762, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Invoices Report — Total Records: ${data.length}`, 55, 68);

    const cols = [
      { label: 'Invoice No', key: 'invoiceNum', width: 90 },
      { label: 'Project Code', key: 'projectNo', width: 90 },
      { label: 'PM Name', key: 'prjMgrName', width: 90 },
      { label: 'Vendor Name', key: 'vendorName', width: 140 },
      { label: 'Invoice Date', key: 'invoiceDate', width: 72 },
      { label: 'GL Date', key: 'glDate', width: 70 },
      { label: 'Invoice Amount', key: 'invoiceAmount', width: 80 },
      { label: 'Amount Paid', key: 'amountPaid', width: 80 },
      { label: 'Unpaid Amount', key: 'unpaid', width: 70 }
    ];

    const rows = data.map(inv => ({
      invoiceNum: inv.invoiceNum,
      projectNo: inv.projectNo,
      prjMgrName: inv.prjMgrName || '-',
      vendorName: inv.vendorName,
      invoiceDate: inv.invoiceDate || '-',
      glDate: inv.glDate || '-',
      invoiceAmount: formatCurrency(inv.invoiceAmount),
      amountPaid: formatCurrency(inv.amountPaid),
      unpaid: formatCurrency(inv.unpaid)
    }));

    drawPdfTable(doc, cols, rows, { startY: 105, margin: 40, landscape: true });

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_INVOICES_PDF', 'SUCCESS', { filters: req.query });
    doc.end();
  } catch (error: any) {
    console.error('Error Invoice PDF:', error);
    await logExport(req, 'DOWNLOAD_INVOICES_PDF', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF summary' });
  }
});

// 9. GET /api/exports/bill-desk/excel
router.get('/bill-desk/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildBillDeskConditions(req, user);

    let queryText = `
      SELECT bill_desk.*, project_managers.prj_mgr_name 
      FROM bill_desk 
      LEFT JOIN project_managers ON bill_desk.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToBillDesk);

    const worksheetData = data.map(bd => ({
      'ID': bd.id,
      'Bill Number': bd.invoiceNo,
      'PO Number': bd.finalPoNo,
      'Project Code': bd.projectNo,
      'PM Name': bd.prjMgrName || '-',
      'Vendor Name': bd.vendorName,
      'Bill Month': bd.billMonth,
      'Invoice Date': bd.invoiceDate,
      'Received Date': bd.receivedDate,
      'Invoice Amount': bd.invoiceAmount,
      'Amount Paid': bd.amountPaid,
      'Invoice Status': bd.invoiceStatus,
      'Status': bd.status,
      'Remarks': bd.objectionRemarks || '-'
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Bill Desk');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bill-desk-export.xlsx"');
    await logExport(req, 'DOWNLOAD_BILL_DESK_EXCEL', 'SUCCESS', { filters: req.query });
    res.send(buffer);
  } catch (error: any) {
    console.error('Error Bill Desk excel:', error);
    await logExport(req, 'DOWNLOAD_BILL_DESK_EXCEL', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel sheet' });
  }
});

// 10. GET /api/exports/bill-desk/pdf
router.get('/bill-desk/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildBillDeskConditions(req, user);

    let queryText = `
      SELECT bill_desk.*, project_managers.prj_mgr_name 
      FROM bill_desk 
      LEFT JOIN project_managers ON bill_desk.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToBillDesk);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bill-desk-report.pdf"');
    doc.pipe(res);

    // Title Block
    doc.rect(40, 40, 762, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Bill Desk Report — Total Records: ${data.length}`, 55, 68);

    const cols = [
      { label: 'Bill No', key: 'invoiceNo', width: 90 },
      { label: 'PO Number', key: 'finalPoNo', width: 90 },
      { label: 'Project Code', key: 'projectNo', width: 90 },
      { label: 'PM Name', key: 'prjMgrName', width: 90 },
      { label: 'Vendor Name', key: 'vendorName', width: 130 },
      { label: 'Bill Month', key: 'billMonth', width: 62 },
      { label: 'Amount', key: 'invoiceAmount', width: 80 },
      { label: 'Paid', key: 'amountPaid', width: 80 },
      { label: 'Status', key: 'status', width: 50 }
    ];

    const rows = data.map(bd => ({
      invoiceNo: bd.invoiceNo,
      finalPoNo: bd.finalPoNo,
      projectNo: bd.projectNo,
      prjMgrName: bd.prjMgrName || '-',
      vendorName: bd.vendorName,
      billMonth: bd.billMonth,
      invoiceAmount: formatCurrency(bd.invoiceAmount),
      amountPaid: formatCurrency(bd.amountPaid),
      status: bd.status
    }));

    drawPdfTable(doc, cols, rows, { startY: 105, margin: 40, landscape: true });

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_BILL_DESK_PDF', 'SUCCESS', { filters: req.query });
    doc.end();
  } catch (error: any) {
    console.error('Error Bill Desk PDF:', error);
    await logExport(req, 'DOWNLOAD_BILL_DESK_PDF', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF summary' });
  }
});

// 11. GET /api/exports/tax-invoices/excel
router.get('/tax-invoices/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildTaxInvoicesConditions(req, user);

    let queryText = `
      SELECT tax_invoices.*, project_managers.prj_mgr_name 
      FROM tax_invoices 
      LEFT JOIN project_managers ON tax_invoices.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToTaxInvoice);

    const worksheetData = data.map(ti => ({
      'ID': ti.id,
      'Bill Number': ti.userBillNo,
      'PO Number': ti.poNo,
      'Project Code': ti.projectNo,
      'PM Name': ti.prjMgrName || '-',
      'Customer GSTIN': ti.custGstinNo,
      'Project GSTIN': ti.prjGstnNo,
      'Bill Date': ti.billDate,
      'Bill Status': ti.billStatus,
      'Billing Period From': ti.billingPeriodFrom,
      'Billing Period To': ti.billingPeriodTo,
      'Supplier Invoice No': ti.suppInvNum,
      'Total Amount': ti.totalAmount,
      'Bill Type': ti.billType,
      'State': ti.stateDescription,
      'IRN Number': ti.irnNo || '-'
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Tax Invoices');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="tax-invoices-export.xlsx"');
    await logExport(req, 'DOWNLOAD_TAX_INVOICES_EXCEL', 'SUCCESS', { filters: req.query });
    res.send(buffer);
  } catch (error: any) {
    console.error('Error Tax Invoice excel:', error);
    await logExport(req, 'DOWNLOAD_TAX_INVOICES_EXCEL', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel sheet' });
  }
});

// 12. GET /api/exports/tax-invoices/pdf
router.get('/tax-invoices/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const { conditions, values } = buildTaxInvoicesConditions(req, user);

    let queryText = `
      SELECT tax_invoices.*, project_managers.prj_mgr_name 
      FROM tax_invoices 
      LEFT JOIN project_managers ON tax_invoices.prj_mgr_id = project_managers.prj_mgr_id
    `.trim();
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const result = await pool.query(queryText, values);
    const data = result.rows.map(mapRowToTaxInvoice);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tax-invoices-report.pdf"');
    doc.pipe(res);

    // Title Block
    doc.rect(40, 40, 762, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Tax Invoices Report — Total Records: ${data.length}`, 55, 68);

    const cols = [
      { label: 'Bill No', key: 'userBillNo', width: 90 },
      { label: 'PO Number', key: 'poNo', width: 90 },
      { label: 'Project Code', key: 'projectNo', width: 90 },
      { label: 'PM Name', key: 'prjMgrName', width: 90 },
      { label: 'Bill Date', key: 'billDate', width: 72 },
      { label: 'Bill Type', key: 'billType', width: 80 },
      { label: 'Supplier Inv No', key: 'suppInvNum', width: 100 },
      { label: 'Total Amount', key: 'totalAmount', width: 80 },
      { label: 'Status', key: 'billStatus', width: 70 }
    ];

    const rows = data.map(ti => ({
      userBillNo: ti.userBillNo,
      poNo: ti.poNo || '-',
      projectNo: ti.projectNo,
      prjMgrName: ti.prjMgrName || '-',
      billDate: ti.billDate || '-',
      billType: ti.billType,
      suppInvNum: ti.suppInvNum || '-',
      totalAmount: formatCurrency(ti.totalAmount),
      billStatus: ti.billStatus
    }));

    drawPdfTable(doc, cols, rows, { startY: 105, margin: 40, landscape: true });

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_TAX_INVOICES_PDF', 'SUCCESS', { filters: req.query });
    doc.end();
  } catch (error: any) {
    console.error('Error Tax Invoice PDF:', error);
    await logExport(req, 'DOWNLOAD_TAX_INVOICES_PDF', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF summary' });
  }
});

// 13. GET /api/exports/dashboard/pdf
router.get('/dashboard/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    
    // Project manager scoping
    let pmId: number | null = null;
    if (user?.role === 'project_manager') {
      pmId = user.prjMgrId;
    } else {
      const pmParam = req.query.prjMgrId;
      if (pmParam && pmParam !== 'All' && String(pmParam).trim() !== '') {
        pmId = Number(pmParam);
      }
    }

    // Single projects query for summary stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(prj_budget_no), 0) as total_budget,
        COALESCE(SUM(po_amount), 0) as total_po,
        COALESCE(SUM(amount_received), 0) as total_received
      FROM projects
      WHERE ($1::integer IS NULL OR prj_mgr_id = $1::integer)
    `.trim();
    const statsRes = await pool.query(statsQuery, [pmId]);
    const stats = statsRes.rows[0];

    // Invoices query for invoice stats
    const invoicesQuery = `
      SELECT
        COALESCE(SUM(invoice_amount), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(unpaid), 0) as total_outstanding
      FROM invoices
      WHERE ($1::integer IS NULL OR prj_mgr_id = $1::integer)
    `.trim();
    const invoicesRes = await pool.query(invoicesQuery, [pmId]);
    const invoices = invoicesRes.rows[0];

    // Top 10 projects by outstanding exposure
    const topProjectsQuery = `
      SELECT 
        project_cd,
        prj_nm,
        customer_name,
        COALESCE(prj_budget_no, 0) as prj_budget_no,
        COALESCE(po_amount, 0) as po_amount,
        COALESCE(amount_received, 0) as amount_received,
        (COALESCE(po_amount, 0) - COALESCE(amount_received, 0)) as outstanding_amount,
        CASE
          WHEN no_of_inv_billdesk = 0 AND total_invoice_amount = 0 THEN 'No Invoices Yet'
          WHEN total_invoice_amount > 0 AND total_amount_paid >= total_invoice_amount THEN 'Fully Paid'
          ELSE 'Partially Paid'
        END as payment_status
      FROM projects
      WHERE ($1::integer IS NULL OR prj_mgr_id = $1::integer)
      ORDER BY outstanding_amount DESC
      LIMIT 10
    `.trim();
    const topProjectsRes = await pool.query(topProjectsQuery, [pmId]);

    // Build PDF
    const doc = new PDFDocument({ margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-executive-summary.pdf"');
    doc.pipe(res);

    // Header bar
    doc.rect(40, 40, 532, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    doc.fontSize(10)
       .font('Helvetica')
       .text('Executive Dashboard Summary Report (Board Summary)', 55, 68);

    // Grid of KPI blocks (Portrait 532 width)
    doc.fillColor('#000000').moveDown(3);
    doc.fontSize(11).font('Helvetica-Bold').text('Key Performance Indicators', 40, 110);
    
    // Draw 2 rows of 3 columns
    doc.rect(40, 125, 532, 85).stroke('#E5E7EB');
    doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(40, 167).lineTo(572, 167).stroke();
    doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(215, 125).lineTo(215, 210).stroke();
    doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(395, 125).lineTo(395, 210).stroke();

    doc.fontSize(7).font('Helvetica').fillColor('#6B7280');
    // Labels
    doc.text('TOTAL ACTIVE PROJECTS', 50, 131);
    doc.text('TOTAL PORTFOLIO BUDGET', 225, 131);
    doc.text('TOTAL PURCHASE ORDERS', 405, 131);
    doc.text('REVENUE RECEIVED', 50, 173);
    doc.text('REVENUE INVOICED', 225, 173);
    doc.text('TOTAL OUTSTANDING BALANCE', 405, 173);

    // Values
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9);
    doc.text(String(stats.total_projects), 50, 143);
    doc.text(formatCurrency(Number(stats.total_budget)), 225, 143);
    doc.text(formatCurrency(Number(stats.total_po)), 405, 143);
    doc.text(formatCurrency(Number(stats.total_received)), 50, 185);
    doc.text(formatCurrency(Number(invoices.total_invoiced)), 225, 185);
    doc.text(formatCurrency(Number(invoices.total_outstanding)), 405, 185);

    // Top 10 projects by exposure
    const nextY = 230;
    doc.fillColor('#1B3E7A').fontSize(11).font('Helvetica-Bold').text('Top 10 Projects by Outstanding Exposure', 40, nextY);

    const cols = [
      { label: 'Project Code', key: 'projectCd', width: 85 },
      { label: 'Customer Name', key: 'customerName', width: 120 },
      { label: 'Budget Amount', key: 'prjBudgetNo', width: 85 },
      { label: 'PO Amount', key: 'poAmount', width: 82 },
      { label: 'Received', key: 'amountReceived', width: 80 },
      { label: 'Exposure', key: 'outstandingAmount', width: 80 }
    ];

    const rows = topProjectsRes.rows.map(row => ({
      projectCd: row.project_cd,
      customerName: row.customer_name || '-',
      prjBudgetNo: formatCurrency(Number(row.prj_budget_no)),
      poAmount: formatCurrency(Number(row.po_amount)),
      amountReceived: formatCurrency(Number(row.amount_received)),
      outstandingAmount: formatCurrency(Number(row.outstanding_amount))
    }));

    drawPdfTable(doc, cols, rows, { startY: nextY + 15, margin: 40, landscape: false });

    // Generate page footers
    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, 'DOWNLOAD_DASHBOARD_PDF', 'SUCCESS', { filters: req.query });
    doc.end();
  } catch (error: any) {
    console.error('Error dashboard summary pdf:', error);
    await logExport(req, 'DOWNLOAD_DASHBOARD_PDF', 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate board report PDF' });
  }
});

// REPORTS EXPORTS ENGINE
const reportColumns: Record<string, { label: string; key: string; width: number }[]> = {
  'project-summary': [
    { label: 'Project Code', key: 'project_cd', width: 65 },
    { label: 'Project Name', key: 'prj_nm', width: 110 },
    { label: 'Customer', key: 'customer_name', width: 90 },
    { label: 'Project Manager', key: 'prj_mgr_name', width: 90 },
    { label: 'Budget', key: 'prj_budget_no', width: 70 },
    { label: 'PO Value', key: 'po_amount', width: 70 },
    { label: 'Invoiced', key: 'total_invoice_amount', width: 70 },
    { label: 'Received', key: 'amount_received', width: 70 },
    { label: 'Outstanding', key: 'outstanding', width: 70 },
    { label: 'Status', key: 'payment_status', width: 58 }
  ],
  'purchase-orders': [
    { label: 'PO Number', key: 'final_po_no', width: 90 },
    { label: 'Project', key: 'project_no', width: 80 },
    { label: 'Vendor', key: 'vendor_name', width: 140 },
    { label: 'PO Date', key: 'po_date', width: 70 },
    { label: 'Valid From', key: 'valid_from', width: 70 },
    { label: 'Valid To', key: 'valid_to', width: 70 },
    { label: 'Total Value', key: 'total', width: 80 },
    { label: 'Approval Status', key: 'approval_status', width: 100 }
  ],
  'vendor-performance': [
    { label: 'Vendor Name', key: 'vendor_name', width: 200 },
    { label: 'Total PO Value', key: 'total_po_value', width: 100 },
    { label: 'Total Invoiced', key: 'total_invoiced', width: 100 },
    { label: 'Total Paid', key: 'total_paid', width: 100 },
    { label: 'Outstanding', key: 'outstanding', width: 100 },
    { label: 'Avg Delay (Days)', key: 'avg_payment_delay', width: 100 }
  ],
  'invoice-summary': [
    { label: 'Invoice #', key: 'invoice_num', width: 90 },
    { label: 'Project', key: 'project_no', width: 80 },
    { label: 'Vendor', key: 'vendor_name', width: 140 },
    { label: 'Invoice Date', key: 'invoice_date', width: 75 },
    { label: 'Amount', key: 'invoice_amount', width: 80 },
    { label: 'Paid', key: 'amount_paid', width: 80 },
    { label: 'Unpaid', key: 'unpaid', width: 80 },
    { label: 'Status', key: 'status', width: 65 },
    { label: 'Aging Bucket', key: 'aging_bucket', width: 110 }
  ],
  'payment-status': [
    { label: 'Payment Status', key: 'payment_status', width: 140 },
    { label: 'Project Count', key: 'project_count', width: 80 },
    { label: 'Total Budget', key: 'total_budget', width: 100 },
    { label: 'Total PO Value', key: 'total_po_value', width: 100 },
    { label: 'Total Invoiced', key: 'total_invoiced', width: 100 },
    { label: 'Total Received', key: 'total_received', width: 100 },
    { label: 'Total Outstanding', key: 'total_outstanding', width: 110 }
  ],
  'outstanding-analysis': [
    { label: 'Invoice #', key: 'invoice_num', width: 95 },
    { label: 'Project', key: 'project_no', width: 85 },
    { label: 'Vendor', key: 'vendor_name', width: 140 },
    { label: 'Invoice Date', key: 'invoice_date', width: 90 },
    { label: 'Invoice Amount', key: 'invoice_amount', width: 90 },
    { label: 'Paid', key: 'amount_paid', width: 90 },
    { label: 'Outstanding', key: 'unpaid', width: 100 },
    { label: 'Days Overdue', key: 'days_overdue', width: 90 }
  ],
  'customer-wise-projects': [
    { label: 'Customer Name', key: 'customer_name', width: 300 },
    { label: 'Project Count', key: 'project_count', width: 100 },
    { label: 'Total Budget', key: 'total_budget', width: 110 },
    { label: 'Total Received', key: 'total_received', width: 110 },
    { label: 'Outstanding', key: 'outstanding', width: 120 }
  ],
  'pm-wise-projects': [
    { label: 'Project Manager', key: 'prj_mgr_name', width: 200 },
    { label: 'Project Count', key: 'project_count', width: 100 },
    { label: 'Portfolio Value', key: 'portfolio_value', width: 120 },
    { label: 'Total Invoices', key: 'total_invoices', width: 100 },
    { label: 'On-time Invoices', key: 'on_time_invoices', width: 110 },
    { label: 'Overdue Invoices', key: 'overdue_invoices', width: 110 }
  ]
};

async function fetchReportData(type: string, filters: any): Promise<any> {
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
    return result.rows;
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

    return {
      projects: projectsRes.rows,
      purchaseOrders: poRes.rows,
      invoices: invRes.rows
    };
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
    return result.rows;
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
    return Array.from(vendorMap.values()).sort((a, b) => a.vendor_name.localeCompare(b.vendor_name));
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
    return result.rows;
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
    return result.rows;
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
    return result.rows;
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
    return result.rows;
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
    return result.rows;
  }

  throw new Error('Invalid report type');
}

function formatRowForSheet(row: any) {
  const formatted = { ...row };
  const currencyKeys = [
    'prj_budget_no', 'po_amount', 'total_invoice_amount', 'amount_received', 'outstanding',
    'total', 'total_po_value', 'total_invoiced', 'total_paid',
    'total_budget', 'total_po_value', 'total_invoiced', 'total_received', 'total_outstanding',
    'invoice_amount', 'amount_paid', 'unpaid', 'portfolio_value'
  ];
  for (const key of currencyKeys) {
    if (formatted[key] !== undefined && formatted[key] !== null) {
      formatted[key] = Number(formatted[key]);
    }
  }
  return formatted;
}

function formatRowForPdf(row: any, type: string): any {
  const formatted = { ...row };
  
  const currencyKeys = [
    'prj_budget_no', 'po_amount', 'total_invoice_amount', 'amount_received', 'outstanding',
    'total', 'total_po_value', 'total_invoiced', 'total_paid',
    'total_budget', 'total_po_value', 'total_invoiced', 'total_received', 'total_outstanding',
    'invoice_amount', 'amount_paid', 'unpaid', 'portfolio_value'
  ];

  for (const key of currencyKeys) {
    if (formatted[key] !== undefined && formatted[key] !== null) {
      formatted[key] = formatFullINR(Number(formatted[key]));
    }
  }

  const dateKeys = ['po_date', 'valid_from', 'valid_to', 'invoice_date', 'gl_date'];
  for (const key of dateKeys) {
    if (formatted[key] instanceof Date) {
      formatted[key] = formatted[key].toISOString().split('T')[0];
    } else if (formatted[key]) {
      formatted[key] = String(formatted[key]).split('T')[0];
    }
  }

  return formatted;
}

// 1. Excel Report Export
router.get('/reports/:type/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const type = req.params.type as string;
    const filters = parseFilters(req.query);

    const data = await fetchReportData(type, filters);
    const wb = xlsx.utils.book_new();

    if (type === 'financial-summary') {
      const { projects, purchaseOrders, invoices } = data;
      
      const wsProj = xlsx.utils.json_to_sheet(projects.map(formatRowForSheet));
      xlsx.utils.book_append_sheet(wb, wsProj, 'Projects');

      const wsPOs = xlsx.utils.json_to_sheet(purchaseOrders.map(formatRowForSheet));
      xlsx.utils.book_append_sheet(wb, wsPOs, 'Purchase Orders');

      const wsInvs = xlsx.utils.json_to_sheet(invoices.map(formatRowForSheet));
      xlsx.utils.book_append_sheet(wb, wsInvs, 'Invoices');

      const totalBudget = projects.reduce((sum: number, p: any) => sum + Number(p.prj_budget_no || 0), 0);
      const totalInvoiced = projects.reduce((sum: number, p: any) => sum + Number(p.total_invoice_amount || 0), 0);
      const unbilled = Math.max(0, totalBudget - totalInvoiced);
      
      const paidInvoices = invoices.filter((i: any) => i.invoice_date && i.gl_date && Number(i.amount_paid || 0) > 0);
      const totalDays = paidInvoices.reduce((sum: number, i: any) => {
        const start = new Date(i.invoice_date);
        const end = new Date(i.gl_date);
        return sum + Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);
      const avgCollection = paidInvoices.length > 0 ? Math.round(totalDays / paidInvoices.length) : 24;
      const disputed = invoices.filter((i: any) => i.objection && i.objection !== '' && Number(i.unpaid || 0) > 0).length;

      const wsInsights = xlsx.utils.json_to_sheet([
        { Metric: 'Average Collection Time (Days)', Value: avgCollection },
        { Metric: 'Unbilled Revenue', Value: unbilled },
        { Metric: 'Disputed Invoices Alerts', Value: disputed }
      ]);
      xlsx.utils.book_append_sheet(wb, wsInsights, 'Insights');
    } else {
      const sheetRows = data.map(formatRowForSheet);
      const ws = xlsx.utils.json_to_sheet(sheetRows);
      xlsx.utils.book_append_sheet(wb, ws, 'Report Data');
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().toISOString().split('T')[0]}.xlsx"`);
    await logExport(req, `DOWNLOAD_REPORT_EXCEL_${type.toUpperCase().replace(/-/g, '_')}`, 'SUCCESS', { filters: req.query });
    res.send(buffer);
  } catch (error: any) {
    const typeStr = req.params.type as string;
    console.error(`Error exporting report ${typeStr} excel:`, error);
    await logExport(req, `DOWNLOAD_REPORT_EXCEL_${typeStr.toUpperCase().replace(/-/g, '_')}`, 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// 2. CSV Report Export
router.get('/reports/:type/csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const type = req.params.type as string;
    const filters = parseFilters(req.query);

    const data = await fetchReportData(type, filters);
    const wb = xlsx.utils.book_new();

    if (type === 'financial-summary') {
      const ws = xlsx.utils.json_to_sheet(data.projects.map(formatRowForSheet));
      xlsx.utils.book_append_sheet(wb, ws, 'Financial Summary');
    } else {
      const sheetRows = data.map(formatRowForSheet);
      const ws = xlsx.utils.json_to_sheet(sheetRows);
      xlsx.utils.book_append_sheet(wb, ws, 'Report Data');
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'csv' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
    await logExport(req, `DOWNLOAD_REPORT_CSV_${type.toUpperCase().replace(/-/g, '_')}`, 'SUCCESS', { filters: req.query });
    res.send(buffer);
  } catch (error: any) {
    const typeStr = req.params.type as string;
    console.error(`Error exporting report ${typeStr} csv:`, error);
    await logExport(req, `DOWNLOAD_REPORT_CSV_${typeStr.toUpperCase().replace(/-/g, '_')}`, 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate CSV report' });
  }
});

// 3. PDF Report Export
router.get('/reports/:type/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const type = req.params.type as string;
    const filters = parseFilters(req.query);

    const data = await fetchReportData(type, filters);

    const doc = new PDFDocument({ margin: 40, bufferPages: true, layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().toISOString().split('T')[0]}.pdf"`);
    doc.pipe(res);

    // Header bar
    doc.rect(40, 40, 762, 50).fill('#1B3E7A');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('National Informatics Centre Services Inc. (NICSI)', 55, 48);
    
    const title = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    doc.fontSize(10)
       .font('Helvetica')
       .text(`NPMS Reports Dashboard | ${title}`, 55, 68);

    doc.fillColor('#000000').moveDown(3);

    if (type === 'financial-summary') {
      const { projects, purchaseOrders, invoices } = data;
      
      const totalBudget = projects.reduce((sum: number, p: any) => sum + Number(p.prj_budget_no || 0), 0);
      const totalInvoiced = projects.reduce((sum: number, p: any) => sum + Number(p.total_invoice_amount || 0), 0);
      const unbilled = Math.max(0, totalBudget - totalInvoiced);
      
      const paidInvoices = invoices.filter((i: any) => i.invoice_date && i.gl_date && Number(i.amount_paid || 0) > 0);
      const totalDays = paidInvoices.reduce((sum: number, i: any) => {
        const start = new Date(i.invoice_date);
        const end = new Date(i.gl_date);
        return sum + Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);
      const avgCollection = paidInvoices.length > 0 ? Math.round(totalDays / paidInvoices.length) : 24;
      const disputed = invoices.filter((i: any) => i.objection && i.objection !== '' && Number(i.unpaid || 0) > 0).length;

      doc.fontSize(10).font('Helvetica-Bold').text('Quick Insights', 40, 110);
      const insightsCols = [
        { label: 'Metric', key: 'metric', width: 400 },
        { label: 'Value', key: 'value', width: 362 }
      ];
      const insightsRows = [
        { metric: 'Average Collection Time (Days)', value: `${avgCollection} Days` },
        { metric: 'Unbilled Revenue', value: formatFullINR(unbilled) },
        { metric: 'Disputed Invoices Alerts', value: `${disputed} Alerts` }
      ];
      let nextY = drawPdfTable(doc, insightsCols, insightsRows, { startY: 125, margin: 40, landscape: true });

      const topChannels = [...projects]
        .sort((a, b) => (b.po_amount || 0) - (a.po_amount || 0))
        .slice(0, 4)
        .map(p => ({
          prj_nm: p.prj_nm,
          po_amount: formatFullINR(Number(p.po_amount || 0))
        }));

      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Top Revenue Channels', 40, nextY + 15);
      const channelsCols = [
        { label: 'Project Name', key: 'prj_nm', width: 500 },
        { label: 'PO Value', key: 'po_amount', width: 262 }
      ];
      nextY = drawPdfTable(doc, channelsCols, topChannels, { startY: nextY + 30, margin: 40, landscape: true });

    } else {
      const cols = reportColumns[type];
      if (!cols) {
        throw new Error(`Columns definition not found for report type ${type}`);
      }

      const rows = data.map((row: any) => formatRowForPdf(row, type));
      drawPdfTable(doc, cols, rows, { startY: 110, margin: 40, landscape: true });
    }

    const range = doc.bufferedPageRange();
    const currentDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF')
         .fontSize(7)
         .font('Helvetica')
         .text(`Report generated on ${currentDate} | Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
           align: 'right',
           width: doc.page.width - 80
         });
    }

    await logExport(req, `DOWNLOAD_REPORT_PDF_${type.toUpperCase().replace(/-/g, '_')}`, 'SUCCESS', { filters: req.query });
    doc.end();
  } catch (error: any) {
    const typeStr = req.params.type as string;
    console.error(`Error exporting report ${typeStr} pdf:`, error);
    await logExport(req, `DOWNLOAD_REPORT_PDF_${typeStr.toUpperCase().replace(/-/g, '_')}`, 'FAILURE', { filters: req.query, error: error.message });
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

export default router;

