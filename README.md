# RateLock — Distributed API Rate Limiter Dashboard

A production-ready SaaS-style developer platform for API key management, rate limiting, request analytics, abuse detection, and traffic monitoring.

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
