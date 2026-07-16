# NPMS — User Manual

**NICSI Project Monitoring System (NPMS)**  
Version: UAT Build — July 2026

---

## Table of Contents

1. [Getting Started — Logging In](#1-getting-started--logging-in)
   - 1.1 [Standard Login](#11-standard-login)
   - 1.2 [Two-Factor Authentication (2FA)](#12-two-factor-authentication-2fa)
   - 1.3 [Forgot Password](#13-forgot-password)
   - 1.4 [Account Lockout](#14-account-lockout)
2. [Application Layout](#2-application-layout)
3. [Dashboard](#3-dashboard)
   - 3.1 [KPI Summary Cards](#31-kpi-summary-cards)
   - 3.2 [Payment Status Chart](#32-payment-status-chart)
   - 3.3 [Chart Card — Project Comparison & Risk Views](#33-chart-card--project-comparison--risk-views)
   - 3.4 [Projects with Problems](#34-projects-with-problems)
   - 3.5 [Top Overdue Invoices](#35-top-overdue-invoices)
   - 3.6 [Expired Purchase Orders](#36-expired-purchase-orders)
4. [Projects Page](#4-projects-page)
   - 4.1 [Searching and Filtering](#41-searching-and-filtering)
   - 4.2 [Sorting](#42-sorting)
   - 4.3 [Table View vs Card View](#43-table-view-vs-card-view)
   - 4.4 [Downloading the Projects List](#44-downloading-the-projects-list)
5. [Project Detail Page](#5-project-detail-page)
   - 5.1 [Header & KPI Cards](#51-header--kpi-cards)
   - 5.2 [Overview Tab](#52-overview-tab)
   - 5.3 [Purchase Orders Tab](#53-purchase-orders-tab)
   - 5.4 [Invoices Tab](#54-invoices-tab)
   - 5.5 [Tax Invoices Tab](#55-tax-invoices-tab)
   - 5.6 [Bill Desk Tab](#56-bill-desk-tab)
   - 5.7 [Downloading a Single Project](#57-downloading-a-single-project)
6. [Purchase Orders Page](#6-purchase-orders-page)
7. [Invoices Page](#7-invoices-page)
8. [Bill Desk Page](#8-bill-desk-page)
9. [Tax Invoices Page](#9-tax-invoices-page)
10. [Reports Page](#10-reports-page)
11. [Notifications](#11-notifications)
12. [Administration (Admin Users Only)](#12-administration-admin-users-only)
    - 12.1 [Users & Members](#121-users--members)
    - 12.2 [Roles & Permissions](#122-roles--permissions)
    - 12.3 [Audit Logs](#123-audit-logs)
    - 12.4 [Security Settings (2FA Setup)](#124-security-settings-2fa-setup)
13. [Settings (My Account)](#13-settings-my-account)
14. [Known Limitations](#14-known-limitations)

---

## 1. Getting Started — Logging In

Open the application in your browser. You will see the NPMS login page — a two-panel screen with the NICSI logo on the left and a login form on the right.

### 1.1 Standard Login

1. Enter your **Username** in the first field.
2. Enter your **Password** in the second field. You can click the eye icon on the right of the password field to toggle visibility.
3. Click **Sign In**.

If your credentials are correct and your account does not have Two-Factor Authentication enabled, you will be taken directly to the **Dashboard**.

> **Which role am I?**  
> - **Project Manager** — You see only the projects assigned to you.  
> - **Super Admin** — You see all projects and have access to Administration features.

---

### 1.2 Two-Factor Authentication (2FA)

If your account has 2FA enabled (currently available to Super Admins only), after entering your username and password you will be redirected to a second screen:

1. Open your authenticator app (Google Authenticator, Microsoft Authenticator, or any TOTP-compatible app).
2. Find the **NPMS** entry and copy the current 6-digit code.
3. Enter the code in the verification box and click **Verify**.
4. If you do not have access to your authenticator app, click **Use backup code** and enter one of the 8 one-time backup codes you saved when you set up 2FA.

The 6-digit code changes every 30 seconds — enter it promptly.

---

### 1.3 Forgot Password

1. On the login screen, click **Forgot password?**
2. Enter your **Username** and click **Send Reset Code**.
3. A 6-digit OTP (One-Time Password) will be emailed to the address registered to your account. Check your inbox (and spam folder).
4. Enter the OTP on the next screen. You have **5 attempts** and **10 minutes** before the code expires.
5. Once the OTP is accepted, you will be prompted to enter and confirm your **new password**.
6. Click **Reset Password**. You will be redirected to the login page.

> If you do not receive the email, contact your system administrator to verify that your email address is registered correctly.

---

### 1.4 Account Lockout

After **5 consecutive failed login attempts**, your account is temporarily locked for **15 minutes**. The screen will display a message indicating you are locked out and should try again later. No action is needed — the lock clears automatically after the timeout period.

---

## 2. Application Layout

Once logged in, the application has three persistent navigation elements:

**Sidebar (left)** — The main navigation menu. Contains links to:
- Dashboard
- Projects
- Purchase Orders
- Invoices
- Bill Desk
- Tax Invoices
- Reports
- Notifications
- Administration *(Super Admins only)*
- Managers *(Super Admins only)*

The sidebar can be collapsed to a narrow icon-only rail by clicking the collapse button at the bottom. Click it again to expand.

**Top Bar (top)** — Contains:
- A global **Search bar** — typing here filters data on whichever page you are currently viewing.
- A **Bell icon** — shows the count of unread notifications. Click to jump to the Notifications page.
- A **Light/Dark mode toggle** — switch between light and dark themes.
- Your **user avatar** — click to access your account settings or log out.
- A **Bhashini translation widget** placeholder (currently inactive — pending NIC domain approval).

**Back button** — On all pages except the Dashboard, a "Back" button in the top-left area takes you to the previous page in your browser history, or to the Dashboard if there is no history.

---

## 3. Dashboard

The Dashboard is the home page of NPMS. It provides a real-time financial health summary of your portfolio.

---

### 3.1 KPI Summary Cards

Five large coloured cards at the top of the page show your most important headline numbers:

| Card | Colour | What it shows |
|---|---|---|
| **Total Projects** | Blue | Number of projects in your portfolio |
| **Total Budget** | Lavender | Sum of all contracted project budgets (₹) |
| **Amount Received** | Teal | Total payments received from clients (₹) |
| **Amount Paid** | Green | Total payments made to vendors (₹) |
| **At-Risk Projects** | Red | Number of projects with at least one active risk flag |

Clicking the **At-Risk Projects** card scrolls the page down to the **Projects with Problems** section.

Each card also shows a small descriptive sub-line (e.g. "Across all managed projects").

---

### 3.2 Payment Status Chart

A doughnut/pie chart showing what proportion of your projects fall into each payment category:

- **Fully Paid** — Total amount paid equals or exceeds total invoice amount.
- **Partially Paid** — Some invoices exist but are not fully settled.
- **No Invoices Yet** — No invoices have been raised against this project.

Hover over a segment to see the exact count and percentage.

---

### 3.3 Chart Card — Project Comparison & Risk Views

A large card containing an interactive bar chart. You can switch between four views using the **Select Graph** dropdown:

| View | What it shows |
|---|---|
| **Project Comparison** | Side-by-side bars for Budget, Received, and Paid per project. Useful for spotting projects where spend is close to or over budget. |
| **Project Risks** | Risk breakdown per project. Choose sub-type: Vendor Overpaid / Billing Ahead / Stalled. |
| **PO Risks** | Purchase order risk breakdown. Choose sub-type: Expiring Soon / Expired & Uncollected / Stalled PO. |
| **Invoice Risks** | Invoice risk breakdown. Choose sub-type: Overdue Unpaid / Disputed Unpaid. |

**Reading the chart:**
- The horizontal axis shows project or vendor names.
- The vertical axis shows amounts (₹) or counts depending on the view.
- Risk charts use a **red bar** (at-risk value) and a **pale green bar** (reference/neutral value).
- A **legend** in the top-right corner of the card explains what each colour represents.
- The chart scrolls horizontally if there are many projects — scroll inside the chart area to see all bars.
- If there are very few data points (e.g. 1–3 projects), the chart width adjusts to the content so bars are not artificially stretched.

---

### 3.4 Projects with Problems

A list below the chart showing every project that has at least one flagged risk. For each project you can see:
- Project name and code
- Which risk types are flagged (e.g. "Vendor Overpaid", "Stalled")
- A summary of the financial values involved

Clicking a project row navigates to that project's **Project Detail** page.

---

### 3.5 Top Overdue Invoices

A compact list of the **top 10** invoices with the largest outstanding unpaid balance. Shows invoice number, project name, vendor, total amount, and unpaid amount. Clicking a row navigates to the full Invoices page pre-filtered to that project.

---

### 3.6 Expired Purchase Orders

A compact list of the **top 10** purchase orders that have passed their validity date but still have an uncollected amount gap (PO total minus amount received). Shows PO number, project, vendor, total, amount received, and days since expiry.

---

## 4. Projects Page

Click **Projects** in the sidebar to see the full list of projects in your portfolio.

---

### 4.1 Searching and Filtering

**Search bar** — The global search bar at the top of the page (also accessible from the top bar) searches across project codes, customer names, and project names in real time as you type. There is a small delay of ~300ms before the search fires to avoid excessive requests while you are still typing.

**Filter button** — Click the funnel/filter icon to open a filter drawer. Available filters include:
- **Customer** — Select a specific client organisation.
- **Project Type** — Filter by project type code.
- **Project Manager** — Filter by the assigned PM *(Super Admins only — Project Managers always see only their own projects)*.
- **Payment Status** — Fully Paid / Partially Paid / No Invoices Yet.
- **Budget Range** — Set minimum and maximum budget values.
- **Date Range** — Filter by project creation date.

Active filters appear as **chips** (small tags) below the search bar. Click the × on any chip to remove that individual filter. Click **Clear Filters** to remove all filters at once.

---

### 4.2 Sorting

In **Table View**, click any column header to sort by that column. The first click sorts ascending (▲), the second click sorts descending (▼), and the third click removes the sort.

---

### 4.3 Table View vs Card View

Toggle between layouts using the **Table / Card** view buttons in the top-right toolbar:

**Table View** — A spreadsheet-style layout. The **Project Code** column is sticky — it stays visible on the left side even when you scroll right through the many financial columns. Columns include Project Code, Customer Name, Budget, Project ABP, PO Amount, Amount Received, Payment Status, PM Name *(superadmin only)*, Number of POs, Number of Invoices, Total Invoice Amount, Total Amount Paid, Number of Tax Invoices, Total Tax Invoice Amount, and Created Date.

**Card View** — A grid of project cards. Each card shows the project code, customer name, payment status badge, budget, PO amount, amount received, and a mini progress indicator.

Click anywhere on a row (Table View) or card (Card View) to navigate to that project's **Project Detail** page.

---

### 4.4 Downloading the Projects List

Click the **Download** button in the toolbar (a downward arrow icon). A small popover appears with two options:
- **Excel (.xlsx)** — Downloads the current filtered list as a spreadsheet.
- **PDF** — Downloads the current filtered list as a printable PDF summary.

The export respects your current active filters and sort order.

---

## 5. Project Detail Page

Click any project row or card to open the Project Detail page. The URL will update to `/projects/<PROJECT_CODE>`.

---

### 5.1 Header & KPI Cards

At the top of the page you will see:
- The **project code** and **customer name** as a breadcrumb header.
- **Four compact stat cards** showing: Contract Budget, PO Amount, Amount Received, and Amount Paid.
- A small **activity timeline** on the right side, derived from the dates on the project's POs, invoices, and tax invoices.
- A **Download** button (top-right) to export the full project record.

---

### 5.2 Overview Tab

The first tab. Shows a two-column layout:
- **Left**: A detailed information table listing all project metadata fields — Project Name, Customer, Project Type, Budget, ABP, Amount Received, Created Date, and contact emails (User Email, HOD Email, NIC Coordinator Email, Staff Email).
- **Right**: A **financial bar chart** comparing Budget vs PO Amount vs Amount Received vs Amount Paid for this project, and a **Payment Status** doughnut showing the breakdown of bill desk invoice statuses (Paid / Pending / In Progress / etc.).

---

### 5.3 Purchase Orders Tab

Click the **Purchase Orders** tab to see all POs linked to this project in a table:

| Column | Description |
|---|---|
| PO Number | The purchase order reference |
| Vendor | Vendor/supplier name |
| PO Date | Date the PO was issued |
| Valid From / Valid To | The PO's validity window |
| PO Total | Total value of the PO |
| Status | Approval status (Approved, Pending, etc.) |

If the project has no purchase orders, an empty state message is displayed.

---

### 5.4 Invoices Tab

Shows all invoices linked to this project:

| Column | Description |
|---|---|
| Invoice # | Invoice reference number |
| Vendor | Vendor name |
| Invoice Date | Date on the invoice |
| Invoice Amount | Total billed value |
| Pending Amount | Amount still awaiting payment |
| Type | Invoice type classification |
| Objection | Objection remarks (if any) |

---

### 5.5 Tax Invoices Tab

Shows all GST tax invoices issued to the client for this project:

| Column | Description |
|---|---|
| Bill No | Tax invoice / bill number |
| Bill Date | Date of the tax invoice |
| PO Reference | Linked PO number |
| Total Amount | Invoice total |
| Bill Status | Payment status |
| Bill Type | Classification |

---

### 5.6 Bill Desk Tab

Shows the internal billing desk records for this project — these are payment-tracking records managed by the finance desk:

| Column | Description |
|---|---|
| Invoice No | Internal invoice reference |
| Bill Month | Billing period month |
| Vendor | Vendor name |
| Invoice Amount | Amount billed |
| Amount Paid | Amount settled |
| Status | Overall billing status |
| Invoice Status | Processing status |

---

### 5.7 Downloading a Single Project

Click the **Download** button in the page header. Choose:
- **Excel** — A multi-sheet workbook containing the project Overview, Purchase Orders, Invoices, Bill Desk, and Tax Invoices all in one file.
- **PDF** — A formatted report with a header block and financial tables for all sections.

---

## 6. Purchase Orders Page

Click **Purchase Orders** in the sidebar to see all purchase orders across your portfolio (or just your projects if you are a Project Manager).

**Filters available:**
- Search (PO number, vendor name, project code)
- Project — filter by a specific project
- Approval Status — filter by PO status
- Vendor Name
- Total Range (minimum and maximum PO value)
- Validity date range (Valid From / Valid To)

**Table columns:**
PO Number (sticky column), Project Code, Vendor Name, PO Date, Valid From, Valid To, PO Total, Approval Status.

Click the **Download** button in the toolbar to export the current filtered list as Excel or PDF.

Clicking a row's project code link navigates to that project's detail page with the **Purchase Orders** tab active.

---

## 7. Invoices Page

Click **Invoices** in the sidebar to see all invoices across your portfolio.

**Filters available:**
- Search (invoice number, vendor name, project code)
- Project — filter by a specific project
- Invoice Type
- Vendor Name
- Has Objection — show only invoices with objection remarks
- GeM Invoice — filter by GeM marketplace flag
- MSME Vendor — filter by MSME vendor flag
- Amount Range
- Date range (Invoice Date)

**Table columns:**
Invoice # (sticky column), Project Code, Vendor Name, Invoice Date, Invoice Amount, Amount Paid, Unpaid Amount, Pending Amount, Type, Objection.

**Colour coding in Unpaid/Pending columns:** Red text indicates an outstanding balance; green or neutral indicates fully settled.

Click the **Download** button to export as Excel or PDF.

---

## 8. Bill Desk Page

Click **Bill Desk** in the sidebar to see all internal billing desk records.

**Filters available:**
- Search (invoice number, project code)
- Project
- Invoice Status
- Overall Status
- Vendor Name
- Amount Range
- Date Range

**Table columns:**
Invoice No (sticky), Project Code, Bill Month, Vendor Name, Invoice Amount, Amount Paid, Invoice Status, Status, Objection Remarks.

Click the **Download** button to export.

---

## 9. Tax Invoices Page

Click **Tax Invoices** in the sidebar to see all GST tax invoices.

**Filters available:**
- Search (bill number, project code)
- Project
- Bill Status
- Bill Type
- State / UT
- Amount Range
- Date Range (Bill Date)

**Table columns:**
Bill No (sticky), Project Code, Bill Date, PO Reference, Total Amount, Bill Status, Bill Type, State, IRN Number.

Click the **Download** button to export.

---

## 10. Reports Page

Click **Reports** in the sidebar. Reports give you pre-formatted analytical views across your data, designed for review and sharing.

**Selecting a report type:**
Use the tabs or dropdown at the top to choose a report type:

| Report | What it shows |
|---|---|
| **Projects** | Full financial summary per project |
| **Purchase Orders** | PO register with vendor and validity details |
| **Invoices** | Expense invoice register with unpaid analysis |
| **Payment Status** | Projects grouped by payment status bucket |
| **Tax Invoices** | GST tax invoice register |
| **Bill Desk** | Internal billing desk records |
| **Customers** | Financial totals aggregated by customer organisation |
| **Managers** | Project counts and totals aggregated by project manager |

**Filtering reports:**
Each report has its own filter panel with options relevant to that report type (project, manager, date range, status, etc.). Filters applied here affect both the table display and the exported file.

**Sorting:**
Click any column header in the report table to sort ascending or descending.

**Sticky first column:**
The first column (Project Code / PO Number / Invoice # / etc.) remains fixed while you scroll horizontally.

**Exporting:**
Click the **Download** button to export the current report as **Excel**, **CSV**, or **PDF**.

---

## 11. Notifications

Click the **bell icon** in the top bar, or **Notifications** in the sidebar, to view your notification inbox.

Notifications are generated automatically by the system every 30 minutes. They alert you to financial risk situations:

| Notification type | What triggered it |
|---|---|
| Vendor Overpaid | A vendor has been paid more than the PO value |
| Billing Ahead of PO | Invoices raised exceed the associated PO amount |
| Stalled Project | A project has had no financial activity for an extended period |
| PO Expiring Soon | A PO's validity end date is within 30 days |
| PO Expired & Uncollected | A PO has passed its validity date with unpaid amounts remaining |
| Overdue Unpaid Invoice | An invoice has an outstanding balance past its expected payment date |
| Disputed Invoice | An invoice has objection remarks |

**Reading notifications:**
- Unread notifications appear with a coloured left border and slightly highlighted background.
- The severity level (INFO / WARNING / CRITICAL) is shown as a badge.
- The date and time the notification was created is shown on the right.

**Marking as read:**
- Click the checkmark or "Mark as read" button on any individual notification.
- Click **Mark all as read** at the top to clear all notifications at once.

The bell icon badge count in the top bar decreases as you mark notifications read.

---

## 12. Administration (Admin Users Only)

The **Administration** section is visible only to users with the **Super Admin** role. Access it from the sidebar.

The Administration page uses a left sidebar to navigate between sections:

---

### 12.1 Users & Members

Shows a table of all application users:

| Column | Description |
|---|---|
| Name / Avatar | User's full name (or username if no name is linked), with initials avatar |
| Email | Registered email address |
| Role | `superadmin` or `project_manager` |
| Status | Active / Inactive |

Use the **search bar** above the table to filter by name.

---

### 12.2 Roles & Permissions

A reference view describing the two roles in the system and what access each has:

- **Super Admin**: Full access to all projects, all financial data, Administration, Managers, Audit Logs, and user management.
- **Project Manager**: Access only to projects assigned to them. Cannot access Administration, Managers, or Audit Logs.

---

### 12.3 Audit Logs

A chronological log of security and activity events in the system. Shows:
- Timestamp
- Username
- Category (LOGIN, LOGOUT, USER_ACTIVITY, SYNC, REPORT_DOWNLOAD, ADMIN_CHANGE)
- Action (e.g. LOGIN_SUCCESS, TOKEN_REFRESH, LOGIN_LOCKED_OUT)
- Status (SUCCESS or FAILURE)
- IP Address
- Details (additional context)

Use the filters at the top to narrow by category, username, or date range. The most recent events appear first.

---

### 12.4 Security Settings (2FA Setup)

From the **Security** tab in Administration (or from your account Settings page), Super Admins can set up Two-Factor Authentication:

**To enable 2FA:**
1. Click **Set Up Two-Factor Authentication**.
2. A QR code appears. Scan it with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.).
3. Enter the **6-digit code** shown in your app to confirm setup.
4. The system displays **8 one-time backup codes**. Save these in a secure location — they can be used to log in if you lose access to your authenticator app. Each backup code can only be used once.
5. Click **Done**. 2FA is now active on your account.

**To disable 2FA:**
1. Click **Disable Two-Factor Authentication**.
2. Enter your current **password** and the current **6-digit authenticator code**.
3. Click **Confirm Disable**.

---

## 13. Settings (My Account)

Click your **user avatar** in the top-right corner and select **Settings** (or navigate directly to `/settings`).

The Settings page is divided into tabs:

- **Profile** — View your username and role. Update your display name and email address.
- **Security** — Change your password. Enable or disable Two-Factor Authentication (Super Admins).
- **Sessions** — View all active login sessions (showing device label, IP address, and last active time). Click **Revoke** on any session you don't recognise to log it out immediately. Click **Revoke all other sessions** to end all sessions except your current one.
- **Preferences** — Toggle light/dark mode (also available via the top bar toggle).

---

## 14. Known Limitations

The following features are visible in the UI but not yet fully active:

| Feature | Current Status |
|---|---|
| **AI Insights** | Shows a "Coming Soon" placeholder. No AI analysis is available yet. |
| **Bhashini Language Translation** | The widget container is present in the top bar but the translation service is awaiting NIC domain approval. The widget is not active. |
| **Live ERP Data Sync** | Data is loaded as a one-time import from Excel/tab-delimited files. There is no live connection to Oracle ERP. Data reflects the state at the time of the last import. |
| **Write-back to ERP** | NPMS is a read-only monitoring system. Changes made to ERP records do not flow into NPMS automatically, and NPMS does not push updates back to ERP. |
