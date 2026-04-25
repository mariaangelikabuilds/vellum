import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// AGE's cypher() function lives in ag_catalog. We set search_path at the
// connection level via libpq options so it's already in place when the
// first query runs — avoids the pg deprecation warning about issuing a
// SET query while another query is in flight on a fresh connection.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  options: '-c search_path=ag_catalog,public',
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
