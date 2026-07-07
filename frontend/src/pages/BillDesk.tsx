import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, 
  Download, 
  Printer, 
  Lightbulb, 
  ArrowRight,
  TrendingUp,
  X,
  CreditCard,
  MoreVertical
} from 'lucide-react';
import { api } from '../lib/api';
import type { Invoice, Project } from '../types';

export const BillDesk: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Nov 2024');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalProjectNo, setModalProjectNo] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalStatus, setModalStatus] = useState<'Paid' | 'Pending' | 'Overdue' | 'Draft'>('Pending');
  const [modalDueDate, setModalDueDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const loadData = async () => {
    try {
      const invs = await api.getInvoices();
      const projs = await api.getProjects();
      setInvoices(invs);
      setProjects(projs);
      if (projs.length > 0 && !modalProjectNo) {
        setModalProjectNo(projs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProjectNo || !modalAmount) return;

    try {
      const amountNum = parseFloat(modalAmount);
      await api.createInvoice({
        projectNo: modalProjectNo,
        amount: amountNum,
        tax: amountNum * 0.18, // 18% GST standard
        status: modalStatus,
        date: new Date().toISOString().split('T')[0],
        dueDate: modalDueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
      });
      
      // Reset and reload
      setShowModal(false);
      setModalAmount('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Metric computations
  const totalOutstanding = invoices
    .filter(i => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((sum, i) => sum + i.amount, 0);
  
  const paidThisMonth = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const pendingApprovalsCount = invoices.filter(i => i.status === 'Pending').length;
  const overdueAlertsCount = invoices.filter(i => i.status === 'Overdue').length;

  // Filter invoice entries
  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = 
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.customer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProject = selectedProject === 'All' || i.projectNo === selectedProject;
    const matchesStatus = selectedStatus === 'All' || i.status === selectedStatus;

    return matchesSearch && matchesProject && matchesStatus;
  });

  // Paginated display
  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading Billing Queue...</div>;
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Bill Desk</h2>
          <p className="font-sans text-sm text-secondary mt-1">Manage and track your project billing operations.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-all font-headline text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Total Outstanding</span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl font-bold text-on-surface">{formatINR(totalOutstanding)}</span>
            <span className="text-error flex items-center font-headline text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> 12%
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Paid This Month</span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl font-bold text-on-surface">{formatINR(paidThisMonth)}</span>
            <span className="text-primary flex items-center font-headline text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> 8%
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2">Pending Approvals</span>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-2xl font-bold text-on-surface">{pendingApprovalsCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 flex flex-col overflow-hidden relative group shadow-sm">
          <span className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider mb-2 z-10">Overdue Alerts</span>
          <div className="flex items-baseline gap-2 z-10">
            <span className="font-headline text-2xl font-bold text-error">{String(overdueAlertsCount).padStart(2, '0')}</span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <CreditCard className="w-28 h-28 text-primary" />
          </div>
        </div>
      </div>

      {/* Search / Filters Row */}
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

        <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-lg border border-outline-variant font-sans">
          <input 
            type="text" 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-on-surface focus:ring-0 w-24 h-8 p-0"
            placeholder="Date Range"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={() => alert('Data downloaded.')}
            className="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded transition-colors"
            title="Download CSV"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => window.print()}
            className="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded transition-colors"
            title="Print Invoices"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice No</th>
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
                  <td colSpan={8} className="px-6 py-8 text-center text-secondary font-headline">No matching invoices found in queue.</td>
                </tr>
              ) : (
                paginatedInvoices.map((i) => (
                  <tr key={i.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4 font-headline text-sm font-bold text-on-surface">{i.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col font-sans">
                        <span className="text-sm font-medium text-on-surface">{i.projectName}</span>
                        <span className="text-xs text-secondary mt-0.5">{i.projectNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans text-sm text-secondary">{i.customer}</td>
                    <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">{formatINR(i.amount, false)}</td>
                    <td className="px-6 py-4 text-right font-sans text-sm text-secondary">{formatINR(i.tax, false)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        i.status === 'Paid' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : i.status === 'Pending' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : i.status === 'Overdue' 
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          i.status === 'Paid' ? 'bg-green-600' : i.status === 'Pending' ? 'bg-amber-600' : i.status === 'Overdue' ? 'bg-red-600' : 'bg-gray-400'
                        }`} />
                        {i.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-sans text-sm ${i.status === 'Overdue' ? 'text-error font-medium' : 'text-on-surface'}`}>
                      {i.dueDate}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button 
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 rounded border font-semibold ${
                  currentPage === pageNum 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white border-outline-variant hover:bg-surface'
                }`}
              >
                {pageNum}
              </button>
            ))}
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

      {/* Recommendation and Promo Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Recommendation Card */}
        <div className="bg-surface p-6 rounded-md border-2 border-dashed border-outline-variant flex gap-6 items-start">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
            <Lightbulb className="w-8 h-8" />
          </div>
          <div className="font-sans">
            <h4 className="font-headline text-lg font-bold text-on-surface mb-2">Billing Recommendation</h4>
            <p className="text-sm text-secondary leading-relaxed">
              NHAI (P-2024-002) typically processes invoice releases on the 20th of each month. Submitting your outstanding claims of ₹4.8M by the 14th will ensure you are cleared in the upcoming treasury cycle.
            </p>
            <button 
              onClick={() => alert('Navigating to schedule review...')}
              className="mt-4 text-primary font-headline text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:underline"
            >
              <span>Review schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Promo Card */}
        <div className="relative rounded-md overflow-hidden border border-outline-variant h-48 group shadow-sm bg-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary-container z-10 flex flex-col justify-center p-8 text-white">
            <h4 className="font-headline text-xl font-bold mb-1">Automate Billing?</h4>
            <p className="text-sm opacity-90 max-w-xs font-sans">Enable smart reminders, OCR invoice parsing, and auto-reconciliation for all vendors.</p>
            <button 
              onClick={() => alert('Upgrading account plan...')}
              className="mt-4 bg-white text-primary w-fit px-5 py-2 rounded-lg font-headline text-xs font-bold uppercase tracking-wider hover:bg-surface-bright transition-all"
            >
              Upgrade Plan
            </button>
          </div>
          <img 
            className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-500 pointer-events-none" 
            alt="Futuristic database abstract" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlTqgosZcW3JJ3IARIdXycPVQlT-8leqMvVfcF_lqZQKqwi3A2jNav3hMDbkt4dVHJlHlpFXOfPhywqRVwlRS4SJ1-zkhzZ8ZvLt-G28ErB4n2QwJ1fROI8rnuTXKr8GZ5_lA7-9mM7is1Dam0lRyqapTCxB1ByjOqb_5-dLzds1V1FU_aIxsUOHHPcnWwJEOrxUoYictPAdiDM4zYN_EPkFX2RSI7lEC7dUhWV9HJiaNuuW1OMDPmcskyV_ZVwBwhKdFV6KTSA9-V" 
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
        title="Quick Invoice Add"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-md max-w-md w-full shadow-[0px_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
              <h3 className="font-headline text-lg font-bold text-on-surface">Generate New Invoice</h3>
              <button onClick={() => setShowModal(false)} className="text-secondary hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Target Project</label>
                <select 
                  required
                  value={modalProjectNo}
                  onChange={(e) => setModalProjectNo(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-sm text-on-surface"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Invoice Amount (₹)</label>
                <input 
                  type="number"
                  required
                  placeholder="e.g. 5000000"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">GST Tax Rate</label>
                <input 
                  type="text"
                  disabled
                  value="18% (Automated Calculation)"
                  className="w-full bg-surface-container opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Status</label>
                <select 
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-sm text-on-surface"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Due Date</label>
                <input 
                  type="date"
                  value={modalDueDate}
                  onChange={(e) => setModalDueDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-secondary font-headline text-sm font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-primary text-white rounded-lg font-headline text-sm font-semibold hover:bg-primary-container shadow-sm"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
