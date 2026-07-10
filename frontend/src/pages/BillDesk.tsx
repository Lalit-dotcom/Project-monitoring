import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MoreVertical, AlertCircle, AlertTriangle, Search, X, Filter } from 'lucide-react';
import { api } from '../lib/api';
import type { BillDeskRecord } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { useCountUp } from '../hooks/useCountUp';
import { toast } from '../lib/toast';

export const BillDesk: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'All';
  const invoiceStatus = searchParams.get('invoiceStatus') || 'All';
  const billMonth = searchParams.get('billMonth') || 'All';
  const hasObjectionRemarks = searchParams.get('hasObjectionRemarks') === 'true';
  const projectNo = searchParams.get('projectNo') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const invoiceDateFrom = searchParams.get('invoiceDateFrom') || '';
  const invoiceDateTo = searchParams.get('invoiceDateTo') || '';
  const receivedDateFrom = searchParams.get('receivedDateFrom') || '';
  const receivedDateTo = searchParams.get('receivedDateTo') || '';
  const sortBy = searchParams.get('sortBy') || 'invoice_date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // State
  const [billDesk, setBillDesk] = useState<BillDeskRecord[]>([]);
  const [distinctOptions, setDistinctOptions] = useState<{
    statuses: string[];
    invoiceStatuses: string[];
    billMonths: string[];
  }>({ statuses: [], invoiceStatuses: [], billMonths: [] });
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Local inputs
  const [searchVal, setSearchVal] = useState(search);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter Refs
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

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

  // Local advanced fields
  const [localMinAmount, setLocalMinAmount] = useState(minAmount);
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount);
  const [localInvoiceDateFrom, setLocalInvoiceDateFrom] = useState(invoiceDateFrom);
  const [localInvoiceDateTo, setLocalInvoiceDateTo] = useState(invoiceDateTo);
  const [localReceivedDateFrom, setLocalReceivedDateFrom] = useState(receivedDateFrom);
  const [localReceivedDateTo, setLocalReceivedDateTo] = useState(receivedDateTo);
  const [localHasObjectionRemarks, setLocalHasObjectionRemarks] = useState(hasObjectionRemarks);
  const [localBillMonth, setLocalBillMonth] = useState(billMonth);

  // Load distinct options
  useEffect(() => {
    const loadDistinct = async () => {
      try {
        const res = await api.getBillDeskDistinctValues();
        setDistinctOptions(res);
      } catch (err) {
        console.error('Failed to load distinct values for Bill Desk:', err);
      }
    };
    loadDistinct();
  }, []);

  // Sync inputs with URL
  useEffect(() => {
    setSearchVal(search);
  }, [search]);

  useEffect(() => {
    setLocalMinAmount(minAmount);
    setLocalMaxAmount(maxAmount);
    setLocalInvoiceDateFrom(invoiceDateFrom);
    setLocalInvoiceDateTo(invoiceDateTo);
    setLocalReceivedDateFrom(receivedDateFrom);
    setLocalReceivedDateTo(receivedDateTo);
    setLocalHasObjectionRemarks(hasObjectionRemarks);
    setLocalBillMonth(billMonth);
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
        const data = await api.getBillDesk({
          search,
          status,
          invoiceStatus,
          billMonth,
          hasObjectionRemarks: hasObjectionRemarks ? true : undefined,
          projectNo,
          minAmount,
          maxAmount,
          invoiceDateFrom,
          invoiceDateTo,
          receivedDateFrom,
          receivedDateTo,
          sortBy,
          sortOrder
        });
        setBillDesk(data);
        setCurrentPage(1);
      } catch (err: any) {
        console.error(err);
        const msg = "Couldn't load Bill Desk — check your connection";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    };
    loadData();
  }, [search, status, invoiceStatus, billMonth, hasObjectionRemarks, projectNo, minAmount, maxAmount, invoiceDateFrom, invoiceDateTo, receivedDateFrom, receivedDateTo, sortBy, sortOrder]);

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
    toast.success('Filters cleared');
  };

  const handleApplyAdvanced = () => {
    updateFilters({
      minAmount: localMinAmount,
      maxAmount: localMaxAmount,
      invoiceDateFrom: localInvoiceDateFrom,
      invoiceDateTo: localInvoiceDateTo,
      receivedDateFrom: localReceivedDateFrom,
      receivedDateTo: localReceivedDateTo,
      hasObjectionRemarks: localHasObjectionRemarks ? 'true' : undefined,
      billMonth: localBillMonth
    });
    setShowAdvanced(false);
  };

  const handleResetAdvanced = () => {
    setLocalMinAmount('');
    setLocalMaxAmount('');
    setLocalInvoiceDateFrom('');
    setLocalInvoiceDateTo('');
    setLocalReceivedDateFrom('');
    setLocalReceivedDateTo('');
    setLocalHasObjectionRemarks(false);
    setLocalBillMonth('All');
    updateFilters({
      minAmount: undefined,
      maxAmount: undefined,
      invoiceDateFrom: undefined,
      invoiceDateTo: undefined,
      receivedDateFrom: undefined,
      receivedDateTo: undefined,
      hasObjectionRemarks: undefined,
      billMonth: undefined
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

  // Metrics
  const totalOutstanding = billDesk.reduce((sum, b) => sum + ((b.invoiceAmount || 0) - (b.amountPaid || 0)), 0);
  const totalInvoices = billDesk.length;
  const paymentDoneCount = billDesk.filter(b => b.status === 'Payment Done').length;
  const processingCount = totalInvoices - paymentDoneCount;

  // Count-up animated metrics
  const animatedTotal = useCountUp(totalInvoices);
  const animatedDone = useCountUp(paymentDoneCount);
  const animatedProcessing = useCountUp(processingCount);
  const animatedOutstanding = useCountUp(Math.round(totalOutstanding / 100000));

  const totalPages = Math.ceil(totalInvoices / rowsPerPage) || 1;
  const paginatedBills = billDesk.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getInvoiceStatusClasses = (status: string | null | undefined) => {
    if (!status) return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
    const s = status.toUpperCase();
    if (s === '30' || s === 'PAID') {
      return 'bg-status-success-bg text-status-success-text border-status-success-border';
    } else if (s === '34' || s === 'PENDING') {
      return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
    }
    return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  };

  const getStatusClasses = (status: string | null | undefined) => {
    if (!status) return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('paid') || s.includes('approved')) {
      return 'bg-status-success-bg text-status-success-text border-status-success-border';
    } else if (s.includes('pending') || s.includes('process')) {
      return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
    }
    return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  };

  if (error) {
    return (
      <div className="p-8 bg-error-container/10 border border-error-container text-error rounded-md max-w-[600px] mx-auto mt-12 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <p className="font-headline font-bold text-lg mb-2">Couldn't load Bill Desk</p>
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
    status !== 'All' ||
    invoiceStatus !== 'All' ||
    billMonth !== 'All' ||
    hasObjectionRemarks ||
    projectNo.trim() !== '' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    invoiceDateFrom !== '' ||
    invoiceDateTo !== '' ||
    receivedDateFrom !== '' ||
    receivedDateTo !== '';

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
  if (invoiceStatus !== 'All') {
    activeChips.push({
      id: 'invoiceStatus',
      label: `Inv Status: ${invoiceStatus}`,
      clear: () => updateFilters({ invoiceStatus: undefined })
    });
  }
  if (billMonth !== 'All') {
    activeChips.push({
      id: 'billMonth',
      label: `Month: ${billMonth}`,
      clear: () => updateFilters({ billMonth: undefined })
    });
  }
  if (hasObjectionRemarks) {
    activeChips.push({
      id: 'hasObjectionRemarks',
      label: 'With Objection Remarks',
      clear: () => updateFilters({ hasObjectionRemarks: undefined })
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
  if (invoiceDateFrom || invoiceDateTo) {
    let label = '';
    if (invoiceDateFrom && invoiceDateTo) label = `Invoice Date: ${invoiceDateFrom} to ${invoiceDateTo}`;
    else if (invoiceDateFrom) label = `Invoice Date after: ${invoiceDateFrom}`;
    else label = `Invoice Date before: ${invoiceDateTo}`;
    activeChips.push({
      id: 'invoiceDateRange',
      label,
      clear: () => updateFilters({ invoiceDateFrom: undefined, invoiceDateTo: undefined })
    });
  }
  if (receivedDateFrom || receivedDateTo) {
    let label = '';
    if (receivedDateFrom && receivedDateTo) label = `Received: ${receivedDateFrom} to ${receivedDateTo}`;
    else if (receivedDateFrom) label = `Received after: ${receivedDateFrom}`;
    else label = `Received before: ${receivedDateTo}`;
    activeChips.push({
      id: 'receivedDateRange',
      label,
      clear: () => updateFilters({ receivedDateFrom: undefined, receivedDateTo: undefined })
    });
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Bill Desk' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Bill Desk</h2>
          <p className="font-sans text-sm text-secondary mt-1">Review and reconcile invoice queues and payouts logged in Bill Desk.</p>
        </div>
        
        {/* Header Action: Filter Toggle Button */}
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          <button 
            ref={filterButtonRef}
            onClick={() => { setShowFilterPopover(!showFilterPopover); }}
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
                placeholder="Search Invoice No, Project, or Vendor..."
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

            {/* Status Dropdown */}
            <select
              value={status}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
            >
              <option value="All">All Statuses</option>
              {distinctOptions.statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Invoice Status Dropdown */}
            <select
              value={invoiceStatus}
              onChange={(e) => updateFilters({ invoiceStatus: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
            >
              <option value="All">All Inv Statuses</option>
              {distinctOptions.invoiceStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* More Filters Toggle */}
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`h-10 px-4 py-2 border rounded-lg transition-all font-headline text-sm font-semibold flex items-center gap-2 ${
                showAdvanced || minAmount || maxAmount || invoiceDateFrom || invoiceDateTo || receivedDateFrom || receivedDateTo || hasObjectionRemarks || billMonth !== 'All'
                  ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                  : 'border-outline-variant hover:border-outline text-secondary bg-white'
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

              {/* Timelines */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Date Ranges</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-secondary text-[10px] w-8">Inv:</span>
                    <input 
                      type="date" 
                      value={localInvoiceDateFrom}
                      onChange={(e) => setLocalInvoiceDateFrom(e.target.value)}
                      className="h-8 rounded border border-outline-variant text-[11px] px-1 outline-none text-on-surface"
                    />
                    <span className="text-secondary text-[10px]">-</span>
                    <input 
                      type="date" 
                      value={localInvoiceDateTo}
                      onChange={(e) => setLocalInvoiceDateTo(e.target.value)}
                      className="h-8 rounded border border-outline-variant text-[11px] px-1 outline-none text-on-surface"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary text-[10px] w-8">Recv:</span>
                    <input 
                      type="date" 
                      value={localReceivedDateFrom}
                      onChange={(e) => setLocalReceivedDateFrom(e.target.value)}
                      className="h-8 rounded border border-outline-variant text-[11px] px-1 outline-none text-on-surface"
                    />
                    <span className="text-secondary text-[10px]">-</span>
                    <input 
                      type="date" 
                      value={localReceivedDateTo}
                      onChange={(e) => setLocalReceivedDateTo(e.target.value)}
                      className="h-8 rounded border border-outline-variant text-[11px] px-1 outline-none text-on-surface"
                    />
                  </div>
                </div>
              </div>

              {/* Bill Month */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Timeline Scope</span>
                <select
                  value={localBillMonth}
                  onChange={(e) => setLocalBillMonth(e.target.value)}
                  className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer font-medium"
                >
                  <option value="All">All Months</option>
                  {distinctOptions.billMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Toggles & Actions */}
              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Special States</span>
                  <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={localHasObjectionRemarks}
                      onChange={(e) => setLocalHasObjectionRemarks(e.target.checked)}
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1"
                    />
                    <span>Has Objection Remarks</span>
                  </label>
                </div>

                <div className="flex items-end justify-end gap-3 font-headline pt-2">
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
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Outstanding</span>
          <span className="font-headline text-2xl font-bold text-on-surface">₹{animatedOutstanding} L</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Settlement Rate</span>
          <span className="font-headline text-2xl font-bold text-primary">
            {totalInvoices > 0 ? `${((paymentDoneCount / totalInvoices) * 100).toFixed(0)}%` : '0%'}
            <span className="text-xs text-secondary font-normal ml-2">({animatedDone} of {animatedTotal})</span>
          </span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Payment Done</span>
          <span className="font-headline text-2xl font-bold text-status-success-text">{animatedDone} Done</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">In Process</span>
          <span className="font-headline text-2xl font-bold text-status-warning-text">{animatedProcessing} Processing</span>
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
          <table className="w-full text-left border-collapse min-w-[1500px] table-sticky-header">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant select-none">
                <th className="sticky left-0 bg-surface-container-low z-25 border-r border-outline-variant px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Bill Month</th>
                <th 
                  onClick={() => handleSort('invoice_date')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Invoice Date {sortBy === 'invoice_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('received_date')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Received Date {sortBy === 'received_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('invoice_amount')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Invoice Amount {sortBy === 'invoice_amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('amount_paid')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Amount Paid {sortBy === 'amount_paid' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice Status</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-center">Objection</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    <td className="sticky left-0 bg-surface-container-lowest border-r border-outline-variant px-6 py-4"><div className="h-4 bg-surface-container rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-6 mx-auto"></div></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : paginatedBills.length === 0 ? (
                <EmptyState
                  isFiltered={isAnyFilterActive}
                  entityName="bill desk records"
                  onClear={handleClearAll}
                />
              ) : (
                paginatedBills.map((b, i) => (
                  <tr key={b.id} className="group hover:bg-surface-container-low transition-colors animate-row-stagger" style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}>
                    <td className="sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors duration-150 z-10 border-r border-outline-variant px-6 py-4 font-headline text-sm font-bold text-on-surface">
                      {renderFallback(b.invoiceNo)}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/projects?projectNo=${b.projectNo}`} className="hover:underline text-primary font-semibold font-sans text-sm">
                        {b.projectNo}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary" title={b.vendorName || ''}>
                      {renderFallback(b.vendorName)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {renderFallback(b.billMonth)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(b.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(b.receivedDate)}
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">
                      {formatINR(b.invoiceAmount, false)}
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">
                      {formatINR(b.amountPaid, false)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getInvoiceStatusClasses(b.invoiceStatus)}`}>
                        {renderFallback(b.invoiceStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusClasses(b.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {renderFallback(b.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {b.objectionRemarks && String(b.objectionRemarks).trim() !== '' ? (
                        <div className="relative group inline-block">
                          <AlertTriangle className="w-4 h-4 text-status-warning-text cursor-help mx-auto" />
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-inverse-surface text-inverse-on-surface text-[10px] font-sans rounded px-2 py-1 max-w-[250px] min-w-[150px] text-center shadow-lg z-50 whitespace-normal">
                            {b.objectionRemarks}
                          </div>
                        </div>
                      ) : (
                        <span className="text-secondary opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-secondary hover:text-primary"><MoreVertical className="w-5 h-5" /></button>
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
            <span>Showing {Math.min(totalInvoices, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(totalInvoices, currentPage * rowsPerPage)} of {totalInvoices} records</span>
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
