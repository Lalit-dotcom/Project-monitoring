import { mockInvoices, mockPurchaseOrders, mockTaxInvoices, mockActivities, mockNotifications, mockUsers } from '../data/mockData';
import type { Project, Invoice, PurchaseOrder, TaxInvoice, BillDeskRecord, Activity, Notification, User, DatabaseProject } from '../types';

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

const mapDbProjectToProject = (dbProj: DatabaseProject): Project & DatabaseProject => {
  return {
    ...dbProj,
    id: dbProj.projectCd,
    name: dbProj.prjNm,
    client: dbProj.customerName,
    department: dbProj.prjType || 'ZO',
    status: dbProj.paymentStatus,
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
    healthScore: 100,
    amountReceived: dbProj.amountReceived || 0,
    createdOn: dbProj.createdOn || ''
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

export interface ProjectFilters {
  search?: string;
  paymentStatus?: string;
  projectType?: string;
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
    const res = await fetchWithAuth(`${API_URL}/api/projects`);
    if (!res.ok) {
      throw new Error('Failed to fetch projects from server');
    }
    const json = await res.json();
    const projects = json.data.map(mapDbProjectToProject);
    return projects.find((p: any) => p.id === id);
  },

  getProjectTypes: async (): Promise<string[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/projects/types`);
    if (!res.ok) {
      throw new Error('Failed to fetch project types');
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
  getDashboardMetrics: async (): Promise<any> => {
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/summary`);
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard metrics');
    }
    return res.json();
  },

  getDashboardCharts: async (): Promise<any[]> => {
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/charts`);
    if (!res.ok) {
      throw new Error('Failed to fetch dashboard charts');
    }
    return res.json();
  },

  getDashboardProjectComparison: async (prjMgrId?: number | null): Promise<{ projectComparison: any[] }> => {
    const params = new URLSearchParams();
    if (prjMgrId != null) params.set('prjMgrId', String(prjMgrId));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithAuth(`${API_URL}/api/dashboard/project-comparison${query}`);
    if (!res.ok) {
      throw new Error('Failed to fetch project comparison');
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
  }
};
