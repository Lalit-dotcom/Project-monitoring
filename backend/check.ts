import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const connectionString = process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  const res = await client.query('SELECT username, email FROM users');
  console.table(res.rows);
  await client.end();
}
check();
