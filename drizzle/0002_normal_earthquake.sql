CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('new', 'undecided', 'added to huntr', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."email_parse_status" AS ENUM('unprocessed', 'parsed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail');--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "email_provider" DEFAULT 'gmail' NOT NULL,
	"provider_message_id" varchar(128) NOT NULL,
	"provider_thread_id" varchar(128) NOT NULL,
	"label_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"from_email" varchar(320) NOT NULL,
	"from_name" varchar(256),
	"to_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" varchar(1000) NOT NULL,
	"snippet" varchar(2000),
	"sent_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone,
	"body_text" text,
	"body_html" text,
	"parse_status" "email_parse_status" DEFAULT 'unprocessed' NOT NULL,
	"parse_error" text,
	"message_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"model" varchar(64) DEFAULT 'gpt-4.1-mini' NOT NULL,
	"prompt_version" varchar(32) DEFAULT 'v1' NOT NULL,
	"instructions_snapshot" text,
	"output" jsonb,
	"error" text,
	"tokens_prompt" integer DEFAULT 0,
	"tokens_completion" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_labels_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_label_id" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"access_token" text,
	"refresh_token" text NOT NULL,
	"expiry_date" timestamp with time zone,
	"scope" text NOT NULL,
	"token_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_id" uuid NOT NULL,
	"source_message_id" varchar(128),
	"location" varchar(512),
	"title" varchar(512) NOT NULL,
	"employment_type" varchar(64),
	"remote" varchar(32),
	"url" text,
	"salary_min" numeric,
	"salary_max" numeric,
	"currency" varchar(32),
	"description" text,
	"status" "job_status" DEFAULT 'new' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.800',
	"posted_at" timestamp with time zone,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" varchar(16) NOT NULL,
	"watched_label_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"scanned" integer DEFAULT 0,
	"new_emails" integer DEFAULT 0,
	"jobs_created" integer DEFAULT 0,
	"jobs_updated" integer DEFAULT 0,
	"errors" integer DEFAULT 0,
	"last_history_id" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"watched_label_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cron_frequency_minutes" integer DEFAULT 1440 NOT NULL,
	"custom_instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_email_id_email_messages_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_labels_cache" ADD CONSTRAINT "gmail_labels_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_tokens" ADD CONSTRAINT "gmail_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_email_id_email_messages_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_email_user_provider_msg" ON "email_messages" USING btree ("user_id","provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "idx_email_user_sent_at" ON "email_messages" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_email_user_hash" ON "email_messages" USING btree ("user_id","message_hash");--> statement-breakpoint
CREATE INDEX "idx_email_parse_status" ON "email_messages" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "idx_jobs_user_email" ON "extraction_jobs" USING btree ("user_id","email_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "extraction_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_labels_user_provider" ON "gmail_labels_cache" USING btree ("user_id","provider_label_id");--> statement-breakpoint
CREATE INDEX "idx_labels_user" ON "gmail_labels_cache" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gmail_tokens_user" ON "gmail_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_listings_user_url_uniq" ON "job_listings" USING btree ("user_id","url");--> statement-breakpoint
CREATE INDEX "job_listings_status_idx" ON "job_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_listings_user_idx" ON "job_listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_listings_company_idx" ON "job_listings" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_runs_user_time" ON "sync_state" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");