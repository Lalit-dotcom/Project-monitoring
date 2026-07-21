import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, AlertTriangle, Send, Loader2, CheckCircle } from 'lucide-react';
import type { Project, DatabaseProject } from '../types';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type NoticeType = 'vendor_pending_bills' | 'client_pending_funds';
type ModalStep = 'pick' | 'preview';

interface NoticeModalProps {
  open: boolean;
  project: (Project & DatabaseProject) | null;
  onClose: () => void;
}

// ─── Currency helper (no ₹ symbol — plain Indian numbering) ─────────────────

function fmtINR(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format today as "DD Month YYYY", e.g. "13 July 2026". */
function todayLong(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Notice template builders (frontend preview only) ────────────────────────
// The authoritative HTML is built server-side; these previews are for display
// inside the modal scroll pane before the user dispatches.

function buildVendorNoticePreview(p: Project & DatabaseProject): string {
  const today = todayLong();
  const year = new Date().getFullYear();
  const refCode = `NICSI/PMD/${year}/${p.projectCd}/${p.projectCd}`;
  const poAmt   = Number(p.poAmount ?? (p as any).po_amount ?? 0);
  const paid    = Number(p.totalAmountPaid ?? (p as any).total_amount_paid ?? (p as any).amountPaid ?? 0);
  const balance = Math.max(0, poAmt - paid);
  const noBills = Number(p.noOfExpInvoice ?? (p as any).no_of_exp_invoice ?? 0);
  const noTax   = Number(p.noOfTaxInvoice ?? (p as any).no_of_tax_invoice ?? 0);

  return `
<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#1a1a2e;">
  <div style="background:#1B3E7A;padding:18px 24px;border-radius:6px 6px 0 0;margin-bottom:0;">
    <div style="color:#c8d8f0;font-size:10px;letter-spacing:1px;text-transform:uppercase;">Government of India · Ministry of Electronics &amp; Information Technology</div>
    <div style="color:#fff;font-size:15px;font-weight:700;margin-top:4px;">National Informatics Centre Services Inc.</div>
    <div style="color:#b0c4de;font-size:10px;margin-top:2px;">Hall No. 2 &amp; 3, 6th Floor, NBCC Tower, 15 Bhikaji Cama Place, New Delhi - 110066 &nbsp;|&nbsp; Tel: +91-11-22900525</div>
  </div>
  <div style="border:1px solid #d0d8e8;border-top:none;border-radius:0 0 6px 6px;padding:20px 24px;background:#fff;">
    <table style="width:100%;font-size:11px;margin-bottom:14px;">
      <tr>
        <td><b>Ref No:</b> ${refCode}</td>
        <td style="text-align:right;"><b>Date:</b> ${today}</td>
      </tr>
    </table>
    <p style="margin:0 0 4px;"><b>To,</b><br/>The Vendor Coordinator,<br/><b>${p.customerName}</b></p>
    <p style="margin:12px 0 4px;"><b>Subject:</b> Urgent Notice for Submission of Pending Expenditure Bills and Tax Invoices</p>
    <p style="margin:0;"><b>Project Ref:</b> ${p.projectCd} &nbsp;|&nbsp; <b>PO No:</b> As per records</p>
    <hr style="border:none;border-top:1px solid #e0e8f0;margin:14px 0;"/>
    <p>Sir/Madam,</p>
    <p>This is with reference to the above-mentioned project being executed through NICSI under the provisions of GFR 2017 (Rule 194/GeM). It has come to our notice that certain expenditure bills and/or tax invoices are still pending submission from your end. The financial position of the project as per our records is as follows:</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:10px 0 16px;">
      <thead>
        <tr style="background:#1B3E7A;color:#fff;">
          <th style="padding:7px 10px;border:1px solid #1B3E7A;text-align:left;">Particulars</th>
          <th style="padding:7px 10px;border:1px solid #1B3E7A;text-align:right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #c8d4e8;">Total PO Value Allotted</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${fmtINR(poAmt)}</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #c8d4e8;">Amount Paid to Vendor</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${fmtINR(paid)}</td></tr>
        <tr style="background:#f0f4ff;font-weight:700;"><td style="padding:6px 10px;border:1px solid #c8d4e8;">Balance Pending Payment</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${fmtINR(balance)}</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #c8d4e8;">Expenditure Bills Received</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${noBills} bill${noBills !== 1 ? 's' : ''}</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #c8d4e8;">Tax Invoices Raised</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${noTax} invoice${noTax !== 1 ? 's' : ''}</td></tr>
      </tbody>
    </table>
    <p>You are hereby requested to submit the outstanding bills/invoices within <b>7 (seven) working days</b> from the date of receipt of this notice. Failure to comply may result in:</p>
    <ol style="padding-left:18px;line-height:2;">
      <li>Delayed processing of pending payments</li>
      <li>Levy of penalty as per the terms of the Purchase Order</li>
      <li>Escalation to the competent authority for appropriate action</li>
    </ol>
    <p>For any clarifications, please contact the NIC Coordinator at the designated email.</p>
    <p style="margin-top:20px;">Yours faithfully,</p>
    <br/>
    <p style="margin:0;font-weight:700;">Accounts &amp; Billing Division</p>
    <p style="margin:0;">Project Monitoring Department</p>
    <p style="margin:0;">National Informatics Centre Services Inc. (NICSI)</p>
    <p style="margin:0;color:#666;font-size:11px;">An Enterprise of NIC under MeitY, Govt. of India</p>
    <hr style="border:none;border-top:1px solid #e0e8f0;margin:18px 0 10px;"/>
    <p style="font-size:10px;color:#999;margin:0;">This is a system-generated notice from NICSI Project Monitoring System (NPMS).<br/>For verification, please quote Ref No: ${refCode}</p>
  </div>
</div>`;
}

function buildClientNoticePreview(p: Project & DatabaseProject): string {
  const today = todayLong();
  const year = new Date().getFullYear();
  const refCode = `NICSI/PMD/${year}/${p.projectCd}/${p.projectCd}`;
  const budget      = Number(p.prjBudgetNo ?? (p as any).prj_budget_no ?? 0);
  const amtReceived = Number(p.amountReceived ?? (p as any).amount_received ?? 0);
  const pending     = Math.max(0, budget - amtReceived);

  return `
<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#1a1a2e;">
  <div style="background:#1B3E7A;padding:18px 24px;border-radius:6px 6px 0 0;margin-bottom:0;">
    <div style="color:#c8d8f0;font-size:10px;letter-spacing:1px;text-transform:uppercase;">Government of India · Ministry of Electronics &amp; Information Technology</div>
    <div style="color:#fff;font-size:15px;font-weight:700;margin-top:4px;">National Informatics Centre Services Inc.</div>
    <div style="color:#b0c4de;font-size:10px;margin-top:2px;">Hall No. 2 &amp; 3, 6th Floor, NBCC Tower, 15 Bhikaji Cama Place, New Delhi - 110066 &nbsp;|&nbsp; Tel: +91-11-22900525</div>
  </div>
  <div style="border:1px solid #d0d8e8;border-top:none;border-radius:0 0 6px 6px;padding:20px 24px;background:#fff;">
    <table style="width:100%;font-size:11px;margin-bottom:14px;">
      <tr>
        <td><b>Ref No:</b> ${refCode}</td>
        <td style="text-align:right;"><b>Date:</b> ${today}</td>
      </tr>
    </table>
    <p style="margin:0 0 4px;"><b>To,</b><br/>The Nodal Officer / Finance Section,<br/><b>${p.customerName}</b></p>
    <p style="margin:12px 0 4px;"><b>Subject:</b> Urgent Notice for Release of Pending Project Funds</p>
    <p style="margin:0;"><b>Project Ref:</b> ${p.projectCd} &nbsp;|&nbsp; <b>PO No:</b> As per records</p>
    <hr style="border:none;border-top:1px solid #e0e8f0;margin:14px 0;"/>
    <p>Sir/Madam,</p>
    <p>This is with reference to the above-mentioned project being executed through NICSI under the provisions of GFR 2017 (Rule 194/GeM). It has come to our notice that certain project funds are yet to be released from your end. The financial position of the project as per our records is as follows:</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:10px 0 16px;">
      <thead>
        <tr style="background:#1B3E7A;color:#fff;">
          <th style="padding:7px 10px;border:1px solid #1B3E7A;text-align:left;">Particulars</th>
          <th style="padding:7px 10px;border:1px solid #1B3E7A;text-align:right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #c8d4e8;">Total Project Sanctioned Budget</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${fmtINR(budget)}</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #c8d4e8;">Amount Received from Client</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${fmtINR(amtReceived)}</td></tr>
        <tr style="background:#f0f4ff;font-weight:700;"><td style="padding:6px 10px;border:1px solid #c8d4e8;">Pending Funds to be Released</td><td style="padding:6px 10px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${fmtINR(pending)}</td></tr>
      </tbody>
    </table>
    <p>You are hereby requested to arrange for the release of the outstanding funds at the earliest, and in any case within <b>7 (seven) working days</b> from the date of receipt of this notice. Failure to release the funds in a timely manner may result in:</p>
    <ol style="padding-left:18px;line-height:2;">
      <li>Delay in execution of project deliverables and vendor payments</li>
      <li>Disruption to ongoing services under the Purchase Order</li>
      <li>Escalation to the competent authority for appropriate action</li>
    </ol>
    <p>For any clarifications, please contact the NIC Coordinator at the designated email.</p>
    <p style="margin-top:20px;">Yours faithfully,</p>
    <br/>
    <p style="margin:0;font-weight:700;">Accounts &amp; Billing Division</p>
    <p style="margin:0;">Project Monitoring Department</p>
    <p style="margin:0;">National Informatics Centre Services Inc. (NICSI)</p>
    <p style="margin:0;color:#666;font-size:11px;">An Enterprise of NIC under MeitY, Govt. of India</p>
    <hr style="border:none;border-top:1px solid #e0e8f0;margin:18px 0 10px;"/>
    <p style="font-size:10px;color:#999;margin:0;">This is a system-generated notice from NICSI Project Monitoring System (NPMS).<br/>For verification, please quote Ref No: ${refCode}</p>
  </div>
</div>`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const NoticeModal: React.FC<NoticeModalProps> = ({ open, project, onClose }) => {
  const [step, setStep] = useState<ModalStep>('pick');
  const [selectedType, setSelectedType] = useState<NoticeType | null>(null);
  const [toEmail, setToEmail] = useState(
    // TODO: Replace hardcoded test email with project.staffEmailId (vendor notice)
    // or project.nicCordEmailId (client notice) once confirmed which field to use.
    'lalitrajput1451@gmail.com'
  );
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setStep('pick');
      setSelectedType(null);
      setToEmail('lalitrajput1451@gmail.com'); // TODO: wire to real field
      setIsSending(false);
      setSent(false);
    }
  }, [open]);

  // Escape key closes the modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !project) return null;

  // ── Business logic guards ────────────────────────────────────────────────
  const poAmt       = Number(project.poAmount ?? (project as any).po_amount ?? 0);
  const budget      = Number(project.prjBudgetNo ?? (project as any).prj_budget_no ?? 0);
  const amtReceived = Number(project.amountReceived ?? (project as any).amount_received ?? 0);
  const amtPaid     = Number(project.totalAmountPaid ?? (project as any).total_amount_paid ?? (project as any).amountPaid ?? 0);
  const pendingBills  = Math.max(0, poAmt - amtPaid);
  const pendingFunds  = Math.max(0, budget - amtReceived);
  const clientDisabled = amtReceived >= budget;
  const vendorDisabled = pendingBills <= 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectType = (type: NoticeType) => {
    setSelectedType(type);
    setStep('preview');
  };

  const handleDispatch = async () => {
    if (!selectedType || !project) return;
    setIsSending(true);
    try {
      await api.sendNotice(String(project.headerId), selectedType, toEmail);
      setSent(true);
      toast.success('Notice dispatched', `Email sent to ${toEmail}`);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      toast.error('Dispatch failed', err.message || 'Could not send notice email.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Preview HTML ──────────────────────────────────────────────────────────
  const previewHtml = selectedType === 'vendor_pending_bills'
    ? buildVendorNoticePreview(project)
    : buildClientNoticePreview(project);

  const modalTitle = selectedType === 'vendor_pending_bills'
    ? `Notice: Pending Vendor Bills & Invoice Submission [${project.projectCd}]`
    : `Notice: Release of Pending Project Funds [${project.projectCd}]`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Send Notice"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── STEP 1: Notice Type Picker ───────────────────────────────────── */}
      {step === 'pick' && (
        <div
          ref={dialogRef}
          className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fade-in-up overflow-hidden"
          style={{ zIndex: 51 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-sm font-bold text-on-surface">Send Notice</h2>
                <p className="font-sans text-[10px] text-secondary">{project.projectCd} &nbsp;·&nbsp; {project.customerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3">
            <p className="font-sans text-xs text-secondary">
              Select the notice type to generate and dispatch a system notice for this project.
            </p>

            {/* Notice Type 1 — Vendor Bills */}
            <div className="relative">
              <button
                onClick={() => !vendorDisabled && handleSelectType('vendor_pending_bills')}
                disabled={vendorDisabled}
                className={`w-full text-left border rounded-xl p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  vendorDisabled
                    ? 'border-outline-variant/50 bg-surface-container-low/40 cursor-not-allowed opacity-60'
                    : 'border-outline-variant hover:border-primary hover:bg-primary/5 group'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className={`font-headline text-sm font-bold transition-colors ${vendorDisabled ? 'text-secondary' : 'text-on-surface group-hover:text-primary'}`}>
                      Send Notice to Vendor
                    </p>
                    <p className="font-sans text-xs text-secondary">Pending Bills &amp; Invoice Submission</p>
                    {vendorDisabled ? (
                      <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold text-secondary bg-surface-container rounded-full px-2.5 py-0.5 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        No pending balance
                      </span>
                    ) : (
                      <p className="font-sans text-xs font-semibold text-on-surface mt-2">
                        Balance Pending:{' '}
                        <span className="text-error font-bold">
                          {pendingBills.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    )}
                  </div>
                  {!vendorDisabled && (
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-full border-2 border-outline-variant group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all">
                        <ChevronRightIcon />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Notice Type 2 — Client Funds */}
            <div className="relative">
              <button
                onClick={() => !clientDisabled && handleSelectType('client_pending_funds')}
                disabled={clientDisabled}
                className={`w-full text-left border rounded-xl p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  clientDisabled
                    ? 'border-outline-variant/50 bg-surface-container-low/40 cursor-not-allowed opacity-60'
                    : 'border-outline-variant hover:border-primary hover:bg-primary/5 group'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className={`font-headline text-sm font-bold transition-colors ${clientDisabled ? 'text-secondary' : 'text-on-surface group-hover:text-primary'}`}>
                      Request Govt/Client
                    </p>
                    <p className="font-sans text-xs text-secondary">Pending Funds Release</p>
                    {clientDisabled ? (
                      <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold text-secondary bg-surface-container rounded-full px-2.5 py-0.5 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        No pending funds
                      </span>
                    ) : (
                      <p className="font-sans text-xs font-semibold text-on-surface mt-2">
                        Pending Funds:{' '}
                        <span className="text-warning font-bold" style={{ color: '#d97706' }}>
                          {pendingFunds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    )}
                  </div>
                  {!clientDisabled && (
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-full border-2 border-outline-variant group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all">
                        <ChevronRightIcon />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-outline-variant flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant rounded-lg font-headline text-sm font-semibold text-secondary hover:border-outline hover:text-on-surface hover:bg-surface-container transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview & Send ───────────────────────────────────────── */}
      {step === 'preview' && selectedType && (
        <div
          ref={dialogRef}
          className="relative bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fade-in-up flex flex-col"
          style={{ zIndex: 51, maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low/50 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-headline text-sm font-bold text-on-surface truncate">{modalTitle}</h2>
                <button
                  onClick={() => setStep('pick')}
                  className="font-sans text-[10px] text-primary hover:underline"
                >
                  ← Back to notice type
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors shrink-0 ml-2"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Email input row */}
          <div className="px-6 py-4 border-b border-outline-variant shrink-0">
            <label className="font-headline text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">
              Send To Email
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-sans text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <p className="font-sans text-[10px] text-secondary mt-1">
              {/* TODO: Default to project.staffEmailId (vendor) or project.nicCordEmailId (client) once confirmed */}
              Temporary test address — replace with actual recipient before production use.
            </p>
          </div>

          {/* Scrollable notice preview */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <p className="font-headline text-xs font-bold text-secondary uppercase tracking-wider mb-3">
              Notice Preview
            </p>
            <div
              className="border border-outline-variant rounded-xl overflow-hidden text-sm"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-outline-variant shrink-0 flex items-center justify-between gap-3">
            {sent ? (
              <div className="flex items-center gap-2 text-sm font-headline font-bold text-green-600">
                <CheckCircle className="w-4 h-4" />
                Notice dispatched successfully
              </div>
            ) : (
              <p className="font-sans text-xs text-secondary">
                This notice will be sent from the NICSI NPMS system to the address above.
              </p>
            )}
            <div className="flex gap-3 shrink-0">
              <button
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 border border-outline-variant rounded-lg font-headline text-sm font-semibold text-secondary hover:border-outline hover:text-on-surface hover:bg-surface-container transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={isSending || sent || !toEmail.trim()}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-headline text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Dispatching...</>
                ) : (
                  <><Send className="w-4 h-4" /> Dispatch Email</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Small inline SVG chevron to avoid import overhead
const ChevronRightIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-outline-variant group-hover:text-white transition-colors">
    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
