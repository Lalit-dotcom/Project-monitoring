import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { AlertCircle, Search, X, Filter, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { PurchaseOrder } from '../types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { useCountUp } from '../hooks/useCountUp';
import { toast } from '../lib/toast';

export const PurchaseOrders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  // Parse filters from URL
  const search = searchParams.get('search') || '';
  const approvalStatus = searchParams.get('approvalStatus') || 'All';
  const vendorId = searchParams.get('vendorId') || 'All';
  const projectNo = searchParams.get('projectNo') || '';
  const minTotal = searchParams.get('minTotal') || '';
  const maxTotal = searchParams.get('maxTotal') || '';
  const poDateFrom = searchParams.get('poDateFrom') || '';
  const poDateTo = searchParams.get('poDateTo') || '';
  const validity = searchParams.get('validity') || 'All';
  const expiringInMonths = searchParams.get('expiringInMonths') || '';
  const sortBy = searchParams.get('sortBy') || 'po_date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const riskExpiringLowCollection = searchParams.get('riskExpiringLowCollection') === 'true';
  const riskExpiredUncollected = searchParams.get('riskExpiredUncollected') === 'true';
  const riskStalled = searchParams.get('riskStalled') === 'true';

  // State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [distinctOptions, setDistinctOptions] = useState<{
    approvalStatuses: string[];
    vendors: { vendorId: number; vendorName: string }[];
  }>({ approvalStatuses: [], vendors: [] });
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

  // Local advanced fields (applied on Apply click)
  const [localMinTotal, setLocalMinTotal] = useState(minTotal);
  const [localMaxTotal, setLocalMaxTotal] = useState(maxTotal);
  const [localPoDateFrom, setLocalPoDateFrom] = useState(poDateFrom);
  const [localPoDateTo, setLocalPoDateTo] = useState(poDateTo);
  const [localValidity, setLocalValidity] = useState(validity);
  const [localExpiringInMonths, setLocalExpiringInMonths] = useState(expiringInMonths);
  const [localRiskExpiringLowCollection, setLocalRiskExpiringLowCollection] = useState(riskExpiringLowCollection);
  const [localRiskExpiredUncollected, setLocalRiskExpiredUncollected] = useState(riskExpiredUncollected);
  const [localRiskStalled, setLocalRiskStalled] = useState(riskStalled);

  // Load distinct values
  useEffect(() => {
    const loadDistinct = async () => {
      try {
        const res = await api.getPurchaseOrderDistinctValues();
        setDistinctOptions(res);
      } catch (err) {
        console.error('Failed to load distinct values for POs:', err);
      }
    };
    loadDistinct();
  }, []);

  // Sync local inputs with URL search parameters
  useEffect(() => {
    setSearchVal(search);
  }, [search]);

  // Sync navbar search into local searchVal (which debounces into updateFilters)
  useEffect(() => {
    if (searchQuery !== undefined) setSearchVal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalMinTotal(minTotal);
    setLocalMaxTotal(maxTotal);
    setLocalPoDateFrom(poDateFrom);
    setLocalPoDateTo(poDateTo);
    setLocalValidity(validity);
    setLocalExpiringInMonths(expiringInMonths);
    setLocalRiskExpiringLowCollection(riskExpiringLowCollection);
    setLocalRiskExpiredUncollected(riskExpiredUncollected);
    setLocalRiskStalled(riskStalled);
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
        const data = await api.getPurchaseOrders({
          search,
          approvalStatus,
          vendorId,
          projectNo,
          minTotal,
          maxTotal,
          poDateFrom,
          poDateTo,
          validity,
          sortBy,
          sortOrder,
          expiringInMonths,
          riskExpiringLowCollection: riskExpiringLowCollection ? true : undefined,
          riskExpiredUncollected: riskExpiredUncollected ? true : undefined,
          riskStalled: riskStalled ? true : undefined
        });
        setPurchaseOrders(data);
        setCurrentPage(1); // Reset page on filter changes
      } catch (err: any) {
        console.error(err);
        const msg = "Couldn't load Purchase Orders — check your connection";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefetching(false);
      }
    };
    loadData();
  }, [search, approvalStatus, vendorId, projectNo, minTotal, maxTotal, poDateFrom, poDateTo, validity, sortBy, sortOrder, expiringInMonths, riskExpiringLowCollection, riskExpiredUncollected, riskStalled]);

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
    setLocalMinTotal('');
    setLocalMaxTotal('');
    setLocalPoDateFrom('');
    setLocalPoDateTo('');
    setLocalValidity('All');
    setLocalExpiringInMonths('');
    setLocalRiskExpiringLowCollection(false);
    setLocalRiskExpiredUncollected(false);
    setLocalRiskStalled(false);
    setSearchParams(new URLSearchParams());
    toast.success('Filters cleared');
  };

  const handleApplyAdvanced = () => {
    updateFilters({
      minTotal: localMinTotal,
      maxTotal: localMaxTotal,
      poDateFrom: localPoDateFrom,
      poDateTo: localPoDateTo,
      validity: localValidity,
      expiringInMonths: localExpiringInMonths,
      riskExpiringLowCollection: localRiskExpiringLowCollection ? 'true' : undefined,
      riskExpiredUncollected: localRiskExpiredUncollected ? 'true' : undefined,
      riskStalled: localRiskStalled ? 'true' : undefined
    });
  };

  const handleResetAdvanced = () => {
    setLocalMinTotal('');
    setLocalMaxTotal('');
    setLocalPoDateFrom('');
    setLocalPoDateTo('');
    setLocalValidity('All');
    setLocalExpiringInMonths('');
    setLocalRiskExpiringLowCollection(false);
    setLocalRiskExpiredUncollected(false);
    setLocalRiskStalled(false);
    updateFilters({
      minTotal: undefined,
      maxTotal: undefined,
      poDateFrom: undefined,
      poDateTo: undefined,
      validity: undefined,
      expiringInMonths: undefined,
      riskExpiringLowCollection: undefined,
      riskExpiredUncollected: undefined,
      riskStalled: undefined
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

  // Metrics
  const totalPOAmount = purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const approvedCount = purchaseOrders.filter(po => po.approvalStatus === 'DISPATCHED' || po.approvalStatus === 'APPROVED').length;
  const pendingCount = purchaseOrders.filter(po => po.approvalStatus === 'PENDING').length;
  const activeCount = (purchaseOrders as any).activeCount || 0;
  const expiredCount = (purchaseOrders as any).expiredCount || 0;

  // Count-up animated metric values
  const animatedTotal = useCountUp(Math.round(totalPOAmount / 100000));
  const animatedApproved = useCountUp(approvedCount);
  const animatedPending = useCountUp(pendingCount);
  const animatedCount = useCountUp(purchaseOrders.length);
  const animatedActive = useCountUp(activeCount);
  const animatedExpired = useCountUp(expiredCount);

  const totalItems = purchaseOrders.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedPOs = purchaseOrders.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getStatusClasses = (status: string | null | undefined) => {
    if (!status) return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
    const s = status.toUpperCase();
    if (s === 'DISPATCHED' || s === 'APPROVED') {
      return 'bg-status-success-bg text-status-success-text border-status-success-border';
    } else if (s === 'PENDING') {
      return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
    }
    return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  };

  // Filter chips
  const isAnyFilterActive = 
    search.trim() !== '' ||
    approvalStatus !== 'All' ||
    vendorId !== 'All' ||
    projectNo.trim() !== '' ||
    minTotal !== '' ||
    maxTotal !== '' ||
    poDateFrom !== '' ||
    poDateTo !== '' ||
    validity !== 'All' ||
    expiringInMonths !== '' ||
    riskExpiringLowCollection ||
    riskExpiredUncollected ||
    riskStalled;

  const activeChips: { id: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    activeChips.push({
      id: 'search',
      label: `Search: "${search}"`,
      clear: () => { setSearchVal(''); updateFilters({ search: undefined }); }
    });
  }
  if (approvalStatus !== 'All') {
    activeChips.push({
      id: 'approvalStatus',
      label: `Status: ${approvalStatus}`,
      clear: () => updateFilters({ approvalStatus: undefined })
    });
  }
  if (vendorId !== 'All') {
    const selectedVendor = distinctOptions.vendors.find(v => String(v.vendorId) === vendorId);
    activeChips.push({
      id: 'vendorId',
      label: `Vendor: ${selectedVendor ? selectedVendor.vendorName : vendorId}`,
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
  if (minTotal || maxTotal) {
    let label = '';
    if (minTotal && maxTotal) label = `Total: ₹${minTotal} - ₹${maxTotal}`;
    else if (minTotal) label = `Total: >= ₹${minTotal}`;
    else label = `Total: <= ₹${maxTotal}`;
    activeChips.push({
      id: 'totalRange',
      label,
      clear: () => updateFilters({ minTotal: undefined, maxTotal: undefined })
    });
  }
  if (poDateFrom || poDateTo) {
    let label = '';
    if (poDateFrom && poDateTo) label = `Date: ${poDateFrom} to ${poDateTo}`;
    else if (poDateFrom) label = `Date after: ${poDateFrom}`;
    else label = `Date before: ${poDateTo}`;
    activeChips.push({
      id: 'poDateRange',
      label,
      clear: () => updateFilters({ poDateFrom: undefined, poDateTo: undefined })
    });
  }
  if (validity !== 'All') {
    activeChips.push({
      id: 'validity',
      label: `Validity: ${validity.toUpperCase()}`,
      clear: () => updateFilters({ validity: undefined })
    });
  }
  if (expiringInMonths) {
    activeChips.push({
      id: 'expiringInMonths',
      label: `Expiring within: ${expiringInMonths} mo`,
      clear: () => { setLocalExpiringInMonths(''); updateFilters({ expiringInMonths: undefined }); }
    });
  }
  if (riskExpiringLowCollection) {
    activeChips.push({
      id: 'riskExpiringLowCollection',
      label: 'Expiring Soon & Low Collection',
      clear: () => updateFilters({ riskExpiringLowCollection: undefined })
    });
  }
  if (riskExpiredUncollected) {
    activeChips.push({
      id: 'riskExpiredUncollected',
      label: 'Expired & Still Uncollected',
      clear: () => updateFilters({ riskExpiredUncollected: undefined })
    });
  }
  if (riskStalled) {
    activeChips.push({
      id: 'riskStalled',
      label: 'Stalled — No Billing Yet',
      clear: () => updateFilters({ riskStalled: undefined })
    });
  }

  if (error) {
    return (
      <div className="p-8 bg-error-container/10 border border-error-container text-error rounded-md max-w-[600px] mx-auto mt-12 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <p className="font-headline font-bold text-lg mb-2">Couldn't load Purchase Orders</p>
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

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Purchase Orders' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Purchase Orders</h2>
          <p className="font-sans text-sm text-secondary mt-1">Review and manage authorized purchase orders across all contract structures.</p>
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
                      await api.exportListFile('purchase-orders', { search, approvalStatus: approvalStatus !== 'All' ? approvalStatus : undefined, vendorId: vendorId !== 'All' ? vendorId : undefined, projectNo: projectNo || undefined, minTotal: minTotal || undefined, maxTotal: maxTotal || undefined, poDateFrom: poDateFrom || undefined, poDateTo: poDateTo || undefined, validity: validity !== 'All' ? validity : undefined, expiringInMonths: expiringInMonths || undefined, riskExpiringLowCollection: riskExpiringLowCollection || undefined, riskExpiredUncollected: riskExpiredUncollected || undefined, riskStalled: riskStalled || undefined }, 'excel');
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
                      await api.exportListFile('purchase-orders', { search, approvalStatus: approvalStatus !== 'All' ? approvalStatus : undefined, vendorId: vendorId !== 'All' ? vendorId : undefined, projectNo: projectNo || undefined, minTotal: minTotal || undefined, maxTotal: maxTotal || undefined, poDateFrom: poDateFrom || undefined, poDateTo: poDateTo || undefined, validity: validity !== 'All' ? validity : undefined, expiringInMonths: expiringInMonths || undefined, riskExpiringLowCollection: riskExpiringLowCollection || undefined, riskExpiredUncollected: riskExpiredUncollected || undefined, riskStalled: riskStalled || undefined }, 'pdf');
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
                placeholder="Search PO Number, Project, or Vendor..."
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

            {/* Approval Status Dropdown */}
            <select
              value={approvalStatus}
              onChange={(e) => updateFilters({ approvalStatus: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer min-w-[150px]"
            >
              <option value="All">All Statuses</option>
              {distinctOptions.approvalStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Vendor Dropdown */}
            <select
              value={vendorId}
              onChange={(e) => updateFilters({ vendorId: e.target.value })}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer max-w-[200px]"
            >
              <option value="All">All Vendors</option>
              {distinctOptions.vendors.map(v => (
                <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {/* Amount Bounds */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Financial Bounds</span>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={localMinTotal}
                      onChange={(e) => setLocalMinTotal(e.target.value)}
                      placeholder="Min"
                      className="h-9 w-full rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                    />
                    <input 
                      type="number" 
                      value={localMaxTotal}
                      onChange={(e) => setLocalMaxTotal(e.target.value)}
                      placeholder="Max"
                      className="h-9 w-full rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Issued Timeline</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input 
                      type="date" 
                      value={localPoDateFrom}
                      onChange={(e) => setLocalPoDateFrom(e.target.value)}
                      className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface min-w-[120px] flex-1"
                    />
                    <span className="text-secondary text-xs">to</span>
                    <input 
                      type="date" 
                      value={localPoDateTo}
                      onChange={(e) => setLocalPoDateTo(e.target.value)}
                      className="h-9 rounded border border-outline-variant text-xs px-2 outline-none text-on-surface min-w-[120px] flex-1"
                    />
                  </div>
                </div>

                {/* Validity Toggle */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Validity State</span>
                  <select
                    value={localValidity}
                    onChange={(e) => setLocalValidity(e.target.value)}
                    className="h-9 w-full rounded border border-outline-variant bg-surface-container-lowest text-xs px-2 outline-none cursor-pointer font-medium"
                  >
                    <option value="All">All Periods</option>
                    <option value="active">Active Only (Unexpired)</option>
                    <option value="expired">Expired Only</option>
                  </select>
                </div>

                {/* Expiring Within N Months */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Expiring within (months)</span>
                  <input 
                    type="number"
                    min="1"
                    value={localExpiringInMonths}
                    onChange={(e) => setLocalExpiringInMonths(e.target.value)}
                    placeholder="e.g. 3"
                    className="h-9 w-full rounded border border-outline-variant text-xs px-2 outline-none text-on-surface"
                  />
                  <p className="text-[10px] text-secondary leading-tight">Shows active POs expiring soon, not already-expired ones.</p>
                </div>
              </div>

              {/* Risk & Compliance Flags */}
              <div className="pt-4 border-t border-outline-variant/60 space-y-3">
                <div className="flex items-center gap-2 text-error">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Risk & Compliance Flags</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Flag 4 */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={localRiskExpiringLowCollection}
                      onChange={(e) => setLocalRiskExpiringLowCollection(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Expiring Soon + Low Collection</span>
                      <span className="text-[10px] text-secondary block leading-normal">
                        This PO expires within the selected window and client collection is still below 80% of the PO value.
                      </span>
                    </div>
                  </label>

                  {/* Flag 5 */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={localRiskExpiredUncollected}
                      onChange={(e) => setLocalRiskExpiredUncollected(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Expired + Still Uncollected</span>
                      <span className="text-[10px] text-secondary block leading-normal">
                        This PO's validity has already ended, but client collection is still below the PO value.
                      </span>
                    </div>
                  </label>

                  {/* Flag 6 */}
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:border-outline bg-surface-container-lowest cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={localRiskStalled}
                      onChange={(e) => setLocalRiskStalled(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded focus:ring-primary focus:ring-1 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-on-surface block">Stalled — No Billing Yet</span>
                      <span className="text-[10px] text-secondary block leading-normal">
                        A purchase order was raised over 60 days ago but no invoices have been billed on this project yet.
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
            onClick={() => {
              handleClearAll();
              toast.success("Filters cleared");
            }}
            className="text-primary hover:underline font-bold ml-auto text-xs"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total PO Registry</span>
          <span className="font-headline text-2xl font-bold text-on-surface">{animatedCount} POs</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total PO Capital</span>
          <span className="font-headline text-2xl font-bold text-on-surface">₹{animatedTotal} L</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm border-l-4 border-l-[#0D9488]">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Active POs</span>
          <span className="font-headline text-2xl font-bold text-[#0D9488]">{animatedActive} Valid</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm border-l-4 border-l-error">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Expired POs</span>
          <span className="font-headline text-2xl font-bold text-error">{animatedExpired} Expired</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Approved & Locked</span>
          <span className="font-headline text-2xl font-bold text-status-success-text">{animatedApproved} Approved</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Awaiting Release</span>
          <span className="font-headline text-2xl font-bold text-status-warning-text">{animatedPending} Pending</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden shadow-sm relative">
        {refetching && (
          <div className="absolute inset-0 bg-surface/55 z-30 flex items-center justify-center pointer-events-none transition-opacity">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="max-h-[calc(100vh-280px)] overflow-auto w-full">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px] table-sticky-header purchase-orders-table-separate">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant select-none">
                <th 
                  onClick={() => handleSort('final_po_no')}
                  className="sticky left-0 bg-surface-container-low z-20 border-r border-outline-variant px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors sticky-corner"
                >
                  PO Number {sortBy === 'final_po_no' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Vendor</th>
                <th 
                  onClick={() => handleSort('po_date')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  PO Date {sortBy === 'po_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Valid From</th>
                <th 
                  onClick={() => handleSort('valid_to')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Valid To {sortBy === 'valid_to' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('total')}
                  className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:bg-surface-container-high transition-colors"
                >
                  Total Amount {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Approval Status</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    <td className="sticky left-0 bg-surface-container-lowest border-r border-outline-variant px-6 py-4"><div className="h-4 bg-surface-container rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-container rounded w-24"></div></td>

                  </tr>
                ))
              ) : paginatedPOs.length === 0 ? (
                <EmptyState
                  isFiltered={isAnyFilterActive}
                  entityName="purchase orders"
                  onClear={handleClearAll}
                />
              ) : (
                paginatedPOs.map((po, i) => (
                  <tr 
                    key={po.id} 
                    onClick={() => navigate(`/projects/${po.projectNo}`)}
                    className="group hover:bg-surface-container-low transition-colors cursor-pointer animate-row-stagger" 
                    style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
                  >
                    <td className="sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors duration-150 z-10 border-r border-outline-variant px-6 py-4 font-headline text-sm font-bold text-primary dont-translate bhashini-skip-translation">
                      {renderFallback(po.finalPoNo)}
                    </td>
                    <td className="px-6 py-4 dont-translate bhashini-skip-translation">
                      <span className="text-primary font-semibold font-sans text-sm">
                        {po.projectNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary" title={po.vendorName || ''}>
                      {renderFallback(po.vendorName)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(po.poDate)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(po.validFrom)}
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">
                      {formatDate(po.validTo)}
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">
                      {formatINR(po.total, false)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusClasses(po.approvalStatus)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {renderFallback(po.approvalStatus)}
                      </span>
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
            <span>Showing {Math.min(totalItems, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(totalItems, currentPage * rowsPerPage)} of {totalItems} purchase orders</span>
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
