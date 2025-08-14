ALTER TABLE "email_links" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "email_messages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();