import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const host = url!.split('@')[1]?.split('?')[0] ?? 'unknown';
    console.log(`Connected to ${host}`);

    await client.query('CREATE EXTENSION IF NOT EXISTS age');
    console.log('✓ CREATE EXTENSION age');

    // LOAD 'age' skipped: shared_preload_libraries already loads it at server startup
    // and Azure Postgres restricts LOAD to superusers (vellumadmin is azure_pg_admin, not superuser)

    await client.query('SET search_path = ag_catalog, "$user", public');
    console.log('✓ search_path = ag_catalog, "$user", public');

    const exists = await client.query(
      'SELECT 1 FROM ag_catalog.ag_graph WHERE name = $1',
      ['vellum_claims'],
    );
    if (exists.rows.length === 0) {
      await client.query("SELECT create_graph('vellum_claims')");
      console.log('✓ create_graph(vellum_claims)');
    } else {
      console.log('· graph vellum_claims already exists, skipping create');
    }

    const graphs = await client.query('SELECT name FROM ag_catalog.ag_graph ORDER BY name');
    console.log('\nGraphs in this database:');
    for (const row of graphs.rows) {
      console.log('  -', row.name);
    }

    console.log('\nAGE setup complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
