import type { Project, Invoice, PurchaseOrder, TaxInvoice, BillDeskRecord, Activity, Notification, User, DatabaseProject } from '../types';
import { toast } from './toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let authToken: string | null = null;

let onLogoutRedirect: (() => void) | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const registerAuthCallbacks = (logoutCb: () => void, refreshCb: (token: string) => void) => {
  onLogoutRedirect = logoutCb;
  onTokenRefreshed = refreshCb;
};

let refreshPromise: Promise<string | null> | null = null;

const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  options.credentials = 'include';
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  options.headers = headers;

  let res = await fetch(url, options);

  // If unauthorized and we didn't just fail on the refresh attempt, try to refresh
  if (res.status === 401 && !url.includes('/api/auth/refresh')) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            authToken = data.accessToken;
            
            if (onTokenRefreshed) {
              onTokenRefreshed(data.accessToken);
            }
            return data.accessToken;
          } else {
            if (onLogoutRedirect) {
              onLogoutRedirect();
            }
            return null;
          }
        } catch (err) {
          if (onLogoutRedirect) {
            onLogoutRedirect();
          }
          return null;
        } finally {
          refreshPromise = null; // Clear the promise once done
        }
      })();
    }

    // Wait for the single active refresh operation (whether we initiated it or someone else did)
    const newAccessToken = await refreshPromise;
    
    if (newAccessToken) {
      // Retry the original request with the new token
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      options.headers = headers;
      res = await fetch(url, options);
    }
  } else if (res.status === 401) {
    if (onLogoutRedirect) {
      onLogoutRedirect();
    }
  }

  return res;
};


const mapDbProjectToProject = (dbProj: DatabaseProject): Project & DatabaseProject => {
  const prjBudgetNo = dbProj.prjBudgetNo ?? (dbProj as any).prj_budget_no ?? 0;
  const amountReceived = dbProj.amountReceived ?? (dbProj as any).amount_received ?? 0;
  const poAmount = dbProj.poAmount ?? (dbProj as any).po_amount ?? 0;
  const totalAmountPaid = dbProj.totalAmountPaid ?? (dbProj as any).total_amount_paid ?? (dbProj as any).amountPaid ?? 0;

  return {
    ...dbProj,
    id: dbProj.projectCd,
    name: dbProj.prjNm,
    client: dbProj.customerName,
    department: dbProj.prjType || 'ZO',
    status: dbProj.paymentStatus,
    poCount: dbProj.noOfPo || (dbProj as any).no_of_po || 0,
    poAmount: Number(poAmount),
    invoiceAmount: Number(dbProj.totalInvoiceAmount || (dbProj as any).total_invoice_amount || 0),
    amountPaid: Number(totalAmountPaid),
    totalAmountPaid: Number(totalAmountPaid),
    taxInvoiceAmount: Number(dbProj.totalTaxInvoiceAmount || (dbProj as any).total_tax_invoice_amount || 0),
    description: dbProj.prjNm,
    location: '',
    duration: '18 Months',
    manager: dbProj.prjMgrName || 'Unassigned',
    priority: Number(poAmount) > 1000000 ? 'High' : Number(poAmount) > 200000 ? 'Medium' : 'Low',
    healthScore: 100,
    prjBudgetNo: Number(prjBudgetNo),
    amountReceived: Number(amountReceived),
    createdOn: dbProj.createdOn || ''
  };
};

