// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const jobStatusEnum = pgEnum('job_status', [
  'new',
  'undecided',
  'added_to_huntr',
  'rejected',
  'duplicate',
]);
export const providerEnum = pgEnum('email_provider', ['gmail']);
export const parseStatusEnum = pgEnum('email_parse_status', [
  'unprocessed',
  'parsed',
  'failed',
]);
export const extractionStatusEnum = pgEnum("extraction_status", [
    "pending", "processing", "succeeded", "failed"
  ]);
export const linkTypeEnum = pgEnum('email_link_type', [
    'job_posting',
    'company',
    'unsubscribe',
    'tracking',
    'job_list',
    'other',
  ]);

// ===== Users =====
export const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)]
);

// ===== Gmail Tokens Table =====

export const gmailTokensTable = pgTable(
    'gmail_tokens',
    {
      userId: uuid('user_id')
        .primaryKey()
        .references(() => usersTable.id, { onDelete: 'cascade' }),
      accessToken: text('access_token'),
      refreshToken: text('refresh_token').notNull(),
      expiryDate: timestamp('expiry_date', { withTimezone: true }),
      scope: text('scope').notNull(),
      tokenType: text('token_type').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [index('idx_gmail_tokens_user').on(t.userId)]
  );

// ===== Gmail Tokens Relations =====

export const gmailTokensRelationsTable = relations(
    gmailTokensTable,
    ({ one }) => ({
      user: one(usersTable, {
        fields: [gmailTokensTable.userId],
        references: [usersTable.id],
      }),
    })
  );

// --- Cached Gmail labels for UI ---
export const gmailLabelsCacheTable = pgTable("gmail_labels_cache", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    providerLabelId: varchar("provider_label_id", { length: 256 }).notNull(), // Gmail's label.id
    name: varchar("name", { length: 256 }).notNull(),
    type: varchar("type", { length: 64 }), // system/user
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }, (t) => [
    uniqueIndex("uq_labels_user_provider").on(t.userId, t.providerLabelId),
    index("idx_labels_user").on(t.userId),
  ]);


 // --- User Settings: labels to watch, frequency, custom instructions ---
export const userSettingsTable = pgTable("user_settings", {
    userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
    watchedLabelIds: jsonb("watched_label_ids").$type<string[]>().notNull().default([]), // Gmail label IDs
    cronFrequencyMinutes: integer("cron_frequency_minutes").notNull().default(1440), // 60..1440
    customInstructions: text("custom_instructions"), // user-curation rules for extraction
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  });

// ===== Email Messages Table =====

export const emailMessagesTable = pgTable(
    'email_messages',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id')
          .notNull()
          .references(() => usersTable.id, { onDelete: 'cascade' }),
      provider: providerEnum('provider').notNull().default('gmail'),
      providerMessageId: varchar('provider_message_id', {
        length: 128,
    }).notNull(), // Gmail message.id
    providerThreadId: varchar('provider_thread_id', { length: 128 }).notNull(), // Gmail thread.id
    labelIds: jsonb('label_ids').$type<string[]>().notNull().default([]),
    fromEmail: varchar('from_email', { length: 320 }).notNull(),
    fromName: varchar('from_name', { length: 256 }),
    toEmails: jsonb('to_emails').$type<string[]>().notNull().default([]),
    ccEmails: jsonb('cc_emails').$type<string[]>().notNull().default([]),
  
    subject: varchar('subject', { length: 1000 }).notNull(),
    snippet: varchar('snippet', { length: 2000 }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }),
  
    bodyText: text('body_text'), // plaintext version
    bodyHtml: text('body_html'), // raw/cleaned html
    parseStatus: parseStatusEnum('parse_status')
      .notNull()
      .default('unprocessed'),
    parseError: text('parse_error'),
    messageHash: varchar('message_hash', { length: 64 }).notNull(), // e.g., sha256
      createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      uniqueIndex('uq_email_user_provider_msg').on(
        t.userId,
        t.provider,
        t.providerMessageId
      ),
      index('idx_email_user_sent_at').on(t.userId, t.sentAt),
      index('idx_email_user_hash').on(t.userId, t.messageHash),
      index('idx_email_parse_status').on(t.parseStatus),
    ]
  );

