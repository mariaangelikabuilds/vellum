import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    const v = await pool.query("SELECT extversion FROM pg_extension WHERE extname='vector'");
    console.log('pgvector OK, version:', v.rows[0]?.extversion ?? 'unknown');
  } catch (e) {
    console.log('FAIL:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
