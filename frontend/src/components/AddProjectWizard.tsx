import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Combobox } from './Combobox';

interface AddProjectWizardProps {
  onClose: () => void;
  onSuccess: (projectCd: string) => void;
}

export const AddProjectWizard: React.FC<AddProjectWizardProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dropdown lists
  const [managers, setManagers] = useState<{ prjMgrId: number; prjMgrName: string }[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [poStatuses, setPoStatuses] = useState<string[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<string[]>([]);
  const [billDeskStatuses, setBillDeskStatuses] = useState<string[]>([]);
  const [billTypes, setBillTypes] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  // Wizard state data
  const [projectData, setProjectData] = useState({
    project_cd: '',
    prj_nm: '',
    customer_name: '',
    prj_budget_no: '',
    prj_mgr_id: '',
    prj_type: '',
    amount_received: '0',
    created_on: new Date().toISOString().split('T')[0]
  });

  const [poData, setPoData] = useState({
    final_po_no: '',
    vendor_name: '',
    po_date: '',
    valid_from: '',
    valid_to: '',
    total: '',
    approval_status: 'DISPATCHED'
  });

  const [invoiceData, setInvoiceData] = useState({
    invoice_num: '',
    vendor_name: '',
    invoice_date: '',
    invoice_amount: '',
    amount_paid: '0',
    invoice_type: 'Services'
  });

  const [billDeskData, setBillDeskData] = useState({
    invoice_no: '',
    bill_month: '',
    vendor_name: '',
    invoice_date: '',
    invoice_amount: '',
    amount_paid: '0',
    status: 'Payment Done'
  });

  const [taxInvoiceData, setTaxInvoiceData] = useState({
    user_bill_no: '',
    cust_gstin_no: '',
    bill_date: '',
    total_amount: '',
    bill_type: 'Invoice',
    state_description: ''
  });

  // Skipped steps tracker
  const [skippedSteps, setSkippedSteps] = useState<{ [key: number]: boolean }>({
    2: false, // PO
    3: false, // Invoice
    4: false, // Bill Desk
    5: false  // Tax Invoice
  });

  // Validation errors
  const [projectErrors, setProjectErrors] = useState<{ [key: string]: string }>({});
  const [poErrors, setPoErrors] = useState<{ [key: string]: string }>({});
  const [invoiceErrors, setInvoiceErrors] = useState<{ [key: string]: string }>({});
  const [billDeskErrors, setBillDeskErrors] = useState<{ [key: string]: string }>({});
  const [taxInvoiceErrors, setTaxInvoiceErrors] = useState<{ [key: string]: string }>({});

  const [globalError, setGlobalError] = useState<string | null>(null);

  // Load dropdown lists on mount
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [mgrList, typeList, poStatusList, invTypeList, bdStatusList, billTypeList, stateList] = await Promise.all([
          api.getProjectManagers(),
          api.getProjectTypes(),
          api.getPOStatuses(),
          api.getInvoiceTypes(),
          api.getBillDeskStatuses(),
          api.getTaxInvoiceBillTypes(),
          api.getTaxInvoiceStates()
        ]);
        setManagers(mgrList);
        setProjectTypes(typeList);
        setPoStatuses(poStatusList);
        setInvoiceTypes(invTypeList);
        setBillDeskStatuses(bdStatusList);
        setBillTypes(billTypeList);
        setStates(stateList);
      } catch (err) {
        console.error('Failed to load project configuration details:', err);
      }
    };
    loadDropdowns();
  }, []);

  // Pre-populate project manager if the user is a project manager
  useEffect(() => {
    if (user && user.role === 'project_manager' && user.prjMgrId) {
      setProjectData(prev => ({
        ...prev,
        prj_mgr_id: String(user.prjMgrId)
      }));
    }
  }, [user]);

  // Debounced server-side uniqueness check for project_cd
  useEffect(() => {
    if (currentStep !== 1 || !projectData.project_cd) return;

    const code = projectData.project_cd.trim();
    if (code === '') return;

    const delayDebounce = setTimeout(async () => {
      try {
        const unique = await api.checkProjectCdUnique(code);
        if (!unique) {
          setProjectErrors(prev => ({ ...prev, project_cd: 'Project code already exists' }));
        } else {
          setProjectErrors(prev => {
            const { project_cd, ...rest } = prev;
            return rest;
          });
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [projectData.project_cd, currentStep]);

  // Find manager name for read-only display
  const getSelectedManagerName = () => {
    const mgrId = Number(projectData.prj_mgr_id);
    if (!mgrId) return '';
    const found = managers.find(m => m.prjMgrId === mgrId);
    return found ? found.prjMgrName : `PM ID: ${mgrId}`;
  };

  // Local validation checks per step
  const validateCurrentStep = (): boolean => {
    let valid = true;

    if (currentStep === 1) {
      const errs: { [key: string]: string } = {};
      if (!projectData.project_cd.trim()) errs.project_cd = 'Project code is required';
      if (!projectData.prj_nm.trim()) errs.prj_nm = 'Project name is required';
      if (!projectData.customer_name.trim()) errs.customer_name = 'Customer name is required';
      
      const budget = Number(projectData.prj_budget_no);
      if (!projectData.prj_budget_no.trim()) {
        errs.prj_budget_no = 'Budget is required';
      } else if (isNaN(budget) || budget <= 0) {
        errs.prj_budget_no = 'Budget must be a number greater than 0';
      }

      if (!projectData.prj_mgr_id) errs.prj_mgr_id = 'Project manager is required';
      if (!projectData.prj_type) errs.prj_type = 'Project type is required';

      const received = Number(projectData.amount_received);
      if (projectData.amount_received && (isNaN(received) || received < 0)) {
        errs.amount_received = 'Amount received must be a positive number';
      }

      if (projectErrors.project_cd) {
        errs.project_cd = projectErrors.project_cd;
      }

      setProjectErrors(errs);
      valid = Object.keys(errs).length === 0;
    }

    if (currentStep === 2 && !skippedSteps[2]) {
      const errs: { [key: string]: string } = {};
      if (!poData.final_po_no.trim()) errs.final_po_no = 'PO number is required';
      if (!poData.vendor_name.trim()) errs.vendor_name = 'Vendor name is required';
      if (!poData.po_date) errs.po_date = 'PO date is required';
      if (!poData.valid_from) errs.valid_from = 'Start date is required';
      if (!poData.valid_to) errs.valid_to = 'End date is required';

      if (poData.valid_from && poData.valid_to) {
        const from = new Date(poData.valid_from);
        const to = new Date(poData.valid_to);
        if (to <= from) {
          errs.valid_to = 'End date must be after start date';
        }
      }

      const total = Number(poData.total);
      if (!poData.total.trim()) {
        errs.total = 'Total amount is required';
      } else if (isNaN(total) || total <= 0) {
        errs.total = 'Total must be a number greater than 0';
      }

      if (!poData.approval_status) errs.approval_status = 'Approval status is required';

      setPoErrors(errs);
      valid = Object.keys(errs).length === 0;
    }

    if (currentStep === 3 && !skippedSteps[3]) {
      const errs: { [key: string]: string } = {};
      if (!invoiceData.invoice_num.trim()) errs.invoice_num = 'Invoice number is required';
      if (!invoiceData.vendor_name.trim()) errs.vendor_name = 'Vendor name is required';
      if (!invoiceData.invoice_date) errs.invoice_date = 'Invoice date is required';

      let invAmt = 0;
      let invAmtValid = false;
      if (!invoiceData.invoice_amount.trim()) {
        errs.invoice_amount = 'Invoice amount is required';
      } else {
        invAmt = Number(invoiceData.invoice_amount);
        if (isNaN(invAmt) || invAmt <= 0) {
          errs.invoice_amount = 'Invoice amount must be a number greater than 0';
        } else {
          invAmtValid = true;
        }
      }

      const paid = Number(invoiceData.amount_paid);
      if (invoiceData.amount_paid && (isNaN(paid) || paid < 0)) {
        errs.amount_paid = 'Amount paid must be a positive number';
      } else if (invAmtValid && paid > invAmt) {
        errs.amount_paid = 'Amount paid cannot exceed invoice amount';
      }

      if (!invoiceData.invoice_type) errs.invoice_type = 'Invoice type is required';

      setInvoiceErrors(errs);
      valid = Object.keys(errs).length === 0;
    }

    if (currentStep === 4 && !skippedSteps[4]) {
      const errs: { [key: string]: string } = {};
      if (!billDeskData.invoice_no.trim()) errs.invoice_no = 'Invoice number is required';
      if (!billDeskData.bill_month.trim()) errs.bill_month = 'Bill month is required';
      if (!billDeskData.vendor_name.trim()) errs.vendor_name = 'Vendor name is required';
      if (!billDeskData.invoice_date) errs.invoice_date = 'Invoice date is required';

      let invAmt = 0;
      let invAmtValid = false;
      if (!billDeskData.invoice_amount.trim()) {
        errs.invoice_amount = 'Invoice amount is required';
      } else {
        invAmt = Number(billDeskData.invoice_amount);
        if (isNaN(invAmt) || invAmt <= 0) {
          errs.invoice_amount = 'Invoice amount must be a number greater than 0';
        } else {
          invAmtValid = true;
        }
      }

      const paid = Number(billDeskData.amount_paid);
      if (billDeskData.amount_paid && (isNaN(paid) || paid < 0)) {
        errs.amount_paid = 'Amount paid must be a positive number';
      } else if (invAmtValid && paid > invAmt) {
        errs.amount_paid = 'Amount paid cannot exceed invoice amount';
      }

      if (!billDeskData.status) errs.status = 'Status is required';

      setBillDeskErrors(errs);
      valid = Object.keys(errs).length === 0;
    }

    if (currentStep === 5 && !skippedSteps[5]) {
      const errs: { [key: string]: string } = {};
      if (!taxInvoiceData.user_bill_no.trim()) errs.user_bill_no = 'Invoice number is required';
      
      if (!taxInvoiceData.cust_gstin_no.trim()) {
        errs.cust_gstin_no = 'Customer GSTIN is required';
      } else if (!/^[a-zA-Z0-9]{15}$/.test(taxInvoiceData.cust_gstin_no.trim())) {
        errs.cust_gstin_no = 'Customer GSTIN must be exactly 15 alphanumeric characters';
      }

      if (!taxInvoiceData.bill_date) errs.bill_date = 'Bill date is required';

      const amount = Number(taxInvoiceData.total_amount);
      if (!taxInvoiceData.total_amount.trim()) {
        errs.total_amount = 'Total amount is required';
      } else if (isNaN(amount) || amount <= 0) {
        errs.total_amount = 'Total amount must be a number greater than 0';
      }

      if (!taxInvoiceData.bill_type) errs.bill_type = 'Bill type is required';
      if (!taxInvoiceData.state_description.trim()) errs.state_description = 'State description is required';

      setTaxInvoiceErrors(errs);
      valid = Object.keys(errs).length === 0;
    }

    return valid;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setGlobalError(null);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setGlobalError(null);
    setCurrentStep(prev => prev - 1);
  };

  const handleSkip = () => {
    setGlobalError(null);
    setSkippedSteps(prev => ({ ...prev, [currentStep]: true }));
    setCurrentStep(prev => prev + 1);
  };

  const handleUnskip = () => {
    setSkippedSteps(prev => ({ ...prev, [currentStep]: false }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setGlobalError(null);

    const payload: any = {
      project: {
        ...projectData,
        prj_budget_no: Number(projectData.prj_budget_no),
        amount_received: Number(projectData.amount_received || 0)
      }
    };

    if (!skippedSteps[2] && poData.final_po_no) {
      payload.purchaseOrder = {
        ...poData,
        total: Number(poData.total)
      };
    }

    if (!skippedSteps[3] && invoiceData.invoice_num) {
      payload.invoice = {
        ...invoiceData,
        invoice_amount: Number(invoiceData.invoice_amount),
        amount_paid: Number(invoiceData.amount_paid || 0)
      };
    }

    if (!skippedSteps[4] && billDeskData.invoice_no) {
      payload.billDesk = {
        ...billDeskData,
        invoice_amount: Number(billDeskData.invoice_amount),
        amount_paid: Number(billDeskData.amount_paid || 0)
      };
    }

    if (!skippedSteps[5] && taxInvoiceData.user_bill_no) {
      payload.taxInvoice = {
        ...taxInvoiceData,
        total_amount: Number(taxInvoiceData.total_amount)
      };
    }

    try {
      const response = await api.createProjectChain(payload);
      onSuccess(response.project.projectCd);
    } catch (err: any) {
      console.error(err);
      if (err.errors) {
        // Map backend errors back to steps
        if (err.errors.project) {
          setProjectErrors(err.errors.project);
          setCurrentStep(1);
          setGlobalError('Project details validation failed. Please check Step 1.');
        } else if (err.errors.purchaseOrder) {
          setPoErrors(err.errors.purchaseOrder);
          setSkippedSteps(prev => ({ ...prev, 2: false }));
          setCurrentStep(2);
          setGlobalError('Purchase Order validation failed. Please check Step 2.');
        } else if (err.errors.invoice) {
          setInvoiceErrors(err.errors.invoice);
          setSkippedSteps(prev => ({ ...prev, 3: false }));
          setCurrentStep(3);
          setGlobalError('Invoice validation failed. Please check Step 3.');
        } else if (err.errors.billDesk) {
          setBillDeskErrors(err.errors.billDesk);
          setSkippedSteps(prev => ({ ...prev, 4: false }));
          setCurrentStep(4);
          setGlobalError('Bill Desk validation failed. Please check Step 4.');
        } else if (err.errors.taxInvoice) {
          setTaxInvoiceErrors(err.errors.taxInvoice);
          setSkippedSteps(prev => ({ ...prev, 5: false }));
          setCurrentStep(5);
          setGlobalError('Tax Invoice validation failed. Please check Step 5.');
        } else {
          setGlobalError(err.message || 'Validation failed on submit');
        }
      } else {
        setGlobalError(err.message || 'An error occurred during submission. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Project' },
    { num: 2, label: 'Purchase Order' },
    { num: 3, label: 'Invoice' },
    { num: 4, label: 'Bill Desk' },
    { num: 5, label: 'Tax Invoice' },
    { num: 6, label: 'Review' }
  ];

  return (
    <div className="fixed inset-0 bg-[#111827]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-2xl flex flex-col my-8 animate-page-fade">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold text-on-surface">Add New Project</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-secondary hover:text-primary hover:bg-surface-container transition-colors"
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Dot Indicator */}
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {stepsList.map((s, idx) => (
              <React.Fragment key={s.num}>
                {idx > 0 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      currentStep > s.num - 1 ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center relative">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      currentStep === s.num
                        ? 'bg-primary text-white ring-4 ring-primary/20 scale-110'
                        : currentStep > s.num
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-outline text-secondary'
                    }`}
                  >
                    {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="absolute top-8 whitespace-nowrap text-[10px] font-semibold text-secondary tracking-wide uppercase">
                    {s.label.split(' ')[0]}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="h-6" /> {/* spacer for labels */}
        </div>

        {/* Form Body */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[50vh]">
          {globalError && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-xs font-medium">
              {globalError}
            </div>
          )}

          {/* STEP 1: Project Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider mb-2">Step 1: Project Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Project Code *</label>
                  <input
                    type="text"
                    value={projectData.project_cd}
                    onChange={(e) => setProjectData({ ...projectData, project_cd: e.target.value.toUpperCase() })}
                    placeholder="e.g. S251917ZOUP"
                    className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      projectErrors.project_cd ? 'border-error' : 'border-outline'
                    }`}
                  />
                  {projectErrors.project_cd && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.project_cd}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={projectData.prj_nm}
                    onChange={(e) => setProjectData({ ...projectData, prj_nm: e.target.value })}
                    placeholder="Enter project name"
                    className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      projectErrors.prj_nm ? 'border-error' : 'border-outline'
                    }`}
                  />
                  {projectErrors.prj_nm && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.prj_nm}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={projectData.customer_name}
                    onChange={(e) => setProjectData({ ...projectData, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                    className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      projectErrors.customer_name ? 'border-error' : 'border-outline'
                    }`}
                  />
                  {projectErrors.customer_name && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.customer_name}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Budget (₹) *</label>
                  <input
                    type="number"
                    value={projectData.prj_budget_no}
                    onChange={(e) => setProjectData({ ...projectData, prj_budget_no: e.target.value })}
                    placeholder="e.g. 150000"
                    className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      projectErrors.prj_budget_no ? 'border-error' : 'border-outline'
                    }`}
                  />
                  {projectErrors.prj_budget_no && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.prj_budget_no}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Project Manager *</label>
                  {user && user.role === 'project_manager' ? (
                    <div className="bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm text-secondary font-medium">
                      Assigned to: {getSelectedManagerName() || user.username}
                    </div>
                  ) : (
                    <Combobox
                      options={managers.map(m => ({ value: String(m.prjMgrId), label: m.prjMgrName }))}
                      value={projectData.prj_mgr_id}
                      onChange={(val) => setProjectData({ ...projectData, prj_mgr_id: val })}
                      placeholder="Select Project Manager"
                      allowCustomValue={false}
                      error={projectErrors.prj_mgr_id}
                    />
                  )}
                  {projectErrors.prj_mgr_id && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.prj_mgr_id}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Project Type *</label>
                  <Combobox
                    options={projectTypes}
                    value={projectData.prj_type}
                    onChange={(val) => setProjectData({ ...projectData, prj_type: val })}
                    placeholder="Select Project Type"
                    allowCustomValue={false}
                    error={projectErrors.prj_type}
                  />
                  {projectErrors.prj_type && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.prj_type}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    value={projectData.amount_received}
                    onChange={(e) => setProjectData({ ...projectData, amount_received: e.target.value })}
                    className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      projectErrors.amount_received ? 'border-error' : 'border-outline'
                    }`}
                  />
                  {projectErrors.amount_received && (
                    <span className="text-[11px] text-error mt-0.5 block">{projectErrors.amount_received}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Created Date</label>
                  <input
                    type="date"
                    value={projectData.created_on}
                    onChange={(e) => setProjectData({ ...projectData, created_on: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Purchase Order Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider">Step 2: Purchase Order Details</h3>
                {skippedSteps[2] && (
                  <button onClick={handleUnskip} className="text-xs text-primary font-bold hover:underline">
                    Enable this step
                  </button>
                )}
              </div>

              {skippedSteps[2] ? (
                <div className="bg-surface-container-low border border-outline border-dashed rounded-lg p-8 text-center text-secondary">
                  Purchase Order details will be skipped. Click "Enable this step" to fill this data.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">PO Number *</label>
                    <input
                      type="text"
                      value={poData.final_po_no}
                      onChange={(e) => setPoData({ ...poData, final_po_no: e.target.value })}
                      placeholder="e.g. PO-8871"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        poErrors.final_po_no ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {poErrors.final_po_no && (
                      <span className="text-[11px] text-error mt-0.5 block">{poErrors.final_po_no}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      value={poData.vendor_name}
                      onChange={(e) => setPoData({ ...poData, vendor_name: e.target.value })}
                      placeholder="e.g. Wipro"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        poErrors.vendor_name ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {poErrors.vendor_name && (
                      <span className="text-[11px] text-error mt-0.5 block">{poErrors.vendor_name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">PO Date *</label>
                    <input
                      type="date"
                      value={poData.po_date}
                      onChange={(e) => setPoData({ ...poData, po_date: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        poErrors.po_date ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {poErrors.po_date && (
                      <span className="text-[11px] text-error mt-0.5 block">{poErrors.po_date}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Total PO Amount (₹) *</label>
                    <input
                      type="number"
                      value={poData.total}
                      onChange={(e) => setPoData({ ...poData, total: e.target.value })}
                      placeholder="e.g. 80000"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        poErrors.total ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {poErrors.total && (
                      <span className="text-[11px] text-error mt-0.5 block">{poErrors.total}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Validity Start *</label>
                    <input
                      type="date"
                      value={poData.valid_from}
                      onChange={(e) => setPoData({ ...poData, valid_from: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        poErrors.valid_from ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {poErrors.valid_from && (
                      <span className="text-[11px] text-error mt-0.5 block">{poErrors.valid_from}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Validity End *</label>
                    <input
                      type="date"
                      value={poData.valid_to}
                      onChange={(e) => setPoData({ ...poData, valid_to: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        poErrors.valid_to ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {poErrors.valid_to && (
                      <span className="text-[11px] text-error mt-0.5 block">{poErrors.valid_to}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Approval Status *</label>
                    <Combobox
                      options={poStatuses}
                      value={poData.approval_status}
                      onChange={(val) => setPoData({ ...poData, approval_status: val })}
                      placeholder="Select Approval Status"
                      allowCustomValue={false}
                      error={poErrors.approval_status}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Invoice Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider">Step 3: Invoice Details</h3>
                {skippedSteps[3] && (
                  <button onClick={handleUnskip} className="text-xs text-primary font-bold hover:underline">
                    Enable this step
                  </button>
                )}
              </div>

              {skippedSteps[3] ? (
                <div className="bg-surface-container-low border border-outline border-dashed rounded-lg p-8 text-center text-secondary">
                  Invoice details will be skipped. Click "Enable this step" to fill this data.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice Number *</label>
                    <input
                      type="text"
                      value={invoiceData.invoice_num}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_num: e.target.value })}
                      placeholder="e.g. INV-1102"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        invoiceErrors.invoice_num ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {invoiceErrors.invoice_num && (
                      <span className="text-[11px] text-error mt-0.5 block">{invoiceErrors.invoice_num}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      value={invoiceData.vendor_name}
                      onChange={(e) => setInvoiceData({ ...invoiceData, vendor_name: e.target.value })}
                      placeholder="e.g. Wipro"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        invoiceErrors.vendor_name ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {invoiceErrors.vendor_name && (
                      <span className="text-[11px] text-error mt-0.5 block">{invoiceErrors.vendor_name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      value={invoiceData.invoice_date}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        invoiceErrors.invoice_date ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {invoiceErrors.invoice_date && (
                      <span className="text-[11px] text-error mt-0.5 block">{invoiceErrors.invoice_date}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice Type *</label>
                    <Combobox
                      options={invoiceTypes}
                      value={invoiceData.invoice_type}
                      onChange={(val) => setInvoiceData({ ...invoiceData, invoice_type: val })}
                      placeholder="Select Invoice Type"
                      allowCustomValue={false}
                      error={invoiceErrors.invoice_type}
                    />
                    {invoiceErrors.invoice_type && (
                      <span className="text-[11px] text-error mt-0.5 block">{invoiceErrors.invoice_type}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice Amount (₹) *</label>
                    <input
                      type="number"
                      value={invoiceData.invoice_amount}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_amount: e.target.value })}
                      placeholder="e.g. 5000"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        invoiceErrors.invoice_amount ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {invoiceErrors.invoice_amount && (
                      <span className="text-[11px] text-error mt-0.5 block">{invoiceErrors.invoice_amount}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={invoiceData.amount_paid}
                      onChange={(e) => setInvoiceData({ ...invoiceData, amount_paid: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        invoiceErrors.amount_paid ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {invoiceErrors.amount_paid && (
                      <span className="text-[11px] text-error mt-0.5 block">{invoiceErrors.amount_paid}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Bill Desk Details */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider">Step 4: Bill Desk Details</h3>
                {skippedSteps[4] && (
                  <button onClick={handleUnskip} className="text-xs text-primary font-bold hover:underline">
                    Enable this step
                  </button>
                )}
              </div>

              {skippedSteps[4] ? (
                <div className="bg-surface-container-low border border-outline border-dashed rounded-lg p-8 text-center text-secondary">
                  Bill Desk details will be skipped. Click "Enable this step" to fill this data.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice/Bill Number *</label>
                    <input
                      type="text"
                      value={billDeskData.invoice_no}
                      onChange={(e) => setBillDeskData({ ...billDeskData, invoice_no: e.target.value })}
                      placeholder="e.g. BD-892"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        billDeskErrors.invoice_no ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {billDeskErrors.invoice_no && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.invoice_no}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Bill Month *</label>
                    <input
                      type="text"
                      value={billDeskData.bill_month}
                      onChange={(e) => setBillDeskData({ ...billDeskData, bill_month: e.target.value })}
                      placeholder="e.g. June-2026"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        billDeskErrors.bill_month ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {billDeskErrors.bill_month && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.bill_month}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      value={billDeskData.vendor_name}
                      onChange={(e) => setBillDeskData({ ...billDeskData, vendor_name: e.target.value })}
                      placeholder="e.g. Wipro"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        billDeskErrors.vendor_name ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {billDeskErrors.vendor_name && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.vendor_name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice Date *</label>
                    <input
                      type="date"
                      value={billDeskData.invoice_date}
                      onChange={(e) => setBillDeskData({ ...billDeskData, invoice_date: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        billDeskErrors.invoice_date ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {billDeskErrors.invoice_date && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.invoice_date}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Invoice Amount (₹) *</label>
                    <input
                      type="number"
                      value={billDeskData.invoice_amount}
                      onChange={(e) => setBillDeskData({ ...billDeskData, invoice_amount: e.target.value })}
                      placeholder="e.g. 10000"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        billDeskErrors.invoice_amount ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {billDeskErrors.invoice_amount && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.invoice_amount}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={billDeskData.amount_paid}
                      onChange={(e) => setBillDeskData({ ...billDeskData, amount_paid: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        billDeskErrors.amount_paid ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {billDeskErrors.amount_paid && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.amount_paid}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Status *</label>
                    <Combobox
                      options={billDeskStatuses}
                      value={billDeskData.status}
                      onChange={(val) => setBillDeskData({ ...billDeskData, status: val })}
                      placeholder="Select Status"
                      allowCustomValue={false}
                      error={billDeskErrors.status}
                    />
                    {billDeskErrors.status && (
                      <span className="text-[11px] text-error mt-0.5 block">{billDeskErrors.status}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Tax Invoice Details */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider">Step 5: Tax Invoice Details</h3>
                {skippedSteps[5] && (
                  <button onClick={handleUnskip} className="text-xs text-primary font-bold hover:underline">
                    Enable this step
                  </button>
                )}
              </div>

              {skippedSteps[5] ? (
                <div className="bg-surface-container-low border border-outline border-dashed rounded-lg p-8 text-center text-secondary">
                  Tax Invoice details will be skipped. Click "Enable this step" to fill this data.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Tax Bill Number *</label>
                    <input
                      type="text"
                      value={taxInvoiceData.user_bill_no}
                      onChange={(e) => setTaxInvoiceData({ ...taxInvoiceData, user_bill_no: e.target.value })}
                      placeholder="e.g. TX-992"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        taxInvoiceErrors.user_bill_no ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {taxInvoiceErrors.user_bill_no && (
                      <span className="text-[11px] text-error mt-0.5 block">{taxInvoiceErrors.user_bill_no}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Customer GSTIN *</label>
                    <input
                      type="text"
                      value={taxInvoiceData.cust_gstin_no}
                      onChange={(e) => setTaxInvoiceData({ ...taxInvoiceData, cust_gstin_no: e.target.value.toUpperCase() })}
                      placeholder="15-char alphanumeric"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        taxInvoiceErrors.cust_gstin_no ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {taxInvoiceErrors.cust_gstin_no && (
                      <span className="text-[11px] text-error mt-0.5 block">{taxInvoiceErrors.cust_gstin_no}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Bill Date *</label>
                    <input
                      type="date"
                      value={taxInvoiceData.bill_date}
                      onChange={(e) => setTaxInvoiceData({ ...taxInvoiceData, bill_date: e.target.value })}
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        taxInvoiceErrors.bill_date ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {taxInvoiceErrors.bill_date && (
                      <span className="text-[11px] text-error mt-0.5 block">{taxInvoiceErrors.bill_date}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Total Bill Amount (₹) *</label>
                    <input
                      type="number"
                      value={taxInvoiceData.total_amount}
                      onChange={(e) => setTaxInvoiceData({ ...taxInvoiceData, total_amount: e.target.value })}
                      placeholder="e.g. 12000"
                      className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                        taxInvoiceErrors.total_amount ? 'border-error' : 'border-outline'
                      }`}
                    />
                    {taxInvoiceErrors.total_amount && (
                      <span className="text-[11px] text-error mt-0.5 block">{taxInvoiceErrors.total_amount}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Bill Type *</label>
                    <Combobox
                      options={billTypes}
                      value={taxInvoiceData.bill_type}
                      onChange={(val) => setTaxInvoiceData({ ...taxInvoiceData, bill_type: val })}
                      placeholder="Select Bill Type"
                      allowCustomValue={false}
                      error={taxInvoiceErrors.bill_type}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">State Description *</label>
                    <Combobox
                      options={states}
                      value={taxInvoiceData.state_description}
                      onChange={(val) => setTaxInvoiceData({ ...taxInvoiceData, state_description: val })}
                      placeholder="Select State"
                      allowCustomValue={false}
                      error={taxInvoiceErrors.state_description}
                    />
                    {taxInvoiceErrors.state_description && (
                      <span className="text-[11px] text-error mt-0.5 block">{taxInvoiceErrors.state_description}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-headline text-on-surface uppercase tracking-wider">Review Project Details</h3>
              
              <div className="space-y-4 text-sm">
                
                {/* Project section */}
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                  <h4 className="font-bold text-xs text-primary uppercase tracking-wide mb-2">1. Project</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="font-semibold text-secondary">Code:</span> {projectData.project_cd}</div>
                    <div><span className="font-semibold text-secondary">Name:</span> {projectData.prj_nm}</div>
                    <div><span className="font-semibold text-secondary">Client:</span> {projectData.customer_name}</div>
                    <div><span className="font-semibold text-secondary">Budget:</span> ₹{Number(projectData.prj_budget_no).toLocaleString('en-IN')}</div>
                    <div><span className="font-semibold text-secondary">Manager:</span> {getSelectedManagerName()}</div>
                    <div><span className="font-semibold text-secondary">Type:</span> {projectData.prj_type}</div>
                  </div>
                </div>

                {/* PO Section */}
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wide">2. Purchase Order</h4>
                    {skippedSteps[2] ? (
                      <span className="text-[10px] bg-outline-variant text-secondary px-2 py-0.5 rounded-full font-bold uppercase">Skipped</span>
                    ) : (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                    )}
                  </div>
                  {!skippedSteps[2] && poData.final_po_no ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-semibold text-secondary">PO No:</span> {poData.final_po_no}</div>
                      <div><span className="font-semibold text-secondary">Vendor:</span> {poData.vendor_name}</div>
                      <div><span className="font-semibold text-secondary">Total:</span> ₹{Number(poData.total).toLocaleString('en-IN')}</div>
                      <div><span className="font-semibold text-secondary">Status:</span> {poData.approval_status}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-secondary italic">No PO data will be submitted.</div>
                  )}
                </div>

                {/* Invoice Section */}
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wide">3. Invoice</h4>
                    {skippedSteps[3] ? (
                      <span className="text-[10px] bg-outline-variant text-secondary px-2 py-0.5 rounded-full font-bold uppercase">Skipped</span>
                    ) : (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                    )}
                  </div>
                  {!skippedSteps[3] && invoiceData.invoice_num ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-semibold text-secondary">Inv No:</span> {invoiceData.invoice_num}</div>
                      <div><span className="font-semibold text-secondary">Vendor:</span> {invoiceData.vendor_name}</div>
                      <div><span className="font-semibold text-secondary">Amount:</span> ₹{Number(invoiceData.invoice_amount).toLocaleString('en-IN')}</div>
                      <div><span className="font-semibold text-secondary">Paid:</span> ₹{Number(invoiceData.amount_paid || 0).toLocaleString('en-IN')}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-secondary italic">No Invoice data will be submitted.</div>
                  )}
                </div>

                {/* Bill Desk Section */}
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wide">4. Bill Desk Record</h4>
                    {skippedSteps[4] ? (
                      <span className="text-[10px] bg-outline-variant text-secondary px-2 py-0.5 rounded-full font-bold uppercase">Skipped</span>
                    ) : (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                    )}
                  </div>
                  {!skippedSteps[4] && billDeskData.invoice_no ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-semibold text-secondary">Bill No:</span> {billDeskData.invoice_no}</div>
                      <div><span className="font-semibold text-secondary">Vendor:</span> {billDeskData.vendor_name}</div>
                      <div><span className="font-semibold text-secondary">Amount:</span> ₹{Number(billDeskData.invoice_amount).toLocaleString('en-IN')}</div>
                      <div><span className="font-semibold text-secondary">Paid:</span> ₹{Number(billDeskData.amount_paid || 0).toLocaleString('en-IN')}</div>
                      <div><span className="font-semibold text-secondary">Status:</span> {billDeskData.status}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-secondary italic">No Bill Desk data will be submitted.</div>
                  )}
                </div>

                {/* Tax Invoice Section */}
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wide">5. Tax Invoice</h4>
                    {skippedSteps[5] ? (
                      <span className="text-[10px] bg-outline-variant text-secondary px-2 py-0.5 rounded-full font-bold uppercase">Skipped</span>
                    ) : (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                    )}
                  </div>
                  {!skippedSteps[5] && taxInvoiceData.user_bill_no ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-semibold text-secondary">Bill No:</span> {taxInvoiceData.user_bill_no}</div>
                      <div><span className="font-semibold text-secondary">GSTIN:</span> {taxInvoiceData.cust_gstin_no}</div>
                      <div><span className="font-semibold text-secondary">Total:</span> ₹{Number(taxInvoiceData.total_amount).toLocaleString('en-IN')}</div>
                      <div><span className="font-semibold text-secondary">State:</span> {taxInvoiceData.state_description}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-secondary italic">No Tax Invoice data will be submitted.</div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          
          {/* Back button */}
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-4 py-2 border border-outline text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg font-headline text-sm font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {/* Skip and Next/Submit buttons */}
          <div className="flex items-center gap-3">
            {/* Skip button */}
            {currentStep > 1 && currentStep < 6 && !skippedSteps[currentStep] && (
              <button
                onClick={handleSkip}
                disabled={loading}
                className="px-4 py-2 text-secondary hover:text-primary hover:underline font-headline text-sm font-semibold transition-all"
              >
                Skip this step
              </button>
            )}

            {/* Next or Submit button */}
            {currentStep < 6 ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-5 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg font-headline text-sm font-semibold flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-lg font-headline text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
