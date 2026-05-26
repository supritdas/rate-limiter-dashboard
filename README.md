# RateLock — Distributed API Rate Limiter Dashboard

A production-ready SaaS-style developer platform for API key management, rate limiting, request analytics, abuse detection, and traffic monitoring.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / Rate Limiter | Redis |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Validation | Zod |
| Frontend | React 18 + React Router v6 |
| State | Zustand |
| Charts | Recharts |
| Styling | CSS Modules |

---

## Project Structure

```
rate-limiter-dashboard/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # DB schema (User, ApiKey, RequestLog, AbuseFlag)
│   └── src/
│       ├── app.ts                 # Express entry point
│       ├── config/
│       │   ├── env.ts             # Zod-validated env vars
│       │   └── redis.ts           # Redis client
│       ├── middleware/
│       │   ├── auth.middleware.ts      # JWT auth
│       │   ├── admin.middleware.ts     # Admin role guard
│       │   ├── rateLimiter.middleware.ts # API key validation + rate limit
│       │   └── error.middleware.ts
│       ├── modules/
│       │   ├── auth/              # Register, login, /me
│       │   ├── apikeys/           # CRUD + stats for API keys
│       │   ├── analytics/         # Overview, timeseries, latency, top IPs/keys
│       │   ├── requests/          # Paginated request log viewer
│       │   └── admin/             # User management, abuse flag resolution
│       ├── services/
│       │   ├── rateLimiter.service.ts  # Fixed window + sliding window algorithms
│       │   ├── logger.service.ts       # Request log writer + reader
│       │   └── abuse.service.ts        # Burst + IP + block-ratio detection
│       ├── types/
│       │   └── express.d.ts       # Express Request augmentation
│       └── utils/
│           └── asyncHandler.ts
└── frontend/
    └── src/
        ├── App.tsx                # React Router setup
        ├── store/
        │   └── auth.store.ts      # Zustand auth store
        ├── hooks/
        │   └── index.ts           # useFetch + domain hooks
        ├── lib/
        │   └── api.ts             # Axios instance with JWT interceptor
        ├── types/
        │   └── index.ts           # Shared TypeScript types
        ├── components/
        │   ├── layout/            # DashboardLayout + sidebar nav
        │   └── ui/                # Card, Button, Badge, Modal, StatCard, Spinner
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx
            ├── DashboardPage.tsx  # Overview + traffic chart + latency
            ├── ApiKeysPage.tsx    # Create, list, toggle, revoke keys
            ├── AnalyticsPage.tsx  # Time series, top IPs, latency breakdown
            ├── RequestLogsPage.tsx # Full paginated request log table
            └── AdminPage.tsx      # User management + abuse flag resolution
```

---

## Request Lifecycle

```
Incoming Request
      │
      ▼
JWT Auth Middleware (Bearer token)
      │
      ▼
API Key Validation (x-api-key header → SHA-256 hash → Redis cache → DB)
      │
      ▼
Rate Limiter Middleware
  ├── Fixed Window  → Redis INCR + EXPIRE per time bucket
  └── Sliding Window → Redis ZADD/ZREMRANGEBYSCORE (Lua script, atomic)
      │
      ├── 429 Too Many Requests → Log (blocked=true) → Abuse Detection
      │
      ▼
Route Handler
      │
      ▼
res.on("finish") → Request Logger (async, non-blocking)
      │
      ▼
Response (with X-RateLimit-* headers)
```

---

## Rate Limiting Algorithms

### Fixed Window Counter
- Key: `rl:fixed:{apiKeyId}:{windowStart}`
- Resets sharply at window boundary
- Lower Redis overhead, slight burst vulnerability at window edge

### Sliding Window Log
- Key: `rl:sliding:{apiKeyId}` (Sorted Set by timestamp)
- Atomic Lua script: removes expired entries, counts, conditionally adds
- Smooth, no boundary burst — higher accuracy

---

## Abuse Detection

Three signals are checked per request:

1. **Burst detection** — More than 50 requests from a single IP in 10 seconds
2. **IP spread** — Same key used from more than 20 unique IPs in 1 hour (key leak indicator)
3. **Block ratio** — More than 80% of last 100 requests were blocked (chronic violator)

Flagged keys appear in the Admin → Abuse Flags tab and can be resolved there.

---

## Quick Start

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL on `5432` and Redis on `6379`.

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — set JWT_SECRET to something secure

npm install
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to DB (dev)
npm run dev           # starts on http://localhost:4000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:5173
```

### 4. Or run both from root

```bash
npm install           # installs concurrently
npm run install:all   # installs backend + frontend deps
npm run dev           # runs both in parallel
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### API Keys (JWT required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/keys` | Create key |
| GET | `/api/keys` | List all keys |
| GET | `/api/keys/:id` | Get one key |
| PATCH | `/api/keys/:id` | Update key |
| DELETE | `/api/keys/:id` | Revoke key |
| GET | `/api/keys/:id/stats` | Key request stats |

### Analytics (JWT required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/overview` | Summary stats |
| GET | `/api/analytics/timeseries?hours=24` | Hourly traffic |
| GET | `/api/analytics/top-keys` | Top keys by traffic |
| GET | `/api/analytics/top-ips` | Top IPs |
| GET | `/api/analytics/latency` | p50/p95/p99 latency |

### Request Logs (JWT required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/requests?page=1&blocked=true` | Paginated logs |

### Admin (JWT + admin role required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | System-wide stats |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/role` | Promote/demote user |
| GET | `/api/admin/abuse-flags` | List open abuse flags |
| PATCH | `/api/admin/abuse-flags/:id/resolve` | Resolve a flag |

### Using Rate Limiting on Your Routes
Pass `x-api-key` header to any protected route:

```bash
curl -H "x-api-key: rl_your_key_here" http://your-api.com/endpoint
```

Response headers on every request:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1716638400000
X-RateLimit-Algorithm: sliding
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/rate_limiter_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-min-16-chars
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```
