import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

// AGE's cypher() function lives in ag_catalog. Every new pool connection
// needs that schema on its search_path or queries fail with "function
// cypher(...) does not exist". This runs once per connection acquire.
pool.on('connect', (client) => {
  client.query('SET search_path = ag_catalog, "$user", public').catch((e) => {
    console.error('failed to set search_path on new connection:', e);
  });
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
