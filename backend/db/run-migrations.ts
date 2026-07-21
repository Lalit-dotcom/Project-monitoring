import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL to run migrations...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Adding columns to project_managers if they do not exist...');
    await client.query(`
      ALTER TABLE project_managers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'erp_synced';
      ALTER TABLE project_managers ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE project_managers ADD COLUMN IF NOT EXISTS mobile_number TEXT;
    `);

    console.log('Explicitly marking existing project_managers rows as erp_synced...');
    await client.query(`
      UPDATE project_managers SET source = 'erp_synced' WHERE source IS NULL;
    `);

    console.log('Creating users table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('superadmin', 'project_manager')),
        prj_mgr_id INTEGER REFERENCES project_managers(prj_mgr_id),
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    console.log('Creating sessions table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        refresh_token_hash TEXT NOT NULL,
        device_label TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT now(),
        last_active_at TIMESTAMP DEFAULT now(),
        revoked BOOLEAN DEFAULT FALSE
      );
    `);

    console.log('Adding 2FA columns to users table if they do not exist...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_temp_secret TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
    `);

    console.log('Adding new columns to sessions table if they do not exist...');
    await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS previous_token_hash TEXT;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMP;
    `);

    console.log('Creating password_reset_otps table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        attempt_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    await client.query(`
      ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
    `);

    console.log('Creating audit_logs table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        username TEXT,
        category TEXT NOT NULL CHECK (category IN ('LOGIN', 'LOGOUT', 'USER_ACTIVITY', 'SYNC', 'REPORT_DOWNLOAD', 'ADMIN_CHANGE')),
        action TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE')),
        ip_address TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('RISK_FLAG', 'SECURITY', 'ADMIN')),
        type TEXT NOT NULL,
        project_no TEXT REFERENCES projects(project_cd),
        target_user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
        dedup_key TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_dedup 
        ON notifications(dedup_key) WHERE resolved_at IS NULL AND dedup_key IS NOT NULL;

      CREATE TABLE IF NOT EXISTS notification_reads (
        notification_id INTEGER NOT NULL REFERENCES notifications(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        read_at TIMESTAMP DEFAULT now(),
        PRIMARY KEY (notification_id, user_id)
      );
    `);

    console.log('Migrations executed successfully.');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
