// scripts/seed.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';

import * as schema from '../db/schema';

const db = drizzle(process.env.DATABASE_URL!, { schema });

const {
  usersTable,
  companiesTable,
  jobListingsTable,
  applicationsTable,
  documentsTable,
} = schema;

async function main() {
  // --- Seed user (UPSERT by email) ---
  const email = 'davepauldonnelly@gmail.com';
  const displayName = 'Development User';
  const [user] = await db
    .insert(usersTable)
    .values({ email, displayName })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { displayName },
    })
    .returning();

  console.log('✅ user:', user);

  // --- Seed company (UPSERT by (name, website)) ---
  const companyName = 'Acme Corp';
  const companyWebsite = 'https://acme.example';
  const [company] = await db
    .insert(companiesTable)
    .values({
      name: companyName,
      website: companyWebsite,
      location: 'Sydney, Australia',
    })
    .onConflictDoUpdate({
      target: [companiesTable.name, companiesTable.website],
      set: { location: 'Sydney, Australia' },
    })
    .returning();

  console.log('✅ company:', company);

  // --- Seed job listing (UPSERT by (user_id, url)) ---
  const jobUrl = 'https://jobs.example/frontend-developer';
  const [listing] = await db
    .insert(jobListingsTable)
    .values({
      userId: user.id,
      companyId: company.id,
      source: 'manual',
      title: 'Frontend Developer',
      location: 'Sydney, Australia',
      workMode: 'hybrid',
      employmentType: 'full-time',
      seniority: 'mid',
      salaryMin: '90000',
      salaryMax: '110000',
      currency: 'AUD',
      url: jobUrl,
      description:
        'Join our team to build modern web applications with React, TypeScript, and Next.js.',
      decision: 'undecided',
      status: 'new',
    })
    .onConflictDoUpdate({
      target: [jobListingsTable.userId, jobListingsTable.url],
      set: {
        title: 'Frontend Developer',
        description:
          'Join our team to build modern web applications with React, TypeScript, and Next.js.',
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log('✅ job listing:', listing);

  // --- Seed document (FIND-OR-INSERT by (userId, jobListingId, type='cv')) ---
  const existingDoc = await db.query.documentsTable.findFirst({
    where: and(
      eq(documentsTable.userId, user.id),
      eq(documentsTable.jobListingId, listing.id),
      eq(documentsTable.type, 'cv')
    ),
  });

  const document =
    existingDoc ??
    (
      await db
        .insert(documentsTable)
        .values({
          userId: user.id,
          jobListingId: listing.id,
          type: 'cv',
          title: 'Tailored CV for Frontend Developer',
          content:
            '## John Doe — Frontend Developer\n\n- Built modern web apps using React, Next.js, TypeScript\n- Collaborated with cross-functional teams to deliver projects on time',
          metadata: { baseProfile: 'default' },
        })
        .returning()
    )[0];

  console.log('✅ document:', document);

  // --- Seed application (FIND-OR-INSERT by (userId, jobListingId)) ---
  const existingApp = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.userId, user.id),
      eq(applicationsTable.jobListingId, listing.id)
    ),
  });

  const application =
    existingApp ??
    (
      await db
        .insert(applicationsTable)
        .values({
          userId: user.id,
          jobListingId: listing.id,
          submittedAt: new Date(),
          submittedVia: 'company_site',
          cvDocId: document.id,
          status: 'submitted',
          notes: 'Applied via Acme careers portal.',
        })
        .returning()
    )[0];

  console.log('✅ application:', application);
  console.log('✨ Seed complete (idempotent). Re-run safe.');
}

main().catch((err) => {
  console.error('❌ Seeder error:', err);
  process.exit(1);
});
