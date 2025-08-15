// scripts/seed.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../db/schema';

const db = drizzle(process.env.DATABASE_URL!, { schema });

const {
    usersTable,
    gmailLabelsCacheTable,
    userSettingsTable,
    emailMessagesTable,
    extractionJobsTable,
    jobLeadUrlsTable,
    syncStateTable,
  } = schema;

async function main() {
    console.log('🌱 Seeding (idempotent) - safe to re-run');

  console.log('🧹 Clearing cron-synced tables...');
  await db.delete(emailMessagesTable);
  await db.delete(extractionJobsTable);
  await db.delete(jobLeadUrlsTable);
  await db.delete(syncStateTable);
  console.log('✅ Cleared cron-synced tables (email_links, email_messages, gmail_sync_state)');

  
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

  console.log('✅ user:', { id: user.id, email: user.email });

// --- Seed Gmail labels cache ---
const [label] = await db
.insert(gmailLabelsCacheTable)
.values({
    userId: user.id,
    providerLabelId: 'Label_969329089524850868',
    name: 'Job Leads',
    type: 'user',
})
.onConflictDoUpdate({
    target: [gmailLabelsCacheTable.userId, gmailLabelsCacheTable.providerLabelId],
    set: {
        name: 'Job Leads',
        type: 'user',
        updatedAt: new Date()
    },
  })
  .returning();
  console.log('✅ gmail_labels_cache:', { id: label.id, providerLabelId: label.providerLabelId });

 // --- Seed User Settings ---
 const [userSetting] = await db
    .insert(userSettingsTable)
    .values({
        userId: user.id,
        watchedLabelIds: [label.providerLabelId],
        cronFrequencyMinutes: 1440,
        customInstructions: '',
    })
    .onConflictDoUpdate({
        target: [userSettingsTable.userId],
        set: {
            watchedLabelIds: userSettingsTable.watchedLabelIds,
            cronFrequencyMinutes: userSettingsTable.cronFrequencyMinutes,
            customInstructions: userSettingsTable.customInstructions,
            updatedAt: new Date()
        },
      })
    .returning();

console.log('✅ user_settings:', { userId: userSetting.userId });
console.log('✨ Seed complete (idempotent). Re-run safe.');
}

main().catch((err) => {
  console.error('❌ Seeder error:', err);
  process.exit(1);
});
