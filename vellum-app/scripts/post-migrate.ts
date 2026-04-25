import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS bib_embedding_hnsw_idx
      ON bibliography
      USING hnsw (embedding vector_cosine_ops);
  `);
  console.log('✓ HNSW index on bibliography.embedding ready');

  const r = await pool.query(`
    SELECT indexname FROM pg_indexes
     WHERE tablename = 'bibliography' AND indexname = 'bib_embedding_hnsw_idx'
  `);
  console.log('  index present:', r.rowCount === 1);

  await pool.end();
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
