<div align="center">

# 🏗️ Schemadrome — Schema-Driven Stateful API Sandbox

**Not just mock data. Real API behavior from your schema.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
</div>

## 📖 What is Schemadrome?

Swagger UI shows documentation. json-server returns static data. Neither simulates **real API behavior**. Frontend teams and QA engineers need APIs that actually maintain state, understand relationships, and support multi-step workflows.

Schemadrome imports your OpenAPI 3.x or GraphQL schema and generates a **stateful**, **foreign-key-aware** API sandbox. POST a user, GET it back. POST to `/users/1/posts` → correctly linked. Record scenarios, replay as tests, export to Postman or Playwright.

## ✨ Features

- 📥 **Schema Import** — OpenAPI 3.x JSON/YAML or GraphQL schema → instant API
- 🧠 **Stateful Engine** — POST creates, GET returns, PUT updates, DELETE removes. Real state.
- 🔗 **Foreign Key Aware** — `/users/1/posts` correctly links to user 1, not random data
- 🎬 **Scenario Recorder** — Record multi-step API calls, replay as test suite
- 🎲 **Smart Data Generator** — Constraint-aware: unique emails, valid dates, realistic names
- 📤 **Export** — Postman collection, Playwright test, or cURL commands
- 📝 **Monaco Editor** — View and edit schemas with syntax highlighting
- 🧭 **API Explorer** — Collapsible sidebar with all endpoints
- 📊 **Response Viewer** — Pretty-printed JSON, headers, timing, status codes
- 🌓 **Dark/Light Theme**

## 📸 Screenshots

| Landing Page | Dashboard |
|:---:|:---:|
| ![Schemadrome Hero](screenshots/hero.png) | ![Schemadrome Dashboard](screenshots/dashboard.png) |

> 💡 *Run locally to see the full interactive experience: `pnpm dev` then open http://localhost:3000*


## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│               Schemadrome                      │
├──────────────┬──────────────┬────────────────┤
│   Frontend   │   Backend    │  Mock Engine   │
│  Next.js 14  │  API Routes  │  State Manager │
│  Monaco      │  Prisma ORM  │  FK Resolver   │
│  API Explorer│  SQLite      │  Data Gen      │
│  Framer      │  Zod Valid   │  Scenario Run  │
└──────────────┴──────────────┴────────────────┘
```

## 🚀 Quick Start

```bash
git clone https://github.com/adlptv/schemadrome.git
cd schemadrome
pnpm install
pnpm dev
# → Import your OpenAPI/GraphQL schema at http://localhost:3000
```

Docker:
```bash
docker-compose up
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import` | Import OpenAPI/GraphQL schema |
| GET | `/api/schemas` | List imported schemas |
| GET/DELETE | `/api/schemas/[id]` | Get/delete schema |
| ALL | `/api/mock/[...path]` | Stateful mock endpoint (catch-all) |
| GET/POST | `/api/scenarios` | List/create scenarios |
| POST | `/api/scenarios/[id]/run` | Run scenario |
| GET | `/api/export/[id]` | Export as Postman/Playwright/cURL |
| GET | `/api/health` | Health check |

## 🎯 Use Cases

- **Frontend Dev:** Develop UI before backend is ready
- **QA:** Create reproducible test scenarios
- **API Design:** Prototype and validate schema design
- **Onboarding:** New team members explore API without setting up backend

## 🔒 Security

- ✅ Zod validation all routes
- ✅ Rate limiting
- ✅ Helmet.js headers
- ✅ CORS configurable
- ✅ Sandbox isolation (no shared state between sessions)

## 📄 License

MIT © [adlptv](https://github.com/adlptv)

---

⭐ Star to support!
