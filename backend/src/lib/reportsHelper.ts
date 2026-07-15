export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  financialYear?: string;
  prjType?: string;
  customerName?: string;
  vendorName?: string;
  prjMgrId?: string;
  paymentStatus?: string;
  invoiceStatus?: string;
  projectId?: string;
}

export function parseFilters(query: any): ReportFilters {
  const {
    fromDate,
    toDate,
    financialYear,
    prjType,
    customerName,
    vendorName,
    prjMgrId,
    paymentStatus,
    invoiceStatus,
    projectId,
  } = query;

  return {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    financialYear: financialYear && financialYear !== 'All' ? financialYear : undefined,
    prjType: prjType && prjType !== 'All' ? prjType : undefined,
    customerName: customerName && customerName !== 'All' ? customerName : undefined,
    vendorName: vendorName && vendorName !== 'All' ? vendorName : undefined,
    prjMgrId: prjMgrId && prjMgrId !== 'All' ? prjMgrId : undefined,
    paymentStatus: paymentStatus && paymentStatus !== 'All' ? paymentStatus : undefined,
    invoiceStatus: invoiceStatus && invoiceStatus !== 'All' ? invoiceStatus : undefined,
    projectId: projectId && projectId !== 'All' ? projectId : undefined,
  };
}

export function buildProjectsQuery(filters: ReportFilters, startIdx: number = 1): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = startIdx;

  // Financial Year parsing
  let fromD = filters.fromDate;
  let toD = filters.toDate;
  if (filters.financialYear) {
    const startYear = parseInt(filters.financialYear.split('-')[0], 10);
    if (!isNaN(startYear)) {
      fromD = `${startYear}-04-01`;
      toD = `${startYear + 1}-03-31`;
    }
  }

  if (fromD) {
    conditions.push(`p.created_on >= $${idx}`);
    values.push(fromD);
    idx++;
  }
  if (toD) {
    conditions.push(`p.created_on <= $${idx}`);
    values.push(toD);
    idx++;
  }

  if (filters.prjType) {
    conditions.push(`p.prj_type = $${idx}`);
    values.push(filters.prjType);
    idx++;
  }

  if (filters.customerName) {
    conditions.push(`p.customer_name = $${idx}`);
    values.push(filters.customerName);
    idx++;
  }

  if (filters.vendorName) {
    conditions.push(`(
      p.project_cd IN (SELECT project_no FROM purchase_orders WHERE vendor_name = $${idx})
      OR p.project_cd IN (SELECT project_no FROM invoices WHERE vendor_name = $${idx})
    )`);
    values.push(filters.vendorName);
    idx++;
  }

  if (filters.prjMgrId) {
    conditions.push(`p.prj_mgr_id = $${idx}`);
    values.push(parseInt(filters.prjMgrId, 10));
    idx++;
  }

  if (filters.paymentStatus) {
    conditions.push(`(
      CASE
        WHEN p.no_of_inv_billdesk = 0 AND p.total_invoice_amount = 0 THEN 'No Invoices Yet'
        WHEN p.total_invoice_amount > 0 AND p.total_amount_paid >= p.total_invoice_amount THEN 'Fully Paid'
        ELSE 'Partially Paid'
      END
    ) = $${idx}`);
    values.push(filters.paymentStatus);
    idx++;
  }

  if (filters.invoiceStatus) {
    conditions.push(`p.project_cd IN (SELECT project_no FROM bill_desk WHERE invoice_status = $${idx})`);
    values.push(filters.invoiceStatus);
    idx++;
  }

  if (filters.projectId) {
    conditions.push(`(p.id = $${idx}::integer OR p.project_cd = $${idx})`);
    values.push(filters.projectId);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql: whereClause, values };
}

