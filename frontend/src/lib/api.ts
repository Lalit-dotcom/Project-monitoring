import { mockInvoices, mockPurchaseOrders, mockTaxInvoices, mockActivities, mockNotifications, mockUsers } from '../data/mockData';
import type { Project, Invoice, PurchaseOrder, TaxInvoice, Activity, Notification, User, DatabaseProject } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Mapping helper to map database format (camelCase) to UI expected format
const getStateName = (cd: string): string => {
  const code = cd.slice(-2).toUpperCase();
  const states: Record<string, string> = {
    ND: 'New Delhi',
    GJ: 'Gujarat',
    TS: 'Telangana',
    UP: 'Uttar Pradesh',
    MH: 'Maharashtra',
    PB: 'Punjab',
    WB: 'West Bengal',
    AP: 'Andhra Pradesh',
    HR: 'Haryana',
    MP: 'Madhya Pradesh',
    DL: 'Delhi',
  };
  return states[code] || 'Regional Office';
};

const mapDbProjectToProject = (dbProj: DatabaseProject): Project => {
  let status: 'Fully Paid' | 'Partially Paid' | 'No Invoices Yet' = 'No Invoices Yet';
  const paid = dbProj.totalAmountPaid || 0;
  const po = dbProj.poAmount || 0;
  const inv = dbProj.totalInvoiceAmount || 0;

  if (inv === 0 && paid === 0) {
    status = 'No Invoices Yet';
  } else if (paid >= po && po > 0) {
    status = 'Fully Paid';
  } else {
    status = 'Partially Paid';
  }

  return {
    id: dbProj.projectCd,
    name: dbProj.prjNm,
    client: dbProj.customerName,
    department: dbProj.prjType || 'ZO',
    status,
    poCount: dbProj.noOfPo || 0,
    poAmount: dbProj.poAmount || 0,
    invoiceAmount: dbProj.totalInvoiceAmount || 0,
    amountPaid: dbProj.totalAmountPaid || 0,
    taxInvoiceAmount: dbProj.totalTaxInvoiceAmount || 0,
    description: dbProj.prjNm,
    location: getStateName(dbProj.projectCd),
    duration: '18 Months',
    manager: dbProj.prjMgrId ? `PM-${dbProj.prjMgrId}` : 'Regional Manager',
    priority: (dbProj.poAmount || 0) > 1000000 ? 'High' : (dbProj.poAmount || 0) > 200000 ? 'Medium' : 'Low',
    healthScore: 100
  };
};

// Helper to initialize local storage data if not present
const initStorage = () => {
  if (!localStorage.getItem('npms_invoices')) {
    localStorage.setItem('npms_invoices', JSON.stringify(mockInvoices));
  }
  if (!localStorage.getItem('npms_purchase_orders')) {
    localStorage.setItem('npms_purchase_orders', JSON.stringify(mockPurchaseOrders));
  }
  if (!localStorage.getItem('npms_tax_invoices')) {
    localStorage.setItem('npms_tax_invoices', JSON.stringify(mockTaxInvoices));
  }
  if (!localStorage.getItem('npms_activities')) {
    localStorage.setItem('npms_activities', JSON.stringify(mockActivities));
  }
  if (!localStorage.getItem('npms_notifications')) {
    localStorage.setItem('npms_notifications', JSON.stringify(mockNotifications));
  }
  if (!localStorage.getItem('npms_users')) {
    localStorage.setItem('npms_users', JSON.stringify(mockUsers));
  }
};

initStorage();

// Typed helper functions to read and write to local storage
const getStorageItem = <T>(key: string): T[] => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : [];
};

