export interface Project {
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
