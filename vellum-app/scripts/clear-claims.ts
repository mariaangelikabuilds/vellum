import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  options: '-c search_path=ag_catalog,public',
});

async function main() {
  const before = await pool.query(`
    SELECT count(*) AS c FROM cypher('vellum_claims', $$
      MATCH (n:Claim) RETURN n
    $$) AS (n agtype);
  `);
  console.log('claims before:', before.rows[0]?.c);

  await pool.query(`
    SELECT * FROM cypher('vellum_claims', $$
      MATCH (n:Claim) DETACH DELETE n
    $$) AS (a agtype);
  `);

  const after = await pool.query(`
    SELECT count(*) AS c FROM cypher('vellum_claims', $$
      MATCH (n:Claim) RETURN n
    $$) AS (n agtype);
  `);
  console.log('claims after :', after.rows[0]?.c);

  await pool.end();
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
