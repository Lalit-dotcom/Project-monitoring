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
  amountReceived: number;
  createdOn: string;
}

export interface Invoice {
  id: number;
  headerId: number | null;
  projectId: number | null;
  projectNo: string;
  prjMgrId: number | null;
  prjMgrName: string | null;
  managerName: string | null;
  poNo: string | null;
  vendorId: number | null;
  vendorName: string | null;
  invoiceNum: string | null;
  invoiceDate: string | null;
  glDate: string | null;
  invoiceAmount: number | null;
  amountPaid: number | null;
  unpaid: number | null;
  penAmt: number | null;
  objection: string | null;
  finalUnpaid: number | null;
  invoiceType: string | null;
  projectAbp: number | null;
  gemFlag: string | null;
  msmeVendorName: string | null;
  createdDate: string | null;
}

export interface PurchaseOrder {
  id: number;
  headerId: number | null;
  projectId: number | null;
  projectNo: string;
  prjMgrId: number | null;
  prjMgrName: string | null;
  vendorId: number | null;
  vendorName: string | null;
  finalPoNo: string | null;
  poDate: string | null;
  validFrom: string | null;
  validTo: string | null;
  total: number | null;
  approvalStatus: string | null;
  createdDate: string | null;
}

export interface TaxInvoice {
  id: number;
  headerId: number | null;
  projectId: number | null;
  projectNo: string;
  prjMgrId: number | null;
  prjMgrName: string | null;
  custId: number | null;
  custGstinNo: string | null;
  prjGstnNo: string | null;
  poNo: string | null;
  ampono: string | null;
  userBillNo: string | null;
  billDate: string | null;
  billStatus: string | null;
  billingPeriodFrom: string | null;
  billingPeriodTo: string | null;
  suppInvNum: string | null;
  totalAmount: number | null;
  billType: string | null;
  stateDescription: string | null;
  irnNo: string | null;
  createdDate: string | null;
}

export interface BillDeskRecord {
  id: number;
  headerId: number | null;
  projectId: number | null;
  projectNo: string;
  prjMgrId: number | null;
  prjMgrName: string | null;
  finalPoNo: string | null;
  billMonth: string | null;
  vendorId: number | null;
  vendorName: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  receivedDate: string | null;
  invoiceAmount: number | null;
  invoiceNum: string | null;
  invoiceAmountBk: number | null;
  amountPaid: number | null;
  invoiceStatus: string | null;
  objectionRemarks: string | null;
  status: string | null;
  createdDate: string | null;
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
  username: string;
  name: string | null;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface DatabaseProject {
  headerId: number;
  projectId: number;
  prjMgrId: number | null;
  prjMgrName: string | null;
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
  paymentStatus: 'Fully Paid' | 'Partially Paid' | 'No Invoices Yet';
}

