import { Pool } from 'pg';

export interface ValidationResult {
  valid: boolean;
  errors: { [key: string]: string };
}

function isValidDate(dateStr: any): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export async function validateProject(
  pool: Pool,
  data: any,
  user: { role: string; prjMgrId: number | null }
): Promise<ValidationResult> {
  const errors: { [key: string]: string } = {};

  // project_cd: required, non-empty, must be unique
  if (!data.project_cd || String(data.project_cd).trim() === '') {
    errors.project_cd = 'Project code is required';
  } else {
    const projectCd = String(data.project_cd).trim();
    try {
      const res = await pool.query('SELECT 1 FROM projects WHERE project_cd = $1', [projectCd]);
      if (res.rows.length > 0) {
        errors.project_cd = 'Project code already exists';
      }
    } catch (err) {
      console.error('Error validating project code uniqueness:', err);
      errors.project_cd = 'Failed to verify uniqueness';
    }
  }

  // prj_nm: required
  if (!data.prj_nm || String(data.prj_nm).trim() === '') {
    errors.prj_nm = 'Project name is required';
  }

  // customer_name: required
  if (!data.customer_name || String(data.customer_name).trim() === '') {
    errors.customer_name = 'Customer name is required';
  }

  // prj_budget_no: required, numeric, > 0
  if (data.prj_budget_no === undefined || data.prj_budget_no === null || String(data.prj_budget_no).trim() === '') {
    errors.prj_budget_no = 'Project budget is required';
  } else {
    const budget = Number(data.prj_budget_no);
    if (isNaN(budget) || budget <= 0) {
      errors.prj_budget_no = 'Project budget must be a number greater than 0';
    }
  }

  // prj_mgr_id: required
  if (data.prj_mgr_id === undefined || data.prj_mgr_id === null || String(data.prj_mgr_id).trim() === '') {
    errors.prj_mgr_id = 'Project manager ID is required';
  } else {
    const prjMgrId = Number(data.prj_mgr_id);
    if (isNaN(prjMgrId)) {
      errors.prj_mgr_id = 'Project manager ID must be a number';
    } else {
      if (user.role === 'project_manager') {
        if (prjMgrId !== user.prjMgrId) {
          // Note: the prompt says we must reject (403) attempts to set a different value.
          // We will handle the 403 status check in the endpoint itself, but we can set a specific key or mark it here.
          errors.prj_mgr_id = 'Forbidden: Project manager can only assign projects to themselves';
        }
      } else if (user.role === 'superadmin') {
        try {
          const mgrRes = await pool.query('SELECT 1 FROM project_managers WHERE prj_mgr_id = $1', [prjMgrId]);
          if (mgrRes.rows.length === 0) {
            errors.prj_mgr_id = 'Project manager does not exist';
          }
        } catch (err) {
          console.error('Error validating manager existence:', err);
          errors.prj_mgr_id = 'Failed to verify project manager';
        }
      }
    }
  }

  // prj_type: required
  if (!data.prj_type || String(data.prj_type).trim() === '') {
    errors.prj_type = 'Project type is required';
  }

  // amount_received: optional, numeric >= 0
  if (data.amount_received !== undefined && data.amount_received !== null && String(data.amount_received).trim() !== '') {
    const received = Number(data.amount_received);
    if (isNaN(received) || received < 0) {
      errors.amount_received = 'Amount received must be a number greater than or equal to 0';
    }
  }

  // created_on: optional, valid date
  if (data.created_on !== undefined && data.created_on !== null && String(data.created_on).trim() !== '') {
    if (!isValidDate(data.created_on)) {
      errors.created_on = 'Created date must be a valid date';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validatePurchaseOrder(data: any): ValidationResult {
  const errors: { [key: string]: string } = {};

  // final_po_no: required, non-empty
  if (!data.final_po_no || String(data.final_po_no).trim() === '') {
    errors.final_po_no = 'Purchase Order number is required';
  }

  // vendor_name: required
  if (!data.vendor_name || String(data.vendor_name).trim() === '') {
    errors.vendor_name = 'Vendor name is required';
  }

  // po_date: required, valid date
  if (!data.po_date || String(data.po_date).trim() === '') {
    errors.po_date = 'PO date is required';
  } else if (!isValidDate(data.po_date)) {
    errors.po_date = 'PO date must be a valid date';
  }

  // valid_from, valid_to: required, valid dates, valid_to must be after valid_from
  let fromValid = false;
  let toValid = false;

  if (!data.valid_from || String(data.valid_from).trim() === '') {
    errors.valid_from = 'Validity start date is required';
  } else if (!isValidDate(data.valid_from)) {
    errors.valid_from = 'Validity start date must be a valid date';
  } else {
    fromValid = true;
  }

  if (!data.valid_to || String(data.valid_to).trim() === '') {
    errors.valid_to = 'Validity end date is required';
  } else if (!isValidDate(data.valid_to)) {
    errors.valid_to = 'Validity end date must be a valid date';
  } else {
    toValid = true;
  }

  if (fromValid && toValid) {
    const fromDate = new Date(data.valid_from);
    const toDate = new Date(data.valid_to);
    if (toDate <= fromDate) {
      errors.valid_to = 'Validity end date must be after validity start date';
    }
  }

  // total: required, numeric, > 0
  if (data.total === undefined || data.total === null || String(data.total).trim() === '') {
    errors.total = 'Total PO amount is required';
  } else {
    const total = Number(data.total);
    if (isNaN(total) || total <= 0) {
      errors.total = 'Total PO amount must be a number greater than 0';
    }
  }

  // approval_status: required, one of defined set
  const allowedStatuses = ['PENDING', 'APPROVED', 'DISPATCHED'];
  if (!data.approval_status || String(data.approval_status).trim() === '') {
    errors.approval_status = 'Approval status is required';
  } else if (!allowedStatuses.includes(String(data.approval_status).toUpperCase())) {
    errors.approval_status = `Approval status must be one of: ${allowedStatuses.join(', ')}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateInvoice(data: any): ValidationResult {
  const errors: { [key: string]: string } = {};

  // invoice_num: required, non-empty
  if (!data.invoice_num || String(data.invoice_num).trim() === '') {
    errors.invoice_num = 'Invoice number is required';
  }

  // vendor_name: required
  if (!data.vendor_name || String(data.vendor_name).trim() === '') {
    errors.vendor_name = 'Vendor name is required';
  }

  // invoice_date: required, valid date
  if (!data.invoice_date || String(data.invoice_date).trim() === '') {
    errors.invoice_date = 'Invoice date is required';
  } else if (!isValidDate(data.invoice_date)) {
    errors.invoice_date = 'Invoice date must be a valid date';
  }

  // invoice_amount: required, numeric, > 0
  let invAmt = 0;
  let invAmtValid = false;
  if (data.invoice_amount === undefined || data.invoice_amount === null || String(data.invoice_amount).trim() === '') {
    errors.invoice_amount = 'Invoice amount is required';
  } else {
    invAmt = Number(data.invoice_amount);
    if (isNaN(invAmt) || invAmt <= 0) {
      errors.invoice_amount = 'Invoice amount must be a number greater than 0';
    } else {
      invAmtValid = true;
    }
  }

  // amount_paid: optional, numeric >= 0, must be <= invoice_amount
  if (data.amount_paid !== undefined && data.amount_paid !== null && String(data.amount_paid).trim() !== '') {
    const paid = Number(data.amount_paid);
    if (isNaN(paid) || paid < 0) {
      errors.amount_paid = 'Amount paid must be a number greater than or equal to 0';
    } else if (invAmtValid && paid > invAmt) {
      errors.amount_paid = 'Amount paid cannot exceed invoice amount';
    }
  }

  // invoice_type: required
  if (!data.invoice_type || String(data.invoice_type).trim() === '') {
    errors.invoice_type = 'Invoice type is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateBillDesk(data: any): ValidationResult {
  const errors: { [key: string]: string } = {};

  // invoice_no: required
  if (!data.invoice_no || String(data.invoice_no).trim() === '') {
    errors.invoice_no = 'Invoice number is required';
  }

  // bill_month: required
  if (!data.bill_month || String(data.bill_month).trim() === '') {
    errors.bill_month = 'Bill month is required';
  }

  // vendor_name: required
  if (!data.vendor_name || String(data.vendor_name).trim() === '') {
    errors.vendor_name = 'Vendor name is required';
  }

  // invoice_date: required, valid date
  if (!data.invoice_date || String(data.invoice_date).trim() === '') {
    errors.invoice_date = 'Invoice date is required';
  } else if (!isValidDate(data.invoice_date)) {
    errors.invoice_date = 'Invoice date must be a valid date';
  }

  // invoice_amount: required, numeric, > 0
  let invAmt = 0;
  let invAmtValid = false;
  if (data.invoice_amount === undefined || data.invoice_amount === null || String(data.invoice_amount).trim() === '') {
    errors.invoice_amount = 'Invoice amount is required';
  } else {
    invAmt = Number(data.invoice_amount);
    if (isNaN(invAmt) || invAmt <= 0) {
      errors.invoice_amount = 'Invoice amount must be a number greater than 0';
    } else {
      invAmtValid = true;
    }
  }

  // amount_paid: optional, numeric >= 0, must be <= invoice_amount
  if (data.amount_paid !== undefined && data.amount_paid !== null && String(data.amount_paid).trim() !== '') {
    const paid = Number(data.amount_paid);
    if (isNaN(paid) || paid < 0) {
      errors.amount_paid = 'Amount paid must be a number greater than or equal to 0';
    } else if (invAmtValid && paid > invAmt) {
      errors.amount_paid = 'Amount paid cannot exceed invoice amount';
    }
  }

  // status: required
  if (!data.status || String(data.status).trim() === '') {
    errors.status = 'Status is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateTaxInvoice(data: any): ValidationResult {
  const errors: { [key: string]: string } = {};

  // user_bill_no: required
  if (!data.user_bill_no || String(data.user_bill_no).trim() === '') {
    errors.user_bill_no = 'Tax Invoice number is required';
  }

  // cust_gstin_no: required, 15-character alphanumeric format check
  if (!data.cust_gstin_no || String(data.cust_gstin_no).trim() === '') {
    errors.cust_gstin_no = 'Customer GSTIN is required';
  } else {
    const gstin = String(data.cust_gstin_no).trim();
    if (!/^[a-zA-Z0-9]{15}$/.test(gstin)) {
      errors.cust_gstin_no = 'Customer GSTIN must be exactly 15 alphanumeric characters';
    }
  }

  // bill_date: required, valid date
  if (!data.bill_date || String(data.bill_date).trim() === '') {
    errors.bill_date = 'Bill date is required';
  } else if (!isValidDate(data.bill_date)) {
    errors.bill_date = 'Bill date must be a valid date';
  }

  // total_amount: required, numeric, > 0
  if (data.total_amount === undefined || data.total_amount === null || String(data.total_amount).trim() === '') {
    errors.total_amount = 'Total amount is required';
  } else {
    const amount = Number(data.total_amount);
    if (isNaN(amount) || amount <= 0) {
      errors.total_amount = 'Total amount must be a number greater than 0';
    }
  }

  // bill_type: required
  if (!data.bill_type || String(data.bill_type).trim() === '') {
    errors.bill_type = 'Bill type is required';
  }

  // state_description: required
  if (!data.state_description || String(data.state_description).trim() === '') {
    errors.state_description = 'State description is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
