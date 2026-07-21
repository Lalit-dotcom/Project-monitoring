import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Wallet, 
  AlertTriangle,
  Download,
  Filter,
  Loader2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileCode,
  List
} from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toast } from '../lib/toast';

export const Reports: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();


  // Filters State
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    financialYear: 'All',
    prjType: 'All',
    customerName: 'All',
    vendorName: 'All',
    prjMgrId: 'All',
    paymentStatus: 'All',
    invoiceStatus: 'All',
    projectId: 'All'
  });

  // Filter Dropdown Options (loaded dynamically)
  const [filterChoices, setFilterChoices] = useState<{
    projectTypes: string[];
    customers: string[];
    vendors: string[];
    projectManagers: { id: number; name: string }[];
    paymentStatuses: string[];
    invoiceStatuses: string[];
    projects: { id: number; code: string; name: string }[];
    financialYears: string[];
  }>({
    projectTypes: [],
    customers: [],
    vendors: [],
    projectManagers: [],
    paymentStatuses: [],
    invoiceStatuses: [],
    projects: [],
    financialYears: []
  });

  const [loadingFilters, setLoadingFilters] = useState(true);

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<
    'project-summary' | 'financial-summary' | 'purchase-orders' | 'vendor-performance' | 
    'invoice-summary' | 'payment-status' | 'outstanding-analysis' | 'customer-wise-projects' | 
    'pm-wise-projects'
  >('project-summary');

  const [reportData, setReportData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Popovers Open/Close States
  const [showExportPopover, setShowExportPopover] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showReportListPopover, setShowReportListPopover] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  // Refs for popovers click-outside handling
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const reportListDropdownRef = useRef<HTMLDivElement>(null);
  const reportListButtonRef = useRef<HTMLButtonElement>(null);

  // Sorting State for Tables
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load dynamically derived filter options on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const choices = await api.getReportFilters();
        setFilterChoices(choices);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load report filter choices");
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilters();
  }, []);

  // Fetch report data for active tab when activeTab or filters change
  useEffect(() => {
    const fetchActiveReport = async () => {
      setLoadingData(true);
      try {
        const data = await api.getReportData(activeTab, filters);
        setReportData(data);
        setSortBy(null); // Reset sort when tab/data changes
      } catch (err) {
        console.error(err);
        toast.error(`Failed to load report data`);
      } finally {
        setLoadingData(false);
      }
    };
    fetchActiveReport();
  }, [activeTab, filters]);

  // Click outside and keydown handlers for all popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Export Popover Click Outside
      if (
        exportDropdownRef.current && 
        !exportDropdownRef.current.contains(target) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(target)
      ) {
        setShowExportPopover(false);
      }
      
      // Filter Popover Click Outside
      if (
        filterDropdownRef.current && 
        !filterDropdownRef.current.contains(target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(target)
      ) {
        setShowFilterPopover(false);
      }
      
      // Report List Popover Click Outside
      if (
        reportListDropdownRef.current && 
        !reportListDropdownRef.current.contains(target) &&
        reportListButtonRef.current &&
        !reportListButtonRef.current.contains(target)
      ) {
        setShowReportListPopover(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowExportPopover(false);
        setShowFilterPopover(false);
        setShowReportListPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.fromDate) count++;
    if (filters.toDate) count++;
    if (filters.financialYear && filters.financialYear !== 'All') count++;
    if (filters.prjType && filters.prjType !== 'All') count++;
    if (filters.customerName && filters.customerName !== 'All') count++;
    if (filters.vendorName && filters.vendorName !== 'All') count++;
    if (filters.prjMgrId && filters.prjMgrId !== 'All') count++;
    if (filters.paymentStatus && filters.paymentStatus !== 'All') count++;
    if (filters.invoiceStatus && filters.invoiceStatus !== 'All') count++;
    if (filters.projectId && filters.projectId !== 'All') count++;
    return count;
  };
  const activeFilterCount = getActiveFilterCount();

  // Handle financial year selections
  const handleFYChange = (fy: string) => {
    if (fy === 'All') {
      setFilters(prev => ({ ...prev, financialYear: 'All', fromDate: '', toDate: '' }));
    } else {
      const startYear = parseInt(fy.split('-')[0], 10);
      if (!isNaN(startYear)) {
        setFilters(prev => ({
          ...prev,
          financialYear: fy,
          fromDate: `${startYear}-04-01`,
          toDate: `${startYear + 1}-03-31`
        }));
      }
    }
  };

  // Handle custom date picker inputs
  const handleDateChange = (name: 'fromDate' | 'toDate', val: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: val,
      financialYear: 'All' // Reset FY dropdown to All since dates are custom
    }));
  };

  // Handle report exports
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setShowExportPopover(false);
    setIsExporting(true);
    try {
      await api.exportReportFile(activeTab, format, filters);
      toast.success(`Exported ${activeTab} successfully`);
    } catch (_) {
      // handled in api.ts
    } finally {
      setIsExporting(false);
    }
  };

  // Generate Utilization Certificate (UC) text file download
  const handleGenerateUC = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    try {
      const amountReceived = Math.round(Number(p.amount_received || 0));
      const totalUtilized = Math.round(
        p.total_amount_paid !== undefined && p.total_amount_paid !== null
          ? Number(p.total_amount_paid)
          : Number(p.amount_received || 0) - Number(p.outstanding || 0)
      );
      const pending = Math.round(amountReceived - totalUtilized);

      const now = new Date();
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

      const content = `=======================================================
        UTILIZATION CERTIFICATE (UC)
=======================================================

Project Code: ${p.project_cd || ''}
Organisation: ${p.customer_name || ''}
-------------------------------------------------------

Total Funds Received : INR ${amountReceived}
Total Funds Utilized : INR ${totalUtilized}
Pending Utilization  : INR ${pending}
-------------------------------------------------------

Certified that out of INR ${amountReceived} received from the User Department, a sum of INR ${totalUtilized} has been utilized for the purpose for which it was sanctioned.

Generated on: ${dateStr}
NICSI Accounts Division
=======================================================`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UC_${p.project_cd}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to generate UC:', err);
      toast.error('Failed to generate Utilization Certificate');
    }
  };

  // Sorting helper for tables in memory
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortedRows = (rows: any[]) => {
    if (!Array.isArray(rows)) return [];
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // Handle null/undefined values
      if (valA == null) valA = '';
      if (valB == null) valB = '';

      // Numeric comparison if both values can be numbers
      if (!isNaN(Number(valA)) && !isNaN(Number(valB)) && valA !== '' && valB !== '') {
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      // Standard string comparison
      return sortOrder === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  };

  // Formatting INR
  const formatINR = (val: number | null | undefined, abbreviate = true): React.ReactNode => {
    let text = '₹0.00';
    if (val != null) {
      if (abbreviate) {
        if (val >= 10000000) {
          text = `₹${(val / 10000000).toFixed(2)} Cr`;
        } else if (val >= 100000) {
          text = `₹${(val / 100000).toFixed(2)} L`;
        } else {
          text = `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      } else {
        text = `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    return <span className="dont-translate bhashini-skip-translation">{text}</span>;
  };

  // Format Dates nicely
  const formatDateStr = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (_) {
      return String(dateStr);
    }
  };

  // Financial summary computation variables (only calculated when activeTab is financial-summary)
  let lifecycleData: any[] = [];
  let agingData: any[] = [];
  let totalOutstanding = 0;
  let topChannels: any[] = [];
  let maxPoAmount = 1;
  let avgCollectionTime = 24;
  let unbilledRevenue = 0;
  let disputedInvoicesCount = 0;

  if (activeTab === 'financial-summary' && reportData && !loadingData) {
    const { projects, invoices, purchaseOrders } = reportData;
    
    // Lifecycle line graph
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: { [key: string]: { PO: number; Received: number; Paid: number; sortKey: number } } = {};
    
    (purchaseOrders || []).forEach((po: any) => {
      if (!po.poDate) return;
      const d = new Date(po.poDate);
      if (isNaN(d.getTime())) return;
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      if (!monthlyMap[key]) {
        monthlyMap[key] = { PO: 0, Received: 0, Paid: 0, sortKey };
      }
      monthlyMap[key].PO += (po.total || 0);
    });

    (invoices || []).forEach((inv: any) => {
      if (!inv.invoiceDate) return;
      const d = new Date(inv.invoiceDate);
      if (isNaN(d.getTime())) return;
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      if (!monthlyMap[key]) {
        monthlyMap[key] = { PO: 0, Received: 0, Paid: 0, sortKey };
      }
      monthlyMap[key].Received += (inv.invoiceAmount || 0);
      monthlyMap[key].Paid += (inv.amountPaid || 0);
    });

    lifecycleData = Object.entries(monthlyMap)
      .map(([name, vals]) => ({
        name,
        PO: parseFloat((vals.PO / 10000000).toFixed(2)),          // to Cr
        Received: parseFloat((vals.Received / 10000000).toFixed(2)), // to Cr
        Paid: parseFloat((vals.Paid / 10000000).toFixed(2)),          // to Cr
        sortKey: vals.sortKey
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    if (lifecycleData.length === 0) {
      lifecycleData = [{ name: 'No Data', PO: 0, Received: 0, Paid: 0 }];
    } else {
      lifecycleData = lifecycleData.slice(-6);
    }

    // Aging donut chart
    let current = 0;
    let d30_60 = 0;
    let d60_90 = 0;
    let d90_plus = 0;
    const today = new Date();
    
    (invoices || []).forEach((inv: any) => {
      const unpaid = inv.unpaid || 0;
      if (unpaid <= 0) return;
      
      if (!inv.invoiceDate) {
        current += unpaid;
        return;
      }
      const invDate = new Date(inv.invoiceDate);
      const diffTime = Math.abs(today.getTime() - invDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) {
        current += unpaid;
      } else if (diffDays <= 60) {
        d30_60 += unpaid;
      } else if (diffDays <= 90) {
        d60_90 += unpaid;
      } else {
        d90_plus += unpaid;
      }
    });

    totalOutstanding = current + d30_60 + d60_90 + d90_plus;
    const displayTotal = totalOutstanding || 1;
    const pCurrent = Math.round((current / displayTotal) * 100);
    const p30_60 = Math.round((d30_60 / displayTotal) * 100);
    const p60_90 = Math.round((d60_90 / displayTotal) * 100);
    const p90_plus = Math.max(0, 100 - pCurrent - p30_60 - p60_90);

    agingData = [
      { name: `Current (${pCurrent}%)`, value: current, color: theme === 'dark' ? '#6bd8cb' : '#00685f' },
      { name: `30-60d (${p30_60}%)`, value: d30_60, color: theme === 'dark' ? '#005049' : '#008378' },
      { name: `60-90d (${p60_90}%)`, value: d60_90, color: theme === 'dark' ? '#c0c7d6' : '#555c6a' },
      { name: `90+d (${p90_plus}%)`, value: d90_plus, color: theme === 'dark' ? '#ffb4ab' : '#ba1a1a' }
    ];

    // Top channels
    topChannels = [...(projects || [])]
      .sort((a, b) => (b.po_amount || 0) - (a.po_amount || 0))
      .slice(0, 4);
    maxPoAmount = topChannels[0]?.po_amount || 1;

    // Quick Insights
    const paidInvoices = (invoices || []).filter((i: any) => i.invoiceDate && i.glDate && (i.amountPaid || 0) > 0);
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum: number, i: any) => {
        const start = new Date(i.invoiceDate!);
        const end = new Date(i.glDate!);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, diff);
      }, 0);
      avgCollectionTime = Math.round(totalDays / paidInvoices.length);
    }

    const totalBudget = (projects || []).reduce((sum: number, p: any) => sum + Number(p.prjBudgetNo || 0), 0);
    const totalInvoiced = (projects || []).reduce((sum: number, p: any) => sum + Number(p.totalInvoiceAmount || p.invoiceAmount || 0), 0);
    unbilledRevenue = Math.max(0, totalBudget - totalInvoiced);

    disputedInvoicesCount = (invoices || []).filter((i: any) => i.objection && i.objection !== '' && (i.unpaid || 0) > 0).length;
  }

  const reportsList = [
    { id: 'project-summary', name: 'Project Summary' },
    { id: 'financial-summary', name: 'Financial Summary' },
    { id: 'purchase-orders', name: 'Purchase Orders' },
    { id: 'vendor-performance', name: 'Vendor Performance' },
    { id: 'invoice-summary', name: 'Invoice Summary' },
    { id: 'payment-status', name: 'Payment Status' },
    { id: 'outstanding-analysis', name: 'Outstanding Analysis' },
    { id: 'customer-wise-projects', name: 'Customer-wise Projects' },
    { id: 'pm-wise-projects', name: 'PM-wise Projects' }
  ] as const;

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header, Report list button, Filters toggle button and Exports popover */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-stack-lg border-b border-outline-variant pb-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Reports' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Reports Dashboard</h2>
          <p className="font-sans text-sm text-secondary">Dynamically audit contracts, vendors, collections, and financial summaries.</p>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* 1. REPORT TYPE SELECTED VIA A "LIST" BUTTON (UI Change 2) */}
          <div className="relative font-sans text-xs">
            <button
              ref={reportListButtonRef}
              onClick={() => { setShowReportListPopover(!showReportListPopover); setShowFilterPopover(false); setShowExportPopover(false); }}
              className="h-10 px-4 py-2 border border-outline-variant hover:border-outline text-on-surface hover:bg-surface-container-low rounded-full font-bold flex items-center justify-between gap-2 transition-all bg-white shadow-sm min-w-[200px]"
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-secondary shrink-0" />
                <span>{reportsList.find(r => r.id === activeTab)?.name}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-secondary shrink-0" />
            </button>
            
            {showReportListPopover && (
              <div 
                ref={reportListDropdownRef}
                className="absolute right-0 mt-2 w-64 bg-surface border border-outline-variant rounded-md shadow-lg z-50 py-1"
              >
                {reportsList.map(rep => (
                  <button
                    key={rep.id}
                    onClick={() => {
                      setActiveTab(rep.id);
                      setShowReportListPopover(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-between ${
                      activeTab === rep.id ? 'text-primary bg-primary/5' : 'text-on-surface'
                    }`}
                  >
                    <span>{rep.name}</span>
                    {activeTab === rep.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. FILTERS BEHIND A BUTTON (UI Change 1) */}
          <div className="relative font-sans text-xs">
            <button
              ref={filterButtonRef}
              onClick={() => { setShowFilterPopover(!showFilterPopover); setShowReportListPopover(false); setShowExportPopover(false); }}
              className="h-10 px-4 py-2 border border-outline-variant hover:border-outline text-on-surface hover:bg-surface-container-low rounded-full font-bold flex items-center justify-center gap-2 transition-all bg-white shadow-sm"
            >
              <Filter className="w-4 h-4 text-secondary" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-on-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilterPopover && (
              <div
                ref={filterDropdownRef}
                className="absolute right-0 mt-2 w-[320px] sm:w-[480px] md:w-[640px] lg:w-[800px] bg-surface border border-outline-variant rounded-xl shadow-xl z-50 p-5 space-y-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    <h3 className="font-headline text-sm font-bold text-on-surface">Dynamic Query Filters</h3>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => setFilters({
                        fromDate: '',
                        toDate: '',
                        financialYear: 'All',
                        prjType: 'All',
                        customerName: 'All',
                        vendorName: 'All',
                        prjMgrId: 'All',
                        paymentStatus: 'All',
                        invoiceStatus: 'All',
                        projectId: 'All'
                      })}
                      className="text-primary hover:underline text-xs font-bold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {loadingFilters ? (
                  <div className="text-secondary text-xs py-4 text-center font-medium">Loading filter options...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-sans text-xs">
                    {/* Financial Year */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Financial Year</label>
                      <select
                        value={filters.financialYear}
                        onChange={(e) => handleFYChange(e.target.value)}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Years</option>
                        {filterChoices.financialYears.map(fy => (
                          <option key={fy} value={fy}>FY {fy}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Range From */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">From Date</label>
                      <input
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => handleDateChange('fromDate', e.target.value)}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      />
                    </div>

                    {/* Date Range To */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">To Date</label>
                      <input
                        type="date"
                        value={filters.toDate}
                        onChange={(e) => handleDateChange('toDate', e.target.value)}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      />
                    </div>

                    {/* Project Type */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Project Type</label>
                      <select
                        value={filters.prjType}
                        onChange={(e) => setFilters(prev => ({ ...prev, prjType: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Types</option>
                        {filterChoices.projectTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Customer */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Customer</label>
                      <select
                        value={filters.customerName}
                        onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Customers</option>
                        {filterChoices.customers.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vendor */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Vendor</label>
                      <select
                        value={filters.vendorName}
                        onChange={(e) => setFilters(prev => ({ ...prev, vendorName: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Vendors</option>
                        {filterChoices.vendors.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Project Manager */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Project Manager</label>
                      <select
                        value={filters.prjMgrId}
                        onChange={(e) => setFilters(prev => ({ ...prev, prjMgrId: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Managers</option>
                        {filterChoices.projectManagers.map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Payment Status</label>
                      <select
                        value={filters.paymentStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Statuses</option>
                        {filterChoices.paymentStatuses.map(ps => (
                          <option key={ps} value={ps}>{ps}</option>
                        ))}
                      </select>
                    </div>

                    {/* Invoice Status */}
                    <div className="space-y-1">
                      <label className="font-bold text-secondary">Invoice Status</label>
                      <select
                        value={filters.invoiceStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, invoiceStatus: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Statuses</option>
                        {filterChoices.invoiceStatuses.map(is => (
                          <option key={is} value={is}>{is}</option>
                        ))}
                      </select>
                    </div>

                    {/* Project Code */}
                    <div className="space-y-1 col-span-1 sm:col-span-2 md:col-span-3">
                      <label className="font-bold text-secondary">Project Code</label>
                      <select
                        value={filters.projectId}
                        onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant px-3 py-2 rounded-md font-medium text-on-surface outline-none focus:border-primary"
                      >
                        <option value="All">All Projects</option>
                        {filterChoices.projects.map(p => (
                          <option key={p.id} value={p.code}>{p.code} - {p.name.slice(0, 50)}...</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. EXPORTS POPOVER */}
          <div className="relative font-sans text-xs">
            <button 
              ref={exportButtonRef}
              onClick={() => { setShowExportPopover(!showExportPopover); setShowFilterPopover(false); setShowReportListPopover(false); }}
              disabled={isExporting || loadingData}
              className="h-10 px-4 py-2 border border-outline-variant hover:border-outline text-on-surface hover:bg-surface-container-low rounded-full font-bold flex items-center justify-center gap-2 transition-all bg-white shadow-sm"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
              ) : (
                <Download className="w-4 h-4 text-secondary" />
              )}
              <span>Export</span>
              <ChevronDown className="w-4 h-4 text-secondary shrink-0" />
            </button>
            
            {showExportPopover && (
              <div 
                ref={exportDropdownRef}
                className="absolute right-0 mt-2 w-48 bg-surface border border-outline-variant rounded-md shadow-lg z-50 py-1"
              >
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-secondary" />
                  <span>Download as Excel</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4 text-secondary" />
                  <span>Download as CSV</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-secondary" />
                  <span>Download as PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DATA AREA (Lazy loaded per active tab) */}
      <div className="w-full min-h-[350px]">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="font-headline text-sm font-semibold text-secondary">Loading report data...</p>
          </div>
        ) : !reportData ? (
          <div className="text-center py-20 text-secondary font-headline">No report data loaded.</div>
        ) : (
          <div className="animate-fadeIn">
            {/* SCROLLABLE TABLES WITH STICKY HEADER (UI Change 3) */}

            {/* a. Project Summary */}
            {activeTab === 'project-summary' && (
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[1600px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {/* Pinned Leftmost Column: Project Code */}
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('project_cd')}>Project Code {sortBy === 'project_cd' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('prj_nm')}>Project Name {sortBy === 'prj_nm' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('customer_name')}>Customer {sortBy === 'customer_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('prj_mgr_name')}>PM {sortBy === 'prj_mgr_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('prj_budget_no')}>Budget {sortBy === 'prj_budget_no' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('po_amount')}>PO Value {sortBy === 'po_amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_invoice_amount')}>Invoiced {sortBy === 'total_invoice_amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('amount_received')}>Received {sortBy === 'amount_received' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('outstanding')}>Outstanding {sortBy === 'outstanding' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('payment_status')}>Status {sortBy === 'payment_status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((p: any, idx: number) => (
                        <tr 
                          key={idx} 
                          onClick={() => navigate(`/projects/${p.project_cd}?tab=overview`)}
                          className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                        >
                          {/* Pinned Leftmost Column: Project Code */}
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-primary group-hover:bg-surface-container-lowest transition-colors dont-translate bhashini-skip-translation" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{p.project_cd}</td>
                          <td className="px-6 py-4 font-semibold text-on-surface">{p.prj_nm}</td>
                          <td className="px-6 py-4 text-secondary">{p.customer_name}</td>
                          <td className="px-6 py-4 text-secondary font-medium">{p.prj_mgr_name || '-'}</td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">{formatINR(p.prj_budget_no)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(p.po_amount)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(p.total_invoice_amount)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(p.amount_received)}</td>
                          <td className="px-6 py-4 text-right font-bold text-on-surface">{formatINR(p.outstanding)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.payment_status === 'Fully Paid' 
                                ? 'bg-success/10 text-success' 
                                : p.payment_status === 'Partially Paid'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                            }`}>
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => handleGenerateUC(e, p)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-primary border border-primary/30 hover:border-primary hover:bg-primary/5 rounded-md transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Generate Utilization Certificate"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Generate UC</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* b. Financial Summary */}
            {activeTab === 'financial-summary' && (
              <div className="grid grid-cols-12 gap-gutter">
                {/* Revenue Lifecycle Chart Card */}
                <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-6 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <h3 className="font-headline text-lg font-bold text-on-surface">Revenue Lifecycle</h3>
                      <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Purchase Orders vs Received vs Paid (Weekly)</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 font-headline text-[10px] font-bold text-secondary uppercase">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                        <span>PO Value</span>
                      </div>
                      <div className="flex items-center gap-2 font-headline text-[10px] font-bold text-secondary uppercase">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                        <span>Received</span>
                      </div>
                      <div className="flex items-center gap-2 font-headline text-[10px] font-bold text-secondary uppercase">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                        <span>Paid</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-80 dont-translate bhashini-skip-translation">
                    {(() => {
                      const chartColors = theme === 'dark' ? {
                        axis: '#bcc9c6',
                        tooltipBg: '#272b2a',
                        tooltipText: '#e1e3e2',
                        linePO: '#005049',
                        lineReceived: '#6bd8cb',
                        linePaid: '#c0c7d6',
                      } : {
                        axis: '#6d7a77',
                        tooltipBg: '#191c1d',
                        tooltipText: '#f0f1f2',
                        linePO: '#008378',
                        lineReceived: '#00685f',
                        linePaid: '#555c6a',
                      };

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lifecycleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke={chartColors.axis} fontSize={11} fontFamily="Geist" />
                            <YAxis stroke={chartColors.axis} fontSize={11} fontFamily="Geist" tickFormatter={(v) => `₹${v}Cr`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: chartColors.tooltipBg, border: 'none', borderRadius: '8px', color: chartColors.tooltipText }}
                              labelStyle={{ fontFamily: 'Geist', fontWeight: 'bold' }}
                            />
                            <Line type="monotone" dataKey="PO" stroke={chartColors.linePO} strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="Received" stroke={chartColors.lineReceived} strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Paid" stroke={chartColors.linePaid} strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* Aging Analysis Donut Card */}
                <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-headline text-lg font-bold text-on-surface">Aging Analysis</h3>
                    <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Outstanding balance by due date</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center relative py-6 dont-translate bhashini-skip-translation">
                    <div className="relative w-44 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={agingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {agingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="font-headline text-xl font-bold text-on-surface">{formatINR(totalOutstanding)}</span>
                        <span className="font-headline text-[9px] text-secondary uppercase tracking-widest font-bold mt-0.5">Total Due</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 font-sans text-xs border-t border-outline-variant pt-4 mt-2">
                    {agingData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-secondary font-medium leading-none">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Revenue Channels */}
                <div className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="font-headline text-lg font-bold text-on-surface">Top Revenue Channels</h3>
                      <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Revenue distribution across key enterprise projects</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {topChannels.map((p) => {
                      const widthPct = Math.round(((p.po_amount || p.poAmount || 0) / maxPoAmount) * 100);
                      return (
                        <div key={p.id} className="space-y-1.5 font-sans">
                          <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-on-surface">{p.prj_nm || p.name}</span>
                            <span className="text-sm font-semibold text-secondary">{formatINR(p.po_amount || p.poAmount, false)}</span>
                          </div>
                          <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${widthPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Quick Insights Cards */}
                <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Avg. Collection Time</p>
                    <p className="font-headline text-2xl font-bold text-on-surface mt-1">{avgCollectionTime} Days</p>
                    <p className="font-sans text-[11px] text-primary font-medium mt-0.5">Derived from real historical payments</p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Unbilled Revenue</p>
                    <p className="font-headline text-2xl font-bold text-on-surface mt-1">{formatINR(unbilledRevenue)}</p>
                    <p className="font-sans text-[11px] text-secondary mt-0.5">Budget remaining to be invoiced</p>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-error/10 flex items-center justify-center text-error shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Disputed Invoices</p>
                    <p className="font-headline text-2xl font-bold text-error mt-1">{String(disputedInvoicesCount).padStart(2, '0')} Alerts</p>
                    <p className="font-sans text-[11px] text-error font-medium mt-0.5">Unpaid invoices with objection flags</p>
                  </div>
                </div>
              </div>
            )}

            {/* c. Purchase Orders */}
            {activeTab === 'purchase-orders' && (
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[1500px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {/* Pinned leftmost: PO Number */}
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('final_po_no')}>PO Number {sortBy === 'final_po_no' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('project_no')}>Project {sortBy === 'project_no' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('vendor_name')}>Vendor {sortBy === 'vendor_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('po_date')}>PO Date {sortBy === 'po_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('valid_from')}>Valid From {sortBy === 'valid_from' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('valid_to')}>Valid To {sortBy === 'valid_to' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total')}>Total Value {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('approval_status')}>Status {sortBy === 'approval_status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((po: any, idx: number) => (
                        <tr 
                          key={idx} 
                          onClick={() => navigate(`/projects/${po.project_no}?tab=purchaseorders&highlight=${po.final_po_no || po.po_no}`)}
                          className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                        >
                          {/* Pinned leftmost: PO Number */}
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-on-surface group-hover:bg-surface-container-lowest transition-colors dont-translate bhashini-skip-translation" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{po.final_po_no}</td>
                          <td className="px-6 py-4 font-semibold text-primary dont-translate bhashini-skip-translation">{po.project_no}</td>
                          <td className="px-6 py-4 text-secondary">{po.vendor_name}</td>
                          <td className="px-6 py-4 text-secondary">{formatDateStr(po.po_date)}</td>
                          <td className="px-6 py-4 text-secondary">{formatDateStr(po.valid_from)}</td>
                          <td className="px-6 py-4 text-secondary">{formatDateStr(po.valid_to)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">{formatINR(po.total)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              po.approval_status === 'Approved' 
                                ? 'bg-success/10 text-success' 
                                : po.approval_status === 'Pending'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-secondary/10 text-secondary'
                            }`}>
                              {po.approval_status || 'Draft'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* d. Vendor Performance */}
            {activeTab === 'vendor-performance' && (
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[1200px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {/* Pinned leftmost: Vendor Name */}
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('vendor_name')}>Vendor Name {sortBy === 'vendor_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_po_value')}>Total PO Value {sortBy === 'total_po_value' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_invoiced')}>Total Invoiced {sortBy === 'total_invoiced' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_paid')}>Total Paid {sortBy === 'total_paid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('outstanding')}>Outstanding {sortBy === 'outstanding' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('avg_payment_delay')}>Avg Delay (Days) {sortBy === 'avg_payment_delay' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((v: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-container-lowest transition-colors group">
                          {/* Pinned leftmost: Vendor Name */}
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-on-surface group-hover:bg-surface-container-lowest transition-colors" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{v.vendor_name}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(v.total_po_value)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(v.total_invoiced)}</td>
                          <td className="px-6 py-4 text-right font-medium text-success">{formatINR(v.total_paid)}</td>
                          <td className="px-6 py-4 text-right font-bold text-error">{formatINR(v.outstanding)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">{v.avg_payment_delay} Days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* e. Invoice Summary */}
            {activeTab === 'invoice-summary' && (
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[1600px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {/* Pinned leftmost: Invoice # */}
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('invoice_num')}>Invoice # {sortBy === 'invoice_num' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('project_no')}>Project {sortBy === 'project_no' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('vendor_name')}>Vendor {sortBy === 'vendor_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('invoice_date')}>Invoice Date {sortBy === 'invoice_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('invoice_amount')}>Amount {sortBy === 'invoice_amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('amount_paid')}>Paid {sortBy === 'amount_paid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('unpaid')}>Unpaid {sortBy === 'unpaid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('status')}>Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('aging_bucket')}>Aging Bucket {sortBy === 'aging_bucket' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((inv: any, idx: number) => (
                        <tr 
                          key={idx} 
                          onClick={() => navigate(`/projects/${inv.project_no}?tab=invoices&highlight=${inv.invoice_num}`)}
                          className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                        >
                          {/* Pinned leftmost: Invoice # */}
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-on-surface group-hover:bg-surface-container-lowest transition-colors dont-translate bhashini-skip-translation" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{inv.invoice_num}</td>
                          <td className="px-6 py-4 font-semibold text-primary dont-translate bhashini-skip-translation">{inv.project_no}</td>
                          <td className="px-6 py-4 text-secondary">{inv.vendor_name}</td>
                          <td className="px-6 py-4 text-secondary">{formatDateStr(inv.invoice_date)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">{formatINR(inv.invoice_amount)}</td>
                          <td className="px-6 py-4 text-right font-medium text-success">{formatINR(inv.amount_paid)}</td>
                          <td className="px-6 py-4 text-right font-bold text-error">{formatINR(inv.unpaid)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'Paid' 
                                ? 'bg-success/10 text-success' 
                                : inv.status === 'Partially Paid'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-secondary">{inv.aging_bucket}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* f. Payment Status */}
            {activeTab === 'payment-status' && (
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[1200px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {/* Pinned leftmost: Payment Status */}
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('payment_status')}>Payment Status Bucket {sortBy === 'payment_status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('project_count')}>Project Count {sortBy === 'project_count' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_budget')}>Total Budget {sortBy === 'total_budget' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_po_value')}>Total PO Value {sortBy === 'total_po_value' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_invoiced')}>Total Invoiced {sortBy === 'total_invoiced' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_received')}>Total Received {sortBy === 'total_received' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_outstanding')}>Total Outstanding {sortBy === 'total_outstanding' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-container-lowest transition-colors group">
                          {/* Pinned leftmost: Payment Status */}
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 group-hover:bg-surface-container-lowest transition-colors" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.payment_status === 'Fully Paid' 
                                ? 'bg-success/10 text-success' 
                                : p.payment_status === 'Partially Paid'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                            }`}>
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">{p.project_count} Projects</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(p.total_budget)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(p.total_po_value)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(p.total_invoiced)}</td>
                          <td className="px-6 py-4 text-right font-medium text-success">{formatINR(p.total_received)}</td>
                          <td className="px-6 py-4 text-right font-bold text-error">{formatINR(p.total_outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* g. Outstanding Analysis */}
            {activeTab === 'outstanding-analysis' && (
              <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[1500px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {/* Pinned leftmost: Invoice # */}
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('invoice_num')}>Invoice # {sortBy === 'invoice_num' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('project_no')}>Project {sortBy === 'project_no' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('vendor_name')}>Vendor {sortBy === 'vendor_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high" onClick={() => handleSort('invoice_date')}>Invoice Date {sortBy === 'invoice_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('invoice_amount')}>Invoice Amount {sortBy === 'invoice_amount' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('amount_paid')}>Paid {sortBy === 'amount_paid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('unpaid')}>Outstanding {sortBy === 'unpaid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('days_overdue')}>Days Overdue {sortBy === 'days_overdue' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((inv: any, idx: number) => (
                        <tr 
                          key={idx} 
                          onClick={() => navigate(`/projects/${inv.project_no}?tab=invoices&highlight=${inv.invoice_num}`)}
                          className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                        >
                          {/* Pinned leftmost: Invoice # */}
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-on-surface group-hover:bg-surface-container-lowest transition-colors dont-translate bhashini-skip-translation" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{inv.invoice_num}</td>
                          <td className="px-6 py-4 font-semibold text-primary dont-translate bhashini-skip-translation">{inv.project_no}</td>
                          <td className="px-6 py-4 text-secondary">{inv.vendor_name}</td>
                          <td className="px-6 py-4 text-secondary">{formatDateStr(inv.invoice_date)}</td>
                          <td className="px-6 py-4 text-right font-medium text-secondary">{formatINR(inv.invoice_amount)}</td>
                          <td className="px-6 py-4 text-right font-medium text-success">{formatINR(inv.amount_paid)}</td>
                          <td className="px-6 py-4 text-right font-bold text-error">{formatINR(inv.unpaid)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.days_overdue > 90 
                                ? 'bg-error/10 text-error' 
                                : inv.days_overdue > 30
                                ? 'bg-warning/10 text-warning'
                                : 'bg-success/10 text-success'
                            }`}>
                              {inv.days_overdue} Days
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* h. Customer-wise Projects */}
            {activeTab === 'customer-wise-projects' && (
              <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm bg-surface">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[800px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('customer_name')}>Customer Name {sortBy === 'customer_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('project_count')}>Project Count {sortBy === 'project_count' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_budget')}>Total Budget {sortBy === 'total_budget' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_received')}>Total Received {sortBy === 'total_received' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('outstanding')}>Outstanding {sortBy === 'outstanding' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-container-lowest transition-colors group">
                          <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-on-surface group-hover:bg-surface-container-lowest transition-colors" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{c.customer_name}</td>
                          <td className="px-6 py-4 text-right font-semibold text-secondary">{c.project_count} Projects</td>
                          <td className="px-6 py-4 text-right font-medium text-on-surface">{formatINR(c.total_budget)}</td>
                          <td className="px-6 py-4 text-right font-medium text-success">{formatINR(c.total_received)}</td>
                          <td className="px-6 py-4 text-right font-bold text-error">{formatINR(c.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* i. PM-wise Projects */}
            {activeTab === 'pm-wise-projects' && (
              <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm bg-surface">
                <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
                  <table className="w-full text-left border-separate border-spacing-0 table-sticky-header text-xs font-sans min-w-[800px] reports-table-separate">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant font-headline text-[10px] font-bold text-secondary uppercase tracking-wider">
                        <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 cursor-pointer hover:bg-surface-container-high sticky-corner" style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'var(--color-surface-container-low)' }} onClick={() => handleSort('prj_mgr_name')}>Project Manager {sortBy === 'prj_mgr_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('project_count')}>Project Count {sortBy === 'project_count' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('portfolio_value')}>Portfolio Value {sortBy === 'portfolio_value' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-high text-right" onClick={() => handleSort('total_invoices')}>Total Invoices {sortBy === 'total_invoices' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                        <th className="px-6 py-4 text-right">On-time vs Overdue Ratio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {getSortedRows(reportData).map((pm: any, idx: number) => {
                        const totalInvs = Number(pm.total_invoices || 0);
                        const onTimePct = totalInvs > 0 ? Math.round((Number(pm.on_time_invoices || 0) / totalInvs) * 100) : 100;
                        const overduePct = totalInvs > 0 ? Math.round((Number(pm.overdue_invoices || 0) / totalInvs) * 100) : 0;
                        
                        return (
                          <tr key={idx} className="hover:bg-surface-container-lowest transition-colors group">
                            <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-bold text-on-surface group-hover:bg-surface-container-lowest transition-colors" style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--color-surface)' }}>{pm.prj_mgr_name || 'Unassigned'}</td>
                            <td className="px-6 py-4 text-right font-semibold text-secondary">{pm.project_count} Projects</td>
                            <td className="px-6 py-4 text-right font-semibold text-on-surface">{formatINR(pm.portfolio_value)}</td>
                            <td className="px-6 py-4 text-right font-medium text-secondary">{totalInvs} Invoices</td>
                            <td className="px-6 py-4 text-right">
                              {totalInvs > 0 ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="font-bold text-on-surface">
                                    {onTimePct}% / {overduePct}%
                                  </span>
                                  <span className="text-[10px] text-secondary font-medium">
                                    On-time: {pm.on_time_invoices}, Overdue: {pm.overdue_invoices}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-secondary italic">No Invoices</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-margin-desktop pt-8 border-t border-outline-variant flex justify-between items-center pb-12 font-headline text-[10px] text-secondary font-bold tracking-widest">
        <p className="uppercase">Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; NPMS Reporting Module v3.1.0</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Audit Logs</a>
          <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
};
