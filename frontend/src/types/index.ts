export interface Project {
  id: string; // e.g. "P-2024-001"
  name: string;
  client: string;
  department: string;
  status: 'Fully Paid' | 'Partially Paid' | 'No Invoices Yet';
  poCount: number;
  poAmount: number;
  invoiceAmount: number;
  amountPaid: number;
  taxInvoiceAmount: number;
  description: string;
  location: string;
  duration: string;
  manager: string;
  priority: 'High' | 'Medium' | 'Low';
  healthScore: number;
}

export interface Invoice {
  id: string; // e.g. "INV-2024-085"
  projectNo: string;
  projectName: string;
  customer: string;
  amount: number;
  tax: number; // GST amount
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  dueDate: string;
  date: string;
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-2024-102"
  projectNo: string;
  projectName: string;
  vendor: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Draft';
  date: string;
}

export interface TaxInvoice {
  id: string; // e.g. "TX-2024-045"
  projectNo: string;
  projectName: string;
  customer: string;
  amount: number;
  linkedInvoiceNo: string;
  date: string;
  status: 'Issued' | 'Pending';
}

export interface Activity {
  id: string;
  projectNo?: string;
  title: string;
  actor: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info';
  description?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info';
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface DatabaseProject {
  headerId: number;
  projectId: number;
  prjMgrId: number | null;
  projectCd: string;
  prjNm: string;
  customerName: string;
  prjBudgetNo: number | null;
  amountReceived: number | null;
  noOfPo: number;
  poAmount: number | null;
  noOfInvBilldesk: number;
  noOfExpInvoice: number;
  totalInvoiceAmount: number;
  totalAmountPaid: number;
  noOfTaxInvoice: number;
  totalTaxInvoiceAmount: number;
  projectAbp: number | null;
  createdOn: string | null;
  custId: number | null;
  prjType: string | null;
  userEmail: string | null;
  mobileNumber: string | null;
  hodEmail: string | null;
  nicCordEmailId: string | null;
  staffEmailId: string | null;
}

