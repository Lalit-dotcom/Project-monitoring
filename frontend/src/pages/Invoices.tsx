import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MoreVertical, AlertCircle, AlertTriangle, Search, X, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Invoice } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { useCountUp } from '../hooks/useCountUp';
import { toast } from '../lib/toast';

export const Invoices: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Parse filters from URL
  const search = searchParams.get('search') || '';
  const invoiceType = searchParams.get('invoiceType') || 'All';
  const hasObjection = searchParams.get('hasObjection') === 'true';
  const unpaidOnly = searchParams.get('unpaidOnly') === 'true';
  const prjMgrId = searchParams.get('prjMgrId') || 'All';
  const vendorId = searchParams.get('vendorId') || 'All';
  const projectNo = searchParams.get('projectNo') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const invoiceDateFrom = searchParams.get('invoiceDateFrom') || '';
  const invoiceDateTo = searchParams.get('invoiceDateTo') || '';
  const sortBy = searchParams.get('sortBy') || 'invoice_date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const riskOverdueUnpaid = searchParams.get('riskOverdueUnpaid') === 'true';
  const riskDisputedUnpaid = searchParams.get('riskDisputedUnpaid') === 'true';

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [distinctOptions, setDistinctOptions] = useState<{
    invoiceTypes: string[];
    vendors: { vendorId: number; vendorName: string }[];
    managers: { managerId: number; managerName: string }[];
  }>({ invoiceTypes: [], vendors: [], managers: [] });
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
  const [localUnpaidOnly, setLocalUnpaidOnly] = useState(unpaidOnly);
  const [localPrjMgrId, setLocalPrjMgrId] = useState(prjMgrId);
  const [localVendorId, setLocalVendorId] = useState(vendorId);
  const [localRiskOverdueUnpaid, setLocalRiskOverdueUnpaid] = useState(riskOverdueUnpaid);
  const [localRiskDisputedUnpaid, setLocalRiskDisputedUnpaid] = useState(riskDisputedUnpaid);

  // Load distinct values
  useEffect(() => {
    const loadDistinct = async () => {
      try {
        const res = await api.getInvoiceDistinctValues();
        setDistinctOptions(res);
      } catch (err) {
        console.error('Failed to load distinct values for Invoices:', err);
      }
    };
    loadDistinct();
  }, []);

  // Sync local inputs with URL search parameters
  useEffect(() => {
    setSearchVal(search);
  }, [search]);

  useEffect(() => {
    setLocalMinAmount(minAmount);
    setLocalMaxAmount(maxAmount);
    setLocalInvoiceDateFrom(invoiceDateFrom);
    setLocalInvoiceDateTo(invoiceDateTo);
    setLocalUnpaidOnly(unpaidOnly);
    setLocalPrjMgrId(prjMgrId);
    setLocalVendorId(vendorId);
    setLocalRiskOverdueUnpaid(riskOverdueUnpaid);
    setLocalRiskDisputedUnpaid(riskDisputedUnpaid);
  }, [searchParams, showFilterPopover]);

  // Debounced search input (300ms)
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
        const data = await api.getInvoices({
          search,
          invoiceType,
          hasObjection: hasObjection ? true : undefined,
          unpaidOnly: unpaidOnly ? true : undefined,
          prjMgrId,
          vendorId,
          projectNo,
          minAmount,
          maxAmount,
          invoiceDateFrom,
          invoiceDateTo,
          sortBy,
          sortOrder,
          riskOverdueUnpaid: riskOverdueUnpaid ? true : undefined,
          riskDisputedUnpaid: riskDisputedUnpaid ? true : undefined
        });
        setInvoices(data);
        setCurrentPage(1);
      } catch (err: any) {
        console.error(err);
        const msg = "Couldn't load Invoices — check your connection";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    };
    loadData();
  }, [search, invoiceType, hasObjection, unpaidOnly, prjMgrId, vendorId, projectNo, minAmount, maxAmount, invoiceDateFrom, invoiceDateTo, sortBy, sortOrder, riskOverdueUnpaid, riskDisputedUnpaid]);

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
    setLocalInvoiceDateFrom('');
    setLocalInvoiceDateTo('');
    setLocalUnpaidOnly(false);
    setLocalPrjMgrId('All');
    setLocalVendorId('All');
    setLocalRiskOverdueUnpaid(false);
    setLocalRiskDisputedUnpaid(false);
    setSearchParams(new URLSearchParams());
    toast.success('Filters cleared');
  };

  const handleApplyAdvanced = () => {
    updateFilters({
      minAmount: localMinAmount,
      maxAmount: localMaxAmount,
      invoiceDateFrom: localInvoiceDateFrom,
      invoiceDateTo: localInvoiceDateTo,
      unpaidOnly: localUnpaidOnly ? 'true' : undefined,
      prjMgrId: localPrjMgrId,
      vendorId: localVendorId,
      riskOverdueUnpaid: localRiskOverdueUnpaid ? 'true' : undefined,
      riskDisputedUnpaid: localRiskDisputedUnpaid ? 'true' : undefined
    });
    setShowAdvanced(false);
  };

  const handleResetAdvanced = () => {
    setLocalMinAmount('');
    setLocalMaxAmount('');
    setLocalInvoiceDateFrom('');
    setLocalInvoiceDateTo('');
    setLocalUnpaidOnly(false);
    setLocalPrjMgrId('All');
    setLocalVendorId('All');
    setLocalRiskOverdueUnpaid(false);
    setLocalRiskDisputedUnpaid(false);
    updateFilters({
      minAmount: undefined,
      maxAmount: undefined,
      invoiceDateFrom: undefined,
      invoiceDateTo: undefined,
      unpaidOnly: undefined,
      prjMgrId: undefined,
      vendorId: undefined,
      riskOverdueUnpaid: undefined,
      riskDisputedUnpaid: undefined
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
  const totalInvoicedVal = invoices.reduce((sum, i) => sum + (i.invoiceAmount || 0), 0);
  const totalPaidVal = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const totalUnpaidVal = invoices.reduce((sum, i) => sum + (i.unpaid || 0), 0);

  // Count-up animated metrics
  const animatedCount = useCountUp(invoices.length);
  const animatedInvoiced = useCountUp(Math.round(totalInvoicedVal / 100000));
  const animatedPaid = useCountUp(Math.round(totalPaidVal / 100000));
  const animatedUnpaid = useCountUp(Math.round(totalUnpaidVal / 100000));

  const totalItems = invoices.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (error) {
    return (
      <div className="p-8 bg-error-container/10 border border-error-container text-error rounded-md max-w-[600px] mx-auto mt-12 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <p className="font-headline font-bold text-lg mb-2">Couldn't load Invoices</p>
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
    invoiceType !== 'All' ||
    hasObjection ||
    unpaidOnly ||
    prjMgrId !== 'All' ||
    vendorId !== 'All' ||
    projectNo.trim() !== '' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    invoiceDateFrom !== '' ||
    invoiceDateTo !== '' ||
    riskOverdueUnpaid ||
    riskDisputedUnpaid;

  const activeChips: { id: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    activeChips.push({
      id: 'search',
      label: `Search: "${search}"`,
      clear: () => { setSearchVal(''); updateFilters({ search: undefined }); }
    });
  }
  if (invoiceType !== 'All') {
    activeChips.push({
      id: 'invoiceType',
      label: `Type: ${invoiceType}`,
      clear: () => updateFilters({ invoiceType: undefined })
    });
  }
  if (hasObjection) {
    activeChips.push({
      id: 'hasObjection',
      label: 'Has Objection',
      clear: () => updateFilters({ hasObjection: undefined })
    });
  }
  if (unpaidOnly) {
    activeChips.push({
      id: 'unpaidOnly',
      label: 'Unpaid Only',
      clear: () => updateFilters({ unpaidOnly: undefined })
    });
  }
  if (prjMgrId !== 'All') {
    const mgr = distinctOptions.managers.find(m => String(m.managerId) === String(prjMgrId));
    activeChips.push({
      id: 'prjMgrId',
      label: `PM: ${mgr ? mgr.managerName : prjMgrId}`,
      clear: () => updateFilters({ prjMgrId: undefined })
    });
  }
  if (vendorId !== 'All') {
    const vnd = distinctOptions.vendors.find(v => String(v.vendorId) === String(vendorId));
    activeChips.push({
      id: 'vendorId',
      label: `Vendor: ${vnd ? vnd.vendorName : vendorId}`,
      clear: () => updateFilters({ vendorId: undefined })
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
    if (invoiceDateFrom && invoiceDateTo) label = `Date: ${invoiceDateFrom} to ${invoiceDateTo}`;
    else if (invoiceDateFrom) label = `Date after: ${invoiceDateFrom}`;
    else label = `Date before: ${invoiceDateTo}`;
    activeChips.push({
      id: 'invoiceDateRange',
      label,
      clear: () => updateFilters({ invoiceDateFrom: undefined, invoiceDateTo: undefined })
    });
  }
  if (riskOverdueUnpaid) {
    activeChips.push({
      id: 'riskOverdueUnpaid',
      label: 'Overdue & Unpaid',
      clear: () => updateFilters({ riskOverdueUnpaid: undefined })
    });
  }
  if (riskDisputedUnpaid) {
    activeChips.push({
      id: 'riskDisputedUnpaid',
      label: 'Disputed & Still Unpaid',
      clear: () => updateFilters({ riskDisputedUnpaid: undefined })
    });
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Invoices' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Invoices</h2>
          <p className="font-sans text-sm text-secondary mt-1">Unified view of all operational client billing sheets and claim payouts.</p>
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
                placeholder="Search Invoice #, Project, or Vendor..."
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

            {/* Invoice Type Dropdown */}
            <select
              value={invoiceType}
              onChange={(e) => updateFilters({ invoiceType: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
            >
              <option value="All">All Types</option>
              {distinctOptions.invoiceTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Has Objection Toggle Chip */}
            <button
              onClick={() => updateFilters({ hasObjection: hasObjection ? undefined : 'true' })}
              className={`h-10 px-4 py-2 rounded-lg border transition-all font-headline text-sm font-semibold flex items-center gap-2 ${
                hasObjection
                  ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text'
                  : 'border-outline-variant text-secondary hover:border-outline bg-surface-container-lowest'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Has Objection</span>
            </button>

            {/* More Filters Toggle */}
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`h-10 px-4 py-2 border rounded-lg transition-all font-headline text-sm font-semibold flex items-center gap-2 ${
                showAdvanced || minAmount || maxAmount || invoiceDateFrom || invoiceDateTo || unpaidOnly || prjMgrId !== 'All' || vendorId !== 'All'
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
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Invoice Date Range</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={localInvoiceDateFrom}
                      onChange={(e) => setLocalInvoiceDateFrom(e.target.value)}
                      className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                    />
                    <span className="text-secondary text-xs">to</span>
                    <input 
                      type="date" 
                      value={localInvoiceDateTo}
                      onChange={(e) => setLocalInvoiceDateTo(e.target.value)}
                      className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                    />
                  </div>
                </div>

                {/* PM & Vendor dropdowns */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                    {user?.role === 'superadmin' ? 'Staff & Vendors' : 'Vendors'}
                  </span>
                  <div className="flex flex-col gap-2">
                    {user?.role === 'superadmin' && (
                      <select
                        value={localPrjMgrId}
                        onChange={(e) => setLocalPrjMgrId(e.target.value)}
                        className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer font-medium"
                      >
                        <option value="All">All PMs</option>
                        {distinctOptions.managers.map(m => (
                          <option key={m.managerId} value={m.managerId}>{m.managerName}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={localVendorId}
                      onChange={(e) => setLocalVendorId(e.target.value)}
                      className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer font-medium"
                    >
                      <option value="All">All Vendors</option>
                      {distinctOptions.vendors.map(v => (
                        <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checkbox State */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Special States</span>
                  <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={localUnpaidOnly}
                      onChange={(e) => setLocalUnpaidOnly(e.target.checked)}
                      className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1"
                    />
                    <span>Unpaid Only</span>
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
                  {/* Flag 7 */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={localRiskOverdueUnpaid}
                      onChange={(e) => setLocalRiskOverdueUnpaid(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Overdue & Unpaid</span>
                      <span className="text-[10px] text-secondary block leading-normal">
                        Unpaid amount is greater than zero and the invoice is older than the standard 30-day payment term.
                      </span>
                    </div>
                  </label>

                  {/* Flag 8 */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={localRiskDisputedUnpaid}
                      onChange={(e) => setLocalRiskDisputedUnpaid(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Disputed & Still Unpaid</span>
                      <span className="text-[10px] text-secondary block leading-normal">
                        This invoice has an open objection and hasn't been paid yet.
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
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Invoiced</span>
          <span className="font-headline text-2xl font-bold text-on-surface">₹{animatedInvoiced} L</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Paid</span>
          <span className="font-headline text-2xl font-bold text-status-success-text">₹{animatedPaid} L</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Unpaid</span>
          <span className="font-headline text-2xl font-bold text-status-error-text">₹{animatedUnpaid} L</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant border-l-4 border-l-error rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Invoices</span>
          <span className="font-headline text-2xl font-bold text-error">{animatedCount} Records</span>
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
          <table className="w-full text-left border-collapse min-w-[1300px] table-sticky-header">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant select-none">
                <th className="sticky left-0 bg-surface-container-low z-20 border-r border-outline-variant px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">PM</th>
                <th 
                  onClick={() => handleSort('invoice_date')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Invoice Date {sortBy === 'invoice_date' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                <th 
                  onClick={() => handleSort('unpaid')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Unpaid {sortBy === 'unpaid' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice Type</th>
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
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-6 mx-auto"></div></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : paginatedInvoices.length === 0 ? (
                <EmptyState
                  isFiltered={isAnyFilterActive}
                  entityName="invoices"
                  onClear={handleClearAll}
                />
              ) : (
                paginatedInvoices.map((inv, i) => (
                  <tr key={inv.id} className="group hover:bg-surface-container-low transition-colors animate-row-stagger" style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}>
                    <td className="sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors duration-150 z-10 border-r border-outline-variant px-6 py-4 font-headline text-sm font-bold text-primary">
                      {renderFallback(inv.invoiceNum)}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/projects?projectNo=${inv.projectNo}`} className="hover:underline text-primary font-semibold font-sans text-sm">
                        {inv.projectNo}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary" title={inv.vendorName || ''}>
                      {renderFallback(inv.vendorName)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {renderFallback(inv.managerName)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">
                      {formatINR(inv.invoiceAmount, false)}
                    </td>
                    <td className={`px-6 py-4 text-right font-headline text-base font-bold ${
                      inv.amountPaid && inv.invoiceAmount && inv.amountPaid >= inv.invoiceAmount ? 'text-status-success-text' : 'text-on-surface'
                    }`}>
                      {formatINR(inv.amountPaid, false)}
                    </td>
                    <td className={`px-6 py-4 text-right font-headline text-base font-bold ${
                      inv.unpaid && inv.unpaid > 0 ? 'text-status-error-text' : 'text-on-surface'
                    }`}>
                      {formatINR(inv.unpaid, false)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {renderFallback(inv.invoiceType)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {inv.objection && String(inv.objection).trim() !== '' ? (
                        <div className="relative group inline-block">
                          <AlertTriangle className="w-4 h-4 text-status-warning-text cursor-help mx-auto" />
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-inverse-surface text-inverse-on-surface text-[10px] font-sans rounded px-2 py-1 max-w-[250px] min-w-[150px] text-center shadow-lg z-50 whitespace-normal">
                            {inv.objection}
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
            <span>Showing {Math.min(totalItems, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(totalItems, currentPage * rowsPerPage)} of {totalItems} invoices</span>
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
