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

export const Dashboard: React.FC = () => {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mets = await api.getDashboardMetrics();
        const acts = await api.getActivities();
        const projs = await api.getProjects();
        setMetrics(mets);
        setActivities(acts.slice(0, 5));
        setProjects(projs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Standardized INR Formatting Helper
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

  // Filter project settlements based on search query
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Hardcoded chart data matching the mockup trend shapes
  const chartData = [
    { name: 'Mar', Received: 2.1, Paid: 1.8 },
    { name: 'Apr', Received: 3.8, Paid: 2.5 },
    { name: 'May', Received: 3.2, Paid: 2.8 },
    { name: 'Jun', Received: 4.5, Paid: 3.1 },
    { name: 'Jul', Received: 4.1, Paid: 3.2 },
    { name: 'Aug', Received: 5.2, Paid: 3.8 },
  ];

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading dashboard financials...</div>;
  }

  // Count project statuses
  const inProgressCount = projects.filter(p => p.status === 'Partially Paid' || p.status === 'No Invoices Yet').length;
  const settledCount = projects.filter(p => p.status === 'Fully Paid').length;

  return (
    <div className="space-y-stack-lg">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Financial Overview</h2>
          <p className="font-sans text-sm text-secondary">Real-time tracking of project liquidity and settlements.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => alert('Report summary exported.')}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container transition-colors font-headline text-sm font-semibold text-secondary"
          >
            <Download className="w-4 h-4 text-outline" /> 
            <span>Export Report</span>
          </button>
          <button 
            onClick={() => navigate('/bill-desk')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-all font-headline text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> 
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-stack-md">
        {/* Card 1: Received */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">Received</span>
            <div className="p-1 bg-primary/10 rounded-md text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">{formatINR(metrics.totalReceived)}</div>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-green-600 font-semibold flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> 12.5%</span>
            <span className="text-secondary opacity-60">vs last month</span>
          </div>
        </div>

        {/* Card 2: Total PO */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">Total PO</span>
            <div className="p-1 bg-secondary/10 rounded-md text-secondary">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">{formatINR(metrics.totalPO)}</div>
          <div className="text-[11px] text-secondary opacity-60">Active across {projects.length} projects</div>
        </div>

        {/* Card 3: Invoiced */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">Invoiced</span>
            <div className="p-1 bg-secondary/10 rounded-md text-secondary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">{formatINR(metrics.totalInvoiced)}</div>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-green-600 font-semibold flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> 4.2%</span>
            <span className="text-secondary opacity-60">Pending approval</span>
          </div>
        </div>

        {/* Card 4: Paid */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">Paid</span>
            <div className="p-1 bg-secondary/10 rounded-md text-secondary">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">{formatINR(metrics.totalPaid)}</div>
          <div className="text-[11px] text-secondary opacity-60">82% processing efficiency</div>
        </div>

        {/* Card 5: Outstanding (Warning State) */}
        <div className="bg-surface-container-lowest border border-outline-variant border-l-4 border-l-error p-5 rounded-md flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">Outstanding</span>
            <div className="p-1 bg-error/10 rounded-md text-error">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">{formatINR(metrics.totalOutstanding)}</div>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-error font-bold">Action Required</span>
          </div>
        </div>
      </div>

      {/* Bento Layout Grid: Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        {/* Received vs Paid Trends Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant p-6 rounded-md flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-lg font-bold text-on-surface">Received vs Paid Trends</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 font-headline text-xs font-semibold text-secondary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Received (Cr)
              </span>
              <span className="flex items-center gap-1.5 font-headline text-xs font-semibold text-secondary">
                <span className="w-2.5 h-2.5 rounded-full bg-outline" /> Paid (Cr)
              </span>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6d7a77" fontSize={11} fontFamily="Geist" />
                <YAxis stroke="#6d7a77" fontSize={11} fontFamily="Geist" tickFormatter={(v) => `₹${v}Cr`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#191c1d', border: 'none', borderRadius: '8px', color: '#ffffff' }}
                  labelStyle={{ fontFamily: 'Geist', fontWeight: 'bold' }}
                  itemStyle={{ fontFamily: 'Inter' }}
                />
                <Area type="monotone" dataKey="Received" stroke="#00685f" fill="rgba(0, 104, 95, 0.05)" strokeWidth={3} />
                <Line type="monotone" dataKey="Paid" stroke="#bcc9c6" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-md flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline text-lg font-bold text-on-surface">Recent Activity</h3>
            <button 
              onClick={() => navigate('/notifications')} 
              className="text-primary font-headline text-xs font-semibold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  act.type === 'success' 
                    ? 'bg-primary/10 text-primary' 
                    : act.type === 'warning' 
                    ? 'bg-error/10 text-error' 
                    : 'bg-secondary/10 text-secondary'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-sans text-sm text-on-surface leading-tight font-medium">
                    {act.title}
                  </p>
                  <p className="font-sans text-xs text-secondary leading-snug">
                    {act.description}
                  </p>
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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden mt-stack-lg">
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
          <table className="w-full text-left border-collapse">
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
                <tr>
                  <td colSpan={6} className="p-8 text-center text-secondary font-headline">No matching settlements found.</td>
                </tr>
              ) : (
                filteredProjects.map((p) => (
                  <tr 
                    key={p.id} 
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <td className="p-4 font-sans text-sm font-semibold text-on-surface">{p.name}</td>
                    <td className="p-4 font-sans text-sm text-secondary">{p.client}</td>
                    <td className="p-4 font-sans text-sm font-semibold">{formatINR(p.poAmount, false)}</td>
                    <td className="p-4 font-sans text-sm font-semibold">{formatINR(p.amountPaid, false)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          p.status === 'Fully Paid' 
                            ? 'bg-primary' 
                            : p.status === 'Partially Paid' 
                            ? 'bg-secondary-container-dark bg-secondary' 
                            : 'bg-error'
                        }`} />
                        <span className={`font-headline text-xs font-bold ${
                          p.status === 'Fully Paid' 
                            ? 'text-primary' 
                            : p.status === 'Partially Paid' 
                            ? 'text-secondary' 
                            : 'text-error'
                        }`}>
                          {p.status === 'Fully Paid' ? 'Settled' : p.status === 'Partially Paid' ? 'Active' : 'Overdue'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(`/projects/${p.id}`)} 
                        className="text-secondary hover:text-primary transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
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
