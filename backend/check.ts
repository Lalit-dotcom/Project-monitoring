import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const connectionString = process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  
  console.log('Updating emails...');
  await client.query("UPDATE project_managers SET email = 'aaaa44451441@gmail.com' WHERE prj_mgr_id = 1626");
  await client.query("UPDATE users SET email = 'aaaa44451441@gmail.com' WHERE username = 'atul'");
  
  const resUsers = await client.query("SELECT id, username, email, prj_mgr_id FROM users WHERE username = 'atul'");
  console.log('Users for atul:');
  console.table(resUsers.rows);
  
  const resPM = await client.query("SELECT prj_mgr_id, prj_mgr_name, email FROM project_managers WHERE prj_mgr_id = 1626");
  console.log('Project Manager for 1626:');
  console.table(resPM.rows);
  await client.end();
}
check();

