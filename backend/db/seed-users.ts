import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function seedUsers() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL to seed users...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // 1. Check if the project manager with ID 1626 exists
    const pmCheck = await client.query(
      'SELECT prj_mgr_id, prj_mgr_name FROM project_managers WHERE prj_mgr_id = 1626'
    );

    if (pmCheck.rows.length === 0) {
      console.warn('Warning: Project Manager with ID 1626 ("Atul Rastogi") not found in project_managers.');
      console.log('Inserting Atul Rastogi fallback into project_managers...');
      await client.query(
        "INSERT INTO project_managers (prj_mgr_id, prj_mgr_name, source) VALUES (1626, 'Atul Rastogi', 'erp_synced') ON CONFLICT (prj_mgr_id) DO NOTHING"
      );
    } else {
      console.log(`Found existing Project Manager: ${pmCheck.rows[0].prj_mgr_name} (ID: 1626)`);
    }

    // 2. Hash passwords
    console.log('Hashing passwords...');
    const lalitHash = await bcrypt.hash('lalit@123', 10);
    const atulHash = await bcrypt.hash('123', 10);

    // 3. Seed users
    console.log('Seeding superadmin "lalit"...');
    await client.query(`
      INSERT INTO users (username, password_hash, role, prj_mgr_id)
      VALUES ('lalit', $1, 'superadmin', NULL)
      ON CONFLICT (username) DO NOTHING
    `, [lalitHash]);

    console.log('Seeding project manager "atul"...');
    await client.query(`
      INSERT INTO users (username, password_hash, role, prj_mgr_id)
      VALUES ('atul', $1, 'project_manager', 1626)
      ON CONFLICT (username) DO NOTHING
    `, [atulHash]);

    console.log('User seeding completed successfully.');
  } catch (err: any) {
    console.error('User seeding failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedUsers();
