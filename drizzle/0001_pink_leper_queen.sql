CREATE TYPE "public"."email_link_type" AS ENUM('job_posting', 'company', 'unsubscribe', 'tracking', 'job_list', 'other');--> statement-breakpoint
CREATE TABLE "job_lead_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"extraction_job_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'new' NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text,
	"domain" varchar(255),
	"type" "email_link_type" DEFAULT 'other' NOT NULL,
	"status_code" integer,
	"description" text,
	"location" varchar(512),
	"title" varchar(512) NOT NULL,
	"employment_type" varchar(64),
	"remote" varchar(32),
	"salary_min" numeric,
	"salary_max" numeric,
	"currency" varchar(32),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.800',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "job_listings" CASCADE;--> statement-breakpoint
ALTER TABLE "job_lead_urls" ADD CONSTRAINT "job_lead_urls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_lead_urls" ADD CONSTRAINT "job_lead_urls_email_id_email_messages_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_lead_urls" ADD CONSTRAINT "job_lead_urls_extraction_job_id_extraction_jobs_id_fk" FOREIGN KEY ("extraction_job_id") REFERENCES "public"."extraction_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_listings_user_url_uniq" ON "job_lead_urls" USING btree ("user_id","url");--> statement-breakpoint
CREATE INDEX "job_listings_status_idx" ON "job_lead_urls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_listings_user_idx" ON "job_lead_urls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_listings_company_idx" ON "job_lead_urls" USING btree ("title");