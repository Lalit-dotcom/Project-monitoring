import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useOutletContext } from 'react-router-dom';
import { AlertCircle, Search, X, Filter, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { TaxInvoice } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { useCountUp } from '../hooks/useCountUp';
import { toast } from '../lib/toast';

export const TaxInvoices: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  // Parse filters from URL
  const search = searchParams.get('search') || '';
  const billStatus = searchParams.get('billStatus') || 'All';
  const state = searchParams.get('state') || 'All';
  const billType = searchParams.get('billType') || 'All';
  const missingIrn = searchParams.get('missingIrn') === 'true';
  const projectNo = searchParams.get('projectNo') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const billDateFrom = searchParams.get('billDateFrom') || '';
  const billDateTo = searchParams.get('billDateTo') || '';
  const sortBy = searchParams.get('sortBy') || 'bill_date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const riskMissingIrn = searchParams.get('riskMissingIrn') === 'true';

  // State
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([]);
  const [distinctOptions, setDistinctOptions] = useState<{
    billStatuses: string[];
    states: string[];
    billTypes: string[];
  }>({ billStatuses: [], states: [], billTypes: [] });
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Local inputs
  const [searchVal, setSearchVal] = useState(search);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showExportPopover, setShowExportPopover] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter Refs
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Close filter/export popovers on click outside or Escape key press
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
      if (
        showExportPopover &&
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(event.target as Node)
      ) {
        setShowExportPopover(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFilterPopover(false);
        setShowExportPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFilterPopover, showExportPopover]);

  // Local advanced fields
  const [localMinAmount, setLocalMinAmount] = useState(minAmount);
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount);
  const [localBillDateFrom, setLocalBillDateFrom] = useState(billDateFrom);
  const [localBillDateTo, setLocalBillDateTo] = useState(billDateTo);
  const [localMissingIrn, setLocalMissingIrn] = useState(missingIrn);
  const [localBillType, setLocalBillType] = useState(billType);
  const [localRiskMissingIrn, setLocalRiskMissingIrn] = useState(riskMissingIrn);

  // Load distinct values
  useEffect(() => {
    const loadDistinct = async () => {
      try {
        const res = await api.getTaxInvoiceDistinctValues();
        setDistinctOptions(res);
      } catch (err) {
        console.error('Failed to load distinct values for Tax Invoices:', err);
      }
    };
    loadDistinct();
  }, []);

  // Sync inputs with URL
  useEffect(() => {
    setSearchVal(search);
  }, [search]);

  // Sync navbar search into local searchVal (which debounces into updateFilters)
  useEffect(() => {
    if (searchQuery !== undefined) setSearchVal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalMinAmount(minAmount);
    setLocalMaxAmount(maxAmount);
    setLocalBillDateFrom(billDateFrom);
    setLocalBillDateTo(billDateTo);
    setLocalMissingIrn(missingIrn);
    setLocalBillType(billType);
    setLocalRiskMissingIrn(riskMissingIrn);
  }, [searchParams, showFilterPopover]);

  // Debounce search (300ms)
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchVal !== search) {
        updateFilters({ search: searchVal });
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchVal]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setRefetching(true);
        setError(null);
        const data = await api.getTaxInvoices({
          search,
          billStatus,
          state,
          billType,
          missingIrn: missingIrn ? true : undefined,
          projectNo,
          minAmount,
          maxAmount,
          billDateFrom,
          billDateTo,
          sortBy,
          sortOrder,
          riskMissingIrn: riskMissingIrn ? true : undefined
        });
        setTaxInvoices(data);
        setCurrentPage(1);
      } catch (err: any) {
        console.error(err);
        const msg = "Couldn't load Tax Invoices — check your connection";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    };
    loadData();
  }, [search, billStatus, state, billType, missingIrn, projectNo, minAmount, maxAmount, billDateFrom, billDateTo, sortBy, sortOrder, riskMissingIrn]);

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
    setLocalMinAmount('');
    setLocalMaxAmount('');
    setLocalBillDateFrom('');
    setLocalBillDateTo('');
    setLocalMissingIrn(false);
    setLocalBillType('All');
    setLocalRiskMissingIrn(false);
    setSearchParams(new URLSearchParams());
    toast.success('Filters cleared');
  };

  const handleApplyAdvanced = () => {
    updateFilters({
      minAmount: localMinAmount,
      maxAmount: localMaxAmount,
      billDateFrom: localBillDateFrom,
      billDateTo: localBillDateTo,
      missingIrn: localMissingIrn ? 'true' : undefined,
      billType: localBillType,
      riskMissingIrn: localRiskMissingIrn ? 'true' : undefined
    });
  };

  const handleResetAdvanced = () => {
    setLocalMinAmount('');
    setLocalMaxAmount('');
    setLocalBillDateFrom('');
    setLocalBillDateTo('');
    setLocalMissingIrn(false);
    setLocalBillType('All');
    setLocalRiskMissingIrn(false);
    updateFilters({
      minAmount: undefined,
      maxAmount: undefined,
      billDateFrom: undefined,
      billDateTo: undefined,
      missingIrn: undefined,
      billType: undefined,
      riskMissingIrn: undefined
    });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateFilters({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateFilters({ sortBy: field, sortOrder: 'desc' });
    }
  };

  const formatINR = (val: number | null | undefined, abbreviate = false) => {
    if (val === null || val === undefined) return '—';
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderFallback = (val: any) => {
    return val === null || val === undefined || String(val).trim() === '' ? '—' : val;
  };

  const formatIRN = (irn: string | null | undefined) => {
    if (!irn || irn.trim() === '') return '—';
    return `${irn.substring(0, 8)}...${irn.substring(irn.length - 4)}`;
  };

  // Metrics
  const totalTaxAmount = taxInvoices.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
  const finalCount = taxInvoices.filter(tx => tx.billStatus === 'FINAL').length;
  const draftCount = taxInvoices.length - finalCount;
  const missingIrnVal = taxInvoices.filter(tx => !tx.irnNo || String(tx.irnNo).trim() === '').length;

  // Count-up animated metrics
  const animatedFinal = useCountUp(finalCount);
  const animatedDraft = useCountUp(draftCount);
  const animatedMissingIrn = useCountUp(missingIrnVal);

  const totalItems = taxInvoices.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedTxs = taxInvoices.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getStatusClasses = (status: string | null | undefined) => {
    if (!status) return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
    const s = status.toUpperCase();
    if (s === 'FINAL') {
      return 'bg-status-success-bg text-status-success-text border-status-success-border';
    } else if (s === 'PENDING' || s === 'DRAFT') {
      return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
    }
    return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  };

  if (error) {
    return (
      <div className="p-8 bg-error-container/10 border border-error-container text-error rounded-md max-w-[600px] mx-auto mt-12 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <p className="font-headline font-bold text-lg mb-2">Couldn't load Tax Invoices</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-error text-white font-headline text-xs font-bold rounded hover:opacity-90 transition-opacity"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Active chips checks
  const isAnyFilterActive = 
    search.trim() !== '' ||
    billStatus !== 'All' ||
    state !== 'All' ||
    billType !== 'All' ||
    missingIrn ||
    projectNo.trim() !== '' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    billDateFrom !== '' ||
    billDateTo !== '' ||
    riskMissingIrn;

  const activeChips: { id: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    activeChips.push({
      id: 'search',
      label: `Search: "${search}"`,
      clear: () => { setSearchVal(''); updateFilters({ search: undefined }); }
    });
  }
  if (billStatus !== 'All') {
    activeChips.push({
      id: 'billStatus',
      label: `Status: ${billStatus}`,
      clear: () => updateFilters({ billStatus: undefined })
    });
  }
  if (state !== 'All') {
    activeChips.push({
      id: 'state',
      label: `State: ${state}`,
      clear: () => updateFilters({ state: undefined })
    });
  }
  if (billType !== 'All') {
    activeChips.push({
      id: 'billType',
      label: `Type: ${billType}`,
      clear: () => updateFilters({ billType: undefined })
    });
  }
  if (missingIrn) {
    activeChips.push({
      id: 'missingIrn',
      label: 'Missing IRN Only',
      clear: () => updateFilters({ missingIrn: undefined })
    });
  }
  if (projectNo.trim()) {
    activeChips.push({
      id: 'projectNo',
      label: `Project: ${projectNo}`,
      clear: () => updateFilters({ projectNo: undefined })
    });
  }
  if (minAmount || maxAmount) {
    let label = '';
    if (minAmount && maxAmount) label = `Amount: ₹${minAmount} - ₹${maxAmount}`;
    else if (minAmount) label = `Amount: >= ₹${minAmount}`;
    else label = `Amount: <= ₹${maxAmount}`;
    activeChips.push({
      id: 'amountRange',
      label,
      clear: () => updateFilters({ minAmount: undefined, maxAmount: undefined })
    });
  }
  if (billDateFrom || billDateTo) {
    let label = '';
    if (billDateFrom && billDateTo) label = `Date: ${billDateFrom} to ${billDateTo}`;
    else if (billDateFrom) label = `Date after: ${billDateFrom}`;
    else label = `Date before: ${billDateTo}`;
    activeChips.push({
      id: 'billDateRange',
      label,
      clear: () => updateFilters({ billDateFrom: undefined, billDateTo: undefined })
    });
  }
  if (riskMissingIrn) {
    activeChips.push({
      id: 'riskMissingIrn',
      label: 'Missing GST e-Invoice',
      clear: () => updateFilters({ riskMissingIrn: undefined })
    });
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Tax Invoices' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Tax Invoices</h2>
          <p className="font-sans text-sm text-secondary mt-1">Track and manage GST-compliant tax invoices and associated metadata.</p>
        </div>
        
        {/* Header Actions: Filter + Download buttons */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-center shrink-0">
          <button 
            ref={filterButtonRef}
            onClick={() => { setShowFilterPopover(!showFilterPopover); setShowExportPopover(false); }}
            className={`h-10 px-4 py-2 border rounded-full font-sans text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
              activeChips.length > 0 
                ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                : 'border-outline-variant hover:border-outline text-secondary bg-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            {activeChips.length > 0 && (
              <span className="flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 ml-1 animate-fade-in-up">
                {activeChips.length}
              </span>
            )}
          </button>

          {/* Download Button */}
          <div className="relative">
            <button
              ref={exportButtonRef}
              onClick={() => { setShowExportPopover(!showExportPopover); setShowFilterPopover(false); }}
              disabled={isExporting}
              className="h-10 px-4 py-2 border border-outline-variant hover:border-outline text-secondary hover:bg-surface-container-low rounded-full font-sans text-xs font-bold flex items-center justify-center gap-2 transition-all bg-white shadow-sm"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
              ) : (
                <Download className="w-4 h-4 text-secondary" />
              )}
              <span>Download</span>
            </button>

            {showExportPopover && (
              <div
                ref={exportDropdownRef}
                className="absolute right-0 mt-2 w-48 bg-surface border border-outline-variant rounded-md shadow-lg z-50 py-1"
              >
                <button
                  onClick={async () => {
                    setShowExportPopover(false);
                    setIsExporting(true);
                    try {
                      await api.exportListFile('tax-invoices', { search, billStatus: billStatus !== 'All' ? billStatus : undefined, state: state !== 'All' ? state : undefined, billType: billType !== 'All' ? billType : undefined, missingIrn: missingIrn || undefined, projectNo: projectNo || undefined, minAmount: minAmount || undefined, maxAmount: maxAmount || undefined, billDateFrom: billDateFrom || undefined, billDateTo: billDateTo || undefined, riskMissingIrn: riskMissingIrn || undefined }, 'excel');
                    } catch (_) {} finally { setIsExporting(false); }
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Download as Excel
                </button>
                <button
                  onClick={async () => {
                    setShowExportPopover(false);
                    setIsExporting(true);
                    try {
                      await api.exportListFile('tax-invoices', { search, billStatus: billStatus !== 'All' ? billStatus : undefined, state: state !== 'All' ? state : undefined, billType: billType !== 'All' ? billType : undefined, missingIrn: missingIrn || undefined, projectNo: projectNo || undefined, minAmount: minAmount || undefined, maxAmount: maxAmount || undefined, billDateFrom: billDateFrom || undefined, billDateTo: billDateTo || undefined, riskMissingIrn: riskMissingIrn || undefined }, 'pdf');
                    } catch (_) {} finally { setIsExporting(false); }
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Download as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER BAR PANEL (Block-level, pushes content down, full width) */}
      {showFilterPopover && (
        <div 
          ref={filterDropdownRef}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm space-y-4 text-left font-sans w-full"
        >
          <div className="flex flex-wrap items-center gap-4">
            {/* Search bar */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-outline shrink-0 pointer-events-none" />
              <input 
                type="text" 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search Bill No, Project, or GSTIN..."
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

            {/* Bill Status Dropdown */}
            <select
              value={billStatus}
              onChange={(e) => updateFilters({ billStatus: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
            >
              <option value="All">All Statuses</option>
              {distinctOptions.billStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* State Dropdown */}
            <select
              value={state}
              onChange={(e) => updateFilters({ state: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
            >
              <option value="All">All States</option>
              {distinctOptions.states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>



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
          <div className="border-t border-outline-variant pt-6 mt-4 space-y-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Amount bounds */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Financial Bounds</span>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={localMinAmount}
                      onChange={(e) => setLocalMinAmount(e.target.value)}
                      placeholder="Min"
                      className="h-9 w-full rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                    />
                    <input 
                      type="number" 
                      value={localMaxAmount}
                      onChange={(e) => setLocalMaxAmount(e.target.value)}
                      placeholder="Max"
                      className="h-9 w-full rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Bill Date Range</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input 
                      type="date" 
                      value={localBillDateFrom}
                      onChange={(e) => setLocalBillDateFrom(e.target.value)}
                      className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface min-w-[120px] flex-1"
                    />
                    <span className="text-secondary text-xs">to</span>
                    <input 
                      type="date" 
                      value={localBillDateTo}
                      onChange={(e) => setLocalBillDateTo(e.target.value)}
                      className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface min-w-[120px] flex-1"
                    />
                  </div>
                </div>

                {/* Bill Type */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Bill Type</span>
                  <select
                    value={localBillType}
                    onChange={(e) => setLocalBillType(e.target.value)}
                    className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer font-medium"
                  >
                    <option value="All">All Types</option>
                    {distinctOptions.billTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Checkbox State */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Special States</span>
                  <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={localMissingIrn}
                      onChange={(e) => setLocalMissingIrn(e.target.checked)}
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1"
                    />
                    <span>Missing IRN Only</span>
                  </label>
                </div>
              </div>

              {/* Risk & Compliance Flags */}
              <div className="pt-4 border-t border-outline-variant/60 space-y-3">
                <div className="flex items-center gap-2 text-error">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Risk & Compliance Flags</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Flag 9 */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={localRiskMissingIrn}
                      onChange={(e) => setLocalRiskMissingIrn(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Missing GST e-Invoice (No IRN)</span>
                      <span className="text-[10px] text-secondary block leading-normal">
                        No IRN has been generated for this tax invoice and it's more than 90 days old — a compliance gap.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Drawer buttons */}
              <div className="flex items-center justify-end gap-3 font-headline pt-4 border-t border-outline-variant/60">
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
        </div>
      )}

      {/* ACTIVE FILTER CHIPS */}
      {activeChips.length > 0 && (
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Tax Invoiced</span>
          <span className="font-headline text-2xl font-bold text-on-surface">{formatINR(totalTaxAmount)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Finalized Invoices</span>
          <span className="font-headline text-2xl font-bold text-status-success-text">{animatedFinal} Final</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Draft Invoices</span>
          <span className="font-headline text-2xl font-bold text-status-warning-text">{animatedDraft} Draft</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant border-l-4 border-l-error rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Missing IRN (Compliance)</span>
          <span className="font-headline text-2xl font-bold text-error">{animatedMissingIrn} Missing</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden shadow-sm relative">
        {refetching && (
          <div className="absolute inset-0 bg-surface/55 z-30 flex items-center justify-center pointer-events-none transition-opacity">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-auto max-h-[calc(100vh-280px)] w-full">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px] table-sticky-header taxinvoices-table-separate">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant select-none">
                <th className="sticky left-0 bg-surface-container-low z-20 border-r border-outline-variant px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider sticky-corner">Bill No</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">GSTIN</th>
                <th 
                  onClick={() => handleSort('bill_date')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Bill Date {sortBy === 'bill_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Billing Period</th>
                <th 
                  onClick={() => handleSort('total_amount')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Total Amount {sortBy === 'total_amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Bill Type</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Bill Status</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">State</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">IRN</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    <td className="sticky left-0 bg-surface-container-lowest border-r border-outline-variant px-6 py-4"><div className="h-4 bg-surface-container rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-32"></div></td>

                  </tr>
                ))
              ) : paginatedTxs.length === 0 ? (
                <EmptyState
                  isFiltered={isAnyFilterActive}
                  entityName="tax invoices"
                  onClear={handleClearAll}
                />
              ) : (
                paginatedTxs.map((tx, i) => (
                  <tr key={tx.id} className="group hover:bg-surface-container-low transition-colors animate-row-stagger" style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}>
                    <td className="sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors duration-150 z-10 border-r border-outline-variant px-6 py-4 font-headline text-sm font-bold text-primary dont-translate bhashini-skip-translation">
                      {renderFallback(tx.userBillNo)}
                    </td>
                    <td className="px-6 py-4 dont-translate bhashini-skip-translation">
                      <Link to={`/projects?projectNo=${tx.projectNo}`} className="hover:underline text-primary font-semibold font-sans text-sm">
                        {tx.projectNo}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary dont-translate bhashini-skip-translation">
                      {renderFallback(tx.custGstinNo)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(tx.billDate)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {tx.billingPeriodFrom && tx.billingPeriodTo
                        ? `${tx.billingPeriodFrom} to ${tx.billingPeriodTo}`
                        : renderFallback(tx.billingPeriodFrom)}
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">
                      {formatINR(tx.totalAmount, false)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {renderFallback(tx.billType)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusClasses(tx.billStatus)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {renderFallback(tx.billStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {renderFallback(tx.stateDescription)}
                    </td>
                    <td className="px-6 py-4 dont-translate bhashini-skip-translation">
                      {tx.irnNo && String(tx.irnNo).trim() !== '' ? (
                        <div className="relative group inline-block font-mono text-xs text-secondary cursor-help">
                          <span>{formatIRN(tx.irnNo)}</span>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-inverse-surface text-inverse-on-surface text-[10px] rounded px-2 py-1 max-w-[300px] min-w-[200px] text-center shadow-lg z-50 break-all font-sans whitespace-normal">
                            {tx.irnNo}
                          </div>
                        </div>
                      ) : (
                        <span className="text-secondary opacity-40">—</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && (
          <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between font-sans text-xs text-secondary">
            <span>Showing {Math.min(totalItems, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(totalItems, currentPage * rowsPerPage)} of {totalItems} tax invoices</span>
            <div className="flex gap-1">
              <button 
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                className="px-2 py-1 border border-outline-variant bg-surface-container-lowest rounded hover:bg-surface disabled:opacity-50"
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <button 
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                className="px-2 py-1 border border-outline-variant bg-surface-container-lowest rounded hover:bg-surface disabled:opacity-50"
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
