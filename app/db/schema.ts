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
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== Enums =====
export const jobDecisionEnum = pgEnum('job_decision', [
  'undecided',
  'apply',
  'skip',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'new',
  'ready',
  'applied',
  'interview',
  'offer',
  'rejected',
  'archived',
]);

export const appStatusEnum = pgEnum('application_status', [
  'submitted',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'cv',
  'cover_letter',
  'note',
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

export const usersRelationsTable = relations(usersTable, ({ many }) => ({
  jobListings: many(jobListingsTable),
  applications: many(applicationsTable),
  documents: many(documentsTable),
  shareTokens: many(shareTokensTable),
}));

// ===== Companies =====
export const companiesTable = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    website: text('website'),
    linkedin: text('linkedin'),
    location: text('location'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('companies_name_website_uniq').on(t.name, t.website),
    index('companies_name_idx').on(t.name),
  ]
);

export const companiesRelationsTable = relations(
  companiesTable,
  ({ many }) => ({
    jobListings: many(jobListingsTable),
  })
);

// ===== Job Listings =====
export const jobListingsTable = pgTable(
  'job_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companiesTable.id, {
      onDelete: 'set null',
    }),

    source: text('source').notNull(), // 'manual' | 'gmail' | 'scrape' (free-text for flexibility)

    title: text('title'),
    location: text('location'),
    workMode: text('work_mode'), // 'onsite' | 'hybrid' | 'remote'
    employmentType: text('employment_type'), // 'full-time' | 'contract' | ...
    seniority: text('seniority'), // 'junior' | 'mid' | 'senior' | ...
    salaryMin: numeric('salary_min'),
    salaryMax: numeric('salary_max'),
    currency: text('currency'),

    url: text('url'),
    description: text('description'),
    rawContent: text('raw_content'),

    extracted: jsonb('extracted'), // AI-structured fields
    extractedConfidence: numeric('extracted_confidence'),

    decision: jobDecisionEnum('decision').notNull().default('undecided'),
    status: jobStatusEnum('status').notNull().default('new'),

    postedAt: timestamp('posted_at', { withTimezone: true }),
    discoveredAt: timestamp('discovered_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(), // update this in code on edits
  },
  (t) => [
    uniqueIndex('job_listings_user_url_uniq').on(t.userId, t.url),
    index('job_listings_status_idx').on(t.status),
    index('job_listings_decision_idx').on(t.decision),
    index('job_listings_user_idx').on(t.userId),
    index('job_listings_company_idx').on(t.companyId),
  ]
);

export const jobListingsRelationsTable = relations(
  jobListingsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [jobListingsTable.userId],
      references: [usersTable.id],
    }),
    company: one(companiesTable, {
      fields: [jobListingsTable.companyId],
      references: [companiesTable.id],
    }),
    applications: many(applicationsTable),
    documents: many(documentsTable),
  })
);

// ===== Applications =====
export const applicationsTable = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    jobListingId: uuid('job_listing_id')
      .notNull()
      .references(() => jobListingsTable.id, { onDelete: 'cascade' }),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submittedVia: text('submitted_via'), // 'company_site' | 'seek' | ...

    cvDocId: uuid('cv_doc_id').references(() => documentsTable.id, {
      onDelete: 'set null',
    }),
    coverLetterDocId: uuid('cover_letter_doc_id').references(
      () => documentsTable.id,
      {
        onDelete: 'set null',
      }
    ),

    status: appStatusEnum('status').notNull().default('submitted'),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('applications_user_idx').on(t.userId),
    index('applications_job_idx').on(t.jobListingId),
    index('applications_status_idx').on(t.status),
  ]
);

export const applicationsRelationsTable = relations(
  applicationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [applicationsTable.userId],
      references: [usersTable.id],
    }),
    jobListing: one(jobListingsTable, {
      fields: [applicationsTable.jobListingId],
      references: [jobListingsTable.id],
    }),
    cvDoc: one(documentsTable, {
      fields: [applicationsTable.cvDocId],
      references: [documentsTable.id],
    }),
    coverLetterDoc: one(documentsTable, {
      fields: [applicationsTable.coverLetterDocId],
      references: [documentsTable.id],
    }),
  })
);

// ===== Documents =====
export const documentsTable = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    jobListingId: uuid('job_listing_id').references(() => jobListingsTable.id, {
      onDelete: 'cascade',
    }),

    type: documentTypeEnum('type').notNull(), // 'cv' | 'cover_letter' | 'note'
    title: text('title'),
    content: text('content'), // markdown or plain text
    metadata: jsonb('metadata'), // e.g., base resume profile info

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('documents_user_idx').on(t.userId),
    index('documents_job_idx').on(t.jobListingId),
    index('documents_type_idx').on(t.type),
  ]
);

