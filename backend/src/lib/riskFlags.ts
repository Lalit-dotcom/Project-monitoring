export const LOW_COLLECTION_THRESHOLD_PCT = 80;   // amount_received < po_amount * this%
export const STALLED_PROJECT_DAYS = 60;           // PO older than this with 0 invoices
export const OVERDUE_INVOICE_DAYS = 30;           // matches existing Bill Desk payment term
export const STALE_MISSING_IRN_DAYS = 90;         // bill_date older than this with no IRN

// 1. Projects Page: Vendor Paid More Than Collected From Client
export function getProjectsVendorOverpaidSql(): string {
  return `(SELECT COALESCE(SUM(i.amount_paid), 0) FROM invoices i WHERE i.project_no = projects.project_cd) > COALESCE(projects.amount_received, 0)`;
}

// 2. Projects Page: Billing Ahead of Collection
export function getProjectsBillingAheadSql(): string {
  return `COALESCE(projects.amount_received, 0) < (COALESCE(projects.po_amount, 0) * ${LOW_COLLECTION_THRESHOLD_PCT} / 100.0)`;
}

// 3. Projects Page: Stalled — PO Issued, Nothing Billed Yet
export function getProjectsStalledSql(): string {
  return `projects.no_of_inv_billdesk = 0 AND EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.project_no = projects.project_cd 
      AND po.po_date < CURRENT_DATE - INTERVAL '${STALLED_PROJECT_DAYS} days'
  )`;
}

// 4. Purchase Orders Page: Expiring Soon + Low Collection
export function getPurchaseOrdersExpiringLowCollectionSql(paramPlaceholder: string): string {
  return `purchase_orders.valid_to >= CURRENT_DATE 
    AND purchase_orders.valid_to <= CURRENT_DATE + (${paramPlaceholder} * INTERVAL '1 month')
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.project_cd = purchase_orders.project_no 
        AND COALESCE(p.amount_received, 0) < purchase_orders.total * ${LOW_COLLECTION_THRESHOLD_PCT} / 100.0
    )`;
}

// 5. Purchase Orders Page: Expired + Still Uncollected
export function getPurchaseOrdersExpiredUncollectedSql(): string {
  return `purchase_orders.valid_to < CURRENT_DATE AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.project_cd = purchase_orders.project_no 
      AND COALESCE(p.amount_received, 0) < purchase_orders.total
  )`;
}

// 6. Purchase Orders Page: Stalled — No Billing Yet
export function getPurchaseOrdersStalledSql(): string {
  return `purchase_orders.po_date < CURRENT_DATE - INTERVAL '${STALLED_PROJECT_DAYS} days' AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.project_cd = purchase_orders.project_no 
      AND p.no_of_inv_billdesk = 0
  )`;
}

// 7. Invoices Page: Overdue & Unpaid
export function getInvoicesOverdueUnpaidSql(): string {
  return `invoices.unpaid > 0 AND invoices.invoice_date < CURRENT_DATE - INTERVAL '${OVERDUE_INVOICE_DAYS} days'`;
}

// 8. Invoices Page: Disputed & Still Unpaid
export function getInvoicesDisputedUnpaidSql(): string {
  return `invoices.objection IS NOT NULL AND invoices.objection != '' AND invoices.unpaid > 0`;
}

// 9. Tax Invoices Page: Missing GST e-Invoice (No IRN)
export function getTaxInvoicesMissingIrnSql(): string {
  return `(tax_invoices.irn_no IS NULL OR tax_invoices.irn_no = '') AND tax_invoices.bill_date < CURRENT_DATE - INTERVAL '${STALE_MISSING_IRN_DAYS} days'`;
}
