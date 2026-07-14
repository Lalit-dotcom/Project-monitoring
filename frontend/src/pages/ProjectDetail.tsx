import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Briefcase, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Mail, 
  FileText,
  MapPin,
  AlertCircle,
  MoreVertical,
  ShoppingCart,
  Download,
  Loader2,
  Bell
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import type { Project, Invoice, PurchaseOrder, TaxInvoice, Activity, DatabaseProject } from '../types';
import { Toast } from '../components/Toast';
import { NoticeModal } from '../components/NoticeModal';

type TabName = 'Overview' | 'Purchase Orders' | 'Invoices' | 'Tax Invoices' | 'Bill Desk' | 'Documents';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const { theme } = useTheme();

  const [project, setProject] = useState<(Project & DatabaseProject) | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportPopover, setShowExportPopover] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!project) return;
    setShowExportPopover(false);
    setIsExporting(true);
    try {
      await api.exportProjectFile(project.projectCd, format);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
      if (event.key === 'Escape' && showExportPopover) {
        setShowExportPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showExportPopover]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showToast, setShowToast] = useState(false);

  // Map URL tab param to TabName
  const getTabFromParam = (param: string | null): TabName => {
    if (!param) return 'Overview';
    const normalized = param.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized === 'purchaseorders' || normalized === 'po' || normalized === 'pos') return 'Purchase Orders';
    if (normalized === 'invoices') return 'Invoices';
    if (normalized === 'taxinvoices') return 'Tax Invoices';
    if (normalized === 'billdesk') return 'Bill Desk';
    if (normalized === 'documents') return 'Documents';
    return 'Overview';
  };

  const activeTab = getTabFromParam(searchParams.get('tab'));

  const handleTabChange = (tab: TabName) => {
    const paramVal = tab.toLowerCase().replace(/\s+/g, '-');
    setSearchParams({ tab: paramVal }, { replace: true });
    setCurrentPage(1);
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    const loadProjectData = async () => {
      if (!id) return;
      try {
        const proj = await api.getProjectById(id);
        if (proj) {
          setProject(proj);
          const allInvs = await api.getInvoices();
          setInvoices(allInvs.filter(inv => inv.projectNo === id));
          const allPOs = await api.getPurchaseOrders();
          setPurchaseOrders(allPOs.filter(po => po.projectNo === id));
          const allTxs = await api.getTaxInvoices();
          setTaxInvoices(allTxs.filter(tx => tx.projectNo === id));
          
          // Trigger system sync toast on load
          setShowToast(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProjectData();
  }, [id]);

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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading project details...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-center space-y-4">
        <h3 className="font-headline text-xl font-bold text-on-surface">Project Not Found</h3>
        <button 
          onClick={() => navigate('/projects')}
          className="text-primary hover:underline font-headline font-semibold flex items-center justify-center gap-1 mx-auto"
        >
          <ChevronLeft className="w-4 h-4" /> Back to projects list
        </button>
      </div>
    );
  }

  // Stat Calculations
  const poAmount = project.poAmount;
  const receivedAmount = project.amountPaid;
  const paidAmount = project.amountPaid;
  const outstandingAmount = Math.max(0, poAmount - receivedAmount);

  const receivedPct = poAmount > 0 ? Math.round((receivedAmount / poAmount) * 100) : 0;
  const paidPct = poAmount > 0 ? Math.round((paidAmount / poAmount) * 100) : 0;
  const outstandingPct = poAmount > 0 ? Math.round((outstandingAmount / poAmount) * 100) : 0;

  // Derive activities dynamically from real database records (POs, Invoices, Tax Invoices)
  const getDerivedActivities = (): Activity[] => {
    const list: Activity[] = [];

    purchaseOrders.forEach(po => {
      if (!po.poDate) return;
      list.push({
        id: `ACT-PO-${po.id}`,
        projectNo: po.projectNo,
        title: 'Purchase Order Linked',
        actor: po.vendorName || 'System',
        timestamp: po.poDate,
        type: 'info',
        description: `PO ${po.finalPoNo} for ${formatINR(po.total || 0, false)} linked successfully.`
      });
    });

    invoices.forEach(inv => {
      if (!inv.invoiceDate) return;
      const isPaid = (inv.amountPaid || 0) >= (inv.invoiceAmount || 0);
      list.push({
        id: `ACT-INV-${inv.id}`,
        projectNo: inv.projectNo,
        title: isPaid ? 'Invoice Settled' : 'Invoice Registered',
        actor: inv.vendorName || 'System',
        timestamp: inv.invoiceDate,
        type: isPaid ? 'success' : 'info',
        description: `Invoice ${inv.invoiceNum} for ${formatINR(inv.invoiceAmount || 0, false)} registered (Paid: ${formatINR(inv.amountPaid || 0, false)}).`
      });
    });

    taxInvoices.forEach(tx => {
      if (!tx.billDate) return;
      list.push({
        id: `ACT-TX-${tx.id}`,
        projectNo: tx.projectNo,
        title: 'Tax Invoice Issued',
        actor: tx.custGstinNo || 'System',
        timestamp: tx.billDate,
        type: 'info',
        description: `Tax Invoice ${tx.userBillNo} for ${formatINR(tx.totalAmount || 0, false)} issued.`
      });
    });

    // Sort by date descending
    return list.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const derivedActivities = getDerivedActivities();

  // Filter lists based on search query in layout context
  const filteredInvoices = invoices.filter(i => 
    String(i.invoiceNum || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(i.invoiceType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPOs = purchaseOrders.filter(po => 
    String(po.finalPoNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(po.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(po.approvalStatus || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTxs = taxInvoices.filter(tx => 
    String(tx.userBillNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(tx.poNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(tx.billStatus || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginated elements helper
  const paginate = (items: any[]) => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return items.slice(startIndex, startIndex + rowsPerPage);
  };

  const handlePageChange = (direction: 'prev' | 'next', totalItems: number) => {
    const maxPage = Math.ceil(totalItems / rowsPerPage);
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < maxPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-stack-lg relative">
      {/* Toast Synchronization Alert */}
      {showToast && (
        <Toast 
          message="System synchronized successfully." 
          onClose={() => setShowToast(false)} 
        />
      )}

      {/* Header Block */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-headline font-bold text-[10px] tracking-wider uppercase">
                Active Project
              </span>
              <span className="text-secondary font-headline text-xs font-semibold">
                Project No: {project.id}
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface">{project.name}</h2>
            <p className="text-secondary font-sans text-sm max-w-2xl mt-1">{project.description}</p>
          </div>

          {/* Header action buttons: Notice + Download */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">

            {/* Notice Button */}
            <button
              onClick={() => setShowNoticeModal(true)}
              className="h-10 px-4 py-2 border border-outline-variant hover:border-primary text-secondary hover:text-primary hover:bg-primary/5 rounded-md font-sans text-xs font-bold flex items-center gap-2 transition-all bg-surface-container-lowest shadow-sm"
              title="Send a system notice to vendor or client"
            >
              <Bell className="w-4 h-4" />
              <span>Notice</span>
            </button>

            {/* Download / Export Button */}
            <div className="relative">
              <button
                ref={exportButtonRef}
                onClick={() => setShowExportPopover(!showExportPopover)}
                disabled={isExporting}
                className="h-10 px-4 py-2 border border-outline-variant hover:border-outline text-secondary hover:bg-surface-container-low rounded-md font-sans text-xs font-bold flex items-center gap-2 transition-all bg-surface-container-lowest shadow-sm"
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
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Download as Excel
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Download as PDF
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-stack-md">
        {/* PO Amount */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 group hover:border-primary transition-colors shadow-sm">
          <div className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider flex justify-between">
            <span>PO Amount</span>
            <Info className="w-3.5 h-3.5 text-outline" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{formatINR(poAmount, false)}</span>
          </div>
          <div className="mt-4 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Received */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 group hover:border-primary transition-colors shadow-sm">
          <div className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider flex justify-between">
            <span>Received</span>
            <span className="text-primary text-[10px] font-bold">{receivedPct}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{formatINR(receivedAmount, false)}</span>
          </div>
          <div className="mt-4 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary-container h-full rounded-full" style={{ width: `${receivedPct}%` }}></div>
          </div>
        </div>

        {/* Paid */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 group hover:border-primary transition-colors shadow-sm">
          <div className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider flex justify-between">
            <span>Paid</span>
            <span className="text-primary text-[10px] font-bold">{paidPct}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-on-surface">{formatINR(paidAmount, false)}</span>
          </div>
          <div className="mt-4 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary/60 h-full rounded-full" style={{ width: `${paidPct}%` }}></div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 group hover:border-primary transition-colors shadow-sm">
          <div className="text-secondary font-headline text-xs font-semibold uppercase tracking-wider flex justify-between">
            <span>Outstanding</span>
            <span className="text-error text-[10px] font-bold">{outstandingPct}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 text-error">
            <span className="font-headline text-3xl font-bold">{formatINR(outstandingAmount, false)}</span>
          </div>
          <div className="mt-4 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-error-container-dark bg-error/40 h-full rounded-full" style={{ width: `${outstandingPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Double Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        {/* Left Section: Details Table & Timeline */}
        <div className="lg:col-span-2 space-y-stack-lg">
          
          {/* Tabbed Card container */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden flex flex-col shadow-sm">
            {/* Tab Navigation header */}
            <div className="flex items-center px-6 bg-surface-container-low border-b border-outline-variant">
              <div className="flex space-x-6 h-14 items-center overflow-x-auto no-scrollbar">
                {(['Overview', 'Purchase Orders', 'Invoices', 'Tax Invoices', 'Bill Desk', 'Documents'] as TabName[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`h-full px-1 font-headline text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab 
                        ? 'text-primary border-primary font-bold' 
                        : 'text-secondary border-transparent hover:text-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              {/* Pagination indicators on right side */}
              {activeTab !== 'Overview' && activeTab !== 'Bill Desk' && (
                <div className="ml-auto hidden md:flex items-center gap-3">
                  <div className="h-8 w-px bg-outline-variant mx-2" />
                  <span className="text-secondary text-xs">Rows per page: {rowsPerPage}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handlePageChange('prev', activeTab === 'Invoices' ? filteredInvoices.length : activeTab === 'Purchase Orders' ? filteredPOs.length : filteredTxs.length)}
                      className="p-1 hover:bg-surface-container rounded-md text-secondary"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePageChange('next', activeTab === 'Invoices' ? filteredInvoices.length : activeTab === 'Purchase Orders' ? filteredPOs.length : filteredTxs.length)}
                      className="p-1 hover:bg-surface-container rounded-md text-secondary"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tab contents */}
            <div className="overflow-x-auto">
              
              {/* INVOICES TAB */}
              {activeTab === 'Invoices' && (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low/50">
                      <tr className="border-b border-outline-variant">
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice #</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Tax Inv Amount</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-secondary font-headline">No invoices found for this project.</td>
                        </tr>
                      ) : (
                        paginate(filteredInvoices).map((inv) => {
                          const status = inv.unpaid && inv.unpaid > 0 ? 'Pending' : 'Paid';
                          return (
                            <tr key={inv.id} className="hover:bg-surface transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="font-headline text-sm font-semibold text-on-surface">{inv.invoiceNum || inv.id}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-secondary text-sm">{formatDate(inv.invoiceDate)}</td>
                              <td className="px-6 py-4 text-secondary text-sm font-medium">{formatINR(inv.penAmt || 0, false)}</td>
                              <td className="px-6 py-4 font-headline text-base font-bold text-on-surface">{formatINR(inv.invoiceAmount, false)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  status === 'Paid' 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    status === 'Paid' ? 'bg-green-700' : 'bg-amber-700'
                                  }`} />
                                  {status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                <button className="p-2 text-secondary hover:text-primary rounded-lg transition-colors">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  <div className="p-4 border-t border-outline-variant bg-surface-container-low/40 flex justify-between items-center text-secondary text-xs font-sans">
                    <p>Showing {Math.min(filteredInvoices.length, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(filteredInvoices.length, currentPage * rowsPerPage)} of {filteredInvoices.length} invoices</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePageChange('prev', filteredInvoices.length)}
                        className="px-3 py-1 border border-outline-variant bg-white rounded hover:bg-surface disabled:opacity-50"
                        disabled={currentPage === 1}
                      >
                        Prev
                      </button>
                      <button 
                        onClick={() => handlePageChange('next', filteredInvoices.length)}
                        className="px-3 py-1 border border-outline-variant bg-white rounded hover:bg-surface disabled:opacity-50"
                        disabled={currentPage >= Math.ceil(filteredInvoices.length / rowsPerPage)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* PURCHASE ORDERS TAB */}
              {activeTab === 'Purchase Orders' && (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low/50">
                      <tr className="border-b border-outline-variant">
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">PO #</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">PO Amount</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filteredPOs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-secondary font-headline">No purchase orders linked to this project.</td>
                        </tr>
                      ) : (
                        paginate(filteredPOs).map((po) => (
                          <tr key={po.id} className="hover:bg-surface transition-colors">
                            <td className="px-6 py-4 font-headline text-sm font-semibold text-primary">{po.finalPoNo || po.id}</td>
                            <td className="px-6 py-4 text-secondary text-sm">{formatDate(po.poDate)}</td>
                            <td className="px-6 py-4 font-sans text-sm font-medium">{po.vendorName}</td>
                            <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">{formatINR(po.total, false)}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-success-bg text-status-success-text font-bold text-[10px] border border-status-success-border uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-status-success-text" />
                                {po.approvalStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="p-4 border-t border-outline-variant bg-surface-container-low/40 flex justify-between items-center text-secondary text-xs">
                    <p>Showing {Math.min(filteredPOs.length, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(filteredPOs.length, currentPage * rowsPerPage)} of {filteredPOs.length} POs</p>
                  </div>
                </>
              )}

              {/* TAX INVOICES TAB */}
              {activeTab === 'Tax Invoices' && (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low/50">
                      <tr className="border-b border-outline-variant">
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Tax Inv #</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Linked Invoice</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">Taxable Amount</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filteredTxs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-secondary font-headline">No tax invoices generated for this project.</td>
                        </tr>
                      ) : (
                        paginate(filteredTxs).map((tx) => (
                          <tr key={tx.id} className="hover:bg-surface transition-colors">
                            <td className="px-6 py-4 font-headline text-sm font-semibold text-primary">{tx.userBillNo || tx.id}</td>
                            <td className="px-6 py-4 text-secondary text-sm">{formatDate(tx.billDate)}</td>
                            <td className="px-6 py-4 font-sans text-sm text-secondary">{tx.poNo}</td>
                            <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface">{formatINR(tx.totalAmount, false)}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                tx.billStatus === 'FINAL' ? 'bg-status-success-bg text-status-success-text border-status-success-border' : 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tx.billStatus === 'FINAL' ? 'bg-status-success-text' : 'bg-status-warning-text'}`} />
                                {tx.billStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="p-4 border-t border-outline-variant bg-surface-container-low/40 flex justify-between items-center text-secondary text-xs">
                    <p>Showing {Math.min(filteredTxs.length, (currentPage - 1) * rowsPerPage + 1)} to {Math.min(filteredTxs.length, currentPage * rowsPerPage)} of {filteredTxs.length} tax invoices</p>
                  </div>
                </>
              )}

              {/* OVERVIEW TAB */}
              {activeTab === 'Overview' && (() => {
                // Build chart data from the current project's fields
                const budget = project.prjBudgetNo ?? 0;
                const poAmount = project.poAmount ?? 0;
                const received = project.amountPaid ?? 0;
                const poCount = project.noOfPo ?? 0;

                const barColors = theme === 'dark'
                  ? { budget: '#6bd8cb', po: '#c0c6db', received: '#d4a847', axis: '#bcc9c6', grid: 'rgba(188,201,198,0.08)', tooltipBg: '#272b2a', tooltipText: '#e1e3e2' }
                  : { budget: '#00685f', po: '#575e70', received: '#b8860b', axis: '#6d7a77', grid: 'rgba(0,0,0,0.04)', tooltipBg: '#191c1d', tooltipText: '#f0f1f2' };

                const chartData = [
                  { name: 'Budget', value: budget, color: barColors.budget },
                  { name: 'PO Amount', value: poAmount, color: barColors.po },
                  { name: 'Received', value: received, color: barColors.received },
                ];

                const formatINRLocal = (val: number) => {
                  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
                  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
                  return `₹${val.toLocaleString('en-IN')}`;
                };

                const FinancialTooltip = ({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ backgroundColor: barColors.tooltipBg, border: 'none', borderRadius: 8, padding: '8px 14px', color: barColors.tooltipText, fontFamily: 'Inter', fontSize: 12 }}>
                      <p style={{ fontFamily: 'Geist', fontWeight: 700, marginBottom: 4 }}>{payload[0]?.payload?.name}</p>
                      <span style={{ fontWeight: 600 }}>{formatINRLocal(payload[0]?.value ?? 0)}</span>
                    </div>
                  );
                };

                return (
                  <div className="p-6 space-y-6 font-sans">
                    {/* Chart title row + PO count badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-headline text-base font-bold text-on-surface">Budget vs PO vs Received</h4>
                        <p className="font-sans text-xs text-secondary mt-0.5">Single-project financial comparison</p>
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-headline text-xs font-bold bg-surface-container text-secondary border border-outline-variant"
                        aria-label={`${poCount} Purchase Orders linked to this project`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
                        {poCount} Purchase Order{poCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Bar chart */}
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }} barCategoryGap="35%">
                          <CartesianGrid vertical={false} stroke={barColors.grid} />
                          <XAxis
                            dataKey="name"
                            stroke={barColors.axis}
                            fontSize={11}
                            fontFamily="Geist"
                            tick={{ fill: barColors.axis }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke={barColors.axis}
                            fontSize={10}
                            fontFamily="Geist"
                            tick={{ fill: barColors.axis }}
                            tickLine={false}
                            tickFormatter={formatINRLocal}
                            width={80}
                          />
                          <Tooltip content={<FinancialTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend swatches */}
                    <div className="flex flex-wrap gap-5">
                      {chartData.map(d => (
                        <span key={d.name} className="flex items-center gap-1.5 font-headline text-xs font-semibold text-secondary">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                          {d.name}
                        </span>
                      ))}
                    </div>

                    {/* Scope text + metadata grid */}
                    <div className="space-y-4 pt-4 border-t border-outline-variant">
                      <div>
                        <h4 className="font-headline text-sm font-bold text-on-surface mb-1">Detailed Scope</h4>
                        <p className="text-secondary text-sm leading-relaxed">{project.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-secondary font-bold font-headline uppercase block">Client Entity</span>
                          <span className="font-semibold text-sm">{project.client}</span>
                        </div>
                        <div>
                          <span className="text-xs text-secondary font-bold font-headline uppercase block">Administrative Department</span>
                          <span className="font-semibold text-sm">{project.department}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BILL DESK TAB */}
              {activeTab === 'Bill Desk' && (
                <div className="p-6 space-y-4 font-sans">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-headline text-lg font-bold text-on-surface">Project Billing Desk</h4>
                      <p className="text-secondary text-sm">Direct portal to settle pending claims and audit draft payouts.</p>
                    </div>
                    <button 
                      onClick={() => navigate(`/bill-desk?projectNo=${id}`)}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-headline text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      View in Bill Desk
                    </button>
                  </div>
                  
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-4 items-start">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-primary">Pre-Audit Recommended</p>
                      <p className="text-xs text-secondary mt-1">
                        System highlights that {project.poCount} active POs are fully funded. Ensure matching compliance tags are attached before posting invoices.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === 'Documents' && (
                <div className="p-12 text-center text-secondary font-headline flex flex-col items-center gap-3 bg-surface-container-low/10 border border-outline-variant rounded-lg">
                  <span className="text-3xl opacity-40">📁</span>
                  <span className="font-semibold text-sm">No documents uploaded yet</span>
                  <span className="text-xs text-secondary/60">Documents associated with this project will appear here once uploaded.</span>
                </div>
              )}

            </div>
          </div>

          {/* Project Timeline Activity Log */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {derivedActivities.length === 0 ? (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-primary/10">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Project Initialized</p>
                    <p className="text-xs text-secondary mt-1">Administrative workflow configured.</p>
                  </div>
                </div>
              ) : (
                derivedActivities.map((act, index) => (
                  <div key={act.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ${
                        act.type === 'success' 
                          ? 'bg-primary text-white ring-primary/10' 
                          : act.type === 'warning' 
                          ? 'bg-error text-white ring-error/10' 
                          : 'bg-secondary text-white ring-secondary/10'
                      }`}>
                        {act.type === 'success' ? (
                          <Check className="w-4 h-4" />
                        ) : act.type === 'warning' ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </div>
                      {index < derivedActivities.length - 1 && (
                        <div className="w-0.5 h-full bg-outline-variant mt-2" />
                      )}
                    </div>
                    <div className={index < derivedActivities.length - 1 ? 'pb-6' : ''}>
                      <p className="text-sm font-semibold text-on-surface">{act.title}</p>
                      <p className="text-xs text-secondary mt-1">{formatDate(act.timestamp)} &bull; by {act.actor}</p>
                      <p className="text-xs text-secondary font-sans mt-2">{act.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Section: Sidebar Metadata & Health */}
        <div className="space-y-stack-lg">
          
          {/* Map Site Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-1 shadow-sm overflow-hidden">
            <div className="h-40 w-full relative">
              <img 
                className="w-full h-full object-cover rounded-t-md" 
                alt={`Delhi NCR Map representing ${project.name}`} 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOLsaZb0wPCb7KWsyVRdKioWDin1-O7q4GJLIJt4y1F_7ZouKS9m5lYmsB0FiYcrarG8klCYuJzNd9uBa9JOT8trEIdjrvUmmL3LfUZ1c60-E4PBXWcA8wdzm4ohHQMQYGgHBG1kKszJTZne4vc44OhlIG3pQXRoXooFu1YzuXDQz_9YfX8-On-WQwbvxwUFbEPxT94rkzYjg2iPdK5mfMbGS22KVRDHQfLSJTDeYCQI4qqH6LGwSotI4UNAO0adfZW5ZSbf9t4nKc" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Project Site: {project.location}</span>
                </div>
              </div>
            </div>
            
            {/* Project Specs */}
            <div className="p-5 space-y-4 font-sans">
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-secondary text-sm">Contract Duration</span>
                <span className="font-bold text-sm text-on-surface">{project.duration}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-secondary text-sm">Project Manager</span>
                <span className="font-bold text-sm text-on-surface">{project.manager}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary text-sm">Priority Level</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                  project.priority === 'High' 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : project.priority === 'Medium' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-secondary/10 text-secondary border-outline-variant'
                }`}>
                  {project.priority} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Financial Health block */}
          <div className="bg-primary p-6 rounded-md text-white relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <h4 className="font-headline text-base font-bold">Financial Health</h4>
              <p className="text-xs opacity-80 mt-1 font-sans">Performance is within projected margins</p>
              <div className="mt-6">
                <span className="text-4xl font-headline font-bold">{project.healthScore.toFixed(1)}%</span>
                <div className="mt-3 w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full" style={{ width: `${project.healthScore}%` }}></div>
                </div>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <Briefcase className="w-36 h-36" />
            </div>
          </div>

        </div>
      </div>

      {/* Notice Modal — two-step modal for vendor bills / client funds notices */}
      <NoticeModal
        open={showNoticeModal}
        project={project}
        onClose={() => setShowNoticeModal(false)}
      />
    </div>
  );
};
