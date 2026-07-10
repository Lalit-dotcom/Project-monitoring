import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL to run migration...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // 1. Create table
    console.log('Creating project_managers table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_managers (
        prj_mgr_id INTEGER PRIMARY KEY,
        prj_mgr_name TEXT
      )
    `);

    // 2. Populate table
    console.log('Populating project_managers from pm_project_type_summary...');
    const result = await client.query(`
      INSERT INTO project_managers (prj_mgr_id, prj_mgr_name)
      SELECT DISTINCT prj_mgr_id, prj_mgr_name 
      FROM pm_project_type_summary 
      WHERE prj_mgr_id IS NOT NULL AND prj_mgr_name IS NOT NULL AND prj_mgr_name != ''
      ON CONFLICT (prj_mgr_id) DO NOTHING
    `);

    console.log(`Migration successful.`);
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