const initialDemoNotifications: Notification[] = [
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

// Helper to initialize local storage data if not present
const initStorage = () => {
  if (!localStorage.getItem('npms_notifications')) {
    localStorage.setItem('npms_notifications', JSON.stringify(initialDemoNotifications));
  }
};

initStorage();

// Typed helper functions to read and write to local storage
// (Unused helper functions removed)

export interface ProjectFilters {
  search?: string;
  paymentStatus?: string;
  projectType?: string;
  customerName?: string;
  sortBy?: string;
  sortOrder?: string;
  amountField?: string;
  minAmount?: string;
  maxAmount?: string;
  dateFrom?: string;
  dateTo?: string;
  noPoYet?: boolean;
  taxInvoiceOutstanding?: boolean;
  riskVendorOverpaid?: boolean;
  riskBillingAhead?: boolean;
  riskStalled?: boolean;
  page?: number;
  pageSize?: number;
  prjMgrId?: string;
}

export interface POFilters {
  search?: string;
  approvalStatus?: string;
  vendorId?: string;
  projectNo?: string;
  minTotal?: string;
  maxTotal?: string;
  poDateFrom?: string;
  poDateTo?: string;
  validity?: string;
  sortBy?: string;
  sortOrder?: string;
  expiringInMonths?: string;
  riskExpiringLowCollection?: boolean;
  riskExpiredUncollected?: boolean;
  riskStalled?: boolean;
}

export interface InvoiceFilters {
  search?: string;
  invoiceType?: string;
  hasObjection?: boolean;
  unpaidOnly?: boolean;
  prjMgrId?: string;
  vendorId?: string;
  projectNo?: string;
  minAmount?: string;
  maxAmount?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  riskOverdueUnpaid?: boolean;
  riskDisputedUnpaid?: boolean;
}

export interface BillDeskFilters {
  search?: string;
  status?: string;
  invoiceStatus?: string;
  billMonth?: string;
  hasObjectionRemarks?: boolean;
  projectNo?: string;
  minAmount?: string;
  maxAmount?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  receivedDateFrom?: string;
  receivedDateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface TaxInvoiceFilters {
  search?: string;
  billStatus?: string;
  state?: string;
  billType?: string;
  missingIrn?: boolean;
  projectNo?: string;
  minAmount?: string;
  maxAmount?: string;
  billDateFrom?: string;
  billDateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  riskMissingIrn?: boolean;
}

// API calls returning promises to simulate async REST operations
export const api = {
  // PROJECTS
  getProjects: async (filters?: ProjectFilters): Promise<(Project & DatabaseProject)[]> => {
    const url = new URL(`${API_URL}/api/projects`);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetchWithAuth(url.toString());
    if (!res.ok) {
      throw new Error('Failed to fetch projects from server');
    }
    const json = await res.json();
    const projectsArray = json.data.map(mapDbProjectToProject);
    // Attach the total count and status group counts as custom properties on the array
    (projectsArray as any).totalCount = json.count;
    (projectsArray as any).statusCounts = json.statusCounts;
    return projectsArray;
  },
  
  getProjectById: async (id: string): Promise<(Project & DatabaseProject) | undefined> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/${encodeURIComponent(id)}`);
    if (res.status === 404) {
      return undefined;
    }
    if (!res.ok) {
      throw new Error('Failed to fetch project from server');
    }
    const json = await res.json();
    return mapDbProjectToProject(json);
  },


  getProjectTypes: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/types`);
    if (!res.ok) {
      throw new Error('Failed to fetch project types');
    }
    return res.json();
  },

  getCustomerNames: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/customers`);
    if (!res.ok) {
      throw new Error('Failed to fetch customer names');
    }
    return res.json();
  },

  getProjectManagers: async (): Promise<{ prjMgrId: number; prjMgrName: string }[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/managers`);
    if (!res.ok) {
      throw new Error('Failed to fetch project managers');
    }
    return res.json();
  },

  getPOStatuses: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/purchase-orders/statuses`);
    if (!res.ok) {
      throw new Error('Failed to fetch purchase order statuses');
    }
    return res.json();
  },

  getInvoiceTypes: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/invoices/types`);
    if (!res.ok) {
      throw new Error('Failed to fetch invoice types');
    }
    return res.json();
  },

  getBillDeskStatuses: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/bill-desk/statuses`);
    if (!res.ok) {
      throw new Error('Failed to fetch bill desk statuses');
    }
    return res.json();
  },

  getTaxInvoiceBillTypes: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/tax-invoices/bill-types`);
    if (!res.ok) {
      throw new Error('Failed to fetch tax invoice bill types');
    }
    return res.json();
  },

  getTaxInvoiceStates: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/tax-invoices/states`);
    if (!res.ok) {
      throw new Error('Failed to fetch tax invoice states');
    }
    return res.json();
  },

  getProjectsSummary: async (): Promise<{
    totalProjects: number;
    totalManagers: number;
    projectsAtRisk: number;
    dueThisWeek: number;
    incompleteProjects: number;
    riskBreakdown: {
      vendorOverpaid: number;
      billingAhead: number;
      stalled: number;
    };
  }> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/summary`);
    if (!res.ok) {
      throw new Error('Failed to fetch projects summary');
    }
    return res.json();
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

  createProjectChain: async (data: {
    project: any;
    purchaseOrder?: any;
    invoice?: any;
    billDesk?: any;
    taxInvoice?: any;
  }): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/create-with-chain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw {
        status: res.status,
        message: errData.error || 'Failed to create project',
        errors: errData.errors
      };
    }
    return res.json();
  },

  checkProjectCdUnique: async (projectCd: string): Promise<boolean> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/check-unique/${encodeURIComponent(projectCd)}`);
    if (!res.ok) {
      throw new Error('Failed to verify project code uniqueness');
    }
    const data = await res.json();
    return data.unique;
  },

  // INVOICES
  getInvoices: async (filters?: InvoiceFilters): Promise<Invoice[]> => {
    const url = new URL(`${API_URL}/api/invoices`);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetchWithAuth(url.toString());
    if (!res.ok) {
      throw new Error('Failed to fetch invoices');
    }
    const json = await res.json();
    return json.data;
  },

  getInvoiceDistinctValues: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/invoices?distinctValues=true`);
    if (!res.ok) {
      throw new Error('Failed to fetch distinct values for invoices');
    }
    return res.json();
  },

  createInvoice: async (_invoice: any): Promise<any> => {
    return {} as any;
  },

  checkInvoicesExist: async (projectNo: string): Promise<boolean> => {
    const res = await fetchWithAuth(`${API_URL}/api/invoices/exists?projectNo=${encodeURIComponent(projectNo)}`);
    if (!res.ok) {
      throw new Error('Failed to check invoices existence');
    }
    const json = await res.json();
    return json.exists;
  },

  // PURCHASE ORDERS
  getPurchaseOrders: async (filters?: POFilters): Promise<PurchaseOrder[]> => {
    const url = new URL(`${API_URL}/api/purchase-orders`);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetchWithAuth(url.toString());
    if (!res.ok) {
      throw new Error('Failed to fetch purchase orders');
    }
    const json = await res.json();
    const data = json.data;
    (data as any).activeCount = json.activeCount || 0;
    (data as any).expiredCount = json.expiredCount || 0;
    return data;
  },

  getPurchaseOrderDistinctValues: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/purchase-orders?distinctValues=true`);
    if (!res.ok) {
      throw new Error('Failed to fetch distinct values for purchase orders');
    }
    return res.json();
  },

  // BILL DESK
  getBillDesk: async (filters?: BillDeskFilters): Promise<BillDeskRecord[]> => {
    const url = new URL(`${API_URL}/api/bill-desk`);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetchWithAuth(url.toString());
    if (!res.ok) {
      throw new Error('Failed to fetch bill desk records');
    }
    const json = await res.json();
    return json.data;
  },

  getBillDeskDistinctValues: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/bill-desk?distinctValues=true`);
    if (!res.ok) {
      throw new Error('Failed to fetch distinct values for bill desk');
    }
    return res.json();
  },

  // TAX INVOICES
  getTaxInvoices: async (filters?: TaxInvoiceFilters): Promise<TaxInvoice[]> => {
    const url = new URL(`${API_URL}/api/tax-invoices`);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetchWithAuth(url.toString());
    if (!res.ok) {
      throw new Error('Failed to fetch tax invoices');
    }
    const json = await res.json();
    return json.data;
  },

  getTaxInvoiceDistinctValues: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/tax-invoices?distinctValues=true`);
    if (!res.ok) {
      throw new Error('Failed to fetch distinct values for tax invoices');
    }
    return res.json();
  },

  // ACTIVITIES
  getActivities: async (): Promise<Activity[]> => {
    return [];
  },

  // NOTIFICATIONS
  getNotifications: async (params?: {
    unreadOnly?: boolean;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Notification[]; count: number; unreadCount: number }> => {
    const qParams = new URLSearchParams();
    if (params) {
      if (params.unreadOnly !== undefined) qParams.set('unreadOnly', String(params.unreadOnly));
      if (params.category) qParams.set('category', params.category);
      if (params.page !== undefined) qParams.set('page', String(params.page));
      if (params.pageSize !== undefined) qParams.set('pageSize', String(params.pageSize));
    }
    const res = await fetchWithAuth(`${API_URL}/api/notifications?${qParams.toString()}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to fetch notifications feed');
    }
    return res.json();
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${API_URL}/api/notifications/${id}/read`, {
      method: 'POST'
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to mark notification as read');
    }
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    const res = await fetchWithAuth(`${API_URL}/api/notifications/read-all`, {
      method: 'POST'
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to mark all notifications as read');
    }
  },

  // USERS
  getUsers: async (): Promise<User[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/users`);
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    return res.json();
  },

  // DASHBOARD METRICS
  getDashboardMetrics: async (prjMgrId?: number | null): Promise<any> => {
    const params = new URLSearchParams();
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/summary?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard metrics');
    }
    return res.json();
  },

  getDashboardCharts: async (prjMgrId?: number | null): Promise<any[]> => {
    const params = new URLSearchParams();
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/charts?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard charts');
    }
    return res.json();
  },

  getDashboardProblemProjects: async (prjMgrId?: number | null): Promise<any[]> => {
    const params = new URLSearchParams();
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/problem-projects?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch problem projects');
    }
    return res.json();
  },

  getDashboardProjectComparison: async (metric: string, prjMgrId?: number | null): Promise<{ projectComparison: any[] }> => {
    const params = new URLSearchParams({ metric });
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/project-comparison?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch project comparison');
    }
    return res.json();
  },

  getDashboardProjectRisks: async (type: string, prjMgrId?: number | null): Promise<{ chartType: 'comparison' | 'single'; series: any[] }> => {
    const params = new URLSearchParams({ type });
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/risks/projects?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch project risks');
    return res.json();
  },

  getDashboardPoRisks: async (type: string, prjMgrId?: number | null): Promise<{ chartType: 'comparison' | 'single'; series: any[] }> => {
    const params = new URLSearchParams({ type });
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/risks/purchase-orders?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch purchase order risks');
    return res.json();
  },

  getDashboardInvoiceRisks: async (type: string, prjMgrId?: number | null): Promise<{ chartType: 'comparison' | 'single'; series: any[] }> => {
    const params = new URLSearchParams({ type });
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/risks/invoices?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch invoice risks');
    return res.json();
  },

  getDashboardOverdueInvoices: async (prjMgrId?: number | null): Promise<any[]> => {
    const params = new URLSearchParams();
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/overdue-invoices?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard overdue invoices');
    }
    return res.json();
  },

  getDashboardExpiredPos: async (prjMgrId?: number | null): Promise<any[]> => {
    const params = new URLSearchParams();
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/expired-pos?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard expired POs');
    }
    return res.json();
  },

  // MANAGERS (SUPERADMIN ONLY)
  getManagers: async (): Promise<any[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/managers`);
    if (!res.ok) {
      throw new Error('Failed to fetch managers');
    }
    return res.json();
  },

  createManager: async (managerData: {
    fullName: string;
    username: string;
    password: string;
    email: string;
    mobileNumber: string;
  }): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/managers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(managerData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create manager');
    }
    return res.json();
  },

  resetManagerPassword: async (prjMgrId: number, password?: string): Promise<{ success: boolean; message: string; password: string }> => {
    const res = await fetchWithAuth(`${API_URL}/api/managers/${prjMgrId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset manager password');
    }
    return res.json();
  },

  changeRequiredPassword: async (tempToken: string, newPassword: string): Promise<any> => {
    const res = await fetch(`${API_URL}/api/auth/change-required-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, newPassword }),
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update password');
    }
    return res.json();
  },

  // SESSIONS
  getSessions: async (): Promise<any[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/sessions`);
    if (!res.ok) {
      throw new Error('Failed to fetch active sessions');
    }
    return res.json();
  },

  revokeSession: async (id: number): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/sessions/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke session');
    }
    return res.json();
  },

  revokeOtherSessions: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/sessions/others`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke other sessions');
    }
    return res.json();
  },

  // 2FA TOTP (SUPERADMIN ONLY)
  setup2FA: async (): Promise<{ secret: string; qrCodeDataUrl: string }> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/2fa/setup`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to initialize 2FA setup');
    }
    return res.json();
  },

  confirm2FA: async (code: string): Promise<{ backupCodes: string[] }> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/2fa/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to confirm 2FA setup');
    }
    return res.json();
  },

  disable2FA: async (password: string): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to disable 2FA');
    }
    return res.json();
  },

  get2FAStatus: async (): Promise<{ enabled: boolean }> => {
    const res = await fetchWithAuth(`${API_URL}/api/auth/2fa/status`);
    if (!res.ok) {
      throw new Error('Failed to fetch 2FA status');
    }
    return res.json();
  },

  exportProjectFile: async (code: string, format: 'excel' | 'pdf'): Promise<void> => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/exports/project/${code}/${format}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `${code}-export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Export failed', err.message || 'An error occurred during file export.');
      throw err;
    }
  },

  exportProjectsFile: async (filters: ProjectFilters, format: 'excel' | 'pdf'): Promise<void> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            queryParams.append(key, String(val));
          }
        });
      }
      const res = await fetchWithAuth(`${API_URL}/api/exports/projects/${format}?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `projects-export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Export failed', err.message || 'An error occurred during file export.');
      throw err;
    }
  },

  exportListFile: async (
    resource: 'purchase-orders' | 'invoices' | 'bill-desk' | 'tax-invoices',
    filters: Record<string, string | number | boolean | undefined | null>,
    format: 'excel' | 'pdf'
  ): Promise<void> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            queryParams.append(key, String(val));
          }
        });
      }
      const res = await fetchWithAuth(`${API_URL}/api/exports/${resource}/${format}?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `${resource}-export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Export failed', err.message || 'An error occurred during file export.');
      throw err;
    }
  },

  exportDashboardPdf: async (prjMgrId?: string): Promise<void> => {
    try {
      const queryParams = new URLSearchParams();
      if (prjMgrId && prjMgrId !== 'All') {
        queryParams.append('prjMgrId', prjMgrId);
      }
      const res = await fetchWithAuth(`${API_URL}/api/exports/dashboard/pdf?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dashboard-executive-summary.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Export failed', err.message || 'An error occurred during PDF export.');
      throw err;
    }
  },

  getAuditLogs: async (params: {
    category?: string;
    status?: string;
    username?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; count: number; summary?: any }> => {
    const qParams = new URLSearchParams();
    if (params.category) qParams.set('category', params.category);
    if (params.status) qParams.set('status', params.status);
    if (params.username) qParams.set('username', params.username);
    if (params.dateFrom) qParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) qParams.set('dateTo', params.dateTo);
    if (params.search) qParams.set('search', params.search);
    if (params.page !== undefined) qParams.set('page', String(params.page));
    if (params.pageSize !== undefined) qParams.set('pageSize', String(params.pageSize));

    const res = await fetchWithAuth(`${API_URL}/api/audit-logs?${qParams.toString()}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to fetch audit logs');
    }
    return res.json();
  },

  /**
   * Send a project notice email (vendor bills or client funds) via the backend.
   * The server re-fetches the project data from DB before building the email.
   */
  getReportFilters: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/reports/filters`);
    if (!res.ok) {
      throw new Error('Failed to fetch report filter values');
    }
    return res.json();
  },

  getReportData: async (type: string, filters?: any): Promise<any> => {
    const url = new URL(`${API_URL}/api/reports/${type}`);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetchWithAuth(url.toString());
    if (!res.ok) {
      throw new Error(`Failed to fetch report data for ${type}`);
    }
    return res.json();
  },

  exportReportFile: async (type: string, format: 'csv' | 'excel' | 'pdf', filters?: any): Promise<void> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            queryParams.append(key, String(val));
          }
        });
      }
      const res = await fetchWithAuth(`${API_URL}/api/exports/reports/${type}/${format}?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const ext = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
      let filename = `report-${type}.${ext}`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Export failed', err.message || 'An error occurred during file export.');
      throw err;
    }
  },

  sendNotice: async (
    projectId: string,
    noticeType: 'vendor_pending_bills' | 'client_pending_funds',
    toEmail: string
  ): Promise<void> => {
    const res = await fetchWithAuth(`${API_URL}/api/notices/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, noticeType, toEmail }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Server returned ${res.status}`);
    }
  }
};

