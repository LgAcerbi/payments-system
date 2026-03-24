import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

/**
 * Bound matches `drizzle-orm` `drizzle()` / `NodePgDatabase`: string keys to
 * schema objects (tables / relations).
 */
type DrizzlePostgresSchema = {
  [key: string]: object;
};

class PgDrizzleClient<TSchema extends DrizzlePostgresSchema> {
  private readonly dbInstance: NodePgDatabase<TSchema>;
  private readonly dbPool: Pool;

  constructor(connectionString: string, schema: TSchema) {
    if (!connectionString) {
      throw new Error('Missing database connection string');
    }

    this.dbPool = new Pool({ connectionString });
    this.dbInstance = drizzle(this.dbPool, { schema });
  }

  getDbInstance(): NodePgDatabase<TSchema> {
    return this.dbInstance;
  }

  async close(): Promise<void> {
    await this.dbPool.end();
  }
}

function createPgDrizzleClient<TSchema extends DrizzlePostgresSchema>(
  connectionString: string,
  schema: TSchema,
): PgDrizzleClient<TSchema> {
  return new PgDrizzleClient(connectionString, schema);
}

export { createPgDrizzleClient, PgDrizzleClient };
export type { NodePgDatabase };
