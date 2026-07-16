import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Check, 
  Mail, 
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Download,
  Loader2,
  Bell,
  Maximize2,
  Minimize2
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
import type { Project, Invoice, PurchaseOrder, TaxInvoice, Activity, DatabaseProject, BillDeskRecord } from '../types';
import { Toast } from '../components/Toast';
import { NoticeModal } from '../components/NoticeModal';
import { CompactStatCard } from '../components/CompactStatCard';
import { Breadcrumbs } from '../components/Breadcrumbs';

type TabName = 'Overview' | 'Purchase Orders' | 'Invoices' | 'Tax Invoices' | 'Bill Desk';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { searchQuery, setSearchQuery } = useOutletContext<{ searchQuery: string; setSearchQuery?: (val: string) => void }>();

  const [project, setProject] = useState<(Project & DatabaseProject) | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([]);
  const [billDesk, setBillDesk] = useState<BillDeskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportPopover, setShowExportPopover] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Pagination and Layout states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [showRowsPerPagePopover, setShowRowsPerPagePopover] = useState(false);
  const rowsPerPageDropdownRef = useRef<HTMLDivElement>(null);
  const rowsPerPageButtonRef = useRef<HTMLButtonElement>(null);

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
      if (
        showRowsPerPagePopover &&
        rowsPerPageDropdownRef.current &&
        !rowsPerPageDropdownRef.current.contains(event.target as Node) &&
        rowsPerPageButtonRef.current &&
        !rowsPerPageButtonRef.current.contains(event.target as Node)
      ) {
        setShowRowsPerPagePopover(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowExportPopover(false);
        setShowRowsPerPagePopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showExportPopover, showRowsPerPagePopover]);
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
    return 'Overview';
  };

  const activeTab = getTabFromParam(searchParams.get('tab'));

  // Filter lists based on global search query from layout context
  const filteredInvoices = invoices.filter(i => 
    String(i.invoiceNum || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(i.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPOs = purchaseOrders.filter(po => 
    String(po.finalPoNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(po.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTxs = taxInvoices.filter(tx => 
    String(tx.userBillNo || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBillDesk = billDesk.filter(b => 
    String(b.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(b.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset page to 1 and clear highlight when searchQuery changes
  const prevSearchQueryRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchQueryRef.current !== searchQuery) {
      setCurrentPage(1);
      if (searchParams.has('highlight')) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('highlight');
        setSearchParams(newParams, { replace: true });
      }
      prevSearchQueryRef.current = searchQuery;
    }
  }, [searchQuery, searchParams, setSearchParams]);

  // Programmatic jump to page and scroll into view for highlighted row
  const highlight = searchParams.get('highlight');
  const lastProcessedHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlight || highlight === lastProcessedHighlightRef.current) return;

    let matchedIndex = -1;

    if (activeTab === 'Invoices' && invoices.length > 0) {
      matchedIndex = filteredInvoices.findIndex(i => String(i.invoiceNum || '') === highlight);
    } else if (activeTab === 'Purchase Orders' && purchaseOrders.length > 0) {
      matchedIndex = filteredPOs.findIndex(po => String(po.finalPoNo || '') === highlight);
    } else if (activeTab === 'Tax Invoices' && taxInvoices.length > 0) {
      matchedIndex = filteredTxs.findIndex(tx => String(tx.userBillNo || '') === highlight);
    } else if (activeTab === 'Bill Desk' && billDesk.length > 0) {
      matchedIndex = filteredBillDesk.findIndex(b => String(b.invoiceNo || '') === highlight);
    }

    if (matchedIndex !== -1) {
      lastProcessedHighlightRef.current = highlight;
      const targetPage = Math.floor(matchedIndex / rowsPerPage) + 1;
      setCurrentPage(targetPage);

      setTimeout(() => {
        const element = document.getElementById(`row-highlight-${highlight}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  }, [highlight, activeTab, invoices, purchaseOrders, taxInvoices, billDesk, filteredInvoices, filteredPOs, filteredTxs, filteredBillDesk, rowsPerPage]);

  const handleTabChange = (tab: TabName) => {
    const paramVal = tab.toLowerCase().replace(/\s+/g, '-');
    setSearchParams({ tab: paramVal }, { replace: true });
    setCurrentPage(1);
    if (setSearchQuery) {
      setSearchQuery('');
    }
  };

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
          const allBDs = await api.getBillDesk();
          setBillDesk(allBDs.filter(b => b.projectNo === id));
          
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

  const receivedPct = poAmount > 0 ? Math.round((receivedAmount / poAmount) * 100) : 0;
  const paidPct = poAmount > 0 ? Math.round((paidAmount / poAmount) * 100) : 0;

  // Aging buckets & Financial Health Calculation
  let currentOverdue = 0;
  let overdue30_60 = 0;
  let overdue60_90 = 0;
  let overdue90_plus = 0;
  const todayForAging = new Date();

  invoices.forEach((inv) => {
    const unpaid = (inv.invoiceAmount || 0) - (inv.amountPaid || 0);
    if (unpaid <= 0) return;

    if (!inv.invoiceDate) {
      currentOverdue += unpaid;
      return;
    }
    const invDate = new Date(inv.invoiceDate);
    const diffTime = Math.abs(todayForAging.getTime() - invDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) {
      currentOverdue += unpaid;
    } else if (diffDays <= 60) {
      overdue30_60 += unpaid;
    } else if (diffDays <= 90) {
      overdue60_90 += unpaid;
    } else {
      overdue90_plus += unpaid;
    }
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);
  const totalBudget = project.prjBudgetNo || 0;
  const normalizationBase = Math.max(totalInvoiced, totalBudget) || 1;
  const totalPenalty = (currentOverdue * 0) + (overdue30_60 * 0.3) + (overdue60_90 * 0.6) + (overdue90_plus * 1.0);
  
  const computedHealth = Math.max(0, Math.min(100, 100 - (totalPenalty / normalizationBase) * 100));

  // Determine Priority Level based on overdue/risk state
  let computedPriority = 'Low';
  const totalOverdue = overdue30_60 + overdue60_90 + overdue90_plus;
  if (overdue90_plus > 0 || (totalOverdue / normalizationBase) > 0.2 || computedHealth < 60) {
    computedPriority = 'High';
  } else if (overdue30_60 > 0 || overdue60_90 > 0 || computedHealth < 85) {
    computedPriority = 'Medium';
  }

  let overdue90_plus_count = 0;
  let total_overdue_count = 0;

  invoices.forEach(inv => {
    const unpaid = inv.unpaid || 0;
    if (unpaid <= 0) return;
    const invDate = new Date(inv.invoiceDate || '');
    if (isNaN(invDate.getTime())) return;
    const diffTime = Math.abs(new Date().getTime() - invDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    total_overdue_count++;
    if (diffDays > 90) {
      overdue90_plus_count++;
    }
  });

  let priorityTooltip = '';
  if (computedPriority === 'High') {
    if (overdue90_plus > 0) {
      priorityTooltip = `High — ${formatINR(overdue90_plus, false)} across ${overdue90_plus_count} invoice${overdue90_plus_count > 1 ? 's' : ''} overdue 90+ days.`;
    } else if ((totalOverdue / normalizationBase) > 0.2) {
      priorityTooltip = `High — total overdue is ${((totalOverdue / normalizationBase) * 100).toFixed(0)}% of project base, exceeding 20% limit.`;
    } else {
      priorityTooltip = `High — project financial health score is critical (${computedHealth.toFixed(1)}%).`;
    }
  } else if (computedPriority === 'Medium') {
    priorityTooltip = `Medium — some overdue exposure exists (${formatINR(totalOverdue, false)} across ${total_overdue_count} invoice${total_overdue_count > 1 ? 's' : ''}).`;
  } else {
    priorityTooltip = 'Low — no significant overdue exposure.';
  }

  // Problems / Risk Flags Calculations
  const getActiveProblems = () => {
    const problems: { title: string; description: string }[] = [];
    if (!project) return problems;

    // 1. Vendor Paid More Than Collected From Client
    const totalInvoiceAmountPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const amountReceived = project.amountReceived || 0;
    if (totalInvoiceAmountPaid > amountReceived) {
      problems.push({
        title: 'Vendor Paid More Than Collected From Client',
        description: `NICSI has paid vendors a total of ${formatINR(totalInvoiceAmountPaid, false)}, which exceeds the ${formatINR(amountReceived, false)} received from the client — cash flow risk.`
      });
    }

    // 2. Billing Ahead of Collection
    const poAmount = project.poAmount || 0;
    if (amountReceived < poAmount * 0.8) {
      problems.push({
        title: 'Billing Ahead of Collection',
        description: `Client collections (${formatINR(amountReceived, false)}) are below 80% of total PO value (${formatINR(poAmount, false)}).`
      });
    }

    // 3. Stalled — PO Issued, Nothing Billed Yet
    const hasOldPo = purchaseOrders.some(po => {
      if (!po.poDate) return false;
      const poDateObj = new Date(po.poDate);
      if (isNaN(poDateObj.getTime())) return false;
      const diffTime = Math.abs(new Date().getTime() - poDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 60;
    });
    const noOfInvoices = project.noOfInvBilldesk ?? 0;
    if (noOfInvoices === 0 && billDesk.length === 0 && hasOldPo) {
      problems.push({
        title: 'Stalled — PO Issued, Nothing Billed Yet',
        description: 'A purchase order was raised over 60 days ago, but no invoices have been posted to the bill desk yet.'
      });
    }

    return problems;
  };

  const activeProblems = getActiveProblems();

  // Contract Duration Calculation
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  for (const po of purchaseOrders) {
    const startStr = po.validFrom || po.poDate;
    const endStr = po.validTo;

    if (startStr) {
      const startDate = new Date(startStr);
      if (!isNaN(startDate.getTime())) {
        if (!earliestDate || startDate < earliestDate) {
          earliestDate = startDate;
        }
      }
    }

    if (endStr) {
      const endDate = new Date(endStr);
      if (!isNaN(endDate.getTime())) {
        if (!latestDate || endDate > latestDate) {
          latestDate = endDate;
        }
      }
    }
  }

  let computedDuration = 'Not yet determined';
  if (earliestDate && latestDate && latestDate >= earliestDate) {
    const diffYears = latestDate.getFullYear() - earliestDate.getFullYear();
    const diffMonths = latestDate.getMonth() - earliestDate.getMonth();
    const totalMonths = diffYears * 12 + diffMonths + 1;
    const formatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
    const startFormatted = formatter.format(earliestDate);
    const endFormatted = formatter.format(latestDate);
    computedDuration = `${totalMonths} Month${totalMonths > 1 ? 's' : ''} (${startFormatted} – ${endFormatted})`;
  }

  // healthMessage removed as Financial Health block is no longer rendered

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

  const getBillDeskStatusClasses = (status: string | null | undefined) => {
    if (!status) return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('paid') || s.includes('approved')) {
      return 'bg-status-success-bg text-status-success-text border-status-success-border';
    } else if (s.includes('pending') || s.includes('process')) {
      return 'bg-status-warning-bg text-status-warning-text border-status-warning-border';
    }
    return 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  };

  // Paginated elements helper
  const paginate = (items: any[]) => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return items.slice(startIndex, startIndex + rowsPerPage);
  };



  const handlePageClick = (pageNum: number, totalItems: number) => {
    const maxPage = Math.ceil(totalItems / rowsPerPage);
    if (pageNum >= 1 && pageNum <= maxPage) {
      setCurrentPage(pageNum);
      if (searchParams.has('highlight')) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('highlight');
        setSearchParams(newParams, { replace: true });
      }
    }
  };

  const renderPaginationFooter = (totalCount: number) => {
    const totalPages = Math.ceil(totalCount / rowsPerPage);
    if (totalPages <= 0) return null;

    const startEntry = totalCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endEntry = Math.min(totalCount, currentPage * rowsPerPage);

    return (
      <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row gap-4 items-center justify-between font-sans text-xs text-secondary">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            Showing <strong className="text-on-surface font-semibold">{startEntry}</strong> - <strong className="text-on-surface font-semibold">{endEntry}</strong> of <strong className="text-on-surface font-semibold">{totalCount}</strong> entries
          </span>
          <div className="flex items-center gap-1.5 ml-2 relative">
            <span className="text-secondary text-xs">Rows per page:</span>
            
            {/* Rows per page popover select */}
            <div className="relative inline-block">
              <button
                ref={rowsPerPageButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRowsPerPagePopover(!showRowsPerPagePopover);
                }}
                className="h-8 px-2.5 border border-outline-variant hover:border-outline text-secondary hover:bg-surface-container-low rounded-md font-sans text-xs font-semibold flex items-center gap-1 bg-white shadow-sm transition-colors"
              >
                <span>{rowsPerPage}</span>
                <ChevronDown className="w-3 h-3 text-secondary" />
              </button>

              {showRowsPerPagePopover && (
                <div 
                  ref={rowsPerPageDropdownRef}
                  className="absolute bottom-full left-0 mb-1 w-16 bg-surface border border-outline-variant rounded-md shadow-lg z-50 py-1"
                >
                  {[5, 10, 25, 50].map((option) => (
                    <button
                      key={option}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRowsPerPage(option);
                        setCurrentPage(1);
                        setShowRowsPerPagePopover(false);
                        if (searchParams.has('highlight')) {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.delete('highlight');
                          setSearchParams(newParams, { replace: true });
                        }
                      }}
                      className={`w-full text-center px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low transition-colors ${
                        rowsPerPage === option ? 'text-primary bg-primary/5 font-bold' : 'text-on-surface'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageClick(currentPage - 1, totalCount)}
            disabled={currentPage === 1}
            className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-lowest disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum, totalCount)}
                className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-colors ${
                  isActive 
                    ? 'bg-[#111827] text-white hover:bg-[#1f2937] cursor-default' 
                    : 'border border-outline-variant hover:bg-surface-container-lowest text-secondary bg-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageClick(currentPage + 1, totalCount)}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-outline-variant rounded hover:bg-surface-container-lowest disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
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

      <Breadcrumbs 
        crumbs={[
          { label: 'Database', to: '/projects' },
          { label: 'Projects', to: '/projects' },
          { label: project.name }
        ]} 
      />

      {/* Header Block */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-headline font-bold text-[10px] tracking-wider uppercase">
                Active Project
              </span>
              <span className="text-secondary font-headline text-xs font-semibold dont-translate bhashini-skip-translation">
                Project No: {project.id}
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface">{project.client}</h2>
            <p className="text-secondary font-sans text-sm max-w-2xl mt-1">Project Manager: {project.manager}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-stack-md">
        {/* Budget */}
        <CompactStatCard
          label="Budget"
          value={project.prjBudgetNo ?? 0}
          bg="#B5D4F4"
          labelColor="#0C447C"
          numColor="#042C53"
          icon={<Info className="w-3.5 h-3.5" />}
          format={(val) => formatINR(val, false)}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        >
          <div className="mt-4 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#042C53' }}></div>
          </div>
        </CompactStatCard>

        {/* Project ABP */}
        <CompactStatCard
          label="Project ABP"
          value={project.projectAbp ?? 0}
          bg="#E0D4FC"
          labelColor="#4F3B90"
          numColor="#322468"
          icon={<Info className="w-3.5 h-3.5" />}
          format={(val) => formatINR(val, false)}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        >
          <div className="mt-4 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#322468' }}></div>
          </div>
        </CompactStatCard>

        {/* PO Amount */}
        <CompactStatCard
          label="PO Amount"
          value={poAmount ?? 0}
          bg="#D3D1C7"
          labelColor="#444441"
          numColor="#2C2C2A"
          icon={<Info className="w-3.5 h-3.5" />}
          format={(val) => formatINR(val, false)}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        >
          <div className="mt-4 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#2C2C2A' }}></div>
          </div>
        </CompactStatCard>

        {/* Received */}
        <CompactStatCard
          label="Received"
          value={receivedAmount ?? 0}
          bg="#9FE1CB"
          labelColor="#085041"
          numColor="#04342C"
          icon={<span className="text-[10px] font-bold" style={{ color: '#085041' }}>{receivedPct}%</span>}
          format={(val) => formatINR(val, false)}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        >
          <div className="mt-4 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${receivedPct}%`, backgroundColor: '#04342C' }}></div>
          </div>
        </CompactStatCard>

        {/* Paid */}
        <CompactStatCard
          label="Paid"
          value={paidAmount ?? 0}
          bg="#F9E8B3"
          labelColor="#7A610A"
          numColor="#534204"
          icon={<span className="text-[10px] font-bold" style={{ color: '#7A610A' }}>{paidPct}%</span>}
          format={(val) => formatINR(val, false)}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        >
          <div className="mt-4 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${paidPct}%`, backgroundColor: '#534204' }}></div>
          </div>
        </CompactStatCard>
      </div>

      {/* Main Double Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        {/* Left Section: Details Table & Timeline */}
        <div className={`${isTableExpanded ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-stack-lg`}>
          
          {/* Tabbed Card container */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden flex flex-col shadow-sm">
            {/* Tab Navigation header */}
            <div className="flex items-center px-6 bg-surface-container-low border-b border-outline-variant">
              <div className="flex space-x-10 h-14 items-center overflow-x-auto no-scrollbar">
                {(['Overview', 'Purchase Orders', 'Invoices', 'Tax Invoices', 'Bill Desk'] as TabName[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`h-full px-2 font-headline text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab 
                        ? 'text-primary border-primary font-bold' 
                        : 'text-secondary border-transparent hover:text-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              {/* Right side container: expand/collapse button */}
              <div className="ml-auto flex items-center gap-3">
                {/* Expand / Collapse Button */}
                <button
                  onClick={() => setIsTableExpanded(!isTableExpanded)}
                  className="p-1.5 hover:bg-surface-container rounded-md text-secondary hover:text-primary transition-colors"
                  title={isTableExpanded ? "Minimize Layout" : "Maximize Layout"}
                >
                  {isTableExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-secondary font-headline">No invoices found for this project.</td>
                        </tr>
                      ) : (
                        paginate(filteredInvoices).map((inv) => {
                          const status = inv.unpaid && inv.unpaid > 0 ? 'Pending' : 'Paid';
                          const isHighlighted = highlight === inv.invoiceNum;
                          return (
                            <tr 
                              key={inv.id} 
                              id={`row-highlight-${inv.invoiceNum}`}
                              className={`transition-all duration-300 group ${isHighlighted ? 'bg-amber-100 dark:bg-amber-950/40 border-y border-amber-300 shadow-sm' : 'hover:bg-surface'}`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="font-headline text-sm font-semibold text-on-surface dont-translate bhashini-skip-translation">{inv.invoiceNum || inv.id}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-secondary text-sm">{formatDate(inv.invoiceDate)}</td>
                              <td className="px-6 py-4 text-secondary text-sm font-medium dont-translate bhashini-skip-translation">{formatINR(inv.penAmt || 0, false)}</td>
                              <td className="px-6 py-4 font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">{formatINR(inv.invoiceAmount, false)}</td>
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
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {renderPaginationFooter(filteredInvoices.length)}
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
                        paginate(filteredPOs).map((po) => {
                          const isHighlighted = highlight === po.finalPoNo;
                          return (
                            <tr 
                              key={po.id} 
                              id={`row-highlight-${po.finalPoNo}`}
                              className={`transition-all duration-300 ${isHighlighted ? 'bg-amber-100 dark:bg-amber-950/40 border-y border-amber-300 shadow-sm' : 'hover:bg-surface'}`}
                            >
                              <td className="px-6 py-4 font-headline text-sm font-semibold text-primary dont-translate bhashini-skip-translation">{po.finalPoNo || po.id}</td>
                              <td className="px-6 py-4 text-secondary text-sm">{formatDate(po.poDate)}</td>
                              <td className="px-6 py-4 font-sans text-sm font-medium">{po.vendorName}</td>
                              <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">{formatINR(po.total, false)}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-success-bg text-status-success-text font-bold text-[10px] border border-status-success-border uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-status-success-text" />
                                  {po.approvalStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {renderPaginationFooter(filteredPOs.length)}
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
                        paginate(filteredTxs).map((tx) => {
                          const isHighlighted = highlight === tx.userBillNo;
                          return (
                            <tr 
                              key={tx.id} 
                              id={`row-highlight-${tx.userBillNo}`}
                              className={`transition-all duration-300 ${isHighlighted ? 'bg-amber-100 dark:bg-amber-950/40 border-y border-amber-300 shadow-sm' : 'hover:bg-surface'}`}
                            >
                              <td className="px-6 py-4 font-headline text-sm font-semibold text-primary dont-translate bhashini-skip-translation">{tx.userBillNo || tx.id}</td>
                              <td className="px-6 py-4 text-secondary text-sm">{formatDate(tx.billDate)}</td>
                              <td className="px-6 py-4 font-sans text-sm text-secondary dont-translate bhashini-skip-translation">{tx.poNo}</td>
                              <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">{formatINR(tx.totalAmount, false)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  tx.billStatus === 'FINAL' ? 'bg-status-success-bg text-status-success-text border-status-success-border' : 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${tx.billStatus === 'FINAL' ? 'bg-status-success-text' : 'bg-status-warning-text'}`} />
                                  {tx.billStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {renderPaginationFooter(filteredTxs.length)}
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
                    <div className="h-[220px] w-full dont-translate bhashini-skip-translation">
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
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low/50">
                      <tr className="border-b border-outline-variant">
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice # / Bill No</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Bill Month</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Invoice Date</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">Invoice Amt</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider text-right">Paid Amt</th>
                        <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filteredBillDesk.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-secondary font-headline">No bill desk records found for this project.</td>
                        </tr>
                      ) : (
                        paginate(filteredBillDesk).map((b) => {
                          const isHighlighted = highlight === b.invoiceNo;
                          return (
                            <tr 
                              key={b.id} 
                              id={`row-highlight-${b.invoiceNo}`}
                              className={`transition-all duration-300 ${isHighlighted ? 'bg-amber-100 dark:bg-amber-950/40 border-y border-amber-300 shadow-sm' : 'hover:bg-surface'}`}
                            >
                              <td className="px-6 py-4 font-headline text-sm font-semibold text-primary dont-translate bhashini-skip-translation">{b.invoiceNo || b.id}</td>
                              <td className="px-6 py-4 text-secondary text-sm" title={b.vendorName || ''}>{b.vendorName || '-'}</td>
                              <td className="px-6 py-4 text-secondary text-sm">{b.billMonth || '-'}</td>
                              <td className="px-6 py-4 text-secondary text-sm">{formatDate(b.invoiceDate)}</td>
                              <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">{formatINR(b.invoiceAmount || 0, false)}</td>
                              <td className="px-6 py-4 text-right font-headline text-base font-bold text-on-surface dont-translate bhashini-skip-translation">{formatINR(b.amountPaid || 0, false)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getBillDeskStatusClasses(b.status)}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {b.status || 'Unknown'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {renderPaginationFooter(filteredBillDesk.length)}
                </>
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

        {/* Right Section: Sidebar Metadata */}
        {!isTableExpanded && (
          <div className="space-y-stack-lg">
            
            {/* Project Details block */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-sm font-sans space-y-4">
              <h3 className="font-headline text-base font-bold text-on-surface mb-2">Project Details</h3>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-secondary text-sm">Contract Duration</span>
                <span className="font-bold text-sm text-on-surface">{computedDuration}</span>
              </div>
              <div className="flex justify-between items-center" title={priorityTooltip}>
                <span className="text-secondary text-sm">Priority Level</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border cursor-help ${
                  computedPriority === 'High' 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : computedPriority === 'Medium' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-secondary/10 text-secondary border-outline-variant'
                }`}>
                  {computedPriority} Priority
                </span>
              </div>
            </div>

            {/* Problems in the Project block */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-sm font-sans space-y-4">
              <h3 className="font-headline text-base font-bold text-on-surface mb-2">Problems in the Project</h3>
              {activeProblems.length === 0 ? (
                <div className="flex gap-3 items-center p-3 rounded-lg border border-outline-variant bg-surface-container-low/20">
                  <CheckCircle2 className="w-5 h-5 text-status-success-text shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-status-success-text block">No issues detected</span>
                    <span className="text-[10px] text-secondary block leading-normal">
                      This project is compliant with automatic risk monitoring rules.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeProblems.map((prob, idx) => (
                    <div 
                      key={idx} 
                      className="flex gap-3 items-start p-3 rounded-lg border border-error/20 bg-error/5 hover:border-error/40 transition-colors"
                    >
                      <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-on-surface block">{prob.title}</span>
                        <span className="text-[10px] text-secondary block leading-normal">
                          {prob.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
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
