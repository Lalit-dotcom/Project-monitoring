import type { Project, Invoice, PurchaseOrder, TaxInvoice, Activity, Notification, User } from '../types';

export const mockProjects: Project[] = [];


export const mockInvoices: Invoice[] = [];

export const mockPurchaseOrders: PurchaseOrder[] = [];

export const mockTaxInvoices: TaxInvoice[] = [];

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
