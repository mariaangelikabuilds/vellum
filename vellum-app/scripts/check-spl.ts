import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const r1 = await pool.query('SHOW shared_preload_libraries');
  console.log('shared_preload_libraries:', r1.rows[0].shared_preload_libraries);

  const r2 = await pool.query('SHOW azure.extensions');
  console.log('azure.extensions:        ', r2.rows[0]['azure.extensions']);

  await pool.end();
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
