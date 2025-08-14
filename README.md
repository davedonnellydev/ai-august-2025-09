# Project 09 #AIAugustAppADay: Job Application Manager (3 day build)

![Last Commit](https://img.shields.io/github/last-commit/davedonnellydev/ai-august-2025-09)

**📆 Date**: 13/Aug/2025 - 16/Aug/2025  
**🎯 Project Objective**: A full stack application to manage job application tracking  
**🚀 Features**:

- **Day 1**: Able to add job ads to apply for, track those applications through the application lifecycle. Stretch goals: use code from the [Resume Critique Tool](https://github.com/davedonnellydev/ai-august-2025-05) to analyse CV & cover letter & suggest changes.
- **Day 2**: Set up a Gmail job leads email ingestor with daily auto-sync. Stretch goals: Frontend UI to manage sync timing & email label targeting.
- **Day 3**: Database to include user background information to auto-assess compatibility with each role. Stretch goals: auto-generate draft cover letter & CV tailoring.

**🛠️ Tech used**: Next.js, TypeScript, OpenAI APIs, Neon Postgres + Drizzle  
**▶️ Live Demo**: _[https://your-demo-url.com](https://your-demo-url.com)_  
_(Link will be added after deployment)_

## 🗒️ Summary

**Lessons learned**  
_A little summary of learnings_

**Blockers**  
_Note any blockers here_

**Final thoughts**  
_Any final thoughts here_

This project has been built as part of my AI August App-A-Day Challenge. You can read more information on the full project here: [https://github.com/davedonnellydev/ai-august-2025-challenge](https://github.com/davedonnellydev/ai-august-2025-challenge).

## 🧪 Testing

![CI](https://github.com/davedonnellydev/ai-august-2025-09/actions/workflows/npm_test.yml/badge.svg)  
_Note: Test suite runs automatically with each push/merge._

## Quick Start

1. **Clone and install:**

   ```bash
   git clone https://github.com/davedonnellydev/ai-august-2025-09.git
   cd ai-august-2025-09
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start development:**

   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# OpenAI API (for AI features)
OPENAI_API_KEY=your_openai_api_key_here

```

### Key Configuration Files

- `next.config.mjs` – Next.js config with bundle analyzer
- `tsconfig.json` – TypeScript config with path aliases (`@/*`)
- `theme.ts` – Mantine theme customization
- `eslint.config.mjs` – ESLint rules (Mantine + TS)
- `jest.config.cjs` – Jest testing config
- `.nvmrc` – Node.js version

### Path Aliases

```ts
import { Component } from '@/components/Component'; // instead of '../../../components/Component'
```

## Gmail Sync Setup
### Netlify Scheduled Function
The Gmail sync runs automatically every 2 hours via Netlify scheduled functions.

#### Configuration
1. **Environment Variables** (set in Netlify dashboard):
   ```
   CRON_SECRET=your-secret-here
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GMAIL_REDIRECT_URI=https://your-site.netlify.app/api/oauth/gmail/callback
   DATABASE_URL=your-neon-postgres-connection-string
   ```
2. **Schedule**: Runs every 2 hours (`0 */2 * * *`)

#### Manual Trigger
Test the sync function manually:
```bash
# Set your secret
export CRON_SECRET="your-secret-here"

# Trigger the function
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-site.netlify.app/.netlify/functions/gmail-sync
```
#### Expected Response
```json
{
  "success": true,
  "message": "Gmail sync completed (history API)",
  "data": {
    "method": "history_api",
    "userId": "2d30743e-10cb-4490-933c-4ccdf37364e9",
    "label": "Label_969329089524850868",
    "summary": {
      "processed": 3,
      "inserted": 2,
      "updated": 1,
      "linksCreated": 5,
      "errors": []
    },
    "timestamp": "2025-01-XX..."
  }
}
```
### Sync Methods
1. **History API** (preferred): Incremental sync using Gmail History API
2. **Label Scan** (fallback): Full scan when history is not available

### Monitoring

- **Netlify Logs**: Check function execution logs in Netlify dashboard
- **Database**: Monitor `email_messages` and `email_links` tables
- **Sync State**: Track `gmail_sync_state` table for sync position

## Development
### Prerequisites
- Node.js 18+
- Neon Postgres database
- Google Cloud Console project with Gmail API enabled

### Setup
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment variables** (create `.env.local`):
   ```
   DATABASE_URL=your-neon-postgres-url
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GMAIL_REDIRECT_URI=http://localhost:3000/api/oauth/gmail/callback
   CRON_SECRET=your-secret-here
   ```
3. **Database setup**:
   ```bash
   npm run db:generate  # Generate migrations
   npm run db:migrate   # Apply migrations
   npm run db:seed      # Seed initial data
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📦 Available Scripts

### Build and dev scripts

- `npm run dev` – start dev server
- `npm run build` – bundle application for production
- `npm run analyze` – analyze production bundle

### Testing scripts

- `npm run typecheck` – checks TypeScript types
- `npm run lint` – runs ESLint
- `npm run jest` – runs jest tests
- `npm run jest:watch` – starts jest watch
- `npm test` – runs `prettier:check`, `lint`, `typecheck` and `jest`

### Other scripts

- `npm run prettier:check` – checks files with Prettier
- `npm run prettier:write` – formats files with Prettier

## 📜 License

![GitHub License](https://img.shields.io/github/license/davedonnellydev/ai-august-2025-09)  
This project is licensed under the MIT License.
