import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  Briefcase,
  AlertTriangle,
  ArrowRight,
  Inbox,
  SearchX
} from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { CompactStatCard } from '../components/CompactStatCard';
import { toast } from '../lib/toast';

/* ─── Chart Empty State ─── */
interface ChartEmptyStateProps {
  title: string;
  description: string;
  isFiltered?: boolean;
}

const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({ title, description, isFiltered = false }) => {
  const Icon = isFiltered ? SearchX : Inbox;
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-outline" aria-hidden="true" />
      </div>
      <span className="text-on-surface font-headline text-sm font-bold mb-1">
        {title}
      </span>
      <span className="text-secondary text-xs">
        {description}
      </span>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const prjMgrIdParam = searchParams.get('prjMgrId');
  const prjMgrId = prjMgrIdParam && prjMgrIdParam !== 'All' ? parseInt(prjMgrIdParam, 10) : null;

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
    },
    lastImportedDate: ''
  });

  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [overdueInvoicesLoading, setOverdueInvoicesLoading] = useState(false);

  const [expiredPos, setExpiredPos] = useState<any[]>([]);
  const [expiredPosLoading, setExpiredPosLoading] = useState(false);

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

  const [activeGraph, setActiveGraph] = useState<'comparison' | 'projectRisks' | 'poRisks' | 'invoiceRisks'>('comparison');
  const [problemProjects, setProblemProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeneralData = async () => {
      setLoading(true);
      try {
        const mets = await api.getDashboardMetrics(prjMgrId);
        setMetrics(mets);
      } catch (err) {
        console.error("Failed to load metrics:", err);
        toast.error("Couldn't load core project metrics");
      } finally {
        setLoading(false);
      }
    };

    const fetchProblems = async () => {
      try {
        const problemProjRes = await api.getDashboardProblemProjects(prjMgrId);
        setProblemProjects(problemProjRes ?? []);
      } catch (err) {
        console.error("Failed to load problem projects:", err);
        setProblemProjects([]);
      }
    };

    const fetchOverdueInvoices = async () => {
      setOverdueInvoicesLoading(true);
      try {
        const overdueRes = await api.getDashboardOverdueInvoices(prjMgrId);
        setOverdueInvoices(overdueRes ?? []);
      } catch (err) {
        console.error("Failed to load overdue invoices:", err);
        setOverdueInvoices([]);
      } finally {
        setOverdueInvoicesLoading(false);
      }
    };

    const fetchExpiredPos = async () => {
      setExpiredPosLoading(true);
      try {
        const expiredRes = await api.getDashboardExpiredPos(prjMgrId);
        setExpiredPos(expiredRes ?? []);
      } catch (err) {
        console.error("Failed to load expired POs:", err);
        setExpiredPos([]);
      } finally {
        setExpiredPosLoading(false);
      }
    };

    fetchGeneralData();
    fetchProblems();
    fetchOverdueInvoices();
    fetchExpiredPos();
  }, [prjMgrId]);

  useEffect(() => {
    const fetchActiveGraphData = async () => {
      if (activeGraph === 'comparison') {
        setComparisonLoading(true);
        try {
          const res = await api.getDashboardProjectComparison(comparisonMetric, prjMgrId);
          setComparisonData(res.projectComparison ?? []);
        } catch (err) {
          console.error(err);
          toast.error("Failed to load comparison data");
        } finally {
          setComparisonLoading(false);
        }
      } else if (activeGraph === 'projectRisks') {
        setProjectRiskLoading(true);
        try {
          const res = await api.getDashboardProjectRisks(projectRiskType, prjMgrId);
          setProjectRiskData(res);
        } catch (err) {
          console.error(err);
          toast.error("Failed to load project risk data");
        } finally {
          setProjectRiskLoading(false);
        }
      } else if (activeGraph === 'poRisks') {
        setPoRiskLoading(true);
        try {
          const res = await api.getDashboardPoRisks(poRiskType, prjMgrId);
          setPoRiskData(res);
        } catch (err) {
          console.error(err);
          toast.error("Failed to load PO risk data");
        } finally {
          setPoRiskLoading(false);
        }
      } else if (activeGraph === 'invoiceRisks') {
        setInvoiceRiskLoading(true);
        try {
          const res = await api.getDashboardInvoiceRisks(invoiceRiskType, prjMgrId);
          setInvoiceRiskData(res);
        } catch (err) {
          console.error(err);
          toast.error("Failed to load invoice risk data");
        } finally {
          setInvoiceRiskLoading(false);
        }
      }
    };

    fetchActiveGraphData();
  }, [activeGraph, prjMgrId, comparisonMetric, projectRiskType, poRiskType, invoiceRiskType]);

  const handleComparisonMetricChange = (newMetric: 'budgetVsReceived' | 'poVsBillPaid' | 'poVsTaxInvoice') => {
    setComparisonMetric(newMetric);
  };

  const handleProjectTypeChange = (newType: 'vendorOverpaid' | 'billingAhead' | 'stalled') => {
    setProjectRiskType(newType);
  };

  const handlePoTypeChange = (newType: 'expiringSoon' | 'expiredUncollected' | 'stalled') => {
    setPoRiskType(newType);
  };

  const handleInvoiceTypeChange = (newType: 'overdueUnpaid' | 'disputedUnpaid') => {
    setInvoiceRiskType(newType);
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
        budgetVsReceived: { val1: '#6bd8cb', val2: '#b2ebe3' }, // Teal & Lighter Mint-Teal
        poVsBillPaid: { val1: '#ffb300', val2: '#90caf9' },     // Amber & Blue
        poVsTaxInvoice: { val1: '#b39ddb', val2: '#d1c4e9' },    // Violet & Lavender
        grid: 'rgba(188,201,198,0.08)',
        axis: '#bcc9c6',
        tooltipBg: '#272b2a',
        tooltipText: '#e1e3e2'
      }
    : {
        budgetVsReceived: { val1: '#0E6B63', val2: '#6FC2B6' }, // Dark Teal & Light Mint-Teal
        poVsBillPaid: { val1: '#b8860b', val2: '#1976d2' },     // Gold & Blue
        poVsTaxInvoice: { val1: '#673ab7', val2: '#9575cd' },    // Purple & Violet
        grid: 'rgba(0,0,0,0.04)',
        axis: '#6d7a77',
        tooltipBg: '#191c1d',
        tooltipText: '#f0f1f2'
      };

  // Consistent theme-aware colors for all Risk/Compliance charts
  const riskColors = theme === 'dark'
    ? {
        atRisk: '#ff8f9c',  // soft crimson/coral-red
        neutral: '#dbe1bc', // soft pale sage-green
        axis: '#bcc9c6',
        grid: 'rgba(188,201,198,0.08)',
        tooltipBg: '#272b2a',
        tooltipText: '#e1e3e2'
      }
    : {
        atRisk: '#E0142E',  // strong red
        neutral: '#E4EAC5', // pale sage-green
        axis: '#6d7a77',
        grid: 'rgba(0,0,0,0.04)',
        tooltipBg: '#191c1d',
        tooltipText: '#f0f1f2'
      };

  const formatCr = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const computeChartWidth = (dataLength: number) => {
    const FIXED_SLOT_WIDTH = 110;
    const Y_AXIS_PADDING = 80;
    return dataLength * FIXED_SLOT_WIDTH + Y_AXIS_PADDING;
  };

  const getLegendItems = () => {
    if (activeGraph === 'comparison') {
      const colors = comparisonColors[comparisonMetric];
      if (comparisonMetric === 'budgetVsReceived') {
        return [
          { name: 'Budget', color: colors.val1 },
          { name: 'Received', color: colors.val2 }
        ];
      } else if (comparisonMetric === 'poVsBillPaid') {
        return [
          { name: 'PO Amount', color: colors.val1 },
          { name: 'Bill Paid', color: colors.val2 }
        ];
      } else {
        return [
          { name: 'PO Amount', color: colors.val1 },
          { name: 'Tax Invoice', color: colors.val2 }
        ];
      }
    }

    if (activeGraph === 'projectRisks') {
      if (projectRiskData.chartType === 'single') {
        return [{ name: 'Days Stalled', color: riskColors.atRisk }];
      } else {
        return [
          { name: projectRiskType === 'vendorOverpaid' ? 'Vendor Paid' : 'PO Amount', color: riskColors.atRisk },
          { name: 'Client Received', color: riskColors.neutral }
        ];
      }
    }

    if (activeGraph === 'poRisks') {
      if (poRiskData.chartType === 'single') {
        return [{ name: 'Days Stalled', color: riskColors.atRisk }];
      } else {
        return [
          { name: 'PO Total', color: riskColors.atRisk },
          { name: 'Client Received', color: riskColors.neutral }
        ];
      }
    }

    if (activeGraph === 'invoiceRisks') {
      return [
        { name: 'Invoice Amount', color: riskColors.neutral },
        { name: 'Unpaid Amount', color: riskColors.atRisk }
      ];
    }

    return [];
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Dashboard</h2>
          <p className="font-sans text-sm text-secondary">Real-time tracking of project liquidity and settlements.</p>
        </div>
        {metrics.lastImportedDate && (
          <div className="text-secondary font-sans text-xs bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-md shadow-sm self-start sm:self-end">
            Data last updated: <span className="font-semibold text-on-surface">{metrics.lastImportedDate}</span>
          </div>
        )}
      </div>

      {/* Metric Cards Row — responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-stack-md">
        <CompactStatCard
          label="Total Projects"
          value={metrics.totalProjects}
          bg="#B5D4F4"
          labelColor="#0C447C"
          numColor="#042C53"
          icon={<Briefcase className="w-4 h-4" />}
          format={v => String(v)}
          sub="Active in portfolio"
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        />
        <CompactStatCard
          label="Budget"
          value={metrics.totalBudget}
          bg="#E0D4FC"
          labelColor="#4F3B90"
          numColor="#322468"
          icon={<FileText className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={`Across ${metrics.totalProjects} projects`}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        />
        <CompactStatCard
          label="Received"
          value={metrics.totalReceived}
          bg="#9FE1CB"
          labelColor="#1F5E49"
          numColor="#133F31"
          icon={<Wallet className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={`Across ${metrics.totalProjects} projects`}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        />
        <CompactStatCard
          label="Paid"
          value={metrics.totalPaid}
          bg="#C5EDC6"
          labelColor="#245C26"
          numColor="#173D19"
          icon={<CheckCircle className="w-4 h-4" />}
          format={v => formatINR(v)}
          sub={`Across ${metrics.totalProjects} projects`}
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
        />
        <CompactStatCard
          label="At-Risk Projects"
          value={metrics.riskBreakdown.atRisk}
          bg="#F09595"
          labelColor="#791F1F"
          numColor="#501313"
          icon={<AlertTriangle className="w-4 h-4" />}
          format={v => String(v)}
          sub="Flagged by risk rules"
          className="p-5 border border-outline-variant/20 shadow-sm rounded-md h-auto font-sans"
          onClick={() => {
            const el = document.getElementById('problems-block');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />
      </div>

      {/* Consolidated Chart Card */}
      <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col min-h-[480px]">
        {/* Header section with selectors */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-4 border-b border-outline-variant">
          <div className="flex-1">
            <h3 className="font-headline text-lg font-bold text-on-surface">
              {activeGraph === 'comparison' && 'Project Comparison'}
              {activeGraph === 'projectRisks' && 'Project Risks'}
              {activeGraph === 'poRisks' && 'Purchase Order Risks'}
              {activeGraph === 'invoiceRisks' && 'Invoice Risks'}
            </h3>
            <p className="font-sans text-xs text-secondary mt-0.5">
              {activeGraph === 'comparison' && (
                comparisonMetric === 'budgetVsReceived'
                  ? 'Budget amount vs. amount received from client — top 5 projects ranked by budget'
                  : comparisonMetric === 'poVsBillPaid'
                  ? 'Purchase Order amount vs. total amount paid to vendors — top 5 projects ranked by PO value'
                  : 'Purchase Order amount vs. total tax invoice amount — top 5 projects ranked by PO value'
              )}
              {activeGraph === 'projectRisks' && (
                projectRiskType === 'vendorOverpaid'
                  ? 'Amount paid to vendor vs. amount received from client — vendor paid more than collected'
                  : projectRiskType === 'billingAhead'
                  ? 'PO amount vs. amount received from client — billing/PO value is ahead of collection progress'
                  : 'Days since oldest PO was issued for projects with zero billing desk invoices (older than 60 days)'
              )}
              {activeGraph === 'poRisks' && (
                poRiskType === 'expiringSoon'
                  ? 'PO total vs. amount received — PO is expiring within 1 month with collection below 80%'
                  : poRiskType === 'expiredUncollected'
                  ? 'PO total vs. amount received — PO has expired but amount collected is less than the PO total'
                  : 'Days since PO date for purchase orders with zero billing desk invoices (older than 60 days)'
              )}
              {activeGraph === 'invoiceRisks' && (
                invoiceRiskType === 'overdueUnpaid'
                  ? 'Invoice amount vs. unpaid amount — invoices that remain unpaid 30 days after the invoice date'
                  : 'Invoice amount vs. unpaid amount — invoices with active client dispute/objection remarks and unpaid balance'
              )}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 shrink-0 md:ml-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-bold text-secondary">Select Graph:</span>
                <select
                  value={activeGraph}
                  onChange={(e) => setActiveGraph(e.target.value as any)}
                  className="bg-surface border border-outline-variant text-on-surface font-sans text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer font-bold"
                >
                  <option value="comparison">Project Comparison</option>
                  <option value="projectRisks">Project Risks</option>
                  <option value="poRisks">Purchase Order Risks</option>
                  <option value="invoiceRisks">Invoice Risks</option>
                </select>
              </div>

              {/* Contextual Secondary Control */}
              {activeGraph === 'comparison' && (
                <select
                  value={comparisonMetric}
                  onChange={(e) => handleComparisonMetricChange(e.target.value as any)}
                  className="bg-surface border border-outline-variant text-on-surface font-sans text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
                >
                  <option value="budgetVsReceived">Budget vs Received</option>
                  <option value="poVsBillPaid">PO vs Bill Paid</option>
                  <option value="poVsTaxInvoice">PO vs Tax Invoice</option>
                </select>
              )}

              {activeGraph === 'projectRisks' && (
                <div className="flex flex-wrap gap-1">
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
              )}

              {activeGraph === 'poRisks' && (
                <div className="flex flex-wrap gap-1">
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
              )}

              {activeGraph === 'invoiceRisks' && (
                <div className="flex flex-wrap gap-1">
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
              )}
            </div>

            {/* Custom Legend */}
            <div className="flex items-center gap-3 md:border-l md:border-outline-variant md:pl-4 md:ml-1 select-none">
              {getLegendItems().map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-secondary font-sans font-medium">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Body */}
        <div className="flex-1 h-[320px] w-full relative">
          {activeGraph === 'comparison' && (
            comparisonLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <p className="text-secondary font-sans text-xs">Loading comparison...</p>
              </div>
            ) : comparisonData.length === 0 ? (
              <ChartEmptyState
                title="No comparison data available"
                description="There are no projects to compare for the current selection."
                isFiltered={!!prjMgrId}
              />
            ) : (
              <div className="absolute inset-0 dont-translate bhashini-skip-translation overflow-x-auto overflow-y-hidden flex justify-start items-stretch">
                <div style={{ width: computeChartWidth(comparisonData.length), height: '100%' }} className="shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={30} barGap={4} barCategoryGap="25%">
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
              </div>
            )
          )}

          {activeGraph === 'projectRisks' && (
            projectRiskLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <p className="text-secondary font-sans text-xs">Loading project risks...</p>
              </div>
            ) : projectRiskData.series.length === 0 ? (
              <ChartEmptyState
                title="No projects currently flagged"
                description="All projects are healthy for this risk category."
                isFiltered={!!prjMgrId}
              />
            ) : (
              <div className="absolute inset-0 dont-translate bhashini-skip-translation overflow-x-auto overflow-y-hidden flex justify-start items-stretch">
                <div style={{ width: computeChartWidth(projectRiskData.series.length), height: '100%' }} className="shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectRiskData.series} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={30} barGap={4} barCategoryGap="25%">
                      <CartesianGrid vertical={false} stroke={riskColors.grid} />
                      <XAxis
                        dataKey="label"
                        stroke={riskColors.axis}
                        fontSize={10}
                        fontFamily="Geist"
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        stroke={riskColors.axis}
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
                          fill={riskColors.atRisk}
                          radius={[3, 3, 0, 0]}
                        />
                      ) : (
                        <>
                          <Bar
                            dataKey="value1"
                            name={projectRiskType === 'vendorOverpaid' ? 'Vendor Paid' : 'PO Amount'}
                            fill={riskColors.atRisk}
                            radius={[3, 3, 0, 0]}
                          />
                          <Bar
                            dataKey="value2"
                            name="Client Received"
                            fill={riskColors.neutral}
                            radius={[3, 3, 0, 0]}
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          )}

          {activeGraph === 'poRisks' && (
            poRiskLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <p className="text-secondary font-sans text-xs">Loading PO risks...</p>
              </div>
            ) : poRiskData.series.length === 0 ? (
              <ChartEmptyState
                title="No purchase orders currently flagged"
                description="All purchase orders are healthy for this risk category."
                isFiltered={!!prjMgrId}
              />
            ) : (
              <div className="absolute inset-0 dont-translate bhashini-skip-translation overflow-x-auto overflow-y-hidden flex justify-start items-stretch">
                <div style={{ width: computeChartWidth(poRiskData.series.length), height: '100%' }} className="shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poRiskData.series} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={30} barGap={4} barCategoryGap="25%">
                      <CartesianGrid vertical={false} stroke={riskColors.grid} />
                      <XAxis
                        dataKey="label"
                        stroke={riskColors.axis}
                        fontSize={10}
                        fontFamily="Geist"
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        stroke={riskColors.axis}
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
                          fill={riskColors.atRisk}
                          radius={[3, 3, 0, 0]}
                        />
                      ) : (
                        <>
                          <Bar
                            dataKey="value1"
                            name="PO Total"
                            fill={riskColors.atRisk}
                            radius={[3, 3, 0, 0]}
                          />
                          <Bar
                            dataKey="value2"
                            name="Client Received"
                            fill={riskColors.neutral}
                            radius={[3, 3, 0, 0]}
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          )}

          {activeGraph === 'invoiceRisks' && (
            invoiceRiskLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <p className="text-secondary font-sans text-xs">Loading invoice risks...</p>
              </div>
            ) : invoiceRiskData.series.length === 0 ? (
              <ChartEmptyState
                title="No invoices currently flagged"
                description="All invoices are healthy for this risk category."
                isFiltered={!!prjMgrId}
              />
            ) : (
              <div className="absolute inset-0 dont-translate bhashini-skip-translation overflow-x-auto overflow-y-hidden flex justify-start items-stretch">
                <div style={{ width: computeChartWidth(invoiceRiskData.series.length), height: '100%' }} className="shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={invoiceRiskData.series} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barSize={30} barGap={4} barCategoryGap="25%">
                      <CartesianGrid vertical={false} stroke={riskColors.grid} />
                      <XAxis
                        dataKey="label"
                        stroke={riskColors.axis}
                        fontSize={10}
                        fontFamily="Geist"
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        stroke={riskColors.axis}
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
                        fill={riskColors.neutral}
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="value2"
                        name="Unpaid Amount"
                        fill={riskColors.atRisk}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Needs Attention Section */}
      <div className="space-y-stack-md pt-6">
        <div className="border-b border-outline-variant pb-3">
          <h3 className="font-headline text-xl font-bold text-on-surface">Needs Attention</h3>
          <p className="font-sans text-xs text-secondary mt-0.5">
            Operational and compliance risk flags requiring immediate follow-up.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg items-start">
          {/* Column 1: Projects with Problems */}
          <div id="problems-block" className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-4">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">Projects with Problems</h3>
                <p className="font-sans text-xs text-secondary mt-0.5">
                  Active projects currently flagged by automatic risk or compliance rules.
                </p>
              </div>
              {metrics.riskBreakdown.atRisk > problemProjects.length && (
                <Link
                  to={`/projects?riskVendorOverpaid=true&riskBillingAhead=true&riskStalled=true${prjMgrId ? `&prjMgrId=${prjMgrId}` : ''}`}
                  className="text-primary hover:text-primary-dark font-sans text-xs font-bold flex items-center gap-1 hover:underline transition-all"
                >
                  <span>View All ({metrics.riskBreakdown.atRisk})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {problemProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
                <CheckCircle className="w-8 h-8 text-status-success-text mb-2" />
                <span className="text-secondary font-headline text-sm font-semibold mb-1">
                  No projects currently flagged
                </span>
                <span className="text-secondary opacity-60 text-xs">
                  All active projects are compliant with risk monitoring rules.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {problemProjects.map((project) => (
                  <div
                    key={project.projectCd}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-headline text-sm font-bold text-primary group-hover:underline">
                          <Link to={`/projects/${project.projectCd}`}>{project.projectCd}</Link>
                        </span>
                        <span className="text-secondary text-xs font-medium">—</span>
                        <span className="font-headline text-sm font-semibold text-on-surface">
                          {project.projectName}
                        </span>
                      </div>

                      <div className="space-y-1.5 pl-1">
                        {project.problems.map((prob: any, idx: number) => {
                          let title = '';
                          let description = '';

                          if (prob.type === 'vendorOverpaid') {
                            title = 'Vendor Paid More Than Collected From Client';
                            description = `NICSI has paid vendors a total of ${formatINR(project.vendorPaidAmount, false)}, which exceeds the ${formatINR(project.amountReceived, false)} received from the client — cash flow risk.`;
                          } else if (prob.type === 'billingAhead') {
                            title = 'Billing Ahead of Collection';
                            description = `Client collections (${formatINR(project.amountReceived, false)}) are below 80% of total PO value (${formatINR(project.poAmount, false)}).`;
                          } else if (prob.type === 'stalled') {
                            title = 'Stalled — PO Issued, Nothing Billed Yet';
                            description = project.daysSincePo !== null
                              ? `A purchase order was raised ${project.daysSincePo} days ago, but no invoices have been posted to the bill desk yet.`
                              : 'A purchase order was raised over 60 days ago, but no invoices have been posted to the bill desk yet.';
                          }

                          return (
                            <div
                              key={idx}
                              className="flex gap-2.5 items-start p-2.5 rounded border border-error/10 bg-error/5 max-w-3xl"
                            >
                              <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-on-surface block">{title}</span>
                                <span className="text-[10px] text-secondary block leading-normal">
                                  {description}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="self-end md:self-start shrink-0">
                      <Link
                        to={`/projects/${project.projectCd}`}
                        className="h-8 px-3 py-1.5 border border-outline-variant hover:border-primary text-secondary hover:text-primary hover:bg-primary/5 rounded-md font-sans text-xs font-semibold flex items-center gap-1.5 transition-all bg-surface shadow-sm"
                      >
                        <span>View Project</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Stack of Overdue Invoices and Expired POs */}
          <div className="space-y-stack-lg">
            {/* Top Overdue Invoices */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-4">
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">Top Overdue Invoices</h3>
                  <p className="font-sans text-xs text-secondary mt-0.5">
                    Unpaid invoices with oldest billing age across the portfolio.
                  </p>
                </div>
              </div>

              {overdueInvoicesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <p className="text-secondary font-sans text-xs">Loading overdue invoices...</p>
                </div>
              ) : overdueInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
                  <CheckCircle className="w-8 h-8 text-status-success-text mb-2" />
                  <span className="text-secondary font-headline text-sm font-semibold mb-1">
                    No overdue invoices
                  </span>
                  <span className="text-secondary opacity-60 text-xs">
                    All active invoices are within the standard 30-day payment term.
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {overdueInvoices.map((inv) => (
                    <div
                      key={inv.invoiceNum}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-4 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-headline text-sm font-bold text-on-surface bg-surface-container border border-outline-variant px-2 py-0.5 rounded">
                            {inv.invoiceNum}
                          </span>
                          <span className="text-xs text-secondary font-sans">
                            {inv.projectNo}
                          </span>
                          <span className="text-xs text-secondary font-sans border-l border-outline-variant pl-2 font-medium">
                            {inv.prjNm}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs font-sans text-secondary">
                          <div>
                            Vendor: <span className="font-semibold text-on-surface">{inv.vendorName}</span>
                          </div>
                          <div>
                            Amount: <span className="font-semibold text-on-surface">{formatINR(inv.invoiceAmount)}</span>
                          </div>
                          <div>
                            Unpaid: <span className="font-semibold text-error">{formatINR(inv.unpaid)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-error/15 text-error">
                            {inv.daysOverdue} days overdue
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container border border-outline-variant text-secondary">
                            Aging: {inv.agingBucket}
                          </span>
                        </div>
                      </div>

                      <div className="self-end md:self-start shrink-0">
                        <Link
                          to={`/projects/${inv.projectNo}?tab=invoices&highlight=${inv.invoiceNum}`}
                          className="h-8 px-3 py-1.5 border border-outline-variant hover:border-primary text-secondary hover:text-primary hover:bg-primary/5 rounded-md font-sans text-xs font-semibold flex items-center gap-1.5 transition-all bg-surface shadow-sm"
                        >
                          <span>View Invoice</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expired Purchase Orders */}
            <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-4">
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">Expired Purchase Orders</h3>
                  <p className="font-sans text-xs text-secondary mt-0.5">
                    Purchase orders past validity date with uncollected project balances.
                  </p>
                </div>
              </div>

              {expiredPosLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <p className="text-secondary font-sans text-xs">Loading expired POs...</p>
                </div>
              ) : expiredPos.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 bg-surface-container-low/20 rounded-md border border-dashed border-outline-variant/50">
                  <CheckCircle className="w-8 h-8 text-status-success-text mb-2" />
                  <span className="text-secondary font-headline text-sm font-semibold mb-1">
                    No expired purchase orders
                  </span>
                  <span className="text-secondary opacity-60 text-xs">
                    All active purchase orders are within their validity periods.
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {expiredPos.map((po) => {
                    const collectionGap = po.total - po.amountReceived;
                    return (
                      <div
                        key={po.finalPoNo}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-4 group"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-headline text-sm font-bold text-on-surface bg-surface-container border border-outline-variant px-2 py-0.5 rounded">
                              {po.finalPoNo}
                            </span>
                            <span className="text-xs text-secondary font-sans">
                              {po.projectNo}
                            </span>
                            <span className="text-xs text-secondary font-sans border-l border-outline-variant pl-2 font-medium">
                              {po.prjNm}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs font-sans text-secondary">
                            <div>
                              Vendor: <span className="font-semibold text-on-surface">{po.vendorName}</span>
                            </div>
                            <div>
                              PO Total: <span className="font-semibold text-on-surface">{formatINR(po.total)}</span>
                            </div>
                            <div>
                              Uncollected Gap: <span className="font-semibold text-error">{formatINR(collectionGap)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-error/15 text-error">
                              {po.daysExpired} days expired
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container border border-outline-variant text-secondary">
                              Valid To: {new Date(po.validTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="self-end md:self-start shrink-0">
                          <Link
                            to={`/projects/${po.projectNo}?tab=purchaseorders&highlight=${po.finalPoNo}`}
                            className="h-8 px-3 py-1.5 border border-outline-variant hover:border-primary text-secondary hover:text-primary hover:bg-primary/5 rounded-md font-sans text-xs font-semibold flex items-center gap-1.5 transition-all bg-surface shadow-sm"
                          >
                            <span>View PO</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
