# Contributing to YudoList

Thanks for taking the time to contribute! This document covers the basics to get you started.

## Development Setup

```bash
# Backend
cd backend && npm install
cp .env.example .env
npm run db:generate && npm run db:push
npm run dev

# Frontend (separate terminal)
cd frontend && npm install
npm run dev
```

## Before Submitting a PR

1. **One problem per PR** — keep the scope small and focused
2. **No new dependencies** without a clear explanation in the PR description
3. **Run the type checker** before pushing:
   ```bash
   # Frontend
   cd frontend && npx tsc --noEmit

   # Backend
   cd backend && npx tsc --noEmit
   ```
4. **Database changes** must include a Prisma migration:
   ```bash
   cd backend && npx prisma migrate dev --name describe-your-change
   ```

## Code Style

- All **code comments in English**
- Component files: `PascalCase.tsx`; utility files: `camelCase.ts`
- Single files stay under **200 lines** — split if larger
- No `any` types; use `unknown` + type guards when needed
- Business logic lives in Zustand stores or hooks, not in components
- All interactive elements need hover / focus / active states

## Commit Messages

Use the imperative mood and keep it under 72 characters:

```
add calendar date filter to list API
fix undo stack corruption on concurrent edits
refactor listStore to split helpers into separate file
```

## Reporting Bugs

Please use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template and include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version

## Suggesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template. Features should align with the core design principle: **keyboard-first, distraction-free**.
