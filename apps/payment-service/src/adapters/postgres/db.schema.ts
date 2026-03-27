import type { PostgresPaymentEventDbSchema } from './payment-event.schema';
import type { PostgresPaymentDbSchema } from './payment.schema';

import { postgresPaymentDbSchema } from './payment.schema';
import { postgresPaymentEventDbSchema } from './payment-event.schema';

type PostgresDbSchema = PostgresPaymentDbSchema & PostgresPaymentEventDbSchema;

const postgresDbSchema = {
    ...postgresPaymentDbSchema,
    ...postgresPaymentEventDbSchema,
};

export default postgresDbSchema;
export { postgresDbSchema };
export type { PostgresDbSchema };
