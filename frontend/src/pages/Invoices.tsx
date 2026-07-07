import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Download, MoreVertical } from 'lucide-react';
import { api } from '../lib/api';
import type { Invoice, Project } from '../types';

export const Invoices: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      try {
        const invs = await api.getInvoices();
        const projs = await api.getProjects();
        setInvoices(invs);
        setProjects(projs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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

  // Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const paidInvoiced = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingInvoiced = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.amount, 0);
  const overdueInvoiced = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.amount, 0);

  // Filter Invoices
  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = 
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProject = selectedProject === 'All' || i.projectNo === selectedProject;
    const matchesStatus = selectedStatus === 'All' || i.status === selectedStatus;

    return matchesSearch && matchesProject && matchesStatus;
  });

  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading Invoices...</div>;
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Invoices</h2>
          <p className="font-sans text-sm text-secondary mt-1">Unified view of all operational client billing sheets and claim payouts.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Invoiced</span>
          <span className="font-headline text-2xl font-bold text-on-surface">{formatINR(totalInvoiced)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Payments Received</span>
          <span className="font-headline text-2xl font-bold text-primary">{formatINR(paidInvoiced)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Pending Treasury</span>
          <span className="font-headline text-2xl font-bold text-secondary">{formatINR(pendingInvoiced)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant border-l-4 border-l-error rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Overdue Balances</span>
          <span className="font-headline text-2xl font-bold text-error">{formatINR(overdueInvoiced)}</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-lg border border-outline-variant font-sans">
          <select 
            value={selectedProject} 
            onChange={(e) => { setSelectedProject(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none text-sm font-semibold text-on-surface focus:ring-0 cursor-pointer h-8 p-0"
          >
            <option value="All">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.id} - {p.name.substring(0, 20)}...</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-lg border border-outline-variant font-sans">
          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none text-sm font-semibold text-on-surface focus:ring-0 cursor-pointer h-8 p-0"
          >
            <option value="All">Status: All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={() => alert('Invoices exported.')}
            className="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded transition-colors"
            title="Download CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Project / ID</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">Tax (GST)</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-secondary font-headline">No invoices found.</td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className="hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${inv.projectNo}`)}
                  >
                    <td className="px-6 py-4 font-headline text-sm font-bold text-primary">{inv.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col font-sans">
                        <span className="text-sm font-medium text-on-surface">{inv.projectName}</span>
                        <span className="text-xs text-secondary mt-0.5">{inv.projectNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">{inv.customer}</td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">{formatINR(inv.amount, false)}</td>
                    <td className="px-6 py-4 text-right font-sans text-sm text-secondary">{formatINR(inv.tax, false)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        inv.status === 'Paid' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : inv.status === 'Pending' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : inv.status === 'Overdue' 
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          inv.status === 'Paid' ? 'bg-green-600' : inv.status === 'Pending' ? 'bg-amber-600' : inv.status === 'Overdue' ? 'bg-red-600' : 'bg-gray-400'
                        }`} />
                        {inv.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-sans text-sm ${inv.status === 'Overdue' ? 'text-error font-medium' : 'text-on-surface'}`}>
                      {inv.dueDate}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <button className="text-secondary hover:text-primary"><MoreVertical className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between font-sans text-xs text-secondary">
          <span>Showing {Math.min(totalItems, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(totalItems, currentPage * rowsPerPage)} of {totalItems} invoices</span>
          <div className="flex gap-1">
            <button 
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              className="px-2 py-1 border border-outline-variant bg-white rounded hover:bg-surface disabled:opacity-50"
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button 
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              className="px-2 py-1 border border-outline-variant bg-white rounded hover:bg-surface disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
