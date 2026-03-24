# Payment Event Transaction Hardening Plan

## Goal

Guarantee atomic processing for one provider event: either all event/payment writes succeed, or none do. Also enforce replay safety and query performance.

## Scope

- `apps/payment-service/src/application/services/payment-event.service.ts`
- `apps/payment-service/src/application/ports/payment.repository.ts`
- `apps/payment-service/src/application/ports/payment-event.repository.ts`
- `apps/payment-service/src/adapters/postgres/payment.repository.ts`
- `apps/payment-service/src/adapters/postgres/payment-event.repository.ts`
- `apps/payment-service/src/adapters/postgres/payment.schema.ts`
- `apps/payment-service/src/adapters/postgres/payment-event.schema.ts`
- `apps/payment-service/src/adapters/postgres/payment.unit-of-work.ts`
- `apps/payment-service/src/compositor.ts`

## Phase 1 - Transaction Boundary (Application-first)

1. Keep one application orchestration entrypoint in `PaymentEventService`.
2. Wrap full flow in `unitOfWork.runInTransaction(...)`:
   - idempotency lookup
   - create event (`created`)
   - payment lookup by `(provider, providerPaymentId)`
   - transition validation
   - payment status update
   - event status update (`processed`/`failed`)
3. Ensure all repository calls inside this flow use tx-scoped repositories.

Acceptance:
- No partial writes when any mid-flow step throws.

## Phase 2 - Schema and Constraints Hardening

1. Add/confirm unique idempotency constraint on `payment_events.idempotency_key` (or scoped key if needed).
2. Add index on payment lookup path:
   - `(provider, provider_payment_id)` on `payments`.
3. Add index for event processing diagnostics:
   - `(provider, provider_event_id)` on `payment_events` (optional unique if provider guarantees strict uniqueness).
4. Keep `payment_events.status` enum (`created|processed|failed`) and `failure_reason` nullable text/varchar.

Acceptance:
- Database enforces dedupe and performant lookup paths.

## Phase 3 - Repository Contract Alignment

1. Ensure `PaymentEventRepository.findPaymentEventByIdempotencyKey(...)` returns `PaymentEvent | null`.
2. Ensure `PaymentRepository.getPaymentByProviderPaymentId(...)` is provider-scoped and nullable.
3. Align adapters to exact contract (no signature drift).

Acceptance:
- Ports/adapters are type-aligned and behavior-aligned.

## Phase 4 - Duplicate and Error Semantics

1. Duplicate event handling path:
   - application returns deterministic duplicate outcome (or throws controlled conflict handled as non-retry in consumer).
2. Consumer should:
   - ack duplicate/validation-conflict (no infinite retries),
   - log structured context (`providerEventId`, `idempotencyKey`, `kafkaMessageId`),
   - emit duplicate metric.

Acceptance:
- Duplicates are observable but not poison messages.

## Phase 5 - Test Strategy (Rollback + Idempotency)

1. Rollback test: fail after event row creation; verify payment unchanged and event not left in inconsistent intermediate state.
2. Success test: verify event becomes `processed` and payment status updated in same transaction.
3. Duplicate test: second same idempotency key does not mutate payment.
4. Transition violation test: invalid status transition marks event `failed` with reason and no payment mutation.
5. Provider-scoped lookup test: same `providerPaymentId` across providers does not collide.

Acceptance:
- All five scenarios pass.

## Phase 6 - Rollout Checklist

1. Apply DB migration first (indexes and constraints).
2. Deploy service code with transaction path enabled.
3. Monitor:
   - duplicate count
   - failed event count by `failureReason`
   - processing latency and retry rate
4. Add runbook for replay/backfill with idempotency guarantees.
