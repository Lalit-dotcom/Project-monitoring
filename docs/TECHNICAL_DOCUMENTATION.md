# NPMS — Technical Documentation

> **Build state**: UAT-ready as of July 2026.  
> This document describes what is **actually built and running**, not the original BRD's aspirational scope. Known gaps are called out explicitly.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [Database Schema](#3-database-schema)
4. [API Endpoint Reference](#4-api-endpoint-reference)
5. [Authentication & Security](#5-authentication--security)
6. [Background Jobs](#6-background-jobs)
7. [Known Gaps & Stubs](#7-known-gaps--stubs)
8. [Deployment & Setup Guide](#8-deployment--setup-guide)

---

## 1. Architecture Overview

NPMS is a **monorepo** web application with a clear three-layer stack:

```
Browser (React SPA)
        │  HTTP/REST + JSON (Bearer JWT)
        ▼
Express API Server (Node.js / TypeScript)
        │  node-postgres (pg)
        ▼
PostgreSQL Database
```

| Layer | Technology | Version |
|---|---|---|
| Frontend | React 18, TypeScript, Vite 8, Tailwind CSS 3, Recharts | React 18.3 |
| Backend | Express 4, TypeScript, tsx (dev), Node.js | Node ≥ 18 |
| Database | PostgreSQL | 14+ recommended |
| Auth | JWT (jsonwebtoken), bcrypt, otplib (TOTP) | — |
| Email | Nodemailer (Gmail SMTP) | — |
| Exports | xlsx (Excel), pdfkit (PDF) | — |
| Scheduler | node-cron | — |

### Request Flow

1. The browser sends `Authorization: Bearer <access_token>` on every API call.
2. The `requireAuth` middleware on the backend verifies the JWT signature.
3. The `scopeToOwnProjects` middleware — applied to all data routes — automatically filters results to only the projects belonging to the authenticated `project_manager`. `superadmin` users see all projects.
4. Route handlers execute parameterised PostgreSQL queries and return JSON.
5. Access tokens expire in **15 minutes**; the frontend silently refreshes via `POST /api/auth/refresh` using an `httpOnly` cookie containing a hashed refresh token.

---

## 2. Repository Structure

```
Project Monitoring/          ← monorepo root
├── backend/
│   ├── src/
│   │   ├── index.ts         ← Express app bootstrap, route mounts, cron
│   │   ├── db.ts            ← pg Pool singleton
│   │   ├── routes/          ← One file per API module
│   │   ├── middleware/
│   │   │   ├── requireAuth.ts        ← JWT verification
│   │   │   └── scopeToOwnProjects.ts ← Per-role data scoping
│   │   ├── lib/
│   │   │   ├── riskFlags.ts     ← Shared SQL helper functions for risk queries
│   │   │   ├── validators.ts    ← Input validation helpers
│   │   │   ├── auditLog.ts      ← Audit log insertion helper
│   │   │   ├── createNotification.ts
│   │   │   ├── reportsHelper.ts
│   │   │   └── pdfTable.ts      ← PDF table rendering utility
│   │   ├── jobs/
│   │   │   └── notificationCheck.ts ← Cron job: risk-flag notifications
│   │   └── types/
│   ├── db/
│   │   ├── schema.sql        ← Base DDL (projects, POs, invoices, bill_desk, tax_invoices)
│   │   ├── run-migrations.ts ← Additive migrations (users, sessions, 2FA, audit_logs, notifications)
│   │   ├── seed.ts           ← ETL: tab-delimited project data → PostgreSQL
│   │   ├── seed-users.ts     ← Seeds superadmin and project_manager users
│   │   └── seed-modules.ts   ← Seeds PO, invoice, bill_desk, tax_invoice data
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            ← One file per page (Dashboard, Projects, ProjectDetail, …)
│   │   ├── components/       ← Shared UI components (Layout, Topbar, Sidebar, CompactStatCard, …)
│   │   ├── context/          ← AuthContext, ThemeContext
│   │   ├── lib/
│   │   │   └── api.ts        ← All fetch wrappers (single source of truth for API calls)
│   │   └── types/index.ts    ← Shared TypeScript interfaces
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docs/                     ← ← You are here
│   ├── TECHNICAL_DOCUMENTATION.md
│   └── USER_MANUAL.md
└── README.md
```

---

## 3. Database Schema

### 3.1 Base Tables (`backend/db/schema.sql`)

#### `projects`
Central entity. One row = one monitored project.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | Internal surrogate key |
| `project_cd` | VARCHAR(20) UNIQUE NOT NULL | Business key, used as FK target by all child tables (e.g. `S250865ZOMH`) |
| `project_id` | BIGINT | ERP source identifier |
| `prj_mgr_id` | INTEGER | FK → `project_managers.prj_mgr_id` |
| `prj_nm` | TEXT | Project name |
| `customer_name` | TEXT | Client organisation name |
| `prj_budget_no` | NUMERIC(15,2) | Contracted budget |
| `amount_received` | NUMERIC(15,2) | Payments received from client |
| `no_of_po` | INTEGER | Denormalised count of purchase orders |
| `po_amount` | NUMERIC(15,2) | Total PO value |
| `no_of_inv_billdesk` | INTEGER | Denormalised bill desk invoice count |
| `no_of_exp_invoice` | INTEGER | Denormalised expense invoice count |
| `total_invoice_amount` | NUMERIC(15,2) | Aggregate invoice value |
| `total_amount_paid` | NUMERIC(15,2) | Aggregate amount paid |
| `no_of_tax_invoice` | INTEGER | Denormalised tax invoice count |
| `total_tax_invoice_amount` | NUMERIC(15,2) | Aggregate tax invoice value |
| `project_abp` | NUMERIC(15,2) | Annual Business Plan amount |
| `created_on` | DATE | Project creation date |
| `cust_id` | BIGINT | Customer identifier |
| `prj_type` | VARCHAR(10) | Project type code |
| `user_email` | TEXT | Primary contact email |
| `hod_email` | TEXT | Head of Department email |
| `nic_cord_emailid` | TEXT | NIC coordinator email |
| `staff_email_id` | TEXT | Staff email |

#### `purchase_orders`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_no` | VARCHAR(20) NOT NULL | FK → `projects.project_cd` |
| `final_po_no` | VARCHAR(30) | PO reference number |
| `vendor_name` | TEXT | Vendor / supplier name |
| `total` | NUMERIC(15,2) | PO value |
| `approval_status` | VARCHAR(30) | e.g. "Approved", "Pending" |
| `valid_from` / `valid_to` | DATE | PO validity window |
| `po_date` | DATE | Issue date |

#### `invoices`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_no` | VARCHAR(20) NOT NULL | FK → `projects.project_cd` |
| `invoice_num` | VARCHAR(30) | Invoice reference |
| `vendor_name` | TEXT | |
| `invoice_amount` | NUMERIC(15,2) | |
| `amount_paid` | NUMERIC(15,2) | |
| `unpaid` | NUMERIC(15,2) | Computed unpaid balance |
| `pen_amt` | NUMERIC(15,2) | Pending/penal amount |
| `final_unpaid` | NUMERIC(15,2) | |
| `objection` | TEXT | Objection remarks |
| `invoice_type` | VARCHAR(30) | |
| `gem_flag` | VARCHAR(10) | GeM marketplace flag |
| `msme_vendor_name` | TEXT | MSME vendor indicator |
| `invoice_date` / `gl_date` | DATE | |

#### `bill_desk`
Internal billing desk records (payment tracking by invoice month).

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_no` | VARCHAR(20) NOT NULL | FK → `projects.project_cd` |
| `invoice_no` | VARCHAR(30) | |
| `invoice_status` | VARCHAR(30) | Processing status |
| `amount_paid` | NUMERIC(15,2) | |
| `invoice_amount` | NUMERIC(15,2) | |
| `bill_month` | VARCHAR(20) | Month identifier |
| `objection_remarks` | TEXT | |
| `status` | VARCHAR(30) | Overall status |

#### `tax_invoices`
GST tax invoices issued to clients.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `project_no` | VARCHAR(20) NOT NULL | FK → `projects.project_cd` |
| `user_bill_no` | VARCHAR(30) | Bill number |
| `bill_status` | VARCHAR(30) | e.g. "Paid", "Pending" |
| `total_amount` | NUMERIC(15,2) | |
| `bill_type` | VARCHAR(30) | |
| `state_description` | VARCHAR(50) | State / UT |
| `irn_no` | TEXT | GST IRN number |
| `bill_date` | DATE | |

#### `project_managers`
| Column | Type | Notes |
|---|---|---|
| `prj_mgr_id` | INTEGER PK | |
| `prj_mgr_name` | TEXT | |
| `email` | TEXT | Added via migration |
| `source` | TEXT | `'erp_synced'` for ERP-imported records |

#### `pm_project_type_summary`
Aggregated project count by type per manager. Read-only reference data.

---

### 3.2 Auth & Session Tables (added by `run-migrations.ts`)

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `username` | TEXT UNIQUE | Login identifier |
| `password_hash` | TEXT | bcrypt hash (cost 10) |
| `role` | TEXT | `'superadmin'` or `'project_manager'` |
| `prj_mgr_id` | INTEGER | FK → `project_managers`. NULL for superadmin |
| `email` | TEXT | For password reset OTPs |
| `totp_secret` | TEXT | Active TOTP secret (null if 2FA disabled) |
| `totp_temp_secret` | TEXT | Staging secret during setup flow |
| `totp_enabled` | BOOLEAN | 2FA active flag |
| `totp_backup_codes` | TEXT[] | Array of one-time backup codes |

#### `sessions`
Tracks active refresh tokens (one per device/browser session).

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INTEGER FK → users | |
| `refresh_token_hash` | TEXT | SHA-256 hash of the refresh token cookie |
| `previous_token_hash` | TEXT | Supports single-rotation grace window |
| `device_label` | TEXT | Parsed from User-Agent |
| `ip_address` | TEXT | |
| `revoked` | BOOLEAN | Soft-delete flag |
| `last_active_at` | TIMESTAMP | Updated on each refresh |

#### `password_reset_otps`
Stores 6-digit OTPs for the email-based forgot-password flow.

#### `audit_logs`
Immutable log of authentication events and admin actions.

| Column | Notes |
|---|---|
| `category` | `LOGIN`, `LOGOUT`, `USER_ACTIVITY`, `SYNC`, `REPORT_DOWNLOAD`, `ADMIN_CHANGE` |
| `action` | Granular action label (e.g. `LOGIN_SUCCESS`, `TOKEN_REFRESH`) |
| `status` | `SUCCESS` or `FAILURE` |
| `details` | JSONB — additional context (IP, lock reason, etc.) |

#### `notifications`
| Column | Notes |
|---|---|
| `category` | `RISK_FLAG`, `SECURITY`, `ADMIN` |
| `severity` | `INFO`, `WARNING`, `CRITICAL` |
| `dedup_key` | Unique constraint prevents duplicate active alerts |
| `project_no` | FK → projects |
| `target_user_id` | FK → users |

#### `notification_reads`
Junction table tracking which users have read which notifications.

---

## 4. API Endpoint Reference

All data endpoints require `Authorization: Bearer <access_token>`.  
Base URL: `http://localhost:4000`

---

### 4.1 Authentication — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Username + password login. Returns access token + sets refresh cookie. Returns `mfaRequired: true` for 2FA-enrolled superadmins. |
| POST | `/api/auth/2fa/verify` | None | Verify TOTP code after MFA challenge. Issues full session. |
| POST | `/api/auth/refresh` | Cookie | Silently refresh access token using httpOnly refresh cookie. |
| POST | `/api/auth/logout` | Cookie | Revoke current session's refresh token. |
| POST | `/api/auth/forgot-password` | None | Send OTP to registered email. |
| POST | `/api/auth/verify-otp` | None | Validate OTP + issue short-lived reset JWT. |
| POST | `/api/auth/reset-password` | Reset JWT | Set new password using reset token. |
| GET | `/api/auth/sessions` | Bearer | List all active sessions for the current user. |
| DELETE | `/api/auth/sessions/:id` | Bearer | Revoke a specific session by ID. |
| DELETE | `/api/auth/sessions/others` | Bearer | Revoke all sessions except the current one. |
| POST | `/api/auth/2fa/setup` | Bearer | Generate a TOTP secret + QR code for setup. |
| POST | `/api/auth/2fa/confirm` | Bearer | Confirm TOTP code to activate 2FA; returns backup codes. |
| POST | `/api/auth/2fa/disable` | Bearer | Disable 2FA with password + TOTP verification. |
| GET | `/api/auth/2fa/status` | Bearer | Return current 2FA enabled status. |
| GET | `/api/auth/users` | Bearer (superadmin only) | List all application users. |

---

### 4.2 Projects — `/api/projects`

All routes require `requireAuth` + `scopeToOwnProjects`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List projects with full filter/sort/pagination support. Query params: `search`, `customer`, `type`, `manager`, `paymentStatus`, `sortBy`, `sortOrder`, `page`, `limit`, `minBudget`, `maxBudget`, etc. |
| GET | `/api/projects/summary` | Aggregate totals: total budget, total received, total paid, project count. |
| GET | `/api/projects/types` | Distinct project type values for filter dropdowns. |
| GET | `/api/projects/customers` | Distinct customer names for filter dropdowns. |
| GET | `/api/projects/managers` | Distinct project manager names for filter dropdowns. |
| GET | `/api/projects/check-unique/:projectCd` | Check whether a project code exists (used for validation). |
| GET | `/api/projects/:projectCd` | Fetch a single project by project code. |
| POST | `/api/projects/create-with-chain` | Create a project together with optional child PO/invoice records. |

---

### 4.3 Purchase Orders — `/api/purchase-orders`

| Method | Path | Description |
|---|---|---|
| GET | `/api/purchase-orders` | List POs with filter/sort support. Params: `search`, `projectNo`, `status`, `vendorName`, `minTotal`, `maxTotal`, `validFrom`, `validTo`, `sortBy`, `sortOrder`. |
| GET | `/api/purchase-orders/statuses` | Distinct `approval_status` values for filter dropdowns. |

---

### 4.4 Invoices — `/api/invoices`

| Method | Path | Description |
|---|---|---|
| GET | `/api/invoices` | List invoices with filter/sort support. Params: `search`, `projectNo`, `type`, `vendorName`, `hasObjection`, `isGem`, `isMsme`, `minAmount`, `maxAmount`, `startDate`, `endDate`, `sortBy`, `sortOrder`. |
| GET | `/api/invoices/types` | Distinct `invoice_type` values for dropdowns. |
| GET | `/api/invoices/exists` | Check whether invoices exist for a given `projectNo`. |

---

### 4.5 Bill Desk — `/api/bill-desk`

| Method | Path | Description |
|---|---|---|
| GET | `/api/bill-desk` | List bill desk records with filter/sort support. Params: `search`, `projectNo`, `status`, `invoiceStatus`, `vendorName`, `minAmount`, `maxAmount`, `startDate`, `endDate`, `sortBy`, `sortOrder`. |
| GET | `/api/bill-desk/statuses` | Distinct `invoice_status` values for dropdowns. |

---

### 4.6 Tax Invoices — `/api/tax-invoices`

| Method | Path | Description |
|---|---|---|
| GET | `/api/tax-invoices` | List tax invoices with filter/sort support. Params: `search`, `projectNo`, `billStatus`, `billType`, `state`, `minAmount`, `maxAmount`, `startDate`, `endDate`, `sortBy`, `sortOrder`. |
| GET | `/api/tax-invoices/bill-types` | Distinct `bill_type` values for dropdowns. |
| GET | `/api/tax-invoices/states` | Distinct `state_description` values for dropdowns. |

---

### 4.7 Dashboard — `/api/dashboard`

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Five KPI metrics: total projects, budget, received, paid, at-risk count. Accepts `prjMgrId` query param. |
| GET | `/api/dashboard/charts` | Payment status distribution (Fully Paid / Partially Paid / No Invoices). |
| GET | `/api/dashboard/project-comparison` | Bar chart data: per-project budget vs received vs paid. Accepts `prjMgrId`. |
| GET | `/api/dashboard/risks/projects` | Project risk breakdown by type (`vendorOverpaid`, `billingAhead`, `stalled`). |
| GET | `/api/dashboard/risks/purchase-orders` | PO risk breakdown (`expiringSoon`, `expiredUncollected`, `stalled`). |
| GET | `/api/dashboard/risks/invoices` | Invoice risk breakdown (`overdueUnpaid`, `disputedUnpaid`). |
| GET | `/api/dashboard/problem-projects` | List of projects with ≥1 active risk flag. |
| GET | `/api/dashboard/overdue-invoices` | Top 10 invoices with the largest unpaid balance. |
| GET | `/api/dashboard/expired-pos` | Top 10 expired POs with the largest uncollected gap. |

---

### 4.8 Reports — `/api/reports`

| Method | Path | Description |
|---|---|---|
| GET | `/api/reports/filters` | Available filter options (managers, project types, customers, states, bill statuses). |
| GET | `/api/reports/:type` | Tabular report data. `:type` values: `projects`, `purchase-orders`, `invoices`, `payment-status`, `tax-invoices`, `bill-desk`, `customers`, `managers`. Supports full server-side filter, sort, and pagination. |

---

### 4.9 Exports — `/api/exports`

All export routes stream a file download directly. Auth required.

| Method | Path | Output |
|---|---|---|
| GET | `/api/exports/project/:code/excel` | Single-project Excel workbook (5 sheets: Overview, POs, Invoices, Bill Desk, Tax Invoices) |
| GET | `/api/exports/project/:code/pdf` | Single-project PDF report |
| GET | `/api/exports/projects/excel` | Projects list Excel (respects active filters via query params) |
| GET | `/api/exports/projects/pdf` | Projects list PDF |
| GET | `/api/exports/purchase-orders/excel` | Purchase Orders Excel |
| GET | `/api/exports/purchase-orders/pdf` | Purchase Orders PDF |
| GET | `/api/exports/invoices/excel` | Invoices Excel |
| GET | `/api/exports/invoices/pdf` | Invoices PDF |
| GET | `/api/exports/bill-desk/excel` | Bill Desk Excel |
| GET | `/api/exports/bill-desk/pdf` | Bill Desk PDF |
| GET | `/api/exports/tax-invoices/excel` | Tax Invoices Excel |
| GET | `/api/exports/tax-invoices/pdf` | Tax Invoices PDF |
| GET | `/api/exports/dashboard/pdf` | Dashboard summary PDF |
| GET | `/api/exports/reports/:type/excel` | Report Excel (`:type` matches report endpoint) |
| GET | `/api/exports/reports/:type/csv` | Report CSV |
| GET | `/api/exports/reports/:type/pdf` | Report PDF |

---

### 4.10 Managers — `/api/managers`

| Method | Path | Description |
|---|---|---|
| GET | `/api/managers` | List project managers (superadmin only). |
| POST | `/api/managers` | Add a new project manager record. |

---

### 4.11 Notifications — `/api/notifications`

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | List notifications for the current user (unread first). |
| POST | `/api/notifications/:id/read` | Mark a notification as read. |
| POST | `/api/notifications/read-all` | Mark all notifications as read. |

---

### 4.12 Notices — `/api/notices`

| Method | Path | Description |
|---|---|---|
| POST | `/api/notices/send` | Send a notice email (used internally for alerts). Requires auth. |

---

### 4.13 Audit Logs — `/api/audit-logs`

| Method | Path | Description |
|---|---|---|
| GET | `/api/audit-logs` | List audit log entries. Superadmin only. Supports filter by category, username, date range. |

---

### 4.14 PM Summary — `/api/pm-summary`

| Method | Path | Description |
|---|---|---|
| GET | `/api/pm-summary` | Aggregated project-type counts per project manager. |

---

### 4.15 Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Returns `{ status: "ok" }` |

---

## 5. Authentication & Security

### 5.1 Token Model

```
Login → access_token (JWT, 15 min) + httpOnly cookie (refresh_token, 7 days)
         │
         └─ All API calls: Authorization: Bearer <access_token>
         │
         └─ Silent refresh: POST /api/auth/refresh (cookie) → new access_token
```

- **Access token payload**: `{ userId, username, role, prjMgrId }`
- **Refresh tokens** are stored only as a SHA-256 hash in the `sessions` table (raw token lives only in the browser cookie).
- **Token rotation**: each `/refresh` call issues a new refresh token. The old hash is retained for a single-rotation grace window (`previous_token_hash`) to handle race conditions.

### 5.2 Password Security

- Passwords are hashed with **bcrypt** at cost factor 10.
- Password reset uses a **6-digit OTP** sent to the user's registered email (Nodemailer / Gmail SMTP), valid for 10 minutes with a **5-attempt limit** before the OTP is invalidated.

### 5.3 Two-Factor Authentication (TOTP)

- Available exclusively for `superadmin` role accounts.
- Uses **TOTP** (Time-based One-Time Passwords) per RFC 6238, implemented with `otplib`.
- **Setup flow**: `POST /2fa/setup` generates a new secret + QR code URI → user scans with authenticator app → `POST /2fa/confirm` verifies code → activates 2FA and returns 8 backup codes.
- A `totp_temp_secret` column holds the in-progress secret until confirmed, preventing duplicate secret generation on page refresh.
- **Disable flow**: requires valid TOTP code + current password to prevent lockout attacks.

### 5.4 Login Rate Limiting & Lockout

- In-memory `failedAttempts` map tracks failed login attempts per username.
- After **5 consecutive failures**, the account is locked for **15 minutes**.
- Lockout is server-process scoped (in-memory). A server restart resets counters — acceptable for current single-instance deployment but should be moved to Redis/DB for multi-instance production.

### 5.5 Data Scoping (`scopeToOwnProjects`)

- The `scopeToOwnProjects` middleware runs on all data routes.
- If `role === 'project_manager'`, it injects a `prjMgrId` filter so the user only sees their own projects.
- If `role === 'superadmin'`, the filter is bypassed and all data is visible.

### 5.6 CORS

Allowed origins are explicitly whitelisted: `localhost:5173`, `5174`, `5175`. Wildcard CORS is disabled.

### 5.7 Audit Logging

Every authentication event (login success/failure, token refresh, logout, lockout, 2FA changes) is written to the `audit_logs` table with timestamp, IP address, username, category, action, and a JSONB details payload.

---

## 6. Background Jobs

A **node-cron** job runs at startup and every **30 minutes**:

- **`notificationCheck.ts`**: Queries `riskFlags.ts` helper functions to detect:
  - Vendor overpaid projects
  - Billing-ahead-of-PO projects
  - Stalled projects (no activity)
  - POs expiring within 30 days
  - Expired POs with uncollected amounts
  - Overdue unpaid invoices
  - Disputed invoices
- For each new risk found, inserts a de-duplicated `notification` row (keyed by `dedup_key`). Existing unresolved notifications are not duplicated.
- Notifications are displayed in the frontend's **Notifications** page and the bell icon badge count in the top bar.

---

## 7. Known Gaps & Stubs

| Feature | Status | Notes |
|---|---|---|
| **Oracle ERP Live Sync** | ❌ Not implemented | Data is loaded via a one-time Excel/tab-delimited import using `db/seed.ts` and `db/seed-modules.ts`. No live Oracle connection exists. |
| **AI Assistant** | ⚠️ Stub only | `frontend/src/pages/AI.tsx` renders a "Coming Soon" placeholder. No backend AI endpoint exists. |
| **Bhashini Translation Widget** | ⚠️ Prepared, pending approval | The frontend scaffolds the Bhashini widget DOM container in `Topbar.tsx` and `Layout.tsx`, and numeric/code cells are marked `bhashini-skip-translation`. The widget itself requires NIC domain approval to activate. The feature will work once the external script is served from an approved domain. |
| **Login lockout persistence** | ⚠️ In-memory only | Rate limiting resets on server restart. Safe for single-instance deployment; not suitable for clustered/multi-process deployment. |
| **Write-back to ERP** | ❌ Not implemented | NPMS is read-only relative to the ERP system. No update/write endpoints push changes back to Oracle. |
| **Managers Page (`/managers`)** | ⚠️ Superadmin only | Lists project managers; allows adding new managers via `POST /api/managers`. Visible only in the superadmin sidebar. |

---

## 8. Deployment & Setup Guide

> The canonical setup steps are in **[README.md](../README.md)**. This section expands on production considerations.

### 8.1 Prerequisites

- Node.js **v18 or later**
- PostgreSQL **14 or later**
- An SMTP-capable email account (Gmail with App Password recommended)

### 8.2 Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory and configure:

```env
PORT=4000
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<dbname>

# SMTP (for OTP password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="NPMS <your-email@gmail.com>"

# JWT
JWT_SECRET=<long-random-secret-min-32-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

> ⚠️ **IMPORTANT**: Change `JWT_SECRET` from the placeholder before deploying. Use a random string of at least 32 characters.

### 8.3 Database Initialisation

```bash
# 1. Apply base schema
psql $DATABASE_URL -f backend/db/schema.sql

# 2. Run additive migrations (users, sessions, 2FA, audit_logs, notifications)
cd backend && npx tsx db/run-migrations.ts

# 3. Seed project data
npx tsx db/seed.ts

# 4. Seed PO / invoice / bill desk / tax invoice data
npx tsx db/seed-modules.ts

# 5. Seed application users (superadmin + project_manager)
npx tsx db/seed-users.ts
```

### 8.4 Running in Development

```bash
# Terminal 1 — Backend
cd backend && npm run dev    # http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm run dev   # http://localhost:5173
```

### 8.5 Production Build

```bash
# Backend (compile TypeScript to dist/)
cd backend && npm run build && node dist/index.js

# Frontend (build static bundle)
cd frontend && npm run build
# Serve dist/ with nginx, Caddy, or any static host
```

### 8.6 Default Credentials (post-seed)

| Username | Password | Role |
|---|---|---|
| `lalit` | `lalit@123` | superadmin |
| `atul` | `123` | project_manager |

> 🔴 **Change these immediately** in any shared or production environment.

### 8.7 CORS for Production

Update the `allowedOrigins` array in `backend/src/index.ts` to include your production frontend domain before deploying.
