-- Drop existing job_lead_urls table with wrong schema
DROP TABLE "job_lead_urls" CASCADE;--> statement-breakpoint

-- Drop the old job_listings table if it exists
DROP TABLE IF EXISTS "job_listings" CASCADE;--> statement-breakpoint

-- Update the job_status enum to use underscores
ALTER TYPE "public"."job_status" RENAME VALUE 'added to huntr' TO 'added_to_huntr';--> statement-breakpoint

-- Create the new job_lead_urls table with correct schema
CREATE TABLE "job_lead_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"extraction_job_id" uuid,
	"status" "job_status" DEFAULT 'new' NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text,
	"type" "email_link_type" DEFAULT 'other' NOT NULL,
	"title" varchar(512),
	"company" varchar(512),
	"location" varchar(512),
	"seniority" varchar(64),
	"employment_type" varchar(64),
	"work_mode" varchar(32),
	"canonical_job_key" varchar(256),
	"anchor_text" text,
	"source_label_id" varchar(256),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.800',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "job_lead_urls" ADD CONSTRAINT "job_lead_urls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_lead_urls" ADD CONSTRAINT "job_lead_urls_email_id_email_messages_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_lead_urls" ADD CONSTRAINT "job_lead_urls_extraction_job_id_extraction_jobs_id_fk" FOREIGN KEY ("extraction_job_id") REFERENCES "public"."extraction_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Create indexes
CREATE UNIQUE INDEX "uq_leads_user_normalized_url" ON "job_lead_urls" USING btree ("user_id","normalized_url");--> statement-breakpoint
CREATE INDEX "idx_leads_canonical_job_key" ON "job_lead_urls" USING btree ("canonical_job_key");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "job_lead_urls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_user" ON "job_lead_urls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_leads_company" ON "job_lead_urls" USING btree ("company");
