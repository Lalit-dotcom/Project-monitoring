import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Briefcase, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Filter,
  Grid,
  List,
  ChevronRight,
  MoreVertical,
  Search,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { api } from '../lib/api';
import type { ProjectFilters } from '../lib/api';
import type { Project } from '../types';

export const Projects: React.FC = () => {
  useOutletContext<{ searchQuery: string }>();
  const navigate = useNavigate();
  
  // URL Query String State Sync
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'All';
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

  // Component local states
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchVal, setSearchVal] = useState(search);

  // Advanced Filters UI Toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced Filters Panel Local State (applied on click "Apply")
  const [localAmountField, setLocalAmountField] = useState(amountField);
  const [localMinAmount, setLocalMinAmount] = useState(minAmount);
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [localNoPoYet, setLocalNoPoYet] = useState(noPoYet);
  const [localTaxInvoiceOutstanding, setLocalTaxInvoiceOutstanding] = useState(taxInvoiceOutstanding);

  // Load distinct project types once
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await api.getProjectTypes();
        setProjectTypes(types);
      } catch (err) {
        console.error('Failed to load project types:', err);
      }
    };
    loadTypes();
  }, []);

  // Sync search local value with URL parameter changes (e.g. on clear)
  useEffect(() => {
    setSearchVal(search);
  }, [search]);

  // Sync advanced local states with URL parameter changes (e.g. back button / clear)
  useEffect(() => {
    setLocalAmountField(amountField);
    setLocalMinAmount(minAmount);
    setLocalMaxAmount(maxAmount);
    setLocalDateFrom(dateFrom);
    setLocalDateTo(dateTo);
    setLocalNoPoYet(noPoYet);
    setLocalTaxInvoiceOutstanding(taxInvoiceOutstanding);
  }, [searchParams]);

  // Debounce search input changes (300ms)
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchVal !== search) {
        updateFilters({ search: searchVal });
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchVal]);

  // Fetch projects from SQL backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setError(null);
        setRefetching(true);

        const apiFilters: ProjectFilters = {
          search,
          paymentStatus: status === 'All' ? undefined : (status === 'Fully Paid' ? 'fully_paid' : status === 'Partially Paid' ? 'partially_paid' : 'no_invoices'),
          projectType,
          sortBy,
          sortOrder,
          amountField,
          minAmount,
          maxAmount,
          dateFrom,
          dateTo,
          noPoYet: noPoYet ? true : undefined,
          taxInvoiceOutstanding: taxInvoiceOutstanding ? true : undefined,
        };

        const data = await api.getProjects(apiFilters);
        setProjects(data);
      } catch (err) {
        console.error(err);
        setError("Couldn't load projects — is the backend running?");
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    };
    fetchProjects();
  }, [search, status, projectType, sortBy, sortOrder, amountField, minAmount, maxAmount, dateFrom, dateTo, noPoYet, taxInvoiceOutstanding]);

  // Sync helper to update searchParams
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

  const handleClearAll = () => {
    setSearchVal('');
    setSearchParams(new URLSearchParams());
  };

  const handleApplyAdvanced = () => {
    updateFilters({
      amountField: localAmountField,
      minAmount: localMinAmount,
      maxAmount: localMaxAmount,
      dateFrom: localDateFrom,
      dateTo: localDateTo,
      noPoYet: localNoPoYet ? 'true' : undefined,
      taxInvoiceOutstanding: localTaxInvoiceOutstanding ? 'true' : undefined
    });
    setShowAdvanced(false);
  };

  const handleResetAdvanced = () => {
    setLocalAmountField('po_amount');
    setLocalMinAmount('');
    setLocalMaxAmount('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalNoPoYet(false);
    setLocalTaxInvoiceOutstanding(false);
    
    updateFilters({
      amountField: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      noPoYet: undefined,
      taxInvoiceOutstanding: undefined
    });
    setShowAdvanced(false);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateFilters({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateFilters({ sortBy: field, sortOrder: 'desc' });
    }
  };

  const formatINR = (val: number, abbreviate = true) => {
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

  // Calculations for metric widgets
  const totalPOAmount = projects.reduce((sum, p) => sum + p.poAmount, 0);
  const totalPaidAmount = projects.reduce((sum, p) => sum + p.amountPaid, 0);
  const avgCollectionRate = totalPOAmount > 0 ? (totalPaidAmount / totalPOAmount) * 100 : 0;

  // Active filter checks for "Clear Filters" enabling
  const isAnyFilterActive = 
    search.trim() !== '' ||
    status !== 'All' ||
    projectType !== 'All' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    noPoYet ||
    taxInvoiceOutstanding;

  // Build active filter chips list (only render row if > 1 is applied)
  const activeChips: { id: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    activeChips.push({
      id: 'search',
      label: `Search: "${search}"`,
      clear: () => { setSearchVal(''); updateFilters({ search: undefined }); }
    });
  }
  if (status !== 'All') {
    activeChips.push({
      id: 'status',
      label: `Status: ${status}`,
      clear: () => updateFilters({ status: undefined })
    });
  }
  if (projectType !== 'All') {
    activeChips.push({
      id: 'projectType',
      label: `Type: ${projectType}`,
      clear: () => updateFilters({ projectType: undefined })
    });
  }
  if (minAmount || maxAmount) {
    const labelField = amountField === 'amount_received' ? 'Received' : 'PO Amount';
    let label = '';
    if (minAmount && maxAmount) label = `${labelField}: ₹${minAmount} - ₹${maxAmount}`;
    else if (minAmount) label = `${labelField}: >= ₹${minAmount}`;
    else label = `${labelField}: <= ${maxAmount}`;
    
    activeChips.push({
      id: 'amountRange',
      label,
      clear: () => updateFilters({ amountField: undefined, minAmount: undefined, maxAmount: undefined })
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
      clear: () => updateFilters({ dateFrom: undefined, dateTo: undefined })
    });
  }
  if (noPoYet) {
    activeChips.push({
      id: 'noPoYet',
      label: 'No PO Yet',
      clear: () => updateFilters({ noPoYet: undefined })
    });
  }
  if (taxInvoiceOutstanding) {
    activeChips.push({
      id: 'taxInvoiceOutstanding',
      label: 'Tax Invoice Outstanding',
      clear: () => updateFilters({ taxInvoiceOutstanding: undefined })
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-secondary font-headline text-sm font-semibold">Loading projects portfolio...</p>
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
    <div className="space-y-stack-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-headline font-bold text-secondary mb-2 uppercase tracking-widest">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3 text-outline" />
            <span className="text-primary">Projects</span>
          </nav>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Projects Portfolio</h2>
          <p className="text-secondary text-sm font-sans mt-1">Reviewing projects from PostgreSQL database.</p>
        </div>

        {/* List/Grid toggles */}
        <div className="flex rounded-lg border border-outline-variant overflow-hidden self-end">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 border-r border-outline-variant transition-colors ${
              viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'bg-surface hover:bg-surface-container text-secondary'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 transition-colors ${
              viewMode === 'list' ? 'bg-primary/10 text-primary' : 'bg-surface hover:bg-surface-container text-secondary'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER BAR PANEL (Basic always visible) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Search bar with leading icon */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-outline shrink-0 pointer-events-none" />
            <input 
              type="text" 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search by name or project code..."
              className="pl-10 h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-sans text-on-surface placeholder-secondary focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
            />
            {searchVal && (
              <button 
                onClick={() => setSearchVal('')} 
                className="absolute right-3 top-2.5 text-secondary hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
          >
            <option value="All">All Statuses</option>
            <option value="Fully Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="No Invoices Yet">No Invoices Yet</option>
          </select>

          {/* Project Type Dropdown */}
          <select
            value={projectType}
            onChange={(e) => updateFilters({ projectType: e.target.value })}
            className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[140px]"
          >
            <option value="All">All Types</option>
            {projectTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* More Filters Toggle */}
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`h-10 px-4 py-2 border rounded-lg transition-all font-headline text-sm font-semibold flex items-center gap-2 ${
              showAdvanced || minAmount || maxAmount || dateFrom || dateTo || noPoYet || taxInvoiceOutstanding
                ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                : 'border-outline-variant hover:border-outline text-secondary'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </button>

          {/* Clear Filters Ghost Button */}
          <button 
            onClick={handleClearAll}
            disabled={!isAnyFilterActive}
            className="h-10 px-4 py-2 font-headline text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* ADVANCED FILTER DRAWER PANEL */}
        {showAdvanced && (
          <div className="border-t border-outline-variant pt-6 mt-4 grid grid-cols-1 md:grid-cols-4 gap-6 font-sans">
            
            {/* Column 1: Amount range */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Financial Bounds</span>
              <div className="flex gap-2">
                <select
                  value={localAmountField}
                  onChange={(e) => setLocalAmountField(e.target.value)}
                  className="h-9 text-xs rounded border border-outline-variant bg-surface-container-lowest font-semibold px-2 outline-none cursor-pointer"
                >
                  <option value="po_amount">PO Amount</option>
                  <option value="amount_received">Received</option>
                </select>
                <input 
                  type="number" 
                  value={localMinAmount}
                  onChange={(e) => setLocalMinAmount(e.target.value)}
                  placeholder="Min"
                  className="h-9 w-20 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                />
                <input 
                  type="number" 
                  value={localMaxAmount}
                  onChange={(e) => setLocalMaxAmount(e.target.value)}
                  placeholder="Max"
                  className="h-9 w-20 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                />
              </div>
            </div>

            {/* Column 2: Date range */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Creation Timeline</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={localDateFrom}
                  onChange={(e) => setLocalDateFrom(e.target.value)}
                  className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                />
                <span className="text-secondary text-xs">to</span>
                <input 
                  type="date" 
                  value={localDateTo}
                  onChange={(e) => setLocalDateTo(e.target.value)}
                  className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                />
              </div>
            </div>

            {/* Column 3: Toggles */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Special States</span>
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={localNoPoYet}
                    onChange={(e) => setLocalNoPoYet(e.target.checked)}
                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1"
                  />
                  <span>No PO Yet</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={localTaxInvoiceOutstanding}
                    onChange={(e) => setLocalTaxInvoiceOutstanding(e.target.checked)}
                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1"
                  />
                  <span>Tax Invoice Outstanding</span>
                </label>
              </div>
            </div>

            {/* Column 4: Drawer buttons */}
            <div className="flex items-end justify-end gap-3 font-headline">
              <button 
                onClick={handleResetAdvanced}
                className="px-4 py-2 border border-outline-variant text-secondary hover:bg-surface-container rounded-lg text-xs font-bold transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={handleApplyAdvanced}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                Apply
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ACTIVE FILTER CHIPS (Only show if > 1 is applied) */}
      {activeChips.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low/40 p-2.5 rounded-lg border border-outline-variant/60 font-sans text-xs">
          <span className="font-bold text-secondary mr-1">Active Filters:</span>
          {activeChips.map(chip => (
            <span 
              key={chip.id} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-outline-variant rounded-full text-on-surface font-semibold"
            >
              <span>{chip.label}</span>
              <button 
                onClick={chip.clear} 
                className="p-0.5 rounded-full hover:bg-surface-container text-secondary hover:text-on-surface"
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

      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-md">
        {/* Card 1: Active Projects */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-tight">Matching Projects</span>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{projects.length}</span>
            <span className="text-secondary text-xs">Filtered count</span>
          </div>
        </div>

        {/* Card 2: Total PO Value */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-tight">Total PO Value</span>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{formatINR(totalPOAmount)}</span>
            <span className="text-green-600 text-xs font-semibold flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +12%</span>
          </div>
        </div>

        {/* Card 3: Avg. Collection */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-tight">Avg. Collection</span>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{avgCollectionRate.toFixed(1)}%</span>
            <span className="text-red-600 text-xs font-semibold flex items-center"><TrendingDown className="w-3 h-3 mr-0.5" /> -2%</span>
          </div>
        </div>

        {/* Card 4: Pending Approval */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-tight">Pending Approval</span>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">02</span>
            <span className="text-secondary text-xs font-semibold">Stable</span>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-stack-md transition-opacity duration-200 ${refetching ? 'opacity-60' : 'opacity-100'}`}>
          {projects.map((p) => (
            <div 
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-surface-container-lowest border border-outline-variant hover:border-primary p-6 rounded-md shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between h-[220px]"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="font-headline text-xs font-bold text-primary">{p.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    p.status === 'Fully Paid' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : p.status === 'Partially Paid' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <h4 className="font-headline text-sm font-bold text-on-surface line-clamp-1">{p.name}</h4>
                <p className="text-secondary text-xs font-sans mt-0.5">{p.client}</p>
                <p className="text-secondary text-[11px] font-sans mt-1 line-clamp-2">{p.description}</p>
              </div>

              <div className="border-t border-outline-variant pt-3 mt-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-secondary block text-[10px] uppercase font-bold font-headline tracking-wider">PO Amount</span>
                  <span className="font-bold text-on-surface">{formatINR(p.poAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-secondary block text-[10px] uppercase font-bold font-headline tracking-wider">Paid</span>
                  <span className={`font-bold ${
                    p.status === 'Fully Paid' 
                      ? 'text-green-700' 
                      : p.status === 'Partially Paid' 
                      ? 'text-amber-700' 
                      : 'text-secondary'
                  }`}>{formatINR(p.amountPaid)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View (Table) */
        <div className={`bg-surface-container-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden transition-opacity duration-200 ${refetching ? 'opacity-60' : 'opacity-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                    Project No
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                    No. of PO
                  </th>
                  
                  {/* Clickable sort headers */}
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
                      <span>Received</span>
                      {sortBy === 'amount_received' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('total_amount_paid')} 
                    className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amt Paid</span>
                      {sortBy === 'total_amount_paid' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                    Invoice Amt
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">
                    Tax Invoice
                  </th>
                  <th 
                    onClick={() => handleSort('created_on')} 
                    className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Created Date</span>
                      {sortBy === 'created_on' ? (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-25" />}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider w-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-secondary font-headline">
                      No matching projects in portfolio.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr 
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-5">
                        <span className="font-bold text-primary group-hover:underline">{p.id}</span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-on-surface font-semibold text-sm leading-tight">{p.name}</p>
                        <p className="text-secondary text-xs font-sans mt-0.5">{p.client} &bull; {p.department}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.status === 'Fully Paid' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : p.status === 'Partially Paid' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'Fully Paid' 
                              ? 'bg-green-600' 
                              : p.status === 'Partially Paid' 
                              ? 'bg-amber-600' 
                              : 'bg-gray-400'
                          }`} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-sm">{p.poCount}</td>
                      <td className="px-6 py-5 text-right font-semibold text-sm">{formatINR(p.poAmount, false)}</td>
                      <td className="px-6 py-5 text-right text-sm">{formatINR(p.amountReceived, false)}</td>
                      <td className={`px-6 py-5 text-right font-bold text-sm ${
                        p.status === 'Fully Paid' 
                          ? 'text-green-700' 
                          : p.status === 'Partially Paid' 
                          ? 'text-amber-700' 
                          : 'text-secondary'
                      }`}>
                        {formatINR(p.amountPaid, false)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm">{formatINR(p.invoiceAmount, false)}</td>
                      <td className="px-6 py-5 text-right text-sm">{formatINR(p.taxInvoiceAmount, false)}</td>
                      <td className="px-6 py-5 text-right text-sm font-sans">{p.createdOn || '-'}</td>
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="p-1 hover:bg-surface-container rounded-md text-secondary hover:text-primary transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer metrics showing filtered count */}
          <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between font-sans text-xs text-secondary">
            <span>Showing {projects.length} of {isAnyFilterActive ? (projects as any).totalCount || projects.length : 29} projects</span>
          </div>
        </div>
      )}
    </div>
  );
};
