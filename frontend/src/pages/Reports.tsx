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
import type { Project, Invoice } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toast } from '../lib/toast';

export const Reports: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('All');
  const dateRange = 'Oct 1, 2026 - Dec 31, 2026';

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const projs = await api.getProjects();
        const invs = await api.getInvoices();
        setProjects(projs);
        setInvoices(invs);
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

  // Lifecycle Chart Data
  const lifecycleData = [
    { name: 'Week 1', PO: 12.0, Received: 6.0, Paid: 4.5 },
    { name: 'Week 3', PO: 15.0, Received: 8.5, Paid: 7.0 },
    { name: 'Week 6', PO: 18.0, Received: 12.0, Paid: 10.0 },
    { name: 'Week 9', PO: 24.0, Received: 17.5, Paid: 15.0 },
    { name: 'Week 12', PO: 27.7, Received: 20.2, Paid: 20.2 },
  ];

  // Aging Pie Chart Data
  const agingData = theme === 'dark' ? [
    { name: 'Current (60%)', value: 60, color: '#6bd8cb' },
    { name: '30-60d (25%)', value: 25, color: '#005049' },
    { name: '60-90d (10%)', value: 10, color: '#c0c7d6' },
    { name: '90+d (5%)', value: 5, color: '#ffb4ab' }
  ] : [
    { name: 'Current (60%)', value: 60, color: '#00685f' },
    { name: '30-60d (25%)', value: 25, color: '#008378' },
    { name: '60-90d (10%)', value: 10, color: '#555c6a' },
    { name: '90+d (5%)', value: 5, color: '#ba1a1a' }
  ];

  // Map and sort top revenue channels based on our real projects
  const topChannels = [...projects]
    .sort((a, b) => b.poAmount - a.poAmount)
    .slice(0, 4);
  const maxPoAmount = topChannels[0]?.poAmount || 1;

  // Outstanding sum for aging center text
  const totalOutstanding = invoices
    .reduce((sum, i) => sum + (i.unpaid || 0), 0);

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
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button 
            onClick={() => alert('PDF report exported successfully.')}
            className="bg-primary hover:bg-primary-container text-on-primary font-headline text-sm font-semibold px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
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
            <p className="font-headline text-2xl font-bold text-on-surface mt-1">24 Days</p>
            <p className="font-sans text-[11px] text-primary font-medium mt-0.5">3 days faster than last quarter</p>
          </div>
        </div>

        {/* Card 2: Unbilled Revenue */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Unbilled Revenue</p>
            <p className="font-headline text-2xl font-bold text-on-surface mt-1">{formatINR(8500000)}</p>
            <p className="font-sans text-[11px] text-secondary mt-0.5">Projections for next 30 days</p>
          </div>
        </div>

        {/* Card 3: Disputed Invoices */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-error/10 flex items-center justify-center text-error shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-[10px] text-secondary font-bold uppercase tracking-wider">Disputed Invoices</p>
            <p className="font-headline text-2xl font-bold text-error mt-1">02 Alerts</p>
            <p className="font-sans text-[11px] text-error font-medium mt-0.5">Requires immediate attention</p>
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