export function buildPOsQuery(filters: ReportFilters, startIdx: number = 1): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = startIdx;

  let fromD = filters.fromDate;
  let toD = filters.toDate;
  if (filters.financialYear) {
    const startYear = parseInt(filters.financialYear.split('-')[0], 10);
    if (!isNaN(startYear)) {
      fromD = `${startYear}-04-01`;
      toD = `${startYear + 1}-03-31`;
    }
  }

  if (fromD) {
    conditions.push(`po.po_date >= $${idx}`);
    values.push(fromD);
    idx++;
  }
  if (toD) {
    conditions.push(`po.po_date <= $${idx}`);
    values.push(toD);
    idx++;
  }

  if (filters.vendorName) {
    conditions.push(`po.vendor_name = $${idx}`);
    values.push(filters.vendorName);
    idx++;
  }

  if (filters.prjMgrId) {
    conditions.push(`p.prj_mgr_id = $${idx}`);
    values.push(parseInt(filters.prjMgrId, 10));
    idx++;
  }

  if (filters.prjType) {
    conditions.push(`p.prj_type = $${idx}`);
    values.push(filters.prjType);
    idx++;
  }

  if (filters.customerName) {
    conditions.push(`p.customer_name = $${idx}`);
    values.push(filters.customerName);
    idx++;
  }

  if (filters.paymentStatus) {
    conditions.push(`(
      CASE
        WHEN p.no_of_inv_billdesk = 0 AND p.total_invoice_amount = 0 THEN 'No Invoices Yet'
        WHEN p.total_invoice_amount > 0 AND p.total_amount_paid >= p.total_invoice_amount THEN 'Fully Paid'
        ELSE 'Partially Paid'
      END
    ) = $${idx}`);
    values.push(filters.paymentStatus);
    idx++;
  }

  if (filters.invoiceStatus) {
    conditions.push(`p.project_cd IN (SELECT project_no FROM bill_desk WHERE invoice_status = $${idx})`);
    values.push(filters.invoiceStatus);
    idx++;
  }

  if (filters.projectId) {
    conditions.push(`(p.id = $${idx}::integer OR p.project_cd = $${idx})`);
    values.push(filters.projectId);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql: whereClause, values };
}

export function buildInvoicesQuery(filters: ReportFilters, startIdx: number = 1): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = startIdx;

  let fromD = filters.fromDate;
  let toD = filters.toDate;
  if (filters.financialYear) {
    const startYear = parseInt(filters.financialYear.split('-')[0], 10);
    if (!isNaN(startYear)) {
      fromD = `${startYear}-04-01`;
      toD = `${startYear + 1}-03-31`;
    }
  }

  if (fromD) {
    conditions.push(`inv.invoice_date >= $${idx}`);
    values.push(fromD);
    idx++;
  }
  if (toD) {
    conditions.push(`inv.invoice_date <= $${idx}`);
    values.push(toD);
    idx++;
  }

  if (filters.vendorName) {
    conditions.push(`inv.vendor_name = $${idx}`);
    values.push(filters.vendorName);
    idx++;
  }

  if (filters.prjMgrId) {
    conditions.push(`p.prj_mgr_id = $${idx}`);
    values.push(parseInt(filters.prjMgrId, 10));
    idx++;
  }

  if (filters.prjType) {
    conditions.push(`p.prj_type = $${idx}`);
    values.push(filters.prjType);
    idx++;
  }

  if (filters.customerName) {
    conditions.push(`p.customer_name = $${idx}`);
    values.push(filters.customerName);
    idx++;
  }

  if (filters.paymentStatus) {
    conditions.push(`(
      CASE
        WHEN p.no_of_inv_billdesk = 0 AND p.total_invoice_amount = 0 THEN 'No Invoices Yet'
        WHEN p.total_invoice_amount > 0 AND p.total_amount_paid >= p.total_invoice_amount THEN 'Fully Paid'
        ELSE 'Partially Paid'
      END
    ) = $${idx}`);
    values.push(filters.paymentStatus);
    idx++;
  }

  if (filters.invoiceStatus) {
    conditions.push(`inv.invoice_num IN (SELECT invoice_no FROM bill_desk WHERE invoice_status = $${idx} AND project_no = inv.project_no)`);
    values.push(filters.invoiceStatus);
    idx++;
  }

  if (filters.projectId) {
    conditions.push(`(p.id = $${idx}::integer OR p.project_cd = $${idx})`);
    values.push(filters.projectId);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql: whereClause, values };
}
