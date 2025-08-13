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
