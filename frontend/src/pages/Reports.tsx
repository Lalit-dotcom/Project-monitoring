import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Wallet, 
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';
import type { Project, Invoice, PurchaseOrder, DatabaseProject } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toast } from '../lib/toast';

export const Reports: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<(Project & DatabaseProject)[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('All');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const dateRange = 'Oct 1, 2026 - Dec 31, 2026';

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const [projs, invs, pos] = await Promise.all([
          api.getProjects(),
          api.getInvoices(),
          api.getPurchaseOrders()
        ]);
        setProjects(projs);
        setInvoices(invs);
        setPurchaseOrders(pos);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load Reports — check your connection");
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
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

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading financial reports...</div>;
  }

  // Filter helper based on selectedProject
  const filteredProjects = selectedProject === 'All'
    ? projects
    : projects.filter(p => String(p.id) === selectedProject || p.projectCd === selectedProject);

  const getLifecycleData = () => {
    const projectFilter = selectedProject;
    
    const filteredInvoices = projectFilter === 'All' 
      ? invoices 
      : invoices.filter(i => String(i.projectId) === projectFilter || i.projectNo === projectFilter);
      
    const filteredPOs = projectFilter === 'All'
      ? purchaseOrders
      : purchaseOrders.filter(po => String(po.projectId) === projectFilter || po.projectNo === projectFilter);

    // Group by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: { [key: string]: { PO: number; Received: number; Paid: number; sortKey: number } } = {};
    
    filteredPOs.forEach(po => {
      if (!po.poDate) return;
      const d = new Date(po.poDate);
      if (isNaN(d.getTime())) return;
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      if (!monthlyMap[key]) {
        monthlyMap[key] = { PO: 0, Received: 0, Paid: 0, sortKey };
      }
      monthlyMap[key].PO += (po.total || 0);
    });

    filteredInvoices.forEach(inv => {
      if (!inv.invoiceDate) return;
      const d = new Date(inv.invoiceDate);
      if (isNaN(d.getTime())) return;
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      if (!monthlyMap[key]) {
        monthlyMap[key] = { PO: 0, Received: 0, Paid: 0, sortKey };
      }
      monthlyMap[key].Received += (inv.invoiceAmount || 0);
      monthlyMap[key].Paid += (inv.amountPaid || 0);
    });

    const sortedData = Object.entries(monthlyMap)
      .map(([name, vals]) => ({
        name,
        PO: parseFloat((vals.PO / 10000000).toFixed(2)),          // to Cr
        Received: parseFloat((vals.Received / 10000000).toFixed(2)), // to Cr
        Paid: parseFloat((vals.Paid / 10000000).toFixed(2)),          // to Cr
        sortKey: vals.sortKey
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    if (sortedData.length === 0) {
      return [
        { name: 'No Data', PO: 0, Received: 0, Paid: 0 }
      ];
    }
    
    return sortedData.slice(-6); // last 6 months of data
  };

  const lifecycleData = getLifecycleData();

  // Aging Pie Chart Data
  const getAgingData = () => {
    const projectFilter = selectedProject;
    const filteredInvoices = projectFilter === 'All'
      ? invoices
      : invoices.filter(i => String(i.projectId) === projectFilter || i.projectNo === projectFilter);

    let current = 0;
    let d30_60 = 0;
    let d60_90 = 0;
    let d90_plus = 0;
    const today = new Date();
    
    filteredInvoices.forEach(inv => {
      const unpaid = inv.unpaid || 0;
      if (unpaid <= 0) return;
      
      if (!inv.invoiceDate) {
        current += unpaid;
        return;
      }
      const invDate = new Date(inv.invoiceDate);
      const diffTime = Math.abs(today.getTime() - invDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) {
        current += unpaid;
      } else if (diffDays <= 60) {
        d30_60 += unpaid;
      } else if (diffDays <= 90) {
        d60_90 += unpaid;
      } else {
        d90_plus += unpaid;
      }
    });

    const total = current + d30_60 + d60_90 + d90_plus;
    const displayTotal = total || 1;
    const pCurrent = Math.round((current / displayTotal) * 100);
    const p30_60 = Math.round((d30_60 / displayTotal) * 100);
    const p60_90 = Math.round((d60_90 / displayTotal) * 100);
    const p90_plus = Math.max(0, 100 - pCurrent - p30_60 - p60_90);

    return {
      total,
      data: [
        { name: `Current (${pCurrent}%)`, value: current, color: theme === 'dark' ? '#6bd8cb' : '#00685f' },
        { name: `30-60d (${p30_60}%)`, value: d30_60, color: theme === 'dark' ? '#005049' : '#008378' },
        { name: `60-90d (${p60_90}%)`, value: d60_90, color: theme === 'dark' ? '#c0c7d6' : '#555c6a' },
        { name: `90+d (${p90_plus}%)`, value: d90_plus, color: theme === 'dark' ? '#ffb4ab' : '#ba1a1a' }
      ]
    };
  };

  const agingResult = getAgingData();
  const agingData = agingResult.data;
  const totalOutstanding = agingResult.total;

  // Map and sort top revenue channels based on our real projects
  const topChannels = [...filteredProjects]
    .sort((a, b) => (b.poAmount || 0) - (a.poAmount || 0))
    .slice(0, 4);
  const maxPoAmount = topChannels[0]?.poAmount || 1;

  // Insights Calculations
  const getAvgCollectionTime = () => {
    const projectFilter = selectedProject;
    const filteredInvoices = projectFilter === 'All'
      ? invoices
      : invoices.filter(i => String(i.projectId) === projectFilter || i.projectNo === projectFilter);

    const paidInvoices = filteredInvoices.filter(i => i.invoiceDate && i.glDate && (i.amountPaid || 0) > 0);
    if (paidInvoices.length === 0) return 24; // fallback baseline
    const totalDays = paidInvoices.reduce((sum, i) => {
      const start = new Date(i.invoiceDate!);
      const end = new Date(i.glDate!);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, diff);
    }, 0);
    return Math.round(totalDays / paidInvoices.length);
  };
  const avgCollectionTime = getAvgCollectionTime();

  const getUnbilledRevenue = () => {
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.prjBudgetNo || 0), 0);
    const totalInvoiced = filteredProjects.reduce((sum, p) => sum + (p.totalInvoiceAmount || p.invoiceAmount || 0), 0);
    return Math.max(0, totalBudget - totalInvoiced);
  };
  const unbilledRevenue = getUnbilledRevenue();

  const getDisputedInvoicesCount = () => {
    const projectFilter = selectedProject;
    const filteredInvoices = projectFilter === 'All'
      ? invoices
      : invoices.filter(i => String(i.projectId) === projectFilter || i.projectNo === projectFilter);
    return filteredInvoices.filter(i => i.objection && i.objection !== '' && (i.unpaid || 0) > 0).length;
  };
  const disputedInvoicesCount = getDisputedInvoicesCount();

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-lg">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Reports' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Financial Reports</h2>
          <p className="font-sans text-sm text-secondary">Analyze your revenue, payment cycles, and aging status.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker Sim */}
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant px-4 py-2 rounded-lg gap-3 cursor-pointer hover:border-primary transition-colors font-sans text-sm">
            <Calendar className="w-4 h-4 text-secondary" />
            <span className="font-semibold text-on-surface">{dateRange}</span>
          </div>

          {/* Filters Sim */}
          <div className="relative font-sans text-sm">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant px-4 py-2 rounded-lg pr-10 font-semibold text-on-surface focus:ring-0 cursor-pointer h-10"
            >
              <option value="All">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.id} - {p.name.slice(0, 25)}...</option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button 
            onClick={async () => {
              setIsExportingPdf(true);
              try {
                await api.exportDashboardPdf();
              } catch (_) {}
              finally { setIsExportingPdf(false); }
            }}
            disabled={isExportingPdf}
            className="bg-primary hover:bg-primary-container text-on-primary font-headline text-sm font-semibold px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main comparison grid */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Revenue Lifecycle Chart Card */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h3 className="font-headline text-lg font-bold text-on-surface">Revenue Lifecycle</h3>
              <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Purchase Orders vs Received vs Paid (Weekly)</p>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2 font-headline text-[10px] font-bold text-secondary uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                <span>PO Value</span>
              </div>
              <div className="flex items-center gap-2 font-headline text-[10px] font-bold text-secondary uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Received</span>
              </div>
              <div className="flex items-center gap-2 font-headline text-[10px] font-bold text-secondary uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                <span>Paid</span>
              </div>
            </div>
          </div>

          {/* Recharts Revenue Line Graph */}
          <div className="w-full h-80">
            {(() => {
              const chartColors = theme === 'dark' ? {
                axis: '#bcc9c6',
                tooltipBg: '#272b2a',
                tooltipText: '#e1e3e2',
                linePO: '#005049',
                lineReceived: '#6bd8cb',
                linePaid: '#c0c7d6',
              } : {
                axis: '#6d7a77',
                tooltipBg: '#191c1d',
                tooltipText: '#f0f1f2',
                linePO: '#008378',
                lineReceived: '#00685f',
                linePaid: '#555c6a',
              };

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lifecycleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke={chartColors.axis} fontSize={11} fontFamily="Geist" />
                    <YAxis stroke={chartColors.axis} fontSize={11} fontFamily="Geist" tickFormatter={(v) => `₹${v}Cr`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: 'none', borderRadius: '8px', color: chartColors.tooltipText }}
                      labelStyle={{ fontFamily: 'Geist', fontWeight: 'bold' }}
                    />
                    {/* PO Value - Dashed Line */}
                    <Line type="monotone" dataKey="PO" stroke={chartColors.linePO} strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} />
                    {/* Received - Solid Teal */}
                    <Line type="monotone" dataKey="Received" stroke={chartColors.lineReceived} strokeWidth={3} dot={{ r: 4 }} />
                    {/* Paid - Solid Dark Gray */}
                    <Line type="monotone" dataKey="Paid" stroke={chartColors.linePaid} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* Aging Analysis Donut Card */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface">Aging Analysis</h3>
            <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Outstanding balance by due date</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative py-6">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {agingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-headline text-2xl font-bold text-on-surface">{formatINR(totalOutstanding)}</span>
                <span className="font-headline text-[9px] text-secondary uppercase tracking-widest font-bold mt-0.5">Total Due</span>
              </div>
            </div>
          </div>

          {/* 2x2 Legends Grid */}
          <div className="grid grid-cols-2 gap-y-3 font-sans text-xs border-t border-outline-variant pt-4 mt-2">
            {agingData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-secondary font-medium leading-none">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Revenue Channels horizontal bar chart */}
        <div className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Top Revenue Channels</h3>
              <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Revenue distribution across key enterprise projects</p>
            </div>
            
            <button 
              onClick={() => navigate('/projects')}
              className="text-primary font-headline text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:underline"
            >
              <span>View Detailed Table</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bar rows */}
          <div className="space-y-6">
            {topChannels.map((p) => {
              const widthPct = Math.round((p.poAmount / maxPoAmount) * 100);
              return (
                <div key={p.id} className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-on-surface">{p.name}</span>
                    <span className="text-sm font-semibold text-secondary">{formatINR(p.poAmount, false)}</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 Quick Insights Cards */}
        {/* Card 1: Avg Collection Time */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Avg. Collection Time</p>
            <p className="font-headline text-2xl font-bold text-on-surface mt-1">{avgCollectionTime} Days</p>
            <p className="font-sans text-[11px] text-primary font-medium mt-0.5">Derived from real historical payments</p>
          </div>
        </div>

        {/* Card 2: Unbilled Revenue */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Unbilled Revenue</p>
            <p className="font-headline text-2xl font-bold text-on-surface mt-1">{formatINR(unbilledRevenue)}</p>
            <p className="font-sans text-[11px] text-secondary mt-0.5">Budget remaining to be invoiced</p>
          </div>
        </div>

        {/* Card 3: Disputed Invoices */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-error/10 flex items-center justify-center text-error shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Disputed Invoices</p>
            <p className="font-headline text-2xl font-bold text-error mt-1">{String(disputedInvoicesCount).padStart(2, '0')} Alerts</p>
            <p className="font-sans text-[11px] text-error font-medium mt-0.5">Unpaid invoices with objection flags</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-margin-desktop pt-8 border-t border-outline-variant flex justify-between items-center pb-12 font-headline text-[10px] text-secondary font-bold tracking-widest">
        <p className="uppercase">Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; NPMS Reporting Module v2.4.1</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Audit Logs</a>
          <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
};
