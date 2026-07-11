import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const connectionString = process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("UPDATE project_managers SET email = 'atul@example.com' WHERE prj_mgr_id = 1626");
  console.log('Updated Atul in project_managers');
  await client.end();
}
fix();
