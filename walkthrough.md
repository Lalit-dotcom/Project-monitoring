# Financial Views Filtering & Sorting Walkthrough

I have implemented full server-side filtering, sorting, and cross-page project linking across the four primary financial list views: **Purchase Orders**, **Invoices**, **Bill Desk**, and **Tax Invoices**.

---

## 1. Summary of Changes

### Backend Refactoring
1. **[purchaseOrders.ts](file:///c:/Users/lalit/Downloads/Project/Monitoring/backend/src/routes/purchaseOrders.ts)**, **[invoices.ts](file:///c:/Users/lalit/Downloads/Project/Monitoring/backend/src/routes/invoices.ts)**, **[billDesk.ts](file:///c:/Users/lalit/Downloads/Project/Monitoring/backend/src/routes/billDesk.ts)**, and **[taxInvoices.ts](file:///c:/Users/lalit/Downloads/Project/Monitoring/backend/src/routes/taxInvoices.ts)**:
   - Added parameterized SQL compilation for dynamic search query matching, dropdown classifications, date ranges, number bounds, and boolean toggles.
   - Built a custom `?distinctValues=true` endpoint route handler on each file that queries unique values for dropdowns (statuses, states, types, manager and vendor references) directly from the PostgreSQL tables.

### Frontend Routing & Type Sync
2. **[lib/api.ts](file:///c:/Users/lalit/Downloads/Project/Monitoring/frontend/src/lib/api.ts)**:
   - Declared filter model type interfaces (`POFilters`, `InvoiceFilters`, `BillDeskFilters`, and `TaxInvoiceFilters`).
   - Mapped these options as search parameters in the api fetch functions, appending active keys to URL query strings.
   - Wired companion methods (`getPurchaseOrderDistinctValues`, `getInvoiceDistinctValues`, `getBillDeskDistinctValues`, and `getTaxInvoiceDistinctValues`).

### Interface Design & Table Sorting Controls
3. **[PurchaseOrders.tsx](file:///c:/Users/lalit/Downloads/Project/Monitoring/frontend/src/pages/PurchaseOrders.tsx)**, **[Invoices.tsx](file:///c:/Users/lalit/Downloads/Project/Monitoring/frontend/src/pages/Invoices.tsx)**, **[BillDesk.tsx](file:///c:/Users/lalit/Downloads/Project/Monitoring/frontend/src/pages/BillDesk.tsx)**, and **[TaxInvoices.tsx](file:///c:/Users/lalit/Downloads/Project/Monitoring/frontend/src/pages/TaxInvoices.tsx)**:
   - Parsed parameters from `useSearchParams()` to automatically pre-fill inputs and active selectors on load.
   - Split controls into a basic row (Search bar, main filter select dropdowns, and "More Filters" toggle button) and an advanced drawer panel (amount bounds, date range, and checkbox toggles).
   - Added a 300ms input debounce to prevent rapid database queries.
   - Mounted active filter chips that allow removing specific parameters individually, along with a "Clear Filters" button.
   - Added interactive sort icons in column headers (toggling ascending/descending) linked to server-side sorting query params.
   - Rendered a semi-transparent spinning loader overlay over the tables while refetching.

### Cross-Page Project Linkage
4. **[ProjectDetail.tsx](file:///c:/Users/lalit/Downloads/Project/Monitoring/frontend/src/pages/ProjectDetail.tsx)**:
   - Updated row click actions in project sub-tables (Invoices, POs, Tax Invoices) and the direct Billing Desk link to redirect users to the main list views pre-filtered with `?projectNo=[projectCode]`.
   - Mapped Project columns on the main tables to navigate internally to these filtered listings.

---

## 2. Screenshot Verification with Active Filters

Below are screenshots of the running application displaying the live tables with active filters applied:

### Filtered Purchase Orders
- Filtered by Search: **"PO-9"**
- Saved screenshot file: [purchase_orders_filtered.png](file:///C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/purchase_orders_filtered.png)
![Filtered POs](/../../.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/purchase_orders_filtered.png)

### Filtered Invoices
- Filtered by Option: **"Has Objection"**
- Saved screenshot file: [invoices_filtered.png](file:///C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/invoices_filtered.png)
![Filtered Invoices](/C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/invoices_filtered.png)

### Filtered Bill Desk
- Filtered by Search: **"PO-9"**
- Saved screenshot file: [bill_desk_filtered.png](file:///C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/bill_desk_filtered.png)
![Filtered Bill Desk](/C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/bill_desk_filtered.png)

### Filtered Tax Invoices
- Filtered by Project: **"S242186ZOMP"**
- Saved screenshot file: [tax_invoices_filtered.png](file:///C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/tax_invoices_filtered.png)
![Filtered Tax Invoices](/C:/Users/lalit/.gemini/antigravity/brain/47cdc0e5-ace5-4200-bda0-346d05f8c131/tax_invoices_filtered.png)
