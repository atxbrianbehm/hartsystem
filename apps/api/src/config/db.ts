import { Pool, QueryResultRow } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export const query = async <T extends QueryResultRow>(text: string, params: unknown[] = []) => {
  const result = await pool.query<T>(text, params);
  return result;
};
