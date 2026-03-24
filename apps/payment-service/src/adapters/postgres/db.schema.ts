import { postgresPaymentDbSchema } from "./payment.schema";
import { postgresPaymentEventDbSchema } from "./payment-event.schema";

const postgresDbSchema = {
    ...postgresPaymentDbSchema,
    ...postgresPaymentEventDbSchema,
}

export default postgresDbSchema;
export { postgresDbSchema };