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

export interface PmSummary {
  id: number;
  headerId: number | null;
  prjMgrId: number | null;
  prjMgrName: string | null;
  prjTypeCode: string | null;
  prjTypeDescription: string | null;
  noOfProject: number | null;
  createdDate: string | null;
}
