import { Client } from 'pg';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Custom Date Parser: Handles JS Dates, raw numeric serials, and DD-MON-YY strings
const parseExcelDate = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    try {
      const dateObj = xlsx.SSF.parse_date_code(val);
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch (err) {
      return null;
    }
  }
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (cleaned === '') return null;
    
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthStr = parts[1].toUpperCase();
      let year = parts[2];
      
      const months: { [key: string]: string } = {
        JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
        JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
      };
      
      const month = months[monthStr];
      if (month) {
        if (year.length === 2) {
          const y = parseInt(year, 10);
          year = y < 50 ? `20${year}` : `19${year}`;
        }
        return `${year}-${month}-${day}`;
      }
    }

    const parsedMs = Date.parse(cleaned);
    if (!isNaN(parsedMs)) {
      const dObj = new Date(parsedMs);
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
};

// Numeric parser that returns null for blank cells or NaN
const parseNumeric = (val: any, defaultVal: number | null = null): number | null => {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'number') {
    return isNaN(val) ? defaultVal : val;
  }
  const cleaned = String(val).trim();
  if (cleaned === '' || cleaned.toLowerCase() === 'nan') return defaultVal;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultVal : parsed;
};

// Strips quotes, line breaks and duplicate spaces
const cleanString = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  const cleaned = String(val).replace(/^"|"$/g, '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned === '' ? null : cleaned;
};

// Read specific sheet from Excel file
const readExcelRows = (filePath: string): any[] => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const workbook = xlsx.readFile(filePath);
  const targetSheetName = workbook.SheetNames.find(name => name.includes('Export') || name === 'Sheet1') || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];
  return xlsx.utils.sheet_to_json(sheet);
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to PostgreSQL. Running database migrations...');

  // 1. Projects table migration
  const idColCheck = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'id'
  `);

  if (idColCheck.rowCount === 0) {
    console.log('Altering projects table...');
    // Drop primary key on header_id
    await client.query(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pkey`);
    // Add auto-incrementing primary key column
    await client.query(`ALTER TABLE projects ADD COLUMN id SERIAL PRIMARY KEY`);
    // Add unique constraint to project_cd
    await client.query(`ALTER TABLE projects ADD CONSTRAINT projects_project_cd_key UNIQUE (project_cd)`);
    console.log('Altered projects table successfully.');
  }

  // 2. Child tables creation
  console.log('Creating child tables if they do not exist...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
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
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_no ON purchase_orders (project_no)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_approval_status ON purchase_orders (approval_status)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS invoices (
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
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_project_no ON invoices (project_no)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS bill_desk (
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
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_bill_desk_project_no ON bill_desk (project_no)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_bill_desk_invoice_status ON bill_desk (invoice_status)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS tax_invoices (
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
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tax_invoices_project_no ON tax_invoices (project_no)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tax_invoices_bill_status ON tax_invoices (bill_status)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS pm_project_type_summary (
      id SERIAL PRIMARY KEY,
      header_id BIGINT,
      prj_mgr_id INTEGER,
      prj_mgr_name TEXT,
      prj_type_code VARCHAR(10),
      prj_type_description TEXT,
      no_of_project INTEGER,
      created_date DATE
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS project_managers (
      prj_mgr_id INTEGER PRIMARY KEY,
      prj_mgr_name TEXT
    )
  `);

  console.log('Truncating child tables to clear data...');
  await client.query(`TRUNCATE TABLE purchase_orders, invoices, bill_desk, tax_invoices, pm_project_type_summary, project_managers CASCADE`);

  const rawDir = path.join('data', 'raw');

  // 3. SEED projects table
  console.log('Seeding projects table from XX_NIC_PM_PRJ_LIST.xlsx...');
  const projectRows = readExcelRows(path.join(rawDir, 'XX_NIC_PM_PRJ_LIST.xlsx'));
  
  for (const row of projectRows) {
    const projectCd = cleanString(row.PROJECT_CD);
    if (!projectCd) continue;

    await client.query(`
      INSERT INTO projects (
        header_id, project_id, prj_mgr_id, project_cd, prj_nm, customer_name,
        prj_budget_no, amount_received, no_of_po, po_amount, no_of_inv_billdesk,
        no_of_exp_invoice, total_invoice_amount, total_amount_paid, no_of_tax_invoice,
        total_tax_invoice_amount, project_abp, created_on, cust_id, prj_type,
        user_email, mobile_number, hod_email, nic_cord_emailid, staff_email_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (project_cd) DO UPDATE SET
        header_id = EXCLUDED.header_id,
        project_id = EXCLUDED.project_id,
        prj_mgr_id = EXCLUDED.prj_mgr_id,
        prj_nm = EXCLUDED.prj_nm,
        customer_name = EXCLUDED.customer_name,
        prj_budget_no = EXCLUDED.prj_budget_no,
        amount_received = EXCLUDED.amount_received,
        no_of_po = EXCLUDED.no_of_po,
        po_amount = EXCLUDED.po_amount,
        no_of_inv_billdesk = EXCLUDED.no_of_inv_billdesk,
        no_of_exp_invoice = EXCLUDED.no_of_exp_invoice,
        total_invoice_amount = EXCLUDED.total_invoice_amount,
        total_amount_paid = EXCLUDED.total_amount_paid,
        no_of_tax_invoice = EXCLUDED.no_of_tax_invoice,
        total_tax_invoice_amount = EXCLUDED.total_tax_invoice_amount,
        project_abp = EXCLUDED.project_abp,
        created_on = EXCLUDED.created_on,
        cust_id = EXCLUDED.cust_id,
        prj_type = EXCLUDED.prj_type,
        user_email = EXCLUDED.user_email,
        mobile_number = EXCLUDED.mobile_number,
        hod_email = EXCLUDED.hod_email,
        nic_cord_emailid = EXCLUDED.nic_cord_emailid,
        staff_email_id = EXCLUDED.staff_email_id
    `, [
      parseNumeric(row.HEADER_ID),
      parseNumeric(row.PROJECT_ID),
      parseNumeric(row.PRJ_MGR_ID),
      projectCd,
      cleanString(row.PRJ_NM) || 'Unknown Project',
      cleanString(row.CUSTOMER_NAME) || 'Unknown Customer',
      parseNumeric(row.PRJ_BUDGET_NO),
      parseNumeric(row.AMOUNT_RECEIVED),
      parseNumeric(row.NO_OF_PO, 0),
      parseNumeric(row.PO_AMOUNT),
      parseNumeric(row.NO_OF_INV_BILLDESK, 0),
      parseNumeric(row.NO_OF_EXP_INVOCIE, 0), // maps matching Excel spelling
      parseNumeric(row.TOTAL_INVOICE_AMOUNT, 0),
      parseNumeric(row.TOTAL_AMOUNT_PAID, 0),
      parseNumeric(row.NO_OF_TAX_INVOICE, 0),
      parseNumeric(row.TOTAL_TAX_INVOCIE_AMOUNT, 0), // maps matching Excel spelling
      parseNumeric(row.PROJECT_ABP),
      parseExcelDate(row.CREATED_ON),
      parseNumeric(row.CUST_ID),
      cleanString(row.PRJ_TYPE),
      cleanString(row.USER_EMAIL),
      cleanString(row.MOBILE_NUMBER),
      cleanString(row.HOD_EMAIL),
      cleanString(row.NIC_CORD_EMAILID),
      cleanString(row.STAFF_EMAIL_ID)
    ]);
  }
  console.log(`Upserted projects: ${projectRows.length}`);

  // Fetch updated list of project codes
  const projectCodesRes = await client.query('SELECT project_cd FROM projects');
  const projectCodes = new Set(projectCodesRes.rows.map(r => r.project_cd));

  // 4. SEED purchase_orders table
  console.log('Seeding purchase_orders table...');
  const poRows = readExcelRows(path.join(rawDir, 'XX_NIC_PM_PO_LIST.xlsx'));
  let poCount = 0;
  for (const row of poRows) {
    const projectNo = cleanString(row.PROJECT_NO);
    if (!projectNo || !projectCodes.has(projectNo)) {
      console.warn(`[Warning] purchase_orders: skipping row, project_no "${projectNo}" not found in projects`);
      continue;
    }
    await client.query(`
      INSERT INTO purchase_orders (
        header_id, project_id, project_no, prj_mgr_id, vendor_id, vendor_name,
        final_po_no, po_date, valid_from, valid_to, total, approval_status, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      parseNumeric(row.HEADER_ID),
      parseNumeric(row.PROJECT_ID),
      projectNo,
      parseNumeric(row.PRJ_MGR_ID),
      parseNumeric(row.VENDOR_ID),
      cleanString(row.VENDOR_NAME),
      cleanString(row.FINAL_PO_NO),
      parseExcelDate(row.PO_DATE),
      parseExcelDate(row.FRDATE),
      parseExcelDate(row.TODATE),
      parseNumeric(row.TOTAL),
      cleanString(row.APPROVAL_STATUS),
      parseExcelDate(row.CREATED_DATE)
    ]);
    poCount++;
  }
  console.log(`Inserted purchase_orders: ${poCount}`);

  // 5. SEED invoices table
  console.log('Seeding invoices table...');
  const invRows = readExcelRows(path.join(rawDir, 'APPS_XX_NIC_PM_INVOICE_LIST.xlsx'));
  let invCount = 0;
  for (const row of invRows) {
    const projectNo = cleanString(row.PROJECT_NO);
    if (!projectNo || !projectCodes.has(projectNo)) {
      console.warn(`[Warning] invoices: skipping row, project_no "${projectNo}" not found in projects`);
      continue;
    }
    await client.query(`
      INSERT INTO invoices (
        header_id, project_id, project_no, prj_mgr_id, manager_name, po_no,
        vendor_id, vendor_name, invoice_num, invoice_date, gl_date, invoice_amount,
        amount_paid, unpaid, pen_amt, objection, final_unpaid, invoice_type,
        project_abp, gem_flag, msme_vendor_name, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `, [
      parseNumeric(row.HEADER_ID),
      parseNumeric(row.PROJECT_ID),
      projectNo,
      parseNumeric(row.PRJ_MGR_ID),
      cleanString(row.MANAGERNAME),
      cleanString(row.PONO),
      parseNumeric(row.VENDOR_ID),
      cleanString(row.VENDOR_NAME),
      cleanString(row.INVOICE_NUM),
      parseExcelDate(row.INVOICE_DATE),
      parseExcelDate(row.GL_DATE),
      parseNumeric(row.INVOICE_AMOUNT),
      parseNumeric(row.AMOUNT_PAID),
      parseNumeric(row.UNPAID),
      parseNumeric(row.PEN_AMT),
      cleanString(row.OBJECTION),
      parseNumeric(row.FINALUNPAID),
      cleanString(row.INVOICE_TYPE),
      parseNumeric(row.PROJECT_ABP),
      cleanString(row.GEM_FLAG),
      cleanString(row.MSMEVEN_NAME),
      parseExcelDate(row.CREATED_DATE)
    ]);
    invCount++;
  }
  console.log(`Inserted invoices: ${invCount}`);

  // 6. SEED bill_desk table
  console.log('Seeding bill_desk table...');
  const bdRows = readExcelRows(path.join(rawDir, 'XX_NIC_PM_BILL_DSK_LIST.xlsx'));
  let bdCount = 0;
  for (const row of bdRows) {
    const projectNo = cleanString(row.PROJECT_NO);
    if (!projectNo || !projectCodes.has(projectNo)) {
      console.warn(`[Warning] bill_desk: skipping row, project_no "${projectNo}" not found in projects`);
      continue;
    }
    await client.query(`
      INSERT INTO bill_desk (
        header_id, project_id, project_no, prj_mgr_id, final_po_no, bill_month,
        vendor_id, vendor_name, invoice_no, invoice_date, received_date, invoice_amount,
        invoice_num, invoice_amount_bk, amount_paid, invoice_status, objection_remarks,
        status, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      parseNumeric(row.HEADER_ID),
      parseNumeric(row.PROJECT_ID),
      projectNo,
      parseNumeric(row.PRJ_MGR_ID),
      cleanString(row.FINAL_PO_NO),
      cleanString(row.BILL_MONTH) || (row.INVOICE_DATE ? (() => {
        const parsedDate = parseExcelDate(row.INVOICE_DATE);
        if (!parsedDate) return null;
        const dObj = new Date(parsedDate);
        return dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      })() : null),
      parseNumeric(row.VENDOR_ID),
      cleanString(row.VENDOR_NAME),
      cleanString(row.INVOICE_NO),
      parseExcelDate(row.INVOICE_DATE),
      parseExcelDate(row.RECEIVED_DATE),
      parseNumeric(row.INVOICE_AMOUNT),
      cleanString(row.INVOICE_NUM),
      parseNumeric(row.INVOICE_AMOUNT_BK),
      parseNumeric(row.AMOUNT_PAID),
      cleanString(row.INVOICE_STATUS),
      cleanString(row.OBJECTION_REMARKS),
      cleanString(row.STATUS),
      parseExcelDate(row.CREATED_DATE)
    ]);
    bdCount++;
  }
  console.log(`Inserted bill_desk: ${bdCount}`);

  // 7. SEED tax_invoices table
  console.log('Seeding tax_invoices table...');
  const txRows = readExcelRows(path.join(rawDir, 'XX_NIC_PM_TAX_INV_LIST.xlsx'));
  let txCount = 0;
  for (const row of txRows) {
    const projectNo = cleanString(row.PROJECT_NO);
    if (!projectNo || !projectCodes.has(projectNo)) {
      console.warn(`[Warning] tax_invoices: skipping row, project_no "${projectNo}" not found in projects`);
      continue;
    }
    await client.query(`
      INSERT INTO tax_invoices (
        header_id, project_id, project_no, prj_mgr_id, cust_id, cust_gstin_no,
        prj_gstn_no, po_no, ampono, user_bill_no, bill_date, bill_status,
        billing_period_from, billing_period_to, supp_inv_num, total_amount,
        bill_type, state_description, irn_no, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      parseNumeric(row.HEADER_ID),
      parseNumeric(row.PROJECT_ID),
      projectNo,
      parseNumeric(row.PRJ_MGR_ID),
      parseNumeric(row.CUST_ID),
      cleanString(row.CUST_GSTIN_NO),
      cleanString(row.PRJ_GSTN_NO),
      cleanString(row.PO_NO),
      cleanString(row.AMPONO),
      cleanString(row.USER_BILL_NO),
      parseExcelDate(row.BILL_DATE),
      cleanString(row.BILL_STATUS),
      cleanString(row.BILLING_PERIOD_FROM),
      cleanString(row.BILLING_PERIOD_TO),
      cleanString(row.SUPP_INV_NUM),
      parseNumeric(row.TOTALAMOUNT),
      cleanString(row.BILL_TYPE),
      cleanString(row.STATE_DESCRIPTION),
      cleanString(row.IRN_NO),
      parseExcelDate(row.CREATED_DATE)
    ]);
    txCount++;
  }
  console.log(`Inserted tax_invoices: ${txCount}`);

  // 8. SEED pm_project_type_summary table
  console.log('Seeding pm_project_type_summary table...');
  const summaryRows = readExcelRows(path.join(rawDir, 'XX_NIC_PMDB_PROJECT_LIST.xlsx'));
  let summaryCount = 0;
  for (const row of summaryRows) {
    await client.query(`
      INSERT INTO pm_project_type_summary (
        header_id, prj_mgr_id, prj_mgr_name, prj_type_code, prj_type_description,
        no_of_project, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      parseNumeric(row.HEADER_ID),
      parseNumeric(row.PRJ_MGR_ID),
      cleanString(row.PRJ_MGR_NM),
      cleanString(row.PRJ_TYP_CODE),
      cleanString(row.PRJ_TYP_DESCRIPTION),
      parseNumeric(row.NOOFPROJECT),
      parseExcelDate(row.CREATED_DATE)
    ]);
    summaryCount++;
  }
  console.log(`Inserted pm_project_type_summary: ${summaryCount}`);

  // 9. SEED project_managers table
  console.log('Seeding project_managers table...');
  await client.query(`
    INSERT INTO project_managers (prj_mgr_id, prj_mgr_name)
    SELECT DISTINCT prj_mgr_id, prj_mgr_name 
    FROM pm_project_type_summary 
    WHERE prj_mgr_id IS NOT NULL AND prj_mgr_name IS NOT NULL AND prj_mgr_name != ''
    ON CONFLICT (prj_mgr_id) DO NOTHING
  `);

  await client.end();
  console.log('All modules seeded successfully!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
