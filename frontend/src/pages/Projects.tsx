import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Filter, 
  Grid, 
  List, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Search,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api';
import type { ProjectFilters } from '../lib/api';
import type { Project, DatabaseProject } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toast } from '../lib/toast';

export const Projects: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // URL Query String State Sync
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const search = searchParams.get('search') || '';
  const prjMgrId = searchParams.get('prjMgrId') || 'All';
  const paymentStatus = searchParams.get('paymentStatus') || 'All';
  const projectType = searchParams.get('projectType') || 'All';
  const sortBy = searchParams.get('sortBy') || 'created_on';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const amountField = searchParams.get('amountField') || 'po_amount';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const noPoYet = searchParams.get('noPoYet') === 'true';
  const taxInvoiceOutstanding = searchParams.get('taxInvoiceOutstanding') === 'true';
  const riskVendorOverpaid = searchParams.get('riskVendorOverpaid') === 'true';
  const riskBillingAhead = searchParams.get('riskBillingAhead') === 'true';
  const riskStalled = searchParams.get('riskStalled') === 'true';
  
  // Pagination & View Mode
  const page = parseInt(searchParams.get('page') || '1') || 1;
  const pageSize = parseInt(searchParams.get('pageSize') || '9') || 9; // 9 cards layout evenly
  const view = searchParams.get('view') || 'table'; // Default to table view

  // Component local states
  const [projects, setProjects] = useState<(Project & DatabaseProject)[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [projectManagers, setProjectManagers] = useState<{ prjMgrId: number; prjMgrName: string }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchVal, setSearchVal] = useState(search);

  // Popover Toggles
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);

  // Filter Refs
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Local Filter Popover Inputs
  const [localPrjMgrId, setLocalPrjMgrId] = useState(prjMgrId);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(paymentStatus);
  const [localProjectType, setLocalProjectType] = useState(projectType);
  const [localAmountField, setLocalAmountField] = useState(amountField);
  const [localMinAmount, setLocalMinAmount] = useState(minAmount);
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [localNoPoYet, setLocalNoPoYet] = useState(noPoYet);
  const [localTaxInvoiceOutstanding, setLocalTaxInvoiceOutstanding] = useState(taxInvoiceOutstanding);
  const [localRiskVendorOverpaid, setLocalRiskVendorOverpaid] = useState(riskVendorOverpaid);
  const [localRiskBillingAhead, setLocalRiskBillingAhead] = useState(riskBillingAhead);
  const [localRiskStalled, setLocalRiskStalled] = useState(riskStalled);

  // Local Sort Popover Inputs
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  // Close filter popover on click outside or Escape key press
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterPopover &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterPopover(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFilterPopover) {
        setShowFilterPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilterPopover]);

  // Load distinct filters on mount
  useEffect(() => {
    const loadDistinctData = async () => {
      try {
        const [types, managers] = await Promise.all([
          api.getProjectTypes(),
          api.getProjectManagers()
        ]);
        setProjectTypes(types);
        setProjectManagers(managers);
      } catch (err) {
        console.error('Failed to load filter option values:', err);
      }
    };
    loadDistinctData();
  }, []);

  // Sync search query from global topbar input
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchVal(searchQuery);
      updateFilters({ search: searchQuery, page: 1 });
    }
  }, [searchQuery]);

  // Sync local search when URL parameters are modified
  useEffect(() => {
    setSearchVal(search);
  }, [search]);

  // Sync popover inputs when URL parameters are modified or popover opens/closes
  useEffect(() => {
    setLocalPrjMgrId(prjMgrId);
    setLocalPaymentStatus(paymentStatus);
    setLocalProjectType(projectType);
    setLocalAmountField(amountField);
    setLocalMinAmount(minAmount);
    setLocalMaxAmount(maxAmount);
    setLocalDateFrom(dateFrom);
    setLocalDateTo(dateTo);
    setLocalNoPoYet(noPoYet);
    setLocalTaxInvoiceOutstanding(taxInvoiceOutstanding);
    setLocalRiskVendorOverpaid(riskVendorOverpaid);
    setLocalRiskBillingAhead(riskBillingAhead);
    setLocalRiskStalled(riskStalled);
    setLocalSortBy(sortBy);
    setLocalSortOrder(sortOrder);
  }, [searchParams, showFilterPopover]);

  // Debounce search inputs (300ms)
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchVal !== search) {
        updateFilters({ search: searchVal, page: 1 });
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchVal]);

  // Fetch paginated Projects from Postgres (excluding view parameter from effect dependencies)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setError(null);
        setRefetching(true);

        const apiFilters: ProjectFilters = {
          search,
          prjMgrId: prjMgrId === 'All' ? undefined : prjMgrId,
          paymentStatus: paymentStatus === 'All' ? undefined : (paymentStatus === 'Fully Paid' ? 'fully_paid' : paymentStatus === 'Partially Paid' ? 'partially_paid' : 'no_invoices'),
          projectType: projectType === 'All' ? undefined : projectType,
          sortBy,
          sortOrder,
          amountField,
          minAmount,
          maxAmount,
          dateFrom,
          dateTo,
          noPoYet: noPoYet ? true : undefined,
          taxInvoiceOutstanding: taxInvoiceOutstanding ? true : undefined,
          riskVendorOverpaid: riskVendorOverpaid ? true : undefined,
          riskBillingAhead: riskBillingAhead ? true : undefined,
          riskStalled: riskStalled ? true : undefined,
          page,
          pageSize
        };

        const data = await api.getProjects(apiFilters);
        setProjects(data);
      } catch (err) {
        console.error(err);
        const msg = "Couldn't load Projects — check your connection";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    };
    fetchProjects();
  }, [search, prjMgrId, paymentStatus, projectType, sortBy, sortOrder, amountField, minAmount, maxAmount, dateFrom, dateTo, noPoYet, taxInvoiceOutstanding, riskVendorOverpaid, riskBillingAhead, riskStalled, page, pageSize]);

  // Helper to synchronize URL parameters
  const updateFilters = (updates: Record<string, any>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '' || val === false || val === 'All') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    setSearchParams(params);
  };

  const handleApplyFilters = () => {
    updateFilters({
      prjMgrId: localPrjMgrId,
      paymentStatus: localPaymentStatus,
      projectType: localProjectType,
      amountField: localAmountField,
      minAmount: localMinAmount,
      maxAmount: localMaxAmount,
      dateFrom: localDateFrom,
      dateTo: localDateTo,
      noPoYet: localNoPoYet ? 'true' : undefined,
      taxInvoiceOutstanding: localTaxInvoiceOutstanding ? 'true' : undefined,
      riskVendorOverpaid: localRiskVendorOverpaid ? 'true' : undefined,
      riskBillingAhead: localRiskBillingAhead ? 'true' : undefined,
      riskStalled: localRiskStalled ? 'true' : undefined,
      page: 1
    });
    setShowFilterPopover(false);
  };

  const handleResetFilters = () => {
    setLocalPrjMgrId('All');
    setLocalPaymentStatus('All');
    setLocalProjectType('All');
    setLocalAmountField('po_amount');
    setLocalMinAmount('');
    setLocalMaxAmount('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalNoPoYet(false);
    setLocalTaxInvoiceOutstanding(false);
    setLocalRiskVendorOverpaid(false);
    setLocalRiskBillingAhead(false);
    setLocalRiskStalled(false);

    updateFilters({
      prjMgrId: undefined,
      paymentStatus: undefined,
      projectType: undefined,
      amountField: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      noPoYet: undefined,
      taxInvoiceOutstanding: undefined,
      riskVendorOverpaid: undefined,
      riskBillingAhead: undefined,
      riskStalled: undefined,
      page: 1
    });
  };

  const handleApplySort = () => {
    updateFilters({
      sortBy: localSortBy,
      sortOrder: localSortOrder,
      page: 1
    });
    setShowSortPopover(false);
  };

  const handleClearAll = () => {
    setSearchVal('');
    setSearchParams(new URLSearchParams());
    setShowFilterPopover(false);
    toast.success('Filters cleared');
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateFilters({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateFilters({ sortBy: field, sortOrder: 'desc' });
    }
  };

  const formatINR = (val: number | null | undefined, abbreviate = true) => {
    if (val === null || val === undefined) return '₹0';
    if (abbreviate) {
      if (val >= 10000000) {
        return `₹${(val / 10000000).toFixed(2)} Cr`;
      }
      if (val >= 100000) {
        return `₹${(val / 100000).toFixed(2)} L`;
      }
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Rendering formatting helpers
  const renderTruncatedText = (val: string | null | undefined, maxWidthClass = "max-w-[160px]") => {
    if (!val || val.trim() === "") return <span className="text-secondary/40">—</span>;
    return (
      <span className={`block truncate ${maxWidthClass}`} title={val}>
        {val}
      </span>
    );
  };

  const renderFallback = (val: any) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return <span className="text-secondary/40">—</span>;
    }
    return val;
  };

  const formatFullINR = (val: number | null | undefined) => {
    if (val === null || val === undefined) return <span className="text-secondary/40">—</span>;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatDateString = (dateStr: string | null | undefined) => {
    if (!dateStr) return <span className="text-secondary/40">—</span>;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Click handler checking if invoices exist
  const handleRowClick = async (projectCd: string, prjNm: string) => {
    try {
      const exists = await api.checkInvoicesExist(projectCd);
      if (exists) {
        navigate(`/invoices?projectNo=${encodeURIComponent(projectCd)}`);
      } else {
        toast.info(`No invoices exist for ${prjNm || projectCd} yet`);
      }
    } catch (err) {
      console.error('Error checking invoice existence:', err);
      toast.error("Failed to check if invoices exist");
    }
  };

  // Derive PM initials for avatar chip
  const getPMInitials = (name: string | null | undefined) => {
    if (!name || name.trim() === '') return 'RM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  // Active filter chips list
  const activeChips: { id: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    activeChips.push({
      id: 'search',
      label: `Search: "${search}"`,
      clear: () => { setSearchVal(''); updateFilters({ search: undefined, page: 1 }); }
    });
  }
  if (prjMgrId !== 'All') {
    const mgr = projectManagers.find(m => String(m.prjMgrId) === String(prjMgrId));
    activeChips.push({
      id: 'prjMgrId',
      label: `PM: ${mgr ? mgr.prjMgrName : prjMgrId}`,
      clear: () => updateFilters({ prjMgrId: undefined, page: 1 })
    });
  }
  if (paymentStatus !== 'All') {
    activeChips.push({
      id: 'paymentStatus',
      label: `Payment: ${paymentStatus}`,
      clear: () => updateFilters({ paymentStatus: undefined, page: 1 })
    });
  }
  if (projectType !== 'All') {
    activeChips.push({
      id: 'projectType',
      label: `Type: ${projectType}`,
      clear: () => updateFilters({ projectType: undefined, page: 1 })
    });
  }
  if (minAmount || maxAmount) {
    const fieldLabel = amountField === 'po_amount' ? 'PO Amt' : 'Recv';
    let label = '';
    if (minAmount && maxAmount) label = `${fieldLabel}: ₹${minAmount} - ₹${maxAmount}`;
    else if (minAmount) label = `${fieldLabel}: >= ₹${minAmount}`;
    else label = `${fieldLabel}: <= ₹${maxAmount}`;
    activeChips.push({
      id: 'amountRange',
      label,
      clear: () => updateFilters({ minAmount: undefined, maxAmount: undefined, page: 1 })
    });
  }
  if (dateFrom || dateTo) {
    let label = '';
    if (dateFrom && dateTo) label = `Created: ${dateFrom} to ${dateTo}`;
    else if (dateFrom) label = `Created after: ${dateFrom}`;
    else label = `Created before: ${dateTo}`;
    activeChips.push({
      id: 'dateRange',
      label,
      clear: () => updateFilters({ dateFrom: undefined, dateTo: undefined, page: 1 })
    });
  }
  if (noPoYet) {
    activeChips.push({
      id: 'noPoYet',
      label: 'No PO Yet',
      clear: () => updateFilters({ noPoYet: undefined, page: 1 })
    });
  }
  if (taxInvoiceOutstanding) {
    activeChips.push({
      id: 'taxInvoiceOutstanding',
      label: 'Tax Invoice Outstanding',
      clear: () => updateFilters({ taxInvoiceOutstanding: undefined, page: 1 })
    });
  }
  if (riskVendorOverpaid) {
    activeChips.push({
      id: 'riskVendorOverpaid',
      label: 'Vendor Paid > Collected',
      clear: () => updateFilters({ riskVendorOverpaid: undefined, page: 1 })
    });
  }
  if (riskBillingAhead) {
    activeChips.push({
      id: 'riskBillingAhead',
      label: 'Billing Ahead of Collection',
      clear: () => updateFilters({ riskBillingAhead: undefined, page: 1 })
    });
  }
  if (riskStalled) {
    activeChips.push({
      id: 'riskStalled',
      label: 'Stalled Project',
      clear: () => updateFilters({ riskStalled: undefined, page: 1 })
    });
  }

  // Pagination parameters
  const totalCount = (projects as any).totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startEntry = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(totalCount, page * pageSize);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[450px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-secondary font-headline text-sm font-semibold">Loading projects scorecard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-8 max-w-lg mx-auto my-16 text-center space-y-4 shadow-sm">
        <h3 className="text-error font-headline font-bold text-lg">Connection Failure</h3>
        <p className="text-secondary font-sans text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-error text-white font-headline text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded hover:bg-red-700 transition-colors shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Projects' }]} />
          <div className="flex items-center">
            <h2 className="font-headline text-2xl font-bold text-on-surface leading-none">
              Projects Portfolio
            </h2>
            <span className="bg-[#DBEAFE] text-[#1E40AF] font-sans font-bold text-xs px-2.5 py-0.5 rounded-full ml-3 inline-flex items-center justify-center">
              {totalCount}
            </span>
          </div>
        </div>

        {/* View mode toggle - functional query toggles */}
        <div className="flex rounded-lg border border-outline-variant overflow-hidden self-end bg-surface shrink-0 shadow-sm">
          <button 
            onClick={() => updateFilters({ view: 'table' })}
            className={`px-3 py-2 border-r border-outline-variant transition-colors ${
              view === 'table' ? 'bg-primary/10 text-primary' : 'bg-surface hover:bg-surface-container text-secondary'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={() => updateFilters({ view: 'card' })}
            className={`px-3 py-2 transition-colors ${
              view === 'card' ? 'bg-primary/10 text-primary' : 'bg-surface hover:bg-surface-container text-secondary'
            }`}
            title="Card Scorecard View"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low/40 p-2.5 rounded-lg border border-outline-variant/60 font-sans text-xs">
          <span className="font-bold text-secondary mr-1">Active Filters:</span>
          {activeChips.map(chip => (
            <span 
              key={chip.id} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-outline-variant rounded-full text-on-surface font-semibold animate-fade-in-up"
            >
              <span>{chip.label}</span>
              <button 
                onClick={chip.clear} 
                className="p-0.5 rounded-full hover:bg-surface-container text-secondary hover:text-on-surface focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <button 
            onClick={handleClearAll}
            className="text-primary hover:underline font-bold ml-auto text-xs"
          >
            Clear All
          </button>
        </div>
      )}

      {/* FILTER & TABS BAR ROW */}
      <div className="flex items-center justify-end gap-3 pb-4 border-b border-outline-variant/60">
        {/* Popover 1: Filter Toggle Button */}
        <button 
          ref={filterButtonRef}
          onClick={() => { setShowFilterPopover(!showFilterPopover); setShowSortPopover(false); }}
          className={`h-10 px-4 py-2 border rounded-full font-sans text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
            activeChips.length > 0 
              ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
              : 'border-outline-variant hover:border-outline text-secondary bg-white'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeChips.length > 0 && (
            <span className="flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 ml-1 animate-fade-in-up">
              {activeChips.length}
            </span>
          )}
        </button>

        {/* Popover 2: Sort */}
        <div className="relative">
          <button 
            onClick={() => { setShowSortPopover(!showSortPopover); setShowFilterPopover(false); }}
            className="h-10 px-4 py-2 border border-outline-variant hover:border-outline text-secondary hover:bg-surface-container-low rounded-full font-sans text-xs font-bold flex items-center gap-2 transition-all bg-white shadow-sm"
          >
            <span>Sort</span>
          </button>
          
          {showSortPopover && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-outline-variant rounded-xl shadow-lg p-5 z-50 text-left font-sans space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
                <span className="font-bold text-sm text-on-surface">Sort By</span>
                <button onClick={() => setShowSortPopover(false)} className="text-secondary hover:text-on-surface focus:outline-none">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Sort Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Field</label>
                <select
                  value={localSortBy}
                  onChange={(e) => setLocalSortBy(e.target.value)}
                  className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer"
                >
                  <option value="created_on">Created Date</option>
                  <option value="po_amount">PO Amount</option>
                  <option value="amount_received">Amount Received</option>
                  <option value="total_amount_paid">Total Amount Paid</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Order</label>
                <select
                  value={localSortOrder}
                  onChange={(e) => setLocalSortOrder(e.target.value)}
                  className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              {/* Popover actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button 
                  onClick={handleApplySort}
                  className="px-3 py-1.5 bg-[#111827] hover:bg-[#1f2937] text-white rounded-lg text-xs font-bold shadow-sm transition-colors w-full"
                >
                  Apply Sort
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER PANEL (Block-level, pushes content down, full width, all filters at once) */}
      {showFilterPopover && (
        <div 
          ref={filterDropdownRef}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm space-y-4 text-left font-sans w-full animate-fade-in-up"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Search bar */}
            <div className="space-y-3 col-span-1 sm:col-span-2">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Search</span>
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-outline shrink-0 pointer-events-none" />
                <input 
                  type="text" 
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search by name, client, or code..."
                  className="pl-10 h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-sans text-on-surface placeholder-secondary focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                />
                {searchVal && (
                  <button 
                    onClick={() => setSearchVal('')} 
                    className="absolute right-3 top-2.5 text-secondary hover:text-on-surface focus:outline-none"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Payment Status Dropdown */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Payment Status</span>
              <select
                value={localPaymentStatus}
                onChange={(e) => setLocalPaymentStatus(e.target.value)}
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="No Invoices Yet">No Invoices Yet</option>
              </select>
            </div>

            {/* Project Type */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Project Type</span>
              <select
                value={localProjectType}
                onChange={(e) => setLocalProjectType(e.target.value)}
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                {projectTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Project Manager select (if superadmin) */}
            {user?.role === 'superadmin' ? (
              <div className="space-y-3">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Project Manager</span>
                <select
                  value={localPrjMgrId}
                  onChange={(e) => setLocalPrjMgrId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="All">All Managers</option>
                  {projectManagers.map(m => (
                    <option key={m.prjMgrId} value={m.prjMgrId}>{m.prjMgrName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="hidden md:block"></div>
            )}

            {/* Financial Bounds */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Financial Bounds</span>
              <div className="flex gap-2">
                <select
                  value={localAmountField}
                  onChange={(e) => setLocalAmountField(e.target.value)}
                  className="h-10 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest font-bold px-1.5 outline-none cursor-pointer text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="po_amount">PO Amt</option>
                  <option value="amount_received">Recv</option>
                </select>
                <input 
                  type="number"
                  value={localMinAmount}
                  onChange={(e) => setLocalMinAmount(e.target.value)}
                  placeholder="Min"
                  className="h-10 w-full rounded-lg border border-outline-variant text-xs px-2 outline-none text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input 
                  type="number"
                  value={localMaxAmount}
                  onChange={(e) => setLocalMaxAmount(e.target.value)}
                  placeholder="Max"
                  className="h-10 w-full rounded-lg border border-outline-variant text-xs px-2 outline-none text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Timeline date range */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Created Timeline</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={localDateFrom}
                  onChange={(e) => setLocalDateFrom(e.target.value)}
                  className="h-10 rounded-lg border border-outline-variant text-xs px-2 outline-none text-on-surface bg-surface-container-lowest w-full font-semibold focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="text-secondary text-xs">to</span>
                <input 
                  type="date"
                  value={localDateTo}
                  onChange={(e) => setLocalDateTo(e.target.value)}
                  className="h-10 rounded-lg border border-outline-variant text-xs px-2 outline-none text-on-surface bg-surface-container-lowest w-full font-semibold focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Special States */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Special States</span>
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={localNoPoYet}
                    onChange={(e) => setLocalNoPoYet(e.target.checked)}
                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer"
                  />
                  <span>No PO Yet</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={localTaxInvoiceOutstanding}
                    onChange={(e) => setLocalTaxInvoiceOutstanding(e.target.checked)}
                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer"
                  />
                  <span>Tax Invoice Outstanding</span>
                </label>
              </div>
            </div>
          </div>

          {/* Risk & Compliance Flags */}
          <div className="pt-4 border-t border-outline-variant/60 space-y-3">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Risk & Compliance Flags</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Flag 1 */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                <input 
                  type="checkbox"
                  checked={localRiskVendorOverpaid}
                  onChange={(e) => setLocalRiskVendorOverpaid(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface block">Vendor Paid More Than Collected From Client</span>
                  <span className="text-[10px] text-secondary block leading-normal">
                    NICSI has paid the vendor more than what's been received from the client on this project — cash flow risk.
                  </span>
                </div>
              </label>

              {/* Flag 2 */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                <input 
                  type="checkbox"
                  checked={localRiskBillingAhead}
                  onChange={(e) => setLocalRiskBillingAhead(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface block">Billing Ahead of Collection</span>
                  <span className="text-[10px] text-secondary block leading-normal">
                    PO value significantly exceeds what's been received from the client so far.
                  </span>
                </div>
              </label>

              {/* Flag 3 */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                <input 
                  type="checkbox"
                  checked={localRiskStalled}
                  onChange={(e) => setLocalRiskStalled(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface block">Stalled — PO Issued, Nothing Billed Yet</span>
                  <span className="text-[10px] text-secondary block leading-normal">
                    A purchase order was raised over 60 days ago but no invoices have been billed on this project yet.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/60 w-full mt-4">
            <button 
              onClick={handleClearAll}
              className="h-10 px-4 py-2 font-headline text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleResetFilters}
                className="px-4 py-2 border border-outline-variant text-secondary hover:bg-surface-container rounded-lg text-xs font-bold transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW SWITCHER (Card grid vs Full Table view) */}
      <div className={`relative transition-opacity duration-200 ${refetching ? 'opacity-60' : 'opacity-100'}`}>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm text-center space-y-4">
            <p className="text-secondary font-headline text-sm font-semibold">No projects match this view</p>
            <button
              onClick={handleClearAll}
              className="text-primary hover:underline font-bold text-xs"
            >
              Reset all filters
            </button>
          </div>
        ) : view === 'table' ? (
          /* Pinned/Sticky Table View */
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
              <table className="w-full text-left border-collapse min-w-[2800px] table-sticky-header font-sans">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {/* Pinned/Sticky First Column: Project Code */}
                    <th className="sticky left-0 bg-surface-container-low border-r border-outline-variant/60 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Project Code
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      PM Name
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      No. of PO
                    </th>
                    <th 
                      onClick={() => handleSort('po_amount')}
                      className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary transition-colors select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>PO Amount</span>
                        {sortBy === 'po_amount' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('amount_received')}
                      className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary transition-colors select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Amount Received</span>
                        {sortBy === 'amount_received' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      No. of Invoices (Bill Desk)
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      Total Invoice Amount
                    </th>
                    <th 
                      onClick={() => handleSort('total_amount_paid')}
                      className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary transition-colors select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Amount Paid</span>
                        {sortBy === 'total_amount_paid' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      No. of Tax Invoices
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      Total Tax Invoice Amount
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      Budget Number
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      Project ABP
                    </th>
                    <th 
                      onClick={() => handleSort('created_on')}
                      className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Created Date</span>
                        {sortBy === 'created_on' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                      Customer ID
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Project Type
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      User Email
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Mobile Number
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      HOD Email
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      NIC Coordinator Email
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                      Staff Email
                    </th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider w-10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface">
                  {projects.map((p, i) => (
                    <tr 
                      key={p.projectCd}
                      onClick={() => handleRowClick(p.projectCd, p.prjNm)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer group animate-row-stagger"
                      style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleRowClick(p.projectCd, p.prjNm)}
                      aria-label={`View project ${p.projectCd}`}
                    >
                      {/* Pinned/Sticky First Column: Project Code */}
                      <td className="sticky left-0 bg-surface border-r border-outline-variant/60 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] px-6 py-5 group-hover:bg-surface-container-low transition-colors">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${p.projectCd}`);
                          }}
                          className="font-bold text-primary group-hover:underline hover:text-primary-container"
                        >
                          {p.projectCd}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-semibold text-sm leading-tight text-on-surface">
                        {renderTruncatedText(p.prjNm, "max-w-[200px]")}
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface whitespace-nowrap">
                        {renderFallback(p.prjMgrName)}
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface">
                        {renderTruncatedText(p.customerName, "max-w-[200px]")}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.paymentStatus === 'Fully Paid'
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                            : p.paymentStatus === 'Partially Paid'
                            ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                            : 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.paymentStatus === 'Fully Paid' ? 'bg-[#15803D]' : p.paymentStatus === 'Partially Paid' ? 'bg-[#B45309]' : 'bg-[#4B5563]'
                          }`} />
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-sm text-on-surface">
                        {p.noOfPo}
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-sm text-on-surface">
                        {formatFullINR(p.poAmount)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm text-on-surface font-semibold">
                        {formatFullINR(p.amountReceived)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm text-on-surface">
                        {p.noOfInvBilldesk}
                      </td>
                      <td className="px-6 py-5 text-right text-sm text-on-surface">
                        {formatFullINR(p.totalInvoiceAmount)}
                      </td>
                      <td className={`px-6 py-5 text-right font-bold text-sm ${
                        p.paymentStatus === 'Fully Paid' 
                          ? 'text-status-success-text' 
                          : p.paymentStatus === 'Partially Paid' 
                          ? 'text-status-warning-text' 
                          : 'text-secondary'
                      }`}>
                        {formatFullINR(p.totalAmountPaid)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm text-on-surface">
                        {p.noOfTaxInvoice}
                      </td>
                      <td className="px-6 py-5 text-right text-sm text-on-surface">
                        {formatFullINR(p.totalTaxInvoiceAmount)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm text-secondary">
                        {renderFallback(p.prjBudgetNo)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm text-secondary">
                        {renderFallback(p.projectAbp)}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary whitespace-nowrap">
                        {formatDateString(p.createdOn)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm text-secondary">
                        {renderFallback(p.custId)}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">
                        {renderFallback(p.prjType)}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">
                        {renderTruncatedText(p.userEmail, "max-w-[180px]")}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary whitespace-nowrap">
                        {renderTruncatedText(p.mobileNumber, "max-w-[120px]")}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">
                        {renderTruncatedText(p.hodEmail, "max-w-[180px]")}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">
                        {renderTruncatedText(p.nicCordEmailId, "max-w-[180px]")}
                      </td>
                      <td className="px-6 py-5 text-sm text-secondary">
                        {renderTruncatedText(p.staffEmailId, "max-w-[180px]")}
                      </td>
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => navigate(`/projects/${p.projectCd}`)}
                          className="p-1 hover:bg-surface-container rounded-md text-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Open details for ${p.projectCd}`}
                        >
                          <MoreVertical className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer inside Table container */}
            {totalPages > 0 && !loading && (
              <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row gap-4 items-center justify-between font-sans text-xs text-secondary">
                <span>
                  Showing <strong className="text-on-surface font-semibold">{startEntry}</strong> - <strong className="text-on-surface font-semibold">{endEntry}</strong> of <strong className="text-on-surface font-semibold">{totalCount}</strong> entries
                </span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => page > 1 && updateFilters({ page: page - 1 })}
                    disabled={page === 1}
                    className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-lowest disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isActive = pageNum === page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => updateFilters({ page: pageNum })}
                        className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-colors ${
                          isActive 
                            ? 'bg-[#111827] text-white hover:bg-[#1f2937] cursor-default' 
                            : 'border border-outline-variant hover:bg-surface-container-lowest text-secondary bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => page < totalPages && updateFilters({ page: page + 1 })}
                    disabled={page === totalPages}
                    className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-lowest disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Card Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {projects.map((p) => {
              return (
                <div
                  key={p.projectCd}
                  onClick={() => handleRowClick(p.projectCd, p.prjNm)}
                  className="bg-surface rounded-xl p-5 shadow-sm relative transition-all duration-200 hover:shadow-md cursor-pointer border border-outline-variant hover:border-primary flex flex-col justify-between h-[210px]"
                  title="Click to view linked Invoices, or use details link"
                >
                  <div>
                    {/* Top Row: Code and Payment Status Badge */}
                    <div className="flex justify-between items-start gap-2">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${p.projectCd}`);
                        }}
                        className="font-mono text-[10px] font-bold text-secondary uppercase bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/60 hover:text-primary transition-colors"
                      >
                        {p.projectCd}
                      </span>
                      
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.paymentStatus === 'Fully Paid'
                          ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                          : p.paymentStatus === 'Partially Paid'
                          ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                          : 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          p.paymentStatus === 'Fully Paid' ? 'bg-[#15803D]' : p.paymentStatus === 'Partially Paid' ? 'bg-[#B45309]' : 'bg-[#4B5563]'
                        }`} />
                        {p.paymentStatus}
                      </span>
                    </div>

                    {/* Project Name & Client */}
                    <div className="mt-3">
                      <h4 
                        className="text-base font-bold text-on-surface line-clamp-1 leading-tight" 
                        title={p.prjNm}
                      >
                        {p.prjNm}
                      </h4>
                      <p className="text-secondary text-[11px] font-sans truncate mt-0.5">
                        {p.customerName}
                      </p>
                    </div>
                  </div>

                  {/* Stats side-by-side (three columns) */}
                  <div className="grid grid-cols-3 gap-2 mt-2 py-3 bg-surface-container-lowest/50 rounded-lg px-3 border border-outline-variant/30 text-left">
                    <div>
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block leading-none mb-1">Budget</span>
                      <span className="font-sans text-xs font-bold text-on-surface leading-none block">
                        {formatINR(p.prjBudgetNo ?? 0, true)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block leading-none mb-1">PO Value</span>
                      <span className="font-sans text-xs font-bold text-on-surface leading-none block">
                        {formatINR(p.poAmount ?? 0, true)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-wider block leading-none mb-1">Invoices</span>
                      <span className="font-sans text-xs font-bold text-on-surface leading-none block">
                        {p.noOfInvBilldesk}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-outline-variant/60 my-2" />

                  {/* Bottom Row: PM initials avatar & navigation link */}
                  <div className="flex justify-between items-center mt-1">
                    {/* PM initials circular chip */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-full bg-[#3B82F6]/10 text-[#2563EB] border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[10px] uppercase shrink-0"
                        title={p.prjMgrName || 'Unassigned'}
                      >
                        {getPMInitials(p.prjMgrName)}
                      </div>
                      <span className="text-[10px] text-secondary font-medium truncate max-w-[125px]">
                        {p.prjMgrName || 'Unassigned'}
                      </span>
                    </div>

                    {/* Navigation details link */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${p.projectCd}`);
                      }}
                      className="text-xs font-bold text-[#2563EB] hover:underline shrink-0 flex items-center gap-1 focus:outline-none"
                    >
                      <span>Details</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CARD GRID PAGINATION FOOTER */}
      {view === 'card' && totalPages > 0 && !loading && (
        <div className="px-6 py-4 bg-surface border border-outline-variant rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between font-sans text-xs text-secondary shadow-sm">
          <span>
            Showing <strong className="text-on-surface font-semibold">{startEntry}</strong> - <strong className="text-on-surface font-semibold">{endEntry}</strong> of <strong className="text-on-surface font-semibold">{totalCount}</strong> entries
          </span>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => page > 1 && updateFilters({ page: page - 1 })}
              disabled={page === 1}
              className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isActive = pageNum === page;
              return (
                <button
                  key={pageNum}
                  onClick={() => updateFilters({ page: pageNum })}
                  className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-colors ${
                    isActive 
                      ? 'bg-[#111827] text-white hover:bg-[#1f2937] cursor-default' 
                      : 'border border-outline-variant hover:bg-surface-container-low text-secondary bg-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => page < totalPages && updateFilters({ page: page + 1 })}
              disabled={page === totalPages}
              className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
