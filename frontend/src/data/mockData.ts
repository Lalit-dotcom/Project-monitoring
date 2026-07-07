import type { Project, Invoice, PurchaseOrder, TaxInvoice, Activity, Notification, User } from '../types';

export const mockProjects: Project[] = [];


export const mockInvoices: Invoice[] = [
  // P-2024-001 (Partially Paid, PO Amt: 320L, Inv Amt: 180L, Paid: 120L)
  {
    id: 'INV-2024-001',
    projectNo: 'P-2024-001',
    projectName: 'Institute of Advanced Study in Science',
    customer: 'Department of Science & Technology',
    amount: 8000000,
    tax: 1440000, // 18% GST
    status: 'Paid',
    dueDate: '2026-04-15',
    date: '2026-03-15'
  },
  {
    id: 'INV-2024-002',
    projectNo: 'P-2024-001',
    projectName: 'Institute of Advanced Study in Science',
    customer: 'Department of Science & Technology',
    amount: 4000000,
    tax: 720000,
    status: 'Paid',
    dueDate: '2026-05-20',
    date: '2026-04-20'
  },
  {
    id: 'INV-2024-003',
    projectNo: 'P-2024-001',
    projectName: 'Institute of Advanced Study in Science',
    customer: 'Department of Science & Technology',
    amount: 6000000,
    tax: 1080000,
    status: 'Pending',
    dueDate: '2026-07-20',
    date: '2026-06-20'
  },

  // P-2024-002 (Fully Paid, PO Amt: 750L, Inv Amt: 750L, Paid: 750L)
  {
    id: 'INV-2024-004',
    projectNo: 'P-2024-002',
    projectName: 'All India Institute of Sciences Bathinda',
    customer: 'Ministry of Health & Family Welfare',
    amount: 40000000,
    tax: 7200000,
    status: 'Paid',
    dueDate: '2026-02-10',
    date: '2026-01-10'
  },
  {
    id: 'INV-2024-005',
    projectNo: 'P-2024-002',
    projectName: 'All India Institute of Sciences Bathinda',
    customer: 'Ministry of Health & Family Welfare',
    amount: 35000000,
    tax: 6300000,
    status: 'Paid',
    dueDate: '2026-05-15',
    date: '2026-04-15'
  },

  // P-2024-003 (Partially Paid, PO Amt: 480L, Inv Amt: 240L, Paid: 160L)
  {
    id: 'INV-2024-006',
    projectNo: 'P-2024-003',
    projectName: 'India Port Rail & Ropeway Corporation',
    customer: 'Ministry of Ports, Shipping & Waterways',
    amount: 16000000,
    tax: 2880000,
    status: 'Paid',
    dueDate: '2026-03-30',
    date: '2026-02-28'
  },
  {
    id: 'INV-2024-007',
    projectNo: 'P-2024-003',
    projectName: 'India Port Rail & Ropeway Corporation',
    customer: 'Ministry of Ports, Shipping & Waterways',
    amount: 8000000,
    tax: 1440000,
    status: 'Overdue',
    dueDate: '2026-06-15',
    date: '2026-05-15'
  },

  // P-2024-005 (Partially Paid, PO Amt: 150L, Inv Amt: 80L, Paid: 40L)
  {
    id: 'INV-2024-008',
    projectNo: 'P-2024-005',
    projectName: 'Sri Padmavati Mahila Visvavidyalayam',
    customer: 'Government of Andhra Pradesh',
    amount: 4000000,
    tax: 720000,
    status: 'Paid',
    dueDate: '2026-04-01',
    date: '2026-03-01'
  },
  {
    id: 'INV-2024-009',
    projectNo: 'P-2024-005',
    projectName: 'Sri Padmavati Mahila Visvavidyalayam',
    customer: 'Government of Andhra Pradesh',
    amount: 4000000,
    tax: 720000,
    status: 'Pending',
    dueDate: '2026-07-15',
    date: '2026-06-15'
  },

  // P-2024-006 (Fully Paid, PO Amt: 950L, Inv Amt: 950L, Paid: 950L)
  {
    id: 'INV-2024-010',
    projectNo: 'P-2024-006',
    projectName: 'CSC E-Governance Services India',
    customer: 'Ministry of Electronics & IT',
    amount: 50000000,
    tax: 9000000,
    status: 'Paid',
    dueDate: '2026-02-28',
    date: '2026-01-28'
  },
  {
    id: 'INV-2024-011',
    projectNo: 'P-2024-006',
    projectName: 'CSC E-Governance Services India',
    customer: 'Ministry of Electronics & IT',
    amount: 45000000,
    tax: 8100000,
    status: 'Paid',
    dueDate: '2026-05-30',
    date: '2026-04-30'
  },
  
  // Some Draft Invoices
  {
    id: 'INV-2024-012',
    projectNo: 'P-2024-004',
    projectName: 'National Automotive Test Tracks',
    customer: 'Ministry of Heavy Industries',
    amount: 3000000,
    tax: 540000,
    status: 'Draft',
    dueDate: '2026-08-01',
    date: '2026-07-01'
  }
];

