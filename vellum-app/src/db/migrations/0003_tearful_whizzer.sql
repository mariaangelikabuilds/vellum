ALTER TABLE "documents" ADD COLUMN "mode" text DEFAULT 'researcher' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "intent" text;