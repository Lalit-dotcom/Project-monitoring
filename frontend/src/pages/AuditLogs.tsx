import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toast } from '../lib/toast';
import { 
  X, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert, 
  Database,
  Lock,
  Download,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not superadmin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      toast.error('Unauthorized access. Super Admin role required.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // States
  const [logs, setLogs] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState<any>({
    failedLogins: 0,
    adminChanges: 0,
    reportDownloads: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [usernameVal, setUsernameVal] = useState('');
  const [categoryVal, setCategoryVal] = useState('All');
  const [statusVal, setStatusVal] = useState('All');
  const [dateFromVal, setDateFromVal] = useState('');
  const [dateToVal, setDateToVal] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Row expansion mapping: log ID -> boolean
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (categoryVal !== 'All') count++;
    if (statusVal !== 'All') count++;
    if (usernameVal.trim() !== '') count++;
    if (dateFromVal !== '') count++;
    if (dateToVal !== '') count++;
    if (searchVal.trim() !== '') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const resetFilters = () => {
    setSearchVal('');
    setUsernameVal('');
    setCategoryVal('All');
    setStatusVal('All');
    setDateFromVal('');
    setDateToVal('');
    setPage(1);
    toast.info('Filters cleared');
  };

  // Fetch logs
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const result = await api.getAuditLogs({
        category: categoryVal === 'All' ? undefined : categoryVal,
        status: statusVal === 'All' ? undefined : statusVal,
        username: usernameVal.trim() || undefined,
        dateFrom: dateFromVal || undefined,
        dateTo: dateToVal || undefined,
        search: searchVal.trim() || undefined,
        page,
        pageSize
      });

      setLogs(result.data);
      setCount(result.count);
      if (result.summary) {
        setSummary(result.summary);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'superadmin') {
      loadAuditLogs();
    }
  }, [user, page, categoryVal, statusVal, dateFromVal, dateToVal]);

  // Debounced search trigger or search manual submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAuditLogs();
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Format Date
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Render Details JSON Pretty Print
  const renderDetails = (details: any) => {
    if (!details) return <span className="text-secondary italic text-xs">No details provided</span>;
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (Object.keys(parsed).length === 0) return <span className="text-secondary italic text-xs">No details provided</span>;
      return (
        <div className="bg-[#FAFBFD] p-4 rounded-lg border border-outline-variant grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 font-mono text-[11px] text-secondary animate-fade-in-up">
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="font-bold text-[#1B3E7A] min-w-[120px] max-w-[160px] truncate shrink-0">{key}:</span>
              <span className="text-on-surface truncate" title={typeof val === 'object' ? JSON.stringify(val) : String(val)}>
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return <span className="text-secondary font-mono text-xs">{String(details)}</span>;
    }
  };

  // Badge Color Map
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'LOGIN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LOGOUT':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'USER_ACTIVITY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SYNC':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'REPORT_DOWNLOAD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ADMIN_CHANGE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  // If not superadmin, block render (redirect handles it, but keeps typescript happy)
  if (!user || user.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] space-y-4">
        <ShieldAlert className="w-12 h-12 text-error animate-bounce" />
        <h3 className="font-headline text-lg font-bold text-on-surface">Not Authorized</h3>
        <p className="text-secondary text-sm">You do not have permission to view this administrative resource.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(count / pageSize) || 1;

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Administration' }, { label: 'Audit Logs' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Security Audit Logs</h2>
          <p className="font-sans text-sm text-secondary">
            Monitor login activity, data downloads, role adjustments, and settings changes. FRS §18 compliant database logging.
          </p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Events (current filter) */}
        <div className="bg-white border border-outline-variant border-t-4 border-t-primary p-5 rounded-lg shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">
              Total Filtered Events
            </span>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {count.toLocaleString()}
          </div>
          <div className="text-[11px] text-secondary">Matching active filters</div>
        </div>

        {/* Failed Logins (LOGIN + FAILURE) */}
        <div className="bg-white border border-outline-variant border-t-4 border-t-error p-5 rounded-lg shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">
              Failed Login Attempts
            </span>
            <div className="p-1.5 bg-error/10 rounded-md text-error">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {summary.failedLogins.toLocaleString()}
          </div>
          <div className="text-[11px] text-error font-medium">LOGIN failures tracked</div>
        </div>

        {/* Admin Changes */}
        <div className="bg-white border border-outline-variant border-t-4 border-t-rose-500 p-5 rounded-lg shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">
              Admin Modifications
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-md">
              <Settings className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {summary.adminChanges.toLocaleString()}
          </div>
          <div className="text-[11px] text-secondary">ADMIN_CHANGE actions logged</div>
        </div>

        {/* Report Downloads */}
        <div className="bg-white border border-outline-variant border-t-4 border-t-amber-500 p-5 rounded-lg shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">
              Report Downloads
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {summary.reportDownloads.toLocaleString()}
          </div>
          <div className="text-[11px] text-secondary">Excel & PDF exports extracted</div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-outline-variant p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-lg">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by action code, details content..."
              className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all text-on-surface"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            {searchVal && (
              <button 
                type="button" 
                onClick={() => { setSearchVal(''); setPage(1); }} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-full font-sans text-xs font-bold transition-all shadow-sm ${
                activeFiltersCount > 0 
                  ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                  : 'border-outline-variant hover:border-outline text-secondary bg-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs text-error hover:underline font-semibold"
              >
                Clear all
              </button>
            )}

            <button
              onClick={loadAuditLogs}
              className="px-4 py-2 bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-headline text-xs font-bold rounded-full shadow-sm transition-all"
            >
              Apply Search
            </button>
          </div>
        </div>

        {/* Filter popover drawer */}
        {showFilter && (
          <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm space-y-4 text-left font-sans w-full animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              
              {/* Category dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Category</label>
                <select
                  value={categoryVal}
                  onChange={(e) => { setCategoryVal(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-white text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="LOGIN">Login Activities</option>
                  <option value="LOGOUT">Logout Activities</option>
                  <option value="USER_ACTIVITY">User Activities</option>
                  <option value="SYNC">Synchronization</option>
                  <option value="REPORT_DOWNLOAD">Report Downloads</option>
                  <option value="ADMIN_CHANGE">Administrative Changes</option>
                </select>
              </div>

              {/* Status dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => { setStatusVal(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-white text-sm font-semibold text-secondary px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                </select>
              </div>

              {/* Username filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Username Search</label>
                <input
                  type="text"
                  placeholder="e.g. atul, admin"
                  value={usernameVal}
                  onChange={(e) => { setUsernameVal(e.target.value); setPage(1); }}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-white text-sm text-on-surface px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Date From & Date To */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFromVal}
                    onChange={(e) => { setDateFromVal(e.target.value); setPage(1); }}
                    className="h-10 flex-1 rounded-lg border border-outline-variant bg-white text-xs text-secondary px-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <span className="text-secondary text-xs">to</span>
                  <input
                    type="date"
                    value={dateToVal}
                    onChange={(e) => { setDateToVal(e.target.value); setPage(1); }}
                    className="h-10 flex-1 rounded-lg border border-outline-variant bg-white text-xs text-secondary px-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-outline-variant rounded-md overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-[300px] space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-secondary font-headline text-sm font-semibold">Retrieving audit log entries...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FAFBFD] sticky top-0 border-b border-outline-variant z-10">
                <tr>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider w-[220px]">Timestamp</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Username</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider w-[180px]">Category</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Action</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">IP Address</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right w-[120px]">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-secondary font-headline text-sm">
                      No security audit records match the current criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isExpanded = !!expandedRows[log.id];
                    return (
                      <React.Fragment key={log.id}>
                        <tr className={`hover:bg-[#FAFBFD]/60 transition-colors ${isExpanded ? 'bg-[#FAFBFD]/30' : ''}`}>
                          {/* Timestamp */}
                          <td className="p-4 font-sans text-xs text-secondary font-medium">
                            {formatDateTime(log.created_at)}
                          </td>
                          {/* Username */}
                          <td className="p-4 font-sans text-sm font-semibold text-on-surface">
                            {log.username ? (
                              <span className="bg-surface-container px-2 py-0.5 rounded text-xs font-mono">{log.username}</span>
                            ) : (
                              <span className="text-[#EF4444] italic text-xs font-semibold">Anonymous</span>
                            )}
                          </td>
                          {/* Category */}
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(log.category)}`}>
                              {log.category.replace('_', ' ')}
                            </span>
                          </td>
                          {/* Action Code */}
                          <td className="p-4 font-mono text-xs text-[#1E293B] font-semibold">
                            {log.action}
                          </td>
                          {/* Status */}
                          <td className="p-4">
                            {log.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                SUCCESS
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                FAILURE
                              </span>
                            )}
                          </td>
                          {/* IP Address */}
                          <td className="p-4 font-mono text-xs text-secondary">
                            {log.ip_address || '—'}
                          </td>
                          {/* Details Toggle */}
                          <td className="p-4 text-right">
                            <button
                              onClick={() => toggleRow(log.id)}
                              className="text-primary hover:text-primary-container p-1 rounded-md hover:bg-primary/5 transition-all focus-visible:outline-none"
                              aria-label="View Audit Record Details"
                            >
                              {isExpanded ? (
                                <span className="flex items-center gap-1 text-xs font-bold">
                                  <EyeOff className="w-3.5 h-3.5" /> Hide
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold">
                                  <Eye className="w-3.5 h-3.5" /> Details
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-[#FAFBFD]/30">
                            <td colSpan={7} className="px-6 py-4 border-t border-outline-variant">
                              <div className="space-y-2">
                                <h4 className="font-headline text-xs font-bold text-secondary uppercase tracking-wider">
                                  JSON Metadata Context
                                </h4>
                                {renderDetails(log.details)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && count > 0 && (
          <div className="bg-[#FAFBFD] px-6 py-4 border-t border-outline-variant flex items-center justify-between font-sans">
            <div className="text-xs text-secondary font-semibold">
              Showing <span className="text-on-surface">{Math.min((page - 1) * pageSize + 1, count)}</span> to{' '}
              <span className="text-on-surface">{Math.min(page * pageSize, count)}</span> of{' '}
              <span className="text-on-surface">{count}</span> records
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-1.5 border border-outline-variant hover:border-outline rounded-md text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-secondary font-sans px-2">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-1.5 border border-outline-variant hover:border-outline rounded-md text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
