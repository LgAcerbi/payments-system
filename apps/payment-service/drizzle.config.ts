import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';

export default defineConfig({
    dialect: 'postgresql',
    schema: [
        './apps/payment-service/src/adapters/postgres/payment.schema.ts',
        './apps/payment-service/src/adapters/postgres/payment-event.schema.ts',
    ],
    out: './apps/payment-service/migrations',
    dbCredentials: {
        url: databaseUrl,
    },
    strict: true,
    verbose: true,
});
