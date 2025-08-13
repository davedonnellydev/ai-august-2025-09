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
