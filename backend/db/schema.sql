-- Drop table if exists to allow safe re-runs
DROP TABLE IF EXISTS projects CASCADE;

-- Create projects table
CREATE TABLE projects (
    header_id BIGINT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    prj_mgr_id INTEGER,
    project_cd VARCHAR(20) NOT NULL,
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

-- Create indexes for fields frequently filtered or searched on
CREATE INDEX idx_projects_project_cd ON projects (project_cd);
CREATE INDEX idx_projects_customer_name ON projects (customer_name);
CREATE INDEX idx_projects_cust_id ON projects (cust_id);
