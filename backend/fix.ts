import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const connectionString = process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("UPDATE project_managers SET email = 'aaaa44451441@gmail.com' WHERE prj_mgr_id = 1626");
  await client.query("UPDATE users SET email = 'aaaa44451441@gmail.com' WHERE username = 'atul'");
  console.log('Updated Atul in project_managers and users');
  await client.end();
}
fix();
