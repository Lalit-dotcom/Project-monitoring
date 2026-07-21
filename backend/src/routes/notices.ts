import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a number in Indian numbering style with 2 decimal places. */
function fmtINR(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format a Date as "DD Month YYYY", e.g. "13 July 2026". */
function fmtDateLong(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Shared NICSI letterhead HTML header block. */
function letterheadHtml(): string {
  return `
    <div style="background:#1B3E7A;padding:20px 32px;border-radius:6px 6px 0 0;">
      <p style="margin:0;color:#fff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Government of India</p>
      <p style="margin:2px 0;color:#e8eef8;font-size:11px;">Ministry of Electronics &amp; Information Technology</p>
      <h1 style="margin:6px 0 2px;color:#fff;font-size:17px;font-weight:700;letter-spacing:0.5px;">
        National Informatics Centre Services Inc.
      </h1>
      <p style="margin:0;color:#c8d8f0;font-size:10px;">
        Hall No. 2 &amp; 3, 6th Floor, NBCC Tower, 15 Bhikaji Cama Place, New Delhi - 110066<br/>
        Tel: +91-11-22900525 &nbsp;|&nbsp; Email: info-nicsi@nic.in &nbsp;|&nbsp; Website: www.nicsi.com
      </p>
    </div>`;
}

/** Shared signature block HTML. */
function signatureHtml(): string {
  return `
    <p style="margin:24px 0 4px;">Yours faithfully,</p>
    <br/>
    <p style="margin:0;font-weight:700;">Accounts &amp; Billing Division</p>
    <p style="margin:0;">Project Monitoring Department</p>
    <p style="margin:0;">National Informatics Centre Services Inc. (NICSI)</p>
    <p style="margin:0;color:#555;font-size:11px;">An Enterprise of NIC under MeitY, Govt. of India</p>`;
}

/** Shared outer email wrapper HTML. */
function wrapEmail(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#222;background:#f4f6fb;">
  <div style="max-width:700px;margin:32px auto;background:#fff;border:1px solid #d0d8e8;border-radius:8px;overflow:hidden;">
    ${body}
  </div>
</body>
</html>`;
}

/** Table row helper for the financial summary table. */
function tableRow(label: string, value: string, highlight = false): string {
  const bg = highlight ? 'background:#f0f4ff;font-weight:700;' : '';
  return `
    <tr style="${bg}">
      <td style="padding:8px 12px;border:1px solid #c8d4e8;">${label}</td>
      <td style="padding:8px 12px;border:1px solid #c8d4e8;text-align:right;font-family:monospace;">${value}</td>
    </tr>`;
}

// ─── Template builders ───────────────────────────────────────────────────────

function buildVendorNoticeHtml(p: Record<string, any>): string {
  const today = fmtDateLong(new Date());
  const currentYear = new Date().getFullYear();
  const refCode = `NICSI/PMD/${currentYear}/${p.project_cd}/${p.project_cd}`;

  const poAmt     = Number(p.po_amount ?? 0);
  const amtPaid   = Number(p.total_amount_paid ?? 0);
  const balance   = Math.max(0, poAmt - amtPaid);
  const noBills   = Number(p.no_of_exp_invoice ?? 0);
  const noTax     = Number(p.no_of_tax_invoice ?? 0);

  const body = `
    ${letterheadHtml()}
    <div style="padding:28px 32px;">
      <table style="width:100%;font-size:12px;margin-bottom:16px;">
        <tr>
          <td><strong>Ref No:</strong> ${refCode}</td>
          <td style="text-align:right;"><strong>Date:</strong> ${today}</td>
        </tr>
      </table>

      <p style="margin:0 0 4px;"><strong>To,</strong><br/>
      The Vendor Coordinator,<br/>
      <strong>${p.customer_name ?? ''}</strong></p>

      <p style="margin:16px 0 4px;"><strong>Subject:</strong> Urgent Notice for Submission of Pending Expenditure Bills and Tax Invoices</p>
      <p style="margin:0;"><strong>Project Ref:</strong> ${p.project_cd} &nbsp;|&nbsp; <strong>PO No:</strong> As per records</p>

      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;"/>

      <p>Sir/Madam,</p>
      <p>
        This is with reference to the above-mentioned project being executed through NICSI
        under the provisions of GFR 2017 (Rule 194/GeM). It has come to our notice that
        certain expenditure bills and/or tax invoices are still pending submission from
        your end. The financial position of the project as per our records is as follows:
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0 20px;">
        <thead>
          <tr style="background:#1B3E7A;color:#fff;">
            <th style="padding:9px 12px;border:1px solid #1B3E7A;text-align:left;">Particulars</th>
            <th style="padding:9px 12px;border:1px solid #1B3E7A;text-align:right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRow('Total PO Value Allotted', fmtINR(poAmt))}
          ${tableRow('Amount Paid to Vendor', fmtINR(amtPaid))}
          ${tableRow('Balance Pending Payment', fmtINR(balance), true)}
          ${tableRow('Expenditure Bills Received', `${noBills} bill${noBills !== 1 ? 's' : ''}`)}
          ${tableRow('Tax Invoices Raised', `${noTax} invoice${noTax !== 1 ? 's' : ''}`)}
        </tbody>
      </table>

      <p>
        You are hereby requested to submit the outstanding bills/invoices within <strong>7 (seven)
        working days</strong> from the date of receipt of this notice. Failure to comply may result in:
      </p>
      <ol style="padding-left:20px;line-height:2;">
        <li>Delayed processing of pending payments</li>
        <li>Levy of penalty as per the terms of the Purchase Order</li>
        <li>Escalation to the competent authority for appropriate action</li>
      </ol>
      <p>For any clarifications, please contact the NIC Coordinator at the designated email.</p>

      ${signatureHtml()}

      <hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px;"/>
      <p style="font-size:10px;color:#888;margin:0;">
        This is a system-generated notice from NICSI Project Monitoring System (NPMS).<br/>
        For verification, please quote Ref No: ${refCode}
      </p>
    </div>`;

  return wrapEmail(body);
}

function buildClientNoticeHtml(p: Record<string, any>): string {
  const today = fmtDateLong(new Date());
  const currentYear = new Date().getFullYear();
  const refCode = `NICSI/PMD/${currentYear}/${p.project_cd}/${p.project_cd}`;

  const budget       = Number(p.prj_budget_no ?? 0);
  const amtReceived  = Number(p.amount_received ?? 0);
  const pendingFunds = Math.max(0, budget - amtReceived);

  const body = `
    ${letterheadHtml()}
    <div style="padding:28px 32px;">
      <table style="width:100%;font-size:12px;margin-bottom:16px;">
        <tr>
          <td><strong>Ref No:</strong> ${refCode}</td>
          <td style="text-align:right;"><strong>Date:</strong> ${today}</td>
        </tr>
      </table>

      <p style="margin:0 0 4px;"><strong>To,</strong><br/>
      The Nodal Officer / Finance Section,<br/>
      <strong>${p.customer_name ?? ''}</strong></p>

      <p style="margin:16px 0 4px;"><strong>Subject:</strong> Urgent Notice for Release of Pending Project Funds</p>
      <p style="margin:0;"><strong>Project Ref:</strong> ${p.project_cd} &nbsp;|&nbsp; <strong>PO No:</strong> As per records</p>

      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;"/>

      <p>Sir/Madam,</p>
      <p>
        This is with reference to the above-mentioned project being executed through NICSI
        under the provisions of GFR 2017 (Rule 194/GeM). It has come to our notice that
        certain project funds are yet to be released from your end. The financial position
        of the project as per our records is as follows:
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0 20px;">
        <thead>
          <tr style="background:#1B3E7A;color:#fff;">
            <th style="padding:9px 12px;border:1px solid #1B3E7A;text-align:left;">Particulars</th>
            <th style="padding:9px 12px;border:1px solid #1B3E7A;text-align:right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRow('Total Project Sanctioned Budget', fmtINR(budget))}
          ${tableRow('Amount Received from Client', fmtINR(amtReceived))}
          ${tableRow('Pending Funds to be Released', fmtINR(pendingFunds), true)}
        </tbody>
      </table>

      <p>
        You are hereby requested to arrange for the release of the outstanding funds at the
        earliest, and in any case within <strong>7 (seven) working days</strong> from the date
        of receipt of this notice. Failure to release the funds in a timely manner may result in:
      </p>
      <ol style="padding-left:20px;line-height:2;">
        <li>Delay in execution of project deliverables and vendor payments</li>
        <li>Disruption to ongoing services under the Purchase Order</li>
        <li>Escalation to the competent authority for appropriate action</li>
      </ol>
      <p>For any clarifications, please contact the NIC Coordinator at the designated email.</p>

      ${signatureHtml()}

      <hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px;"/>
      <p style="font-size:10px;color:#888;margin:0;">
        This is a system-generated notice from NICSI Project Monitoring System (NPMS).<br/>
        For verification, please quote Ref No: ${refCode}
      </p>
    </div>`;

  return wrapEmail(body);
}

// ─── Route ──────────────────────────────────────────────────────────────────

/**
 * POST /api/notices/send
 * Body: { projectId: string, noticeType: 'vendor_pending_bills' | 'client_pending_funds', toEmail: string }
 *
 * Re-fetches project from DB, builds the HTML email server-side, dispatches via
 * the existing nodemailer/SMTP transporter pattern (same env vars as auth.ts).
 */
router.post('/send', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { projectId, noticeType, toEmail } = req.body;

  if (!projectId || !noticeType || !toEmail) {
    res.status(400).json({ error: 'projectId, noticeType, and toEmail are required' });
    return;
  }
  if (!['vendor_pending_bills', 'client_pending_funds'].includes(noticeType)) {
    res.status(400).json({ error: 'Invalid noticeType' });
    return;
  }

  try {
    // Re-fetch project from DB — do NOT trust client-sent financials.
    // The 'id' passed from the frontend is the header_id (see api.ts getProjectById → p.id).
    const result = await pool.query(
      `SELECT
         header_id,
         project_id,
         project_cd,
         prj_nm,
         customer_name,
         po_amount,
         prj_budget_no,
         amount_received,
         total_amount_paid,
         no_of_exp_invoice,
         no_of_tax_invoice,
         prj_mgr_id
       FROM projects
       WHERE header_id::text = $1 OR project_cd = $1
       LIMIT 1`,
      [projectId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const p = result.rows[0];

    // If user is a project_manager, ensure they own this project
    if (user.role === 'project_manager' && p.prj_mgr_id !== user.prjMgrId) {
      res.status(403).json({ error: 'Forbidden: you do not own this project' });
      return;
    }

    // Validate business logic for client notice
    if (noticeType === 'client_pending_funds') {
      const budget       = Number(p.prj_budget_no ?? 0);
      const amtReceived  = Number(p.amount_received ?? 0);
      if (amtReceived >= budget) {
        res.status(400).json({ error: 'No pending funds — amount received equals or exceeds project budget' });
        return;
      }
    }

    // Build HTML email
    const html = noticeType === 'vendor_pending_bills'
      ? buildVendorNoticeHtml(p)
      : buildClientNoticeHtml(p);

    const subject = noticeType === 'vendor_pending_bills'
      ? `Notice: Pending Vendor Bills & Invoice Submission [${p.project_cd}]`
      : `Notice: Release of Pending Project Funds [${p.project_cd}]`;

    const timestamp = new Date().toISOString();
    console.log(`[NOTICE] type="${noticeType}" project="${p.project_cd}" recipient="${toEmail}" sentBy="${user.username}" ts="${timestamp}"`);

    // Send via SMTP (same pattern as auth.ts)
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"NICSI NPMS" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject,
        html,
      });

      console.log(`[NOTICE] Email dispatched successfully to ${toEmail}`);
    } else {
      // Dev mode: log notice details to console without sending
      console.log(`[DEV MODE] [SIMULATED NOTICE EMAIL] To: ${toEmail} | Subject: ${subject}`);
    }

    res.json({ success: true, message: `Notice dispatched to ${toEmail}` });
  } catch (err: any) {
    console.error('[NOTICE] Send error:', err);
    res.status(500).json({ error: 'Failed to send notice email', detail: err.message });
  }
});

export default router;
