import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Wallet,
  FileText,
  CheckCircle,
  Briefcase
} from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useCountUp } from '../hooks/useCountUp';
import { toast } from '../lib/toast';

/* ─── Animated Metric Card ─── */
interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: React.ReactNode;
  accent?: 'primary' | 'accent' | 'warning' | 'success' | 'error';
  format: (v: number) => string;
}

const accentMap = {
  primary: {
    border: 'border-t-primary',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
  },
  accent: {
    border: 'border-t-accent',
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
  },
  warning: {
    border: 'border-t-status-warning-text',
    iconBg: 'bg-status-warning-bg',
    iconText: 'text-status-warning-text',
  },
  success: {
    border: 'border-t-status-success-text',
    iconBg: 'bg-status-success-bg',
    iconText: 'text-status-success-text',
  },
  error: {
    border: 'border-t-error',
    iconBg: 'bg-error/10',
    iconText: 'text-error',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, sub, accent = 'primary', format }) => {
  const animated = useCountUp(value);
  const styles = accentMap[accent];
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant border-t-4 ${styles.border} p-5 rounded-lg shadow-sm flex flex-col gap-2`}
    >
      <div className="flex justify-between items-start">
        <span className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider">
          {label}
        </span>
        <div className={`p-1 ${styles.iconBg} rounded-md ${styles.iconText}`}>
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
  const { searchQuery: _searchQuery } = useOutletContext<{ searchQuery: string }>();
  const [metrics, setMetrics] = useState({
    totalReceived: 0,
    totalPO: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalProjects: 0,
    totalBudget: 0,
    riskBreakdown: {
      healthy: 0,
      atRisk: 0
    }
  });

  const [comparisonMetric, setComparisonMetric] = useState<'budgetVsReceived' | 'poVsBillPaid' | 'poVsTaxInvoice'>('budgetVsReceived');
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const [projectRiskType, setProjectRiskType] = useState<'vendorOverpaid' | 'billingAhead' | 'stalled'>('vendorOverpaid');
  const [projectRiskData, setProjectRiskData] = useState<{ chartType: 'comparison' | 'single'; series: any[] }>({ chartType: 'comparison', series: [] });
  const [projectRiskLoading, setProjectRiskLoading] = useState(false);

  const [poRiskType, setPoRiskType] = useState<'expiringSoon' | 'expiredUncollected' | 'stalled'>('expiringSoon');
  const [poRiskData, setPoRiskData] = useState<{ chartType: 'comparison' | 'single'; series: any[] }>({ chartType: 'comparison', series: [] });
  const [poRiskLoading, setPoRiskLoading] = useState(false);

  const [invoiceRiskType, setInvoiceRiskType] = useState<'overdueUnpaid' | 'disputedUnpaid'>('overdueUnpaid');
  const [invoiceRiskData, setInvoiceRiskData] = useState<{ chartType: 'comparison' | 'single'; series: any[] }>({ chartType: 'comparison', series: [] });
  const [invoiceRiskLoading, setInvoiceRiskLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mets, comparisonRes, projRisks, poRisks, invRisks] = await Promise.all([
          api.getDashboardMetrics(),
          api.getDashboardProjectComparison(comparisonMetric),
          api.getDashboardProjectRisks(projectRiskType),
          api.getDashboardPoRisks(poRiskType),
          api.getDashboardInvoiceRisks(invoiceRiskType)
        ]);
        setMetrics(mets);
        setComparisonData(comparisonRes.projectComparison ?? []);
        setProjectRiskData(projRisks);
        setPoRiskData(poRisks);
        setInvoiceRiskData(invRisks);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load Dashboard risks data — check your connection");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleComparisonMetricChange = async (newMetric: 'budgetVsReceived' | 'poVsBillPaid' | 'poVsTaxInvoice') => {
    setComparisonMetric(newMetric);
    setComparisonLoading(true);
    try {
      const data = await api.getDashboardProjectComparison(newMetric);
      setComparisonData(data.projectComparison ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load project comparison data");
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleProjectTypeChange = async (newType: 'vendorOverpaid' | 'billingAhead' | 'stalled') => {
    setProjectRiskType(newType);
    setProjectRiskLoading(true);
    try {
      const data = await api.getDashboardProjectRisks(newType);
      setProjectRiskData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load project risk data");
    } finally {
      setProjectRiskLoading(false);
    }
  };

  const handlePoTypeChange = async (newType: 'expiringSoon' | 'expiredUncollected' | 'stalled') => {
    setPoRiskType(newType);
    setPoRiskLoading(true);
    try {
      const data = await api.getDashboardPoRisks(newType);
      setPoRiskData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load PO risk data");
    } finally {
      setPoRiskLoading(false);
    }
  };

  const handleInvoiceTypeChange = async (newType: 'overdueUnpaid' | 'disputedUnpaid') => {
    setInvoiceRiskType(newType);
    setInvoiceRiskLoading(true);
    try {
      const data = await api.getDashboardInvoiceRisks(newType);
      setInvoiceRiskData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice risk data");
    } finally {
      setInvoiceRiskLoading(false);
    }
  };

  const formatINR = (val: number, abbreviate = true) => {
    if (abbreviate) {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="text-secondary font-headline text-sm font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  // Curated theme-aware colors for each Project Comparison Metric
  const comparisonColors = theme === 'dark'
    ? {
        budgetVsReceived: { val1: '#6bd8cb', val2: '#c0c6db' }, // Teal & Grey-Blue
        poVsBillPaid: { val1: '#ffb300', val2: '#90caf9' },     // Amber & Blue
        poVsTaxInvoice: { val1: '#ec407a', val2: '#ce93d8' },    // Pink & Purple
        grid: 'rgba(188,201,198,0.08)',
        axis: '#bcc9c6',
        tooltipBg: '#272b2a',
        tooltipText: '#e1e3e2'
      }
    : {
        budgetVsReceived: { val1: '#00685f', val2: '#575e70' }, // Dark Teal & Slate
        poVsBillPaid: { val1: '#b8860b', val2: '#1976d2' },     // Gold & Blue
        poVsTaxInvoice: { val1: '#c2185b', val2: '#7b1fa2' },    // Pink & Purple
        grid: 'rgba(0,0,0,0.04)',
        axis: '#6d7a77',
        tooltipBg: '#191c1d',
        tooltipText: '#f0f1f2'
      };

  // Distinct hue-based theme-aware colors for each of the 3 Risk Cards
  const riskCardColors = theme === 'dark'
    ? {
        project: {
          atRisk: '#ffab91',  // soft orange-red
          neutral: '#ffe082', // soft amber
          axis: '#bcc9c6',
          grid: 'rgba(188,201,198,0.08)',
          tooltipBg: '#272b2a',
          tooltipText: '#e1e3e2'
        },
        po: {
          atRisk: '#ff80ab',  // soft pink-red
          neutral: '#b39ddb', // soft purple
          axis: '#bcc9c6',
          grid: 'rgba(188,201,198,0.08)',
          tooltipBg: '#272b2a',
          tooltipText: '#e1e3e2'
        },
        invoice: {
          atRisk: '#ffb4ab',  // soft crimson
          neutral: '#b0bec5', // soft slate
          axis: '#bcc9c6',
          grid: 'rgba(188,201,198,0.08)',
          tooltipBg: '#272b2a',
          tooltipText: '#e1e3e2'
        }
      }
    : {
        project: {
          atRisk: '#d84315',  // dark orange-red
          neutral: '#ffb300', // amber
          axis: '#6d7a77',
          grid: 'rgba(0,0,0,0.04)',
          tooltipBg: '#191c1d',
          tooltipText: '#f0f1f2'
        },
        po: {
          atRisk: '#c2185b',  // deep pink
          neutral: '#673ab7', // deep purple
          axis: '#6d7a77',
          grid: 'rgba(0,0,0,0.04)',
          tooltipBg: '#191c1d',
          tooltipText: '#f0f1f2'
        },
        invoice: {
          atRisk: '#ba1a1a',  // deep red
          neutral: '#607d8b', // slate grey
          axis: '#6d7a77',
          grid: 'rgba(0,0,0,0.04)',
          tooltipBg: '#191c1d',
          tooltipText: '#f0f1f2'
        }
      };

  const formatCr = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Custom tooltip for risk charts
  const CustomRiskTooltip = ({ active, payload, label, unitType }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="p-3 rounded-md shadow-lg border-0 text-xs font-sans"
        style={{
          backgroundColor: comparisonColors.tooltipBg,
          color: comparisonColors.tooltipText
        }}
      >
        <p className="font-bold font-headline mb-2" style={{ color: comparisonColors.tooltipText }}>
          {label}
        </p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="opacity-80">{p.name}:</span>
            <span className="font-bold">
              {unitType === 'days' ? `${p.value} days` : formatCr(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-stack-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Dashboard</h2>
          <p className="font-sans text-sm text-secondary">Real-time tracking of project liquidity and settlements.</p>
        </div>
      </div>

      {/* Metric Cards Row — responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-stack-md">
        <MetricCard
          label="Total Projects"
          value={metrics.totalProjects}
          icon={<Briefcase className="w-4 h-4" />}
          format={v => String(v)}
          accent="primary"
          sub={<span className="text-secondary opacity-60">Active in portfolio</span>}
        />
        <MetricCard
          label="Budget"
          value={metrics.totalBudget}
          icon={<FileText className="w-4 h-4" />}
          format={v => formatINR(v)}
          accent="accent"
          sub={<span className="text-secondary opacity-60">Across {metrics.totalProjects} projects</span>}
        />
        <MetricCard
          label="Received"
          value={metrics.totalReceived}
          icon={<Wallet className="w-4 h-4" />}
          format={v => formatINR(v)}
          accent="warning"
          sub={<span className="text-secondary opacity-60">Across {metrics.totalProjects} projects</span>}
        />
        <MetricCard
          label="Paid"
          value={metrics.totalPaid}
          icon={<CheckCircle className="w-4 h-4" />}
          format={v => formatINR(v)}
          accent="success"
          sub={<span className="text-secondary opacity-60">Across {metrics.totalProjects} projects</span>}
        />
      </div>

      {/* Cards Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg">
        {/* Card 1: Project Comparison */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col min-h-[460px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Project Comparison</h3>
              <p className="font-sans text-xs text-secondary mt-0.5">
                {comparisonMetric === 'budgetVsReceived'
                  ? 'Budget amount vs. amount received from client — top 5 projects ranked by budget'
                  : comparisonMetric === 'poVsBillPaid'
                  ? 'Purchase Order amount vs. total amount paid to vendors — top 5 projects ranked by PO value'
                  : 'Purchase Order amount vs. total tax invoice amount — top 5 projects ranked by PO value'}
              </p>
            </div>
            <div className="self-start sm:self-center">
              <select
                value={comparisonMetric}
                onChange={(e) => handleComparisonMetricChange(e.target.value as any)}
                className="bg-surface border border-outline-variant text-on-surface font-sans text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
              >
                <option value="budgetVsReceived">Budget vs Received</option>
                <option value="poVsBillPaid">PO vs Bill Paid</option>
                <option value="poVsTaxInvoice">PO vs Tax Invoice</option>
              </select>
            </div>
          </div>

          {comparisonLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <p className="text-secondary font-sans text-xs">Loading comparison...</p>
            </div>
          ) : comparisonData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
              <span className="text-secondary font-headline text-sm font-semibold mb-1">
                No comparison data available
              </span>
            </div>
          ) : (
            <div className="flex-1 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke={comparisonColors.grid} />
                  <XAxis
                    dataKey="projectCode"
                    stroke={comparisonColors.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke={comparisonColors.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    tickFormatter={formatCr}
                    width={70}
                  />
                  <Tooltip
                    content={<CustomRiskTooltip unitType="money" />}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  />
                  <Bar
                    dataKey="value1"
                    name={
                      comparisonMetric === 'budgetVsReceived'
                        ? 'Budget'
                        : 'PO Amount'
                    }
                    fill={comparisonColors[comparisonMetric].val1}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="value2"
                    name={
                      comparisonMetric === 'budgetVsReceived'
                        ? 'Received'
                        : comparisonMetric === 'poVsBillPaid'
                        ? 'Bill Paid'
                        : 'Tax Invoice'
                    }
                    fill={comparisonColors[comparisonMetric].val2}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Card 2: Project Risks */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col min-h-[460px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Project Risks</h3>
              <p className="font-sans text-xs text-secondary mt-0.5">
                {projectRiskType === 'vendorOverpaid'
                  ? 'Amount paid to vendor vs. amount received from client — vendor paid more than collected'
                  : projectRiskType === 'billingAhead'
                  ? 'PO amount vs. amount received from client — billing/PO value is ahead of collection progress'
                  : 'Days since oldest PO was issued for projects with zero billing desk invoices (older than 60 days)'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
              {(['vendorOverpaid', 'billingAhead', 'stalled'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleProjectTypeChange(t)}
                  className={`px-3 py-1.5 rounded-full font-headline text-xs font-semibold transition-all ${
                    projectRiskType === t
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low/60 text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  {t === 'vendorOverpaid' ? 'Vendor Overpaid' : t === 'billingAhead' ? 'Billing Ahead' : 'Stalled'}
                </button>
              ))}
            </div>
          </div>

          {projectRiskLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <p className="text-secondary font-sans text-xs">Loading project risks...</p>
            </div>
          ) : projectRiskData.series.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
              <span className="text-secondary font-headline text-sm font-semibold mb-1">
                No projects currently at risk
              </span>
              <span className="text-secondary opacity-60 text-xs">
                All active projects are healthy for this risk category.
              </span>
            </div>
          ) : (
            <div className="flex-1 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectRiskData.series} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke={riskCardColors.project.grid} />
                  <XAxis
                    dataKey="label"
                    stroke={riskCardColors.project.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke={riskCardColors.project.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    tickFormatter={projectRiskData.chartType === 'single' ? undefined : formatCr}
                    width={70}
                  />
                  <Tooltip
                    content={<CustomRiskTooltip unitType={projectRiskData.chartType === 'single' ? 'days' : 'money'} />}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  />
                  {projectRiskData.chartType === 'single' ? (
                    <Bar
                      dataKey="value1"
                      name="Days Stalled"
                      fill={riskCardColors.project.atRisk}
                      radius={[3, 3, 0, 0]}
                    />
                  ) : (
                    <>
                      <Bar
                        dataKey="value1"
                        name={projectRiskType === 'vendorOverpaid' ? 'Vendor Paid' : 'PO Amount'}
                        fill={riskCardColors.project.atRisk}
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="value2"
                        name="Client Received"
                        fill={riskCardColors.project.neutral}
                        radius={[3, 3, 0, 0]}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Card 3: Purchase Order Risks */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col min-h-[460px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Purchase Order Risks</h3>
              <p className="font-sans text-xs text-secondary mt-0.5">
                {poRiskType === 'expiringSoon'
                  ? 'PO total vs. amount received — PO is expiring within 1 month with collection below 80%'
                  : poRiskType === 'expiredUncollected'
                  ? 'PO total vs. amount received — PO has expired but amount collected is less than the PO total'
                  : 'Days since PO date for purchase orders with zero billing desk invoices (older than 60 days)'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
              {(['expiringSoon', 'expiredUncollected', 'stalled'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handlePoTypeChange(t)}
                  className={`px-3 py-1.5 rounded-full font-headline text-xs font-semibold transition-all ${
                    poRiskType === t
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low/60 text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  {t === 'expiringSoon' ? 'Expiring Soon' : t === 'expiredUncollected' ? 'Expired & Uncollected' : 'Stalled'}
                </button>
              ))}
            </div>
          </div>

          {poRiskLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <p className="text-secondary font-sans text-xs">Loading PO risks...</p>
            </div>
          ) : poRiskData.series.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
              <span className="text-secondary font-headline text-sm font-semibold mb-1">
                No purchase orders currently at risk
              </span>
              <span className="text-secondary opacity-60 text-xs">
                All purchase orders are healthy for this risk category.
              </span>
            </div>
          ) : (
            <div className="flex-1 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poRiskData.series} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke={riskCardColors.po.grid} />
                  <XAxis
                    dataKey="label"
                    stroke={riskCardColors.po.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke={riskCardColors.po.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    tickFormatter={poRiskData.chartType === 'single' ? undefined : formatCr}
                    width={70}
                  />
                  <Tooltip
                    content={<CustomRiskTooltip unitType={poRiskData.chartType === 'single' ? 'days' : 'money'} />}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  />
                  {poRiskData.chartType === 'single' ? (
                    <Bar
                      dataKey="value1"
                      name="Days Stalled"
                      fill={riskCardColors.po.atRisk}
                      radius={[3, 3, 0, 0]}
                    />
                  ) : (
                    <>
                      <Bar
                        dataKey="value1"
                        name="PO Total"
                        fill={riskCardColors.po.atRisk}
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="value2"
                        name="Client Received"
                        fill={riskCardColors.po.neutral}
                        radius={[3, 3, 0, 0]}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Card 4: Invoice Risks */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col min-h-[460px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Invoice Risks</h3>
              <p className="font-sans text-xs text-secondary mt-0.5">
                {invoiceRiskType === 'overdueUnpaid'
                  ? 'Invoice amount vs. unpaid amount — invoices that remain unpaid 30 days after the invoice date'
                  : 'Invoice amount vs. unpaid amount — invoices with active client dispute/objection remarks and unpaid balance'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
              {(['overdueUnpaid', 'disputedUnpaid'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleInvoiceTypeChange(t)}
                  className={`px-3 py-1.5 rounded-full font-headline text-xs font-semibold transition-all ${
                    invoiceRiskType === t
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low/60 text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  {t === 'overdueUnpaid' ? 'Overdue & Unpaid' : 'Disputed & Unpaid'}
                </button>
              ))}
            </div>
          </div>

          {invoiceRiskLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <p className="text-secondary font-sans text-xs">Loading invoice risks...</p>
            </div>
          ) : invoiceRiskData.series.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
              <span className="text-secondary font-headline text-sm font-semibold mb-1">
                No invoices currently at risk
              </span>
              <span className="text-secondary opacity-60 text-xs">
                All invoices are healthy for this risk category.
              </span>
            </div>
          ) : (
            <div className="flex-1 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoiceRiskData.series} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke={riskCardColors.invoice.grid} />
                  <XAxis
                    dataKey="label"
                    stroke={riskCardColors.invoice.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke={riskCardColors.invoice.axis}
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    tickFormatter={formatCr}
                    width={70}
                  />
                  <Tooltip
                    content={<CustomRiskTooltip unitType="money" />}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  />
                  <Bar
                    dataKey="value1"
                    name="Invoice Amount"
                    fill={riskCardColors.invoice.neutral}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="value2"
                    name="Unpaid Amount"
                    fill={riskCardColors.invoice.atRisk}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
