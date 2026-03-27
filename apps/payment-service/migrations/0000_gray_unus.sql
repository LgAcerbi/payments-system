CREATE TYPE "public"."payment_provider" AS ENUM('stripe');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('initiated', 'processing', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."payment_event" AS ENUM('payment-initiated', 'payment-succeeded', 'payment-processing', 'payment-failed', 'payment-canceled');--> statement-breakpoint
CREATE TYPE "public"."payment_event_status" AS ENUM('created', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"amount" bigint NOT NULL,
	"amount_refunded" bigint,
	"description" varchar(255),
	"currency" varchar(3) NOT NULL,
	"status" "payment_status" NOT NULL,
	"order_id" uuid NOT NULL,
	"method" varchar(32) NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" varchar(255) NOT NULL,
	"provider_data" jsonb,
	"idempotency_key" varchar(32) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid,
	"event" "payment_event" NOT NULL,
	"status" "payment_event_status" NOT NULL,
	"failure_reason" varchar(1024),
	"idempotency_key" varchar(64) NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"provider_payment_id" varchar(255) NOT NULL,
	"provider_raw_payload" jsonb,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