export const documentsRelationsTable = relations(documentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentsTable.userId],
    references: [usersTable.id],
  }),
  jobListing: one(jobListingsTable, {
    fields: [documentsTable.jobListingId],
    references: [jobListingsTable.id],
  }),
}));

// ===== Share Tokens (for public dashboards) =====
export const shareTokensTable = pgTable(
  'share_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),

    token: text('token').notNull().unique(), // random, unguessable
    purpose: text('purpose').notNull(), // e.g., 'dashboard'
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('share_tokens_token_idx').on(t.token),
    index('share_tokens_user_idx').on(t.userId),
  ]
);

export const shareTokensRelationsTable = relations(
  shareTokensTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [shareTokensTable.userId],
      references: [usersTable.id],
    }),
  })
);

// ===== EMAIL TABLES =====

export const providerEnum = pgEnum('email_provider', ['gmail']);
export const parseStatusEnum = pgEnum('email_parse_status', [
  'unprocessed',
  'parsed',
  'failed',
]);
export const linkTypeEnum = pgEnum('email_link_type', [
  'job_posting',
  'company',
  'unsubscribe',
  'tracking',
  'other',
]);
export const emailRelationEnum = pgEnum('email_relation_type', [
  'lead',
  'update',
  'interview',
  'rejection',
  'offer',
  'other',
]);

// ===== Email Messages Table =====

export const emailMessagesTable = pgTable(
  'email_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: providerEnum('provider').notNull().default('gmail'),
    providerMessageId: varchar('provider_message_id', {
      length: 128,
    }).notNull(), // Gmail message.id
    providerThreadId: varchar('provider_thread_id', { length: 128 }).notNull(), // Gmail thread.id
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),

    fromEmail: varchar('from_email', { length: 320 }).notNull(),
    fromName: varchar('from_name', { length: 256 }),
    toEmails: jsonb('to_emails').$type<string[]>().notNull().default([]),
    ccEmails: jsonb('cc_emails').$type<string[]>().notNull().default([]),
    bccEmails: jsonb('bcc_emails').$type<string[]>().notNull().default([]),

    subject: varchar('subject', { length: 1000 }).notNull(),
    snippet: varchar('snippet', { length: 2000 }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }),

    // Store one sanitized flavor for parsing/LLM; keep raw RFC out unless absolutely needed
    bodyText: text('body_text'), // plaintext version
    bodyHtmlClean: text('body_html_clean'), // stripped/cleaned HTML if available

    labels: jsonb('labels').$type<string[]>().notNull().default([]),

    messageHash: varchar('message_hash', { length: 64 }).notNull(), // e.g., sha256
    isIncoming: boolean('is_incoming').notNull().default(true),

    parseStatus: parseStatusEnum('parse_status')
      .notNull()
      .default('unprocessed'),
    parseError: text('parse_error'),
    jobSignalScore: numeric('job_signal_score', {
      precision: 4,
      scale: 3,
    }).default('0.000'), // 0.000–1.000

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

// ===== Email Links Table =====

export const emailLinksTable = pgTable('email_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailId: uuid('email_id')
    .notNull()
    .references(() => emailMessagesTable.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  normalizedUrl: text('normalized_url'),
  domain: varchar('domain', { length: 255 }),
  type: linkTypeEnum('type').notNull().default('other'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  statusCode: integer('status_code'),
});

// ===== Email to Job Listings Table =====
// Join emails to job listings/applications with a semantic relation
export const emailToJobListingsTable = pgTable(
  'email_to_job_listings',
  {
    emailId: uuid('email_id')
      .notNull()
      .references(() => emailMessagesTable.id, { onDelete: 'cascade' }),
    jobListingId: uuid('job_listing_id')
      .notNull()
      .references(() => jobListingsTable.id, { onDelete: 'cascade' }),
    relationType: emailRelationEnum('relation_type').notNull().default('lead'),
    confidence: numeric('confidence', { precision: 4, scale: 3 })
      .notNull()
      .default('0.750'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.emailId, t.jobListingId, t.relationType] })]
);

// ===== Gmail Sync State Table =====

export const gmailSyncStateTable = pgTable('gmail_sync_state', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  lastHistoryId: varchar('last_history_id', { length: 64 }), // for incremental syncs (if you adopt History API)
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