export const mockPurchaseOrders: PurchaseOrder[] = [
  // P-2024-001
  { id: 'PO-2024-101', projectNo: 'P-2024-001', projectName: 'Institute of Advanced Study in Science', vendor: 'Precision Sensors Ltd', amount: 12000000, status: 'Approved', date: '2026-01-10' },
  { id: 'PO-2024-102', projectNo: 'P-2024-001', projectName: 'Institute of Advanced Study in Science', vendor: 'GeoTech Softwares', amount: 10000000, status: 'Approved', date: '2026-02-15' },
  { id: 'PO-2024-103', projectNo: 'P-2024-001', projectName: 'Institute of Advanced Study in Science', vendor: 'Assam Electronics', amount: 10000000, status: 'Approved', date: '2026-03-01' },

  // P-2024-002
  { id: 'PO-2024-104', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', vendor: 'Apex Gas Pipelines', amount: 30000000, status: 'Approved', date: '2025-11-20' },
  { id: 'PO-2024-105', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', vendor: 'Bathinda Steel Builders', amount: 20000000, status: 'Approved', date: '2025-12-05' },
  { id: 'PO-2024-106', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', vendor: 'Meditron Systems', amount: 15000000, status: 'Approved', date: '2026-01-12' },
  { id: 'PO-2024-107', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', vendor: 'MedCare Sol', amount: 5000000, status: 'Approved', date: '2026-02-10' },
  { id: 'PO-2024-108', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', vendor: 'Punjab Computech', amount: 5000000, status: 'Approved', date: '2026-03-05' },

  // P-2024-003
  { id: 'PO-2024-109', projectNo: 'P-2024-003', projectName: 'India Port Rail & Ropeway Corporation', vendor: 'RailCorp Engineers', amount: 20000000, status: 'Approved', date: '2026-01-18' },
  { id: 'PO-2024-110', projectNo: 'P-2024-003', projectName: 'India Port Rail & Ropeway Corporation', vendor: 'Ropeway Tech India', amount: 15000000, status: 'Approved', date: '2026-02-05' },
  { id: 'PO-2024-111', projectNo: 'P-2024-003', projectName: 'India Port Rail & Ropeway Corporation', vendor: 'LogiSoft Solutions', amount: 8000000, status: 'Approved', date: '2026-02-28' },
  { id: 'PO-2024-112', projectNo: 'P-2024-003', projectName: 'India Port Rail & Ropeway Corporation', vendor: 'Standard Elevators', amount: 5000000, status: 'Approved', date: '2026-04-10' },

  // P-2024-004
  { id: 'PO-2024-113', projectNo: 'P-2024-004', projectName: 'National Automotive Test Tracks', vendor: 'Telemetry Dyno Corp', amount: 12000000, status: 'Approved', date: '2026-06-01' },

  // P-2024-005
  { id: 'PO-2024-114', projectNo: 'P-2024-005', projectName: 'Sri Padmavati Mahila Visvavidyalayam', vendor: 'Tirupati NetSolutions', amount: 8000000, status: 'Approved', date: '2026-02-12' },
  { id: 'PO-2024-115', projectNo: 'P-2024-005', projectName: 'Sri Padmavati Mahila Visvavidyalayam', vendor: 'ServerTech Systems', amount: 7000000, status: 'Approved', date: '2026-03-10' },

  // P-2024-006
  { id: 'PO-2024-116', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', vendor: 'NIC Services', amount: 30000000, status: 'Approved', date: '2025-10-15' },
  { id: 'PO-2024-117', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', vendor: 'Digital Village Builders', amount: 25000000, status: 'Approved', date: '2025-11-20' },
  { id: 'PO-2024-118', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', vendor: 'GateWay Pay', amount: 15000000, status: 'Approved', date: '2025-12-15' },
  { id: 'PO-2024-119', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', vendor: 'IndiAuth Sol', amount: 10000000, status: 'Approved', date: '2026-01-20' },
  { id: 'PO-2024-120', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', vendor: 'Bhartiya Cloud', amount: 10000000, status: 'Approved', date: '2026-02-18' },
  { id: 'PO-2024-121', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', vendor: 'Rural Soft Labs', amount: 5000000, status: 'Approved', date: '2026-03-24' }
];

export const mockTaxInvoices: TaxInvoice[] = [
  // Paid and issued tax invoices
  { id: 'TX-2024-001', projectNo: 'P-2024-001', projectName: 'Institute of Advanced Study in Science', customer: 'Department of Science & Technology', amount: 8000000, linkedInvoiceNo: 'INV-2024-001', date: '2026-03-16', status: 'Issued' },
  { id: 'TX-2024-002', projectNo: 'P-2024-001', projectName: 'Institute of Advanced Study in Science', customer: 'Department of Science & Technology', amount: 4000000, linkedInvoiceNo: 'INV-2024-002', date: '2026-04-21', status: 'Issued' },
  { id: 'TX-2024-003', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', customer: 'Ministry of Health & Family Welfare', amount: 40000000, linkedInvoiceNo: 'INV-2024-004', date: '2026-01-12', status: 'Issued' },
  { id: 'TX-2024-004', projectNo: 'P-2024-002', projectName: 'All India Institute of Sciences Bathinda', customer: 'Ministry of Health & Family Welfare', amount: 35000000, linkedInvoiceNo: 'INV-2024-005', date: '2026-04-16', status: 'Issued' },
  { id: 'TX-2024-005', projectNo: 'P-2024-003', projectName: 'India Port Rail & Ropeway Corporation', customer: 'Ministry of Ports, Shipping & Waterways', amount: 16000000, linkedInvoiceNo: 'INV-2024-006', date: '2026-03-02', status: 'Issued' },
  { id: 'TX-2024-006', projectNo: 'P-2024-005', projectName: 'Sri Padmavati Mahila Visvavidyalayam', customer: 'Government of Andhra Pradesh', amount: 4000000, linkedInvoiceNo: 'INV-2024-008', date: '2026-03-02', status: 'Issued' },
  { id: 'TX-2024-007', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', customer: 'Ministry of Electronics & IT', amount: 50000000, linkedInvoiceNo: 'INV-2024-010', date: '2026-01-30', status: 'Issued' },
  { id: 'TX-2024-008', projectNo: 'P-2024-006', projectName: 'CSC E-Governance Services India', customer: 'Ministry of Electronics & IT', amount: 45000000, linkedInvoiceNo: 'INV-2024-011', date: '2026-05-02', status: 'Issued' },

  // Pending tax invoices (for pending invoices)
  { id: 'TX-2024-009', projectNo: 'P-2024-001', projectName: 'Institute of Advanced Study in Science', customer: 'Department of Science & Technology', amount: 6000000, linkedInvoiceNo: 'INV-2024-003', date: '2026-06-21', status: 'Pending' },
  { id: 'TX-2024-010', projectNo: 'P-2024-005', projectName: 'Sri Padmavati Mahila Visvavidyalayam', customer: 'Government of Andhra Pradesh', amount: 4000000, linkedInvoiceNo: 'INV-2024-009', date: '2026-06-16', status: 'Pending' }
];

export const mockActivities: Activity[] = [
  {
    id: 'ACT-001',
    projectNo: 'P-2024-002',
    title: 'Final Settlement Cleared',
    actor: 'Ministry of Health & FW',
    timestamp: '2 hours ago',
    type: 'success',
    description: 'Payment of ₹3,50,00,000 processed for Invoice INV-2024-005.'
  },
  {
    id: 'ACT-002',
    projectNo: 'P-2024-003',
    title: 'Overdue Alert Triggered',
    actor: 'System Audit Node',
    timestamp: '4 hours ago',
    type: 'warning',
    description: 'Invoice INV-2024-007 (₹80,00,000) has exceeded the 30-day grace period.'
  },
  {
    id: 'ACT-003',
    projectNo: 'P-2024-001',
    title: 'New Purchase Order Linked',
    actor: 'Dr. Arindam Sen',
    timestamp: '1 day ago',
    type: 'info',
    description: 'PO-2024-103 (₹1,00,00,000) for Assam Electronics linked successfully.'
  },
  {
    id: 'ACT-004',
    projectNo: 'P-2024-005',
    title: 'Invoice Draft Created',
    actor: 'V. Lakshmi',
    timestamp: '2 days ago',
    type: 'info',
    description: 'Draft invoice INV-2024-009 initiated for server farm validation.'
  },
  {
    id: 'ACT-005',
    projectNo: 'P-2024-006',
    title: 'Tax Invoice TX-2024-008 Issued',
    actor: 'Amit Verma',
    timestamp: '3 days ago',
    type: 'success',
    description: 'Tax Invoice issued for ₹4,50,0,000 linked to payment clearance.'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'N-001',
    title: 'System Synchronized',
    description: 'All project databases have been synchronized with the Ministry treasury gateway.',
    timestamp: '10 mins ago',
    type: 'success',
    read: false
  },
  {
    id: 'N-002',
    title: 'Overdue Invoice Alert',
    description: 'Invoice INV-2024-007 for India Port Rail & Ropeway Corp is overdue by 12 days.',
    timestamp: '1 hour ago',
    type: 'warning',
    read: false
  },
  {
    id: 'N-003',
    title: 'PO Approval Pending',
    description: 'PO-2024-113 for National Automotive Test Tracks requires director approval.',
    timestamp: '5 hours ago',
    type: 'info',
    read: true
  },
  {
    id: 'N-004',
    title: 'Billing Milestone Reached',
    description: 'All India Institute of Sciences Bathinda has reached 100% billing settlement.',
    timestamp: '1 day ago',
    type: 'success',
    read: true
  }
];

export const mockUsers: User[] = [
  { id: 'U-001', name: 'John Doe', email: 'john.doe@npms.gov.in', role: 'Administrator', status: 'Active' },
  { id: 'U-002', name: 'Alex Sterling', email: 'alex.sterling@npms.gov.in', role: 'Finance Admin', status: 'Active' },
  { id: 'U-003', name: 'Dr. Arindam Sen', email: 'arindam.sen@dst.gov.in', role: 'Project Manager', status: 'Active' },
  { id: 'U-004', name: 'Rajesh Kumar', email: 'rajesh.k@mohfw.gov.in', role: 'Project Manager', status: 'Active' },
  { id: 'U-005', name: 'Capt. Sunil Deshpande', email: 's.deshpande@iprrc.gov.in', role: 'External Auditor', status: 'Active' },
  { id: 'U-006', name: 'Neha Sharma', email: 'neha.sharma@mhi.gov.in', role: 'Project Analyst', status: 'Inactive' }
];