// --- OpenAI extraction jobs (audit + retries) ---
export const extractionJobsTable = pgTable("extraction_jobs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    emailId: uuid("email_id").notNull().references(() => emailMessagesTable.id, { onDelete: "cascade" }),
    status: extractionStatusEnum("status").notNull().default("pending"),
    model: varchar("model", { length: 64 }).notNull().default("gpt-4.1-mini"), // or whatever you choose
    promptVersion: varchar("prompt_version", { length: 32 }).notNull().default("v1"),
    instructionsSnapshot: text("instructions_snapshot"), // copy of userSettings.customInstructions at run time
    output: jsonb("output"), // structured output from LLM
    error: text("error"),
    tokensPrompt: integer("tokens_prompt").default(0),
    tokensCompletion: integer("tokens_completion").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }, (t) => [
    index("idx_jobs_user_email").on(t.userId, t.emailId),
    index("idx_jobs_status").on(t.status),
  ]);

// ===== Job Lead URLs =====
export const jobLeadUrlsTable = pgTable(
    'job_lead_urls',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id')
        .notNull()
        .references(() => usersTable.id, { onDelete: 'cascade' }),
      emailId: uuid("email_id").notNull().references(() => emailMessagesTable.id, { onDelete: "cascade" }),
      extractionJobId: uuid('extraction_job_id').references(() => extractionJobsTable.id, { onDelete: 'set null'}),
      status: jobStatusEnum('status').notNull().default('new'),

      url: text('url').notNull(),
      normalizedUrl: text('normalized_url'),
      type: linkTypeEnum('type').notNull().default('other'),
      
      // Optional job details extracted from email content
      title: varchar('title', { length: 512 }),
      company: varchar('company', { length: 512 }),
      location: varchar('location', { length: 512 }),
      seniority: varchar('seniority', { length: 64 }), // 'junior' | 'mid' | 'senior' | ...
      employmentType: varchar('employment_type', { length: 64 }), // 'full-time' | 'contract' | ...
      workMode: varchar('work_mode', { length: 32 }), // 'onsite' | 'hybrid' | 'remote'
      
      // Deduplication and tracking
      canonicalJobKey: varchar('canonical_job_key', { length: 256 }), // hash for soft dedupe
      anchorText: text('anchor_text'), // link text from email
      sourceLabelId: varchar('source_label_id', { length: 256 }), // Gmail label that contained this
      firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
      
      // Metadata
      tags: jsonb("tags").$type<string[]>().notNull().default([]),
      confidence: numeric("confidence", { precision: 4, scale: 3 }).default("0.800"),  
      createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      uniqueIndex('uq_leads_user_normalized_url').on(t.userId, t.normalizedUrl),
      index('idx_leads_canonical_job_key').on(t.canonicalJobKey),
      index('idx_leads_status').on(t.status),
      index('idx_leads_user').on(t.userId),
      index('idx_leads_company').on(t.company),
    ]
  );

// ===== Gmail Sync State Table =====

export const syncStateTable = pgTable('sync_state', {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    mode: varchar("mode", { length: 16 }).notNull(), // "cron" | "manual"
    watchedLabelIds: jsonb("watched_label_ids").$type<string[]>().notNull().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    scanned: integer("scanned").default(0),
    newEmails: integer("new_emails").default(0),
    jobsCreated: integer("jobs_created").default(0),
    jobsUpdated: integer("jobs_updated").default(0),
    errors: integer("errors").default(0),   
    lastHistoryId: varchar('last_history_id', { length: 64 }), // for incremental syncs
  }, (t) => [
    index("idx_runs_user_time").on(t.userId, t.startedAt)
  ]);

