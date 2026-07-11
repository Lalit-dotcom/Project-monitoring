import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function testQuery() {
  const connectionString = process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT 
      project_cd as "projectCode",
      prj_nm as "projectName",
      COALESCE(prj_budget_no, 0) as budget,
      COALESCE(amount_received, 0) as received,
      COALESCE(no_of_po, 0) as "poCount"
    FROM projects
    ORDER BY prj_budget_no DESC NULLS LAST
    LIMIT 10
  `);
  console.table(res.rows.map(r => ({
    projectCode: r.projectCode,
    projectName: r.projectName?.slice(0, 30),
    budget: Number(r.budget),
    received: Number(r.received),
    poCount: Number(r.poCount)
  })));
  await client.end();
}
testQuery();
