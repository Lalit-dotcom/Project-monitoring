import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import {
  Wallet,
  ShoppingCart,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { api } from '../lib/api';
import type { Project, Activity } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { useCountUp } from '../hooks/useCountUp';
import { toast } from '../lib/toast';

/* ─── Animated Metric Card ─── */
interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: React.ReactNode;
  accentLeft?: boolean;
  format: (v: number) => string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, sub, accentLeft, format }) => {
  const animated = useCountUp(value);
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 ${
        accentLeft ? 'border-l-4 border-l-error' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">
          {label}
        </span>
        <div className={`p-1 ${accentLeft ? 'bg-error/10' : 'bg-primary/10'} rounded-md ${accentLeft ? 'text-error' : 'text-primary'}`}>
          {icon}
        </div>
      </div>
      <div className="font-headline text-3xl font-bold text-on-surface">
        {format(animated)}
      </div>
      {sub && <div className="flex items-center gap-1 text-[11px]">{sub}</div>}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalReceived: 0,
    totalPO: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mets = await api.getDashboardMetrics();
        const acts = await api.getActivities();
        const projs = await api.getProjects();
        const charts = await api.getDashboardCharts();
        setMetrics(mets);
        setActivities(acts.slice(0, 5));
        setProjects(projs);
        setChartData(charts);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load Dashboard — check your connection");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatINR = (val: number, abbreviate = true) => {
    if (abbreviate) {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const filteredProjects = projects.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="text-secondary font-headline text-sm font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  const inProgressCount = projects.filter(p => p.status === 'Partially Paid' || p.status === 'No Invoices Yet').length;
  const settledCount = projects.filter(p => p.status === 'Fully Paid').length;

  const chartColors = theme === 'dark'
    ? { axis: '#bcc9c6', tooltipBg: '#272b2a', tooltipText: '#e1e3e2', areaStroke: '#6bd8cb', areaFill: 'rgba(107,216,203,0.05)', lineStroke: '#889390' }
    : { axis: '#6d7a77', tooltipBg: '#191c1d', tooltipText: '#f0f1f2', areaStroke: '#00685f', areaFill: 'rgba(0,104,95,0.05)', lineStroke: '#bcc9c6' };

  return (
    <div className="space-y-stack-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Dashboard' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Financial Overview</h2>
          <p className="font-sans text-sm text-secondary">Real-time tracking of project liquidity and settlements.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => toast.info('Export Report — coming soon')}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container transition-colors font-headline text-sm font-semibold text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Export financial report"
          >
            <Download className="w-4 h-4 text-outline" aria-hidden="true" />
            <span>Export Report</span>
          </button>
          <button
            onClick={() => navigate('/bill-desk')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-all font-headline text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            aria-label="Create a new invoice"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row — responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-stack-md">
        <MetricCard
          label="Received"
          value={metrics.totalReceived}
          icon={<Wallet className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={
            <>
              <span className="text-green-600 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" aria-hidden="true" /> 12.5%
              </span>
              <span className="text-secondary opacity-60">vs last month</span>
            </>
          }
        />
        <MetricCard
          label="Total PO"
          value={metrics.totalPO}
          icon={<ShoppingCart className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={<span className="text-secondary opacity-60">Active across {projects.length} projects</span>}
        />
        <MetricCard
          label="Invoiced"
          value={metrics.totalInvoiced}
          icon={<FileText className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={
            <>
              <span className="text-green-600 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" aria-hidden="true" /> 4.2%
              </span>
              <span className="text-secondary opacity-60">Pending approval</span>
            </>
          }
        />
        <MetricCard
          label="Paid"
          value={metrics.totalPaid}
          icon={<CheckCircle className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={<span className="text-secondary opacity-60">82% processing efficiency</span>}
        />
        <MetricCard
          label="Outstanding"
          value={metrics.totalOutstanding}
          icon={<AlertCircle className="w-4 h-4" />}
          format={v => formatINR(v)}
          accentLeft
          sub={<span className="text-error font-bold">Action Required</span>}
        />
      </div>

      {/* Bento Layout Grid: Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        {/* Received vs Paid Trends Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant p-6 rounded-md flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-lg font-bold text-on-surface">Received vs Paid Trends</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 font-headline text-xs font-semibold text-secondary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true" /> Received (Cr)
              </span>
              <span className="flex items-center gap-1.5 font-headline text-xs font-semibold text-secondary">
                <span className="w-2.5 h-2.5 rounded-full bg-outline" aria-hidden="true" /> Paid (Cr)
              </span>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke={chartColors.axis} fontSize={11} fontFamily="Geist" />
                <YAxis stroke={chartColors.axis} fontSize={11} fontFamily="Geist" tickFormatter={(v) => `₹${v}Cr`} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartColors.tooltipBg, border: 'none', borderRadius: '8px', color: chartColors.tooltipText }}
                  labelStyle={{ fontFamily: 'Geist', fontWeight: 'bold' }}
                  itemStyle={{ fontFamily: 'Inter' }}
                />
                <Area type="monotone" dataKey="Received" stroke={chartColors.areaStroke} fill={chartColors.areaFill} strokeWidth={3} />
                <Line type="monotone" dataKey="Paid" stroke={chartColors.lineStroke} strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-md flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-lg font-bold text-on-surface">Recent Activity</h3>
            <button
              onClick={() => navigate('/notifications')}
              className="text-primary font-headline text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              aria-label="View all activity notifications"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    act.type === 'success'
                      ? 'bg-primary/10 text-primary'
                      : act.type === 'warning'
                      ? 'bg-error/10 text-error'
                      : 'bg-secondary/10 text-secondary'
                  }`}
                  aria-hidden="true"
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-sans text-sm text-on-surface leading-tight font-medium">{act.title}</p>
                  <p className="font-sans text-xs text-secondary leading-snug">{act.description}</p>
                  <span className="text-[10px] text-secondary opacity-60 mt-1">
                    {act.timestamp} &bull; by {act.actor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settlements Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden mt-stack-lg">
        {/* Table Header */}
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-headline text-lg font-bold text-on-surface">Active Project Settlements</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-headline text-[10px] font-bold uppercase tracking-wider">
              {inProgressCount} In Progress
            </span>
            <span className="px-3 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container font-headline text-[10px] font-bold uppercase tracking-wider">
              {settledCount} Settled
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-sticky-header">
            <thead className="bg-surface-container-low/50">
              <tr className="border-b border-outline-variant">
                <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Project Name</th>
                <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Client</th>
                <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">PO Value</th>
                <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Received</th>
                <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredProjects.length === 0 ? (
                <EmptyState
                  isFiltered={searchQuery.trim() !== ''}
                  entityName="settlements"
                  onClear={() => {/* search is controlled by topbar */}}
                />
              ) : (
                filteredProjects.map((p, i) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer animate-row-stagger"
                    style={{ animationDelay: `${Math.min(i * 25, 400)}ms` }}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.id}`)}
                    aria-label={`View project ${p.name}`}
                  >
                    <td className="p-4 font-sans text-sm font-semibold text-on-surface">{p.name}</td>
                    <td className="p-4 font-sans text-sm text-secondary">{p.client}</td>
                    <td className="p-4 font-sans text-sm font-semibold">{formatINR(p.poAmount, false)}</td>
                    <td className="p-4 font-sans text-sm font-semibold">{formatINR(p.amountPaid, false)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            p.status === 'Fully Paid' ? 'bg-primary' : p.status === 'Partially Paid' ? 'bg-secondary' : 'bg-error'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`font-headline text-xs font-bold ${
                            p.status === 'Fully Paid' ? 'text-primary' : p.status === 'Partially Paid' ? 'text-secondary' : 'text-error'
                          }`}
                        >
                          {p.status === 'Fully Paid' ? 'Settled' : p.status === 'Partially Paid' ? 'Active' : 'Overdue'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="text-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        aria-label={`Open details for ${p.name}`}
                      >
                        <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
