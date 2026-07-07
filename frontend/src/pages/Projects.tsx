import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Filter,
  Download,
  Grid,
  List,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { api } from '../lib/api';
import type { Project } from '../types';

type SortField = 'id' | 'name' | 'status' | 'poCount' | 'poAmount' | 'invoiceAmount' | 'amountPaid' | 'taxInvoiceAmount';
type SortOrder = 'asc' | 'desc';

export const Projects: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await api.getProjects();
        setProjects(data);
      } catch (err) {
        console.error(err);
        setError("Couldn't load projects — is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Calculations for metric widgets
  const totalPOAmount = projects.reduce((sum, p) => sum + p.poAmount, 0);
  const totalPaidAmount = projects.reduce((sum, p) => sum + p.amountPaid, 0);
  const avgCollectionRate = totalPOAmount > 0 ? (totalPaidAmount / totalPOAmount) * 100 : 0;

  // Filter & Sort
  const filteredProjects = projects
    .filter(p => {
      const matchesSearch = 
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      // Numbers
      return sortOrder === 'asc' 
        ? (valA as number) - (valB as number) 
        : (valB as number) - (valA as number);
    });

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
          <p className="text-secondary text-sm font-sans mt-1">Reviewing {projects.length} ongoing projects across all departments.</p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3 self-end relative">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg bg-surface transition-all font-headline text-sm font-semibold text-secondary ${
              showFilterDropdown ? 'border-primary text-primary bg-primary/5' : 'border-outline-variant hover:border-outline'
            }`}
          >
            <Filter className="w-4 h-4 text-outline" />
            <span>Filter: {statusFilter}</span>
          </button>

          {/* Filter Dropdown Menu */}
          {showFilterDropdown && (
            <div className="absolute top-11 left-0 z-50 bg-surface-container-lowest border border-outline-variant rounded-lg p-2 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] w-48 font-sans">
              <button 
                onClick={() => { setStatusFilter('All'); setShowFilterDropdown(false); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-surface-container-low text-sm font-medium"
              >
                All Statuses
              </button>
              <button 
                onClick={() => { setStatusFilter('Fully Paid'); setShowFilterDropdown(false); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-surface-container-low text-sm text-green-700 font-semibold"
              >
                Fully Paid
              </button>
              <button 
                onClick={() => { setStatusFilter('Partially Paid'); setShowFilterDropdown(false); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-surface-container-low text-sm text-amber-700 font-semibold"
              >
                Partially Paid
              </button>
              <button 
                onClick={() => { setStatusFilter('No Invoices Yet'); setShowFilterDropdown(false); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-surface-container-low text-sm text-secondary font-semibold"
              >
                No Invoices Yet
              </button>
            </div>
          )}

          <button 
            onClick={() => alert('Projects portfolio exported.')}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container transition-all font-headline text-sm font-semibold text-secondary"
          >
            <Download className="w-4 h-4 text-outline" />
            <span>Export</span>
          </button>

          <div className="flex rounded-lg border border-outline-variant overflow-hidden">
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
      </div>

      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-md">
        {/* Card 1: Active Projects */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-tight">Active Projects</span>
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{projects.length}</span>
            <span className="text-green-600 text-xs font-semibold flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +3%</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          {filteredProjects.map((p) => (
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
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th onClick={() => handleSort('id')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary">
                    Project No {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('name')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary">
                    Customer Name {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('status')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary">
                    Status {sortField === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('poCount')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary">
                    No. of PO {sortField === 'poCount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('poAmount')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary">
                    PO Amount {sortField === 'poAmount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('invoiceAmount')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary">
                    Invoice Amt {sortField === 'invoiceAmount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('amountPaid')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary">
                    Amt Paid {sortField === 'amountPaid' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('taxInvoiceAmount')} className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right cursor-pointer hover:text-primary">
                    Tax Invoice {sortField === 'taxInvoiceAmount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider w-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-secondary font-headline">
                      No matching projects in portfolio.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => (
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
                      <td className="px-6 py-5 text-right text-sm">{formatINR(p.invoiceAmount, false)}</td>
                      <td className={`px-6 py-5 text-right font-bold text-sm ${
                        p.status === 'Fully Paid' 
                          ? 'text-green-700' 
                          : p.status === 'Partially Paid' 
                          ? 'text-amber-700' 
                          : 'text-secondary'
                      }`}>
                        {formatINR(p.amountPaid, false)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm">{formatINR(p.taxInvoiceAmount, false)}</td>
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
        </div>
      )}
    </div>
  );
};
