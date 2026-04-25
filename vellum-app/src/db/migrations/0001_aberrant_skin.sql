ALTER TABLE "documents" ADD COLUMN "prose_text" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "published" boolean DEFAULT false;