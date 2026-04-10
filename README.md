# TeamLunch APP

TeamLunch lets office colleagues collaboratively pick a lunch restaurant in real-time. One person creates a session, peers join it, everyone submits restaurant suggestions, and the initiator ends the session — triggering a random pick broadcast to all members.

## Technology Stack

- **Backend:** NestJS (TypeScript, TypeORM, Socket.IO)
- **Frontend:** Next.js (React, TypeScript, TanStack Query)
- **Database:** MySQL
- **Auth:** Google OAuth 2.0 via Passport

## High-Level Architecture

```
Browser
  teamLunchApp (Next.js 14)
  ┌──────────────┐   REST/HTTPS   ┌────────────────────────┐
  │  React Pages │ ─────────────▶ │  teamLunchApi (NestJS) │
  │  Socket.IO   │ ◀────WS──────  │  + Socket.IO Gateway   │
  └──────────────┘                └──────────┬─────────────┘
                                             │ TypeORM
                                   ┌─────────▼───────────┐
                                   │    MySQL 8.0         │
                                   └─────────────────────┘
```

## 4. Repository Structure

```
TeamLunch/
├── teamLunchApi/              ← NestJS backend
│   ├── src/
│   │   ├── auth/              ← Google OAuth, JWT strategy, guards
│   │   ├── sessions/          ← Session CRUD + business logic
│   │   ├── restaurants/       ← Restaurant submission
│   │   ├── realtime/          ← Socket.IO gateway
│   │   ├── common/            ← Guards, filters, interceptors, pipes
│   │   ├── database/          ← TypeORM config, migrations
│   │   └── main.ts
│   ├── test/                  ← e2e tests (Supertest)
│   ├── Dockerfile
│   └── package.json
│
├── teamLunchApp/              ← Next.js frontend
│   ├── app/                   ← App Router pages
│   │   ├── (auth)/            ← Login page
│   │   ├── sessions/          ← Session list and detail pages
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/                   ← API client, socket client, hooks
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── .env.example
```

## Setup & Running

1. **Clone the repo.**
2. **Environment mapping:** Configure standard `.env` variables from `.env.example` in both `team-lunch-api` and `team-lunch-app` if necessary. (Ensure Google Client variables are correctly placed).
3. **Full Deployment
```bash
docker-compose up -d

```
4. **Database Spin-up:**
```bash
docker-compose up -d db
```
5. **Backend Setup:**
```bash
cd team-lunch-api
npm install
npm run start:dev
```
6. **Frontend Setup:**
```bash
cd team-lunch-app
npm install
npm run dev
```

## Testing

For Backend E2E Tests, start the database, configure local `.env` and execute:
```bash
cd team-lunch-api
npm run test:e2e
```

For Playwright E2E UI Happy Path:
```bash
cd team-lunch-app
npx playwright test
```

