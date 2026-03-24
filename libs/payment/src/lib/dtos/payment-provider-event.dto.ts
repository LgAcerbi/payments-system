import { z } from "zod";

const paymentProviderEventDtoSchema = z.object({
    provider: z.enum(['stripe']),
    event: z.string(),
    status: z.string(),
    idempotencyKey: z.string(),
    providerEventId: z.string(),
    providerPaymentId: z.string(),
    providerRawPayload: z.unknown(),
    occurredAt: z.iso.datetime(),
});

type PaymentProviderEventDto = z.infer<typeof paymentProviderEventDtoSchema>;

export default paymentProviderEventDtoSchema;
export { paymentProviderEventDtoSchema };
export type { PaymentProviderEventDto };