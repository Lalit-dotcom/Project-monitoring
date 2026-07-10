-- Drop tables if exist to allow safe re-runs
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS bill_desk CASCADE;
DROP TABLE IF EXISTS tax_invoices CASCADE;
DROP TABLE IF EXISTS pm_project_type_summary CASCADE;
DROP TABLE IF EXISTS project_managers CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Create project_managers table
CREATE TABLE project_managers (
    prj_mgr_id INTEGER PRIMARY KEY,
    prj_mgr_name TEXT
);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    header_id BIGINT,
    project_id BIGINT NOT NULL,
    prj_mgr_id INTEGER,
    project_cd VARCHAR(20) NOT NULL UNIQUE,
    prj_nm TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    prj_budget_no NUMERIC(15,2),
    amount_received NUMERIC(15,2),
    no_of_po INTEGER DEFAULT 0,
    po_amount NUMERIC(15,2),
    no_of_inv_billdesk INTEGER DEFAULT 0,
    no_of_exp_invoice INTEGER DEFAULT 0,
    total_invoice_amount NUMERIC(15,2) DEFAULT 0,
    total_amount_paid NUMERIC(15,2) DEFAULT 0,
    no_of_tax_invoice INTEGER DEFAULT 0,
    total_tax_invoice_amount NUMERIC(15,2) DEFAULT 0,
    project_abp NUMERIC(15,2),
    created_on DATE,
    cust_id BIGINT,
    prj_type VARCHAR(10),
    user_email TEXT,
    mobile_number VARCHAR(20),
    hod_email TEXT,
    nic_cord_emailid TEXT,
    staff_email_id TEXT
);

-- Create indexes for projects
CREATE INDEX idx_projects_project_cd ON projects (project_cd);
CREATE INDEX idx_projects_customer_name ON projects (customer_name);
CREATE INDEX idx_projects_cust_id ON projects (cust_id);

-- Create purchase_orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    header_id BIGINT,
    project_id BIGINT,
    project_no VARCHAR(20) NOT NULL REFERENCES projects(project_cd),
    prj_mgr_id INTEGER,
    vendor_id INTEGER,
    vendor_name TEXT,
    final_po_no VARCHAR(30),
    po_date DATE,
    valid_from DATE,
    valid_to DATE,
    total NUMERIC(15,2),
    approval_status VARCHAR(30),
    created_date DATE
);

CREATE INDEX idx_purchase_orders_project_no ON purchase_orders (project_no);
CREATE INDEX idx_purchase_orders_approval_status ON purchase_orders (approval_status);

-- Create invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    header_id BIGINT,
    project_id BIGINT,
    project_no VARCHAR(20) NOT NULL REFERENCES projects(project_cd),
    prj_mgr_id INTEGER,
    manager_name TEXT,
    po_no VARCHAR(30),
    vendor_id INTEGER,
    vendor_name TEXT,
    invoice_num VARCHAR(30),
    invoice_date DATE,
    gl_date DATE,
    invoice_amount NUMERIC(15,2),
    amount_paid NUMERIC(15,2),
    unpaid NUMERIC(15,2),
    pen_amt NUMERIC(15,2),
    objection TEXT,
    final_unpaid NUMERIC(15,2),
    invoice_type VARCHAR(30),
    project_abp NUMERIC(15,2),
    gem_flag VARCHAR(10),
    msme_vendor_name TEXT,
    created_date DATE
);

CREATE INDEX idx_invoices_project_no ON invoices (project_no);

-- Create bill_desk table
CREATE TABLE bill_desk (
    id SERIAL PRIMARY KEY,
    header_id BIGINT,
    project_id BIGINT,
    project_no VARCHAR(20) NOT NULL REFERENCES projects(project_cd),
    prj_mgr_id INTEGER,
    final_po_no VARCHAR(30),
    bill_month VARCHAR(20),
    vendor_id INTEGER,
    vendor_name TEXT,
    invoice_no VARCHAR(30),
    invoice_date DATE,
    received_date DATE,
    invoice_amount NUMERIC(15,2),
    invoice_num VARCHAR(30),
    invoice_amount_bk NUMERIC(15,2),
    amount_paid NUMERIC(15,2),
    invoice_status VARCHAR(30),
    objection_remarks TEXT,
    status VARCHAR(30),
    created_date DATE
);

CREATE INDEX idx_bill_desk_project_no ON bill_desk (project_no);
CREATE INDEX idx_bill_desk_invoice_status ON bill_desk (invoice_status);

-- Create tax_invoices table
CREATE TABLE tax_invoices (
    id SERIAL PRIMARY KEY,
    header_id BIGINT,
    project_id BIGINT,
    project_no VARCHAR(20) NOT NULL REFERENCES projects(project_cd),
    prj_mgr_id INTEGER,
    cust_id BIGINT,
    cust_gstin_no VARCHAR(20),
    prj_gstn_no VARCHAR(20),
    po_no VARCHAR(30),
    ampono VARCHAR(30),
    user_bill_no VARCHAR(30),
    bill_date DATE,
    bill_status VARCHAR(30),
    billing_period_from VARCHAR(20),
    billing_period_to VARCHAR(20),
    supp_inv_num VARCHAR(30),
    total_amount NUMERIC(15,2),
    bill_type VARCHAR(30),
    state_description VARCHAR(50),
    irn_no TEXT,
    created_date DATE
);

CREATE INDEX idx_tax_invoices_project_no ON tax_invoices (project_no);
CREATE INDEX idx_tax_invoices_bill_status ON tax_invoices (bill_status);

-- Create pm_project_type_summary table
CREATE TABLE pm_project_type_summary (
    id SERIAL PRIMARY KEY,
    header_id BIGINT,
    prj_mgr_id INTEGER,
    prj_mgr_name TEXT,
    prj_type_code VARCHAR(10),
    prj_type_description TEXT,
    no_of_project INTEGER,
    created_date DATE
);