const setStorageItem = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// API calls returning promises to simulate async REST operations
export const api = {
  // PROJECTS
  getProjects: async (): Promise<Project[]> => {
    const res = await fetch(`${API_URL}/api/projects`);
    if (!res.ok) {
      throw new Error('Failed to fetch projects from server');
    }
    const json = await res.json();
    return json.data.map(mapDbProjectToProject);
  },
  
  getProjectById: async (id: string): Promise<Project | undefined> => {
    const res = await fetch(`${API_URL}/api/projects`);
    if (!res.ok) {
      throw new Error('Failed to fetch projects from server');
    }
    const json = await res.json();
    const projects: Project[] = json.data.map(mapDbProjectToProject);
    return projects.find(p => p.id === id);
  },

  createProject: async (project: Omit<Project, 'poCount' | 'poAmount' | 'invoiceAmount' | 'amountPaid' | 'taxInvoiceAmount' | 'healthScore'>): Promise<Project> => {
    const newProject: Project = {
      ...project,
      poCount: 0,
      poAmount: 0,
      invoiceAmount: 0,
      amountPaid: 0,
      taxInvoiceAmount: 0,
      healthScore: 100
    };
    return newProject;
  },

  // INVOICES
  getInvoices: async (): Promise<Invoice[]> => {
    return getStorageItem<Invoice>('npms_invoices');
  },

  createInvoice: async (invoice: Omit<Invoice, 'id' | 'projectName' | 'customer'>): Promise<Invoice> => {
    const invoices = getStorageItem<Invoice>('npms_invoices');
    const projects = getStorageItem<Project>('npms_projects');
    const project = projects.find(p => p.id === invoice.projectNo);
    
    const newInvoice: Invoice = {
      ...invoice,
      id: `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`,
      projectName: project ? project.name : 'Unknown Project',
      customer: project ? project.client : 'Unknown Customer'
    };

    invoices.unshift(newInvoice);
    setStorageItem('npms_invoices', invoices);

    // Update project metrics accordingly
    if (project) {
      project.invoiceAmount += invoice.amount;
      if (invoice.status === 'Paid') {
        project.amountPaid += invoice.amount;
      }
      // Re-evaluate project status based on bills
      const projInvs = invoices.filter(i => i.projectNo === project.id);
      const paidAmt = projInvs.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
      const totalInv = projInvs.reduce((sum, i) => sum + i.amount, 0);
      
      if (totalInv === 0) {
        project.status = 'No Invoices Yet';
      } else if (paidAmt >= project.poAmount) {
        project.status = 'Fully Paid';
      } else {
        project.status = 'Partially Paid';
      }
      setStorageItem('npms_projects', projects);
    }

    // Add activity log
    const activities = getStorageItem<Activity>('npms_activities');
    activities.unshift({
      id: `ACT-${Date.now()}`,
      projectNo: invoice.projectNo,
      title: `Invoice ${newInvoice.id} Created`,
      actor: 'Finance Admin',
      timestamp: 'Just now',
      type: 'info',
      description: `New invoice of ₹${invoice.amount.toLocaleString('en-IN')} drafted for ${newInvoice.projectName}.`
    });
    setStorageItem('npms_activities', activities);

    return newInvoice;
  },

  // PURCHASE ORDERS
  getPurchaseOrders: async (): Promise<PurchaseOrder[]> => {
    return getStorageItem<PurchaseOrder>('npms_purchase_orders');
  },

  // TAX INVOICES
  getTaxInvoices: async (): Promise<TaxInvoice[]> => {
    return getStorageItem<TaxInvoice>('npms_tax_invoices');
  },

  // ACTIVITIES
  getActivities: async (): Promise<Activity[]> => {
    return getStorageItem<Activity>('npms_activities');
  },

  // NOTIFICATIONS
  getNotifications: async (): Promise<Notification[]> => {
    return getStorageItem<Notification>('npms_notifications');
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    const notifications = getStorageItem<Notification>('npms_notifications');
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      setStorageItem('npms_notifications', notifications);
    }
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    const notifications = getStorageItem<Notification>('npms_notifications');
    notifications.forEach(n => n.read = true);
    setStorageItem('npms_notifications', notifications);
  },

  // USERS
  getUsers: async (): Promise<User[]> => {
    return getStorageItem<User>('npms_users');
  },

  // DASHBOARD METRICS
  getDashboardMetrics: async () => {
    const projects = getStorageItem<Project>('npms_projects');
    const invoices = getStorageItem<Invoice>('npms_invoices');

    const totalPO = projects.reduce((sum, p) => sum + p.poAmount, 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.status !== 'Draft' ? i.amount : 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (i.status === 'Paid' ? i.amount : 0), 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + (i.status === 'Overdue' || i.status === 'Pending' ? i.amount : 0), 0);
    const totalReceived = totalPaid; // received and paid are equivalent in this context

    return {
      totalReceived,
      totalPO,
      totalInvoiced,
      totalPaid,
      totalOutstanding
    };
  }
};
