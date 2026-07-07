import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import type { Project } from '../types/project.js';

const router = Router();

// Convert snake_case database fields to camelCase properties for client JSON payload
function mapRowToProject(row: any): Project {
  let createdOnStr: string | null = null;
  if (row.created_on) {
    if (row.created_on instanceof Date) {
      // Keep only YYYY-MM-DD
      createdOnStr = row.created_on.toISOString().split('T')[0];
    } else {
      createdOnStr = String(row.created_on);
    }
  }

  return {
    headerId: Number(row.header_id),
    projectId: Number(row.project_id),
    prjMgrId: row.prj_mgr_id ? Number(row.prj_mgr_id) : null,
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
  };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY header_id ASC');
    const projects: Project[] = result.rows.map(mapRowToProject);

    res.json({
      data: projects,
      count: projects.length
    });
  } catch (error: any) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'An internal server error occurred while retrieving projects.'
    });
  }
});

export default router;
