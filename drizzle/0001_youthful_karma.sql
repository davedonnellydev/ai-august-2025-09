CREATE TYPE "public"."email_relation_type" AS ENUM('lead', 'update', 'interview', 'rejection', 'offer', 'other');--> statement-breakpoint
CREATE TYPE "public"."email_link_type" AS ENUM('job_posting', 'company', 'unsubscribe', 'tracking', 'other');--> statement-breakpoint
CREATE TYPE "public"."email_parse_status" AS ENUM('unprocessed', 'parsed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail');--> statement-breakpoint
CREATE TABLE "email_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email_id" uuid NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text,
	"domain" varchar(255),
	"type" "email_link_type" DEFAULT 'other' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"status_code" integer
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" "email_provider" DEFAULT 'gmail' NOT NULL,
	"provider_message_id" varchar(128) NOT NULL,
	"provider_thread_id" varchar(128) NOT NULL,
	"user_id" uuid NOT NULL,
	"from_email" varchar(320) NOT NULL,
	"from_name" varchar(256),
	"to_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bcc_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" varchar(1000) NOT NULL,
	"snippet" varchar(2000),
	"sent_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone,
	"body_text" text,
	"body_html_clean" text,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message_hash" varchar(64) NOT NULL,
	"is_incoming" boolean DEFAULT true NOT NULL,
	"parse_status" "email_parse_status" DEFAULT 'unprocessed' NOT NULL,
	"parse_error" text,
	"job_signal_score" numeric(4, 3) DEFAULT '0.000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_to_job_listings" (
	"email_id" uuid NOT NULL,
	"job_listing_id" uuid NOT NULL,
	"relation_type" "email_relation_type" DEFAULT 'lead' NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.750' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_to_job_listings_email_id_job_listing_id_relation_type_pk" PRIMARY KEY("email_id","job_listing_id","relation_type")
);
--> statement-breakpoint
CREATE TABLE "gmail_sync_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"last_history_id" varchar(64),
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_links" ADD CONSTRAINT "email_links_email_id_email_messages_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_to_job_listings" ADD CONSTRAINT "email_to_job_listings_email_id_email_messages_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_to_job_listings" ADD CONSTRAINT "email_to_job_listings_job_listing_id_job_listings_id_fk" FOREIGN KEY ("job_listing_id") REFERENCES "public"."job_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_sync_state" ADD CONSTRAINT "gmail_sync_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_email_user_provider_msg" ON "email_messages" USING btree ("user_id","provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "idx_email_user_sent_at" ON "email_messages" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_email_user_hash" ON "email_messages" USING btree ("user_id","message_hash");--> statement-breakpoint
CREATE INDEX "idx_email_parse_status" ON "email_messages" USING btree ("parse_status");