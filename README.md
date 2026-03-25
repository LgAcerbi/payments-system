# Node Payments System

A production-oriented payment processing backend built with **Node.js**, **TypeScript**, and **Stripe**, designed around **Clean Architecture** principles and **event-driven communication** via **Apache Kafka**. The system handles the full payment lifecycle — initiation, confirmation, asynchronous webhook reconciliation, and failure recovery — with a focus on **data consistency**, **idempotency**, and **fault tolerance**.

> Built as a real-world demonstration of how to design, structure, and operate a payment system that prioritises correctness over convenience.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
  - [System Design](#system-design)
  - [Database Choice & CAP Theorem](#database-choice--cap-theorem)
  - [Service Communication](#service-communication)
  - [Trade-offs](#trade-offs)
- [Patterns & Design Decisions](#patterns--design-decisions)
  - [Clean Architecture / Hexagonal Architecture](#clean-architecture--hexagonal-architecture)
  - [Domain-Driven Design](#domain-driven-design)
  - [Idempotency](#idempotency)
  - [Error Handling (RFC 9457)](#error-handling-rfc-9457)
  - [Dead Letter Queue & Retry Strategy](#dead-letter-queue--retry-strategy)
  - [Composition Root](#composition-root)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running Locally (Development)](#running-locally-development)
- [Roadmap](#roadmap)

---

## Architecture Overview

### System Design

```
┌──────────┐        ┌──────────────────────────────────────────────┐
│  Client  │───────▶│              Payment Service                 │
└──────────┘  HTTP  │                                              │
                    │  ┌────────────┐   ┌────────────────────────┐ │
                    │  │  Fastify   │──▶│   Application Layer    │ │
                    │  │  (HTTP)    │   │  PaymentService        │ │
                    │  └────────────┘   │  PaymentEventService   │ │
                    │                   └───────┬────────┬───────┘ │
                    │                      Ports│        │Ports    │
                    │               ┌───────────┘        └───────┐ │
                    │               ▼                             ▼ │
                    │  ┌────────────────────┐   ┌───────────────┐  │
                    │  │     PostgreSQL      │   │    Stripe     │  │
                    │  │  (Drizzle ORM)      │   │   Gateway     │  │
                    │  └────────────────────┘   └───────────────┘  │
                    │               ▲                               │
                    │               │                               │
                    │  ┌────────────────────┐                      │
                    │  │   Kafka Consumer   │◀── payment-events    │
                    │  │   (Webhooks)       │                      │
                    │  └────────────────────┘                      │
                    │         │ on failure                          │
                    │         ▼                                     │
                    │  ┌────────────────────────────┐              │
                    │  │ payment-events-dead-letter  │              │
                    │  └────────────────────────────┘              │
                    └──────────────────────────────────────────────┘
```

The system is designed as a **single deployable service** that separates concerns internally through strict layering rather than network boundaries. External payment provider webhooks (e.g. Stripe) are ingested via Kafka, decoupling webhook reception from processing and enabling replay, retry, and dead-letter semantics without data loss.

### Database Choice & CAP Theorem

**PostgreSQL** was chosen as the primary data store — a deliberate decision grounded in the **CAP theorem**:

| CAP Property | Decision |
|---|---|
| **Consistency** | **Prioritised.** Financial data demands strong consistency. A payment must never be double-charged or lost due to stale reads. PostgreSQL provides full ACID transactions and serialisable isolation when needed. |
| **Availability** | Acceptable trade-off. In a network partition scenario, rejecting a write (returning an error to the client) is safer than accepting a potentially inconsistent payment. |
| **Partition Tolerance** | Handled at the infrastructure level (replication, failover) rather than at the data model level. |

This makes PostgreSQL a **CP system** — the correct choice for a payment domain where **correctness** is non-negotiable. An eventually consistent store (e.g. DynamoDB, Cassandra) would introduce reconciliation complexity that is unacceptable for financial transactions.

**Why not a NoSQL store?**
- Payment data is inherently relational: a payment belongs to an order, has many events, and references an external provider resource.
- The query patterns (lookup by ID, by order, by provider reference) map naturally to indexed columns, not to access-pattern-driven key design.
- Schema enforcement at the database level adds a safety net for a domain where data corruption has real financial consequences.

### Service Communication

| Channel | Pattern | Use Case |
|---|---|---|
| **HTTP (Fastify)** | Request-Response | Client-facing operations: create payment, confirm intent, query status |
| **Kafka** | Async Event-Driven | Ingesting payment provider webhooks. Decouples webhook reception from processing, enabling retries and dead-letter handling without blocking the webhook endpoint. |

Kafka acts as a **durable buffer** between the external payment provider and the internal event processor. This ensures:
- **At-least-once delivery** — events are not lost if the service crashes mid-processing.
- **Replay capability** — events can be reprocessed from a specific offset.
- **Back-pressure handling** — spikes in webhook volume don't overwhelm the service.

### Trade-offs

| Decision | Benefit | Cost |
|---|---|---|
| **PostgreSQL over NoSQL** | Strong consistency, ACID, relational integrity | Horizontal scaling requires more effort (read replicas, partitioning) |
| **Kafka for webhook ingestion** | Durability, retry, replay, decoupling | Operational complexity; requires broker infrastructure |
| **Single service (modular monolith)** | Simpler deployment, no network overhead between layers, easier local development | Scaling is all-or-nothing; cannot scale read-heavy and write-heavy paths independently |
| **Stripe as sole provider** | Simplified gateway logic | Adding a second provider requires implementing `PaymentProviderGateway` + `PaymentEventMapper` and registering in the resolver |
| **Drizzle ORM** | Type-safe queries, lightweight, schema-as-code | Less mature ecosystem compared to Prisma/TypeORM; fewer community resources |
| **esbuild (unbundled)** | Fast builds, simple output | No tree-shaking; larger output than a bundled build |

---

## Patterns & Design Decisions

### Clean Architecture / Hexagonal Architecture

The codebase follows a strict **Ports & Adapters** (hexagonal) architecture with unidirectional dependency flow:

```
Adapters (HTTP, Kafka, Postgres, Stripe)
       │
       ▼
Application Layer (Services, Ports/Interfaces)
       │
       ▼
Domain Layer (Entities, Value Objects, Business Rules)
```

- **Domain** — pure business logic with zero infrastructure dependencies. Entities enforce their own invariants (e.g. `Payment.canTransitionTo()` encodes the status state machine).
- **Application** — orchestrates use cases by composing domain objects and port interfaces. Knows *what* to do, not *how*.
- **Ports** — TypeScript interfaces that define the contracts the application needs (repository, gateway, mapper). The application layer depends only on these abstractions.
- **Adapters** — concrete implementations of ports (PostgreSQL repositories, Stripe SDK gateway, Kafka consumer). Depend inward on the application layer, never the reverse.

This ensures the **domain and application layers are fully testable** without any infrastructure — swap in mock adapters and the business logic runs identically.

### Domain-Driven Design

Key DDD tactical patterns applied:

- **Entities** — `Payment` and `PaymentEvent` carry identity (`id`) and encapsulate business rules. `Payment` validates invariants on construction (positive amount, valid currency, non-empty orderId) and exposes `canTransitionTo(status)` encoding the status state machine.
- **Status State Machine** — valid payment transitions are enforced in the domain, not scattered across services:

```
initiated ──▶ processing ──▶ succeeded
    │              │
    ▼              ▼
 canceled        failed
```

- **Factory Methods** — `Payment.initiate(...)` encapsulates creation rules, ensuring every payment starts in a valid state.
- **Resolver Pattern** — `PaymentProviderGatewayResolver` and `PaymentEventMapperResolver` act as strategy selectors, mapping a provider name to its concrete implementation. This makes multi-provider support a matter of registering a new entry.

### Idempotency

Financial operations **must** be idempotent. The system handles this at two levels:

1. **Payment Creation** — each `createPayment` request carries an `idempotencyKey`. Before calling the Stripe gateway, the service checks if a payment with that key already exists and returns the existing result.
2. **Webhook Processing** — each `PaymentEvent` is stored with an `idempotencyKey` derived from the provider's event ID. Duplicate webhook deliveries are detected and short-circuited before any state mutation.

### Error Handling (RFC 9457)

HTTP errors follow the **RFC 9457 Problem Details** specification, returning structured JSON:

```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Not Found",
  "status": 404,
  "detail": "Payment with id '550e8400-e29b-41d4-a716-446655440000' not found"
}
```

Domain errors (`ValidationError`, `NotFoundError`, `ConflictError`) are mapped to HTTP status codes by a global Fastify error handler, keeping controllers thin and error formatting consistent.

### Dead Letter Queue & Retry Strategy

The Kafka consumer implements a resilient processing pipeline:

1. **Deterministic errors** (`ValidationError`, `ConflictError`) — fail immediately, no retry. These indicate bad data that will never succeed.
2. **Transient errors** — retried with **exponential backoff** (configurable attempts and base delay).
3. **Exhausted retries** — the message is published to `payment-events-dead-letter` with full context (original payload, error, attempt count) for manual investigation or automated reprocessing.

### Composition Root

All dependency wiring happens in a single `compositor.ts` file — the only place that knows about concrete implementations. This is the **Composition Root** pattern: the application's object graph is assembled in one location at startup, making dependencies explicit and the system easy to reconfigure.

---

## Payment Providers

The system uses a **resolver pattern** to support multiple payment providers behind a unified interface. Each provider requires two adapter implementations:

| Adapter | Interface | Responsibility |
|---|---|---|
| **Gateway** | `PaymentProviderGateway` | Creates payment intents and confirms payments against the provider API |
| **Event Mapper** | `PaymentEventMapper` | Translates provider-specific webhook payloads into domain `PaymentEvent` objects |

### Supported Providers

| Provider | Status | Operations |
|---|---|---|
| **Stripe** | Supported | Payment intent creation, payment confirmation, webhook event mapping (`payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`) |

### Adding a New Provider

The architecture is designed so that adding a provider requires **zero changes** to the domain or application layers:

1. Implement `PaymentProviderGateway` for the new provider (e.g. `adapters/braintree/payment-provider.gateway.ts`)
2. Implement `PaymentEventMapper` to translate the provider's webhook events to domain events
3. Register both in their respective resolvers inside `compositor.ts`
4. Add the provider name to the `PaymentProvider` type in the domain

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js + TypeScript 5.9 | Type-safe server-side JavaScript |
| **HTTP Framework** | Fastify 5 | High-performance HTTP server with schema validation |
| **Schema Validation** | Zod 4 + fastify-type-provider-zod | Runtime validation with TypeScript type inference |
| **API Documentation** | @fastify/swagger + @fastify/swagger-ui | Auto-generated OpenAPI docs at `/docs` |
| **Database** | PostgreSQL 16 | ACID-compliant relational store |
| **ORM** | Drizzle ORM | Type-safe, lightweight SQL query builder |
| **Message Broker** | Apache Kafka (KRaft) | Durable event streaming for webhook processing |
| **Payment Provider** | Stripe | Payment intent creation and confirmation |
| **Logging** | Pino | Structured JSON logging |
| **Monorepo** | Nx 22 | Build orchestration, dependency graph, task caching |
| **Build** | esbuild | Fast TypeScript compilation |
| **Containerisation** | Docker + Docker Compose | Local development and deployment |

---

## Project Structure

```
node-payments-system/
├── apps/
│   └── payment-service/
│       ├── Dockerfile
│       ├── project.json                    # Nx project configuration
│       └── src/
│           ├── main.ts                     # Entry point: env loading, bootstrap
│           ├── compositor.ts               # Composition root: wires all dependencies
│           ├── domain/
│           │   └── entities/
│           │       ├── payment.ts          # Payment entity with invariants & state machine
│           │       └── payment-event.ts    # PaymentEvent entity
│           ├── application/
│           │   ├── services/
│           │   │   ├── payment.service.ts          # Create, confirm, query payments
│           │   │   └── payment-event.service.ts    # Process webhook events
│           │   └── ports/
│           │       ├── payment.repository.ts               # Repository interface
│           │       ├── payment-event.repository.ts         # Event repository interface
│           │       ├── payment-provider.gateway.ts         # Provider gateway interface
│           │       ├── payment-provider-gateway.resolver.ts
│           │       ├── payment-event.mapper.ts             # Event mapper interface
│           │       └── payment-event-mapper.resolver.ts
│           └── adapters/
│               ├── http/fastify/
│               │   ├── payment.controller.ts   # REST endpoints
│               │   └── health.controller.ts    # Health check
│               ├── kafka/
│               │   └── payment-provider-event.consumer.ts  # Webhook event consumer
│               ├── postgres/
│               │   ├── db.schema.ts            # Merged Drizzle schema
│               │   ├── payment.schema.ts       # Payments table definition
│               │   ├── payment-event.schema.ts # Events table definition
│               │   ├── payment.repository.ts   # PostgreSQL implementation
│               │   └── payment-event.repository.ts
│               ├── stripe/
│               │   ├── payment-provider.gateway.ts # Stripe SDK integration
│               │   └── payment-event.mapper.ts     # Stripe event → domain mapping
│               └── resolvers/
│                   ├── payment-provider-gateway.resolver.ts
│                   └── payment-event-mapper.resolver.ts
├── libs/
│   ├── drizzle-pg/     # Shared Drizzle + pg pool client
│   ├── errors/         # Domain error hierarchy (AppError, ValidationError, etc.)
│   ├── fastify/        # Shared Fastify server factory + error handler
│   ├── http/           # HTTP error helpers (RFC 9457)
│   ├── kafka/          # Kafka client wrapper (producer + consumer)
│   ├── logger/         # Pino logger factory
│   ├── payment/        # Shared DTOs (Kafka message schemas)
│   └── utils/          # String utilities
├── docker-compose.yml
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## API Reference

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |

### Payments

| Method | Path | Description |
|---|---|---|
| `POST` | `/payments` | Create a payment intent |
| `GET` | `/payments/:id` | Get payment by internal ID |
| `GET` | `/payments/order/:orderId` | Get payment by order ID |
| `GET` | `/payments/provider/:provider/id/:providerPaymentId` | Get payment by provider reference |
| `POST` | `/payments/:id/confirm` | Confirm a payment intent |

Full OpenAPI documentation is available at **`/docs`** when the service is running.

#### Create Payment

```bash
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payment": {
      "amount": 2500,
      "currency": "usd",
      "orderId": "550e8400-e29b-41d4-a716-446655440000",
      "provider": "stripe",
      "description": "Order #1234"
    },
    "idempotencyKey": "unique-request-key-123"
  }'
```

#### Confirm Payment

```bash
curl -X POST http://localhost:3000/payments/{id}/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "pm_card_visa"
  }'
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) >= 20 (for local development)
- A [Stripe](https://stripe.com/) test API key

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PRIVATE_STRIPE_KEY` | Yes | — | Stripe secret key (`sk_test_...`) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `KAFKA_BROKERS` | Yes | — | Comma-separated Kafka broker addresses |
| `HTTP_HOST` | No | `0.0.0.0` | HTTP server bind address |
| `HTTP_PORT` | No | `80` | HTTP server port |
| `HTTP_RATE_LIMIT_MAX` | No | `100` | Max requests per time window |
| `HTTP_RATE_LIMIT_TIME_WINDOW` | No | `60000` | Rate limit window (ms) |
| `MESSAGING_RETRY_ATTEMPTS` | No | `3` | Kafka consumer retry attempts |
| `MESSAGING_RETRY_BASE_DELAY_MS` | No | `400` | Base delay for exponential backoff (ms) |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `NODE_ENV` | No | `development` | Environment identifier |

### Running with Docker Compose

The fastest way to get the full stack running:

```bash
# Set your Stripe test key
export PRIVATE_STRIPE_KEY=sk_test_your_key_here

# Start all services (PostgreSQL, Kafka, Payment Service)
docker compose up --build
```

Services will be available at:
- **Payment Service:** http://localhost:3000
- **API Docs (Swagger):** http://localhost:3000/docs
- **Adminer (DB UI):** http://localhost:8080

### Running Locally (Development)

```bash
# Install dependencies
npm install

# Start infrastructure only
docker compose up postgres kafka -d

# Set environment variables
export PRIVATE_STRIPE_KEY=sk_test_your_key_here
export DATABASE_URL=postgresql://payments:payments@localhost:5432/payments
export KAFKA_BROKERS=localhost:9092
export HTTP_PORT=3000

# Build and serve the payment service
npx nx serve payment-service
```

---

## Roadmap

- [ ] Idempotency enforcement on `createPayment` (lookup by idempotency key before gateway call)
- [ ] Database transactions wrapping multi-step mutations in `PaymentEventService`
- [ ] Value objects (`Money`, `PaymentStatus`) for stronger domain invariants
- [ ] Graceful shutdown (SIGTERM/SIGINT handling for HTTP, Kafka, and DB)
- [ ] Database migrations with `drizzle-kit`
- [ ] Unit and integration test suites
- [ ] Request correlation IDs through HTTP and Kafka headers

---

## License

MIT
