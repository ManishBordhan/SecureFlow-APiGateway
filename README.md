\## Intelligent API Gateway with Rate Limiting \& Abuse Detection



A production-grade API Gateway built as an MCA final semester project.

Implements authentication, dynamic proxying, three rate limiting algorithms,

and an intelligent abuse detection engine with a real-time admin dashboard.



\---



\## Architecture Overview



Client Request

│

▼

┌─────────────────────────────────────────┐

│           API Gateway (Port 3000)        │

│                                         │

│  1. Request Logger   → MongoDB + Socket │

│  2. Abuse Detection  → Redis scoring    │

│  3. Authentication   → JWT / API Key    │

│  4. Rate Limiter     → Token Bucket /   │

│                        Sliding Window / │

│                        Fixed Window     │

│  5. Proxy Service    → Upstream         │

└─────────────────────────────────────────┘

│

▼

Upstream Service (jsonplaceholder / microservices)



\---



\## Tech Stack



| Layer          | Technology         | Reason                                      |

|----------------|--------------------|---------------------------------------------|

| Runtime        | Node.js + Express  | High I/O throughput, ideal for a gateway    |

| Database       | MongoDB            | Log-heavy, event-driven, flexible schema    |

| Cache / Store  | Redis              | Sub-millisecond counters and blocklist      |

| Auth           | JWT + API Keys     | Dual-mode, production standard              |

| Real-time      | Socket.IO          | Live traffic feed to admin dashboard        |

| Logging        | Pino               | Structured JSON logging, low overhead       |

| Testing        | Jest + Supertest   | Unit and integration test coverage          |

| containers     | Docker + Compose   | Reproducible environment                    |



\---



\## Project Structure



gateway/

├── src/

│   ├── controllers/        # Request handlers

│   ├── middleware/         # Auth, rate limiter, abuse detection, logger

│   ├── routes/             # Route definitions

│   ├── services/

│   │   ├── rateLimiter/    # Token bucket, sliding window, fixed window

│   │   ├── proxy/          # Request forwarding logic

│   │   └── detection/      # Signals, scorer, blocker

│   ├── models/             # MongoDB schemas

│   ├── config/             # DB, Redis, env config

│   ├── sockets/            # Socket.IO real-time events

│   ├── jobs/               # Background cleanup tasks

│   ├── utils/              # Logger, response helpers

│   ├── constants/          # Centralised magic strings

│   └── app.js              # Express setup

├── server.js               # HTTP server entry point

├── dashboard/              # Admin dashboard (HTML + CSS + JS)

├── tests/

│   ├── unit/               # Per-module tests

│   └── integration/        # End-to-end tests

├── docker-compose.yml

├── .env.example

└── README.md



\---



\## Getting Started



\### Prerequisites

\- Node.js 18+

\- Docker Desktop



\### Setup



\*\*1. Clone and install:\*\*

```bash

git clone <your-repo-url>

cd gateway

npm install

```



\*\*2. Configure environment:\*\*

```bash

cp .env.example .env

```



\*\*3. Start MongoDB and Redis:\*\*

```bash

docker-compose up -d mongo redis

```



\*\*4. Start the gateway:\*\*

```bash

npm run dev

```



\*\*5. Verify it is running:\*\*

```bash

curl http://localhost:3000/health

```



Expected response:

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "status": "healthy",

&#x20;   "services": { "mongo": "connected", "redis": "connected" }

&#x20; }

}

```



\---



\## API Reference



\### Auth endpoints



| Method | Endpoint           | Auth     | Description           |

|--------|--------------------|----------|-----------------------|

| POST   | /auth/register     | None     | Register new user     |

| POST   | /auth/login        | None     | Login, receive JWT    |

| POST   | /auth/keys         | JWT      | Generate API key      |

| GET    | /auth/keys         | JWT      | List your API keys    |

| DELETE | /auth/keys/:id     | JWT      | Revoke an API key     |



\### Admin endpoints (admin role required)



| Method | Endpoint           | Description                        |

|--------|--------------------|------------------------------------|

| GET    | /admin/stats       | Gateway metrics (last 24h)         |

| GET    | /admin/requests    | Recent request logs                |

| GET    | /admin/abuse       | Abuse event log                    |

| GET    | /admin/users       | All registered users               |

| POST   | /admin/block       | Manually block an IP               |

| POST   | /admin/unblock     | Unblock an IP                      |



\### Proxy (all other routes)



Any route not matching `/health`, `/auth`, or `/admin` is proxied to the

upstream service defined in `UPSTREAM\_BASE\_URL`.



Authentication required via:

\- `Authorization: Bearer <jwt\_token>`

\- `x-api-key: <api\_key>`



\---



\## Rate Limiting Algorithms



Three algorithms are implemented. Switch between them via `.env`:

```env

RATE\_LIMIT\_ALGORITHM=tokenBucket     # or slidingWindow or fixedWindow

```



\### Token Bucket

\- Each user has a bucket of N tokens that refills at a fixed rate

\- Burst traffic allowed up to bucket capacity

\- Implemented as an atomic Redis Lua script — no race conditions

\- \*\*Best for:\*\* APIs that want to allow occasional bursts



\### Sliding Window Log

\- Stores timestamps of every request in a Redis sorted set

\- Removes entries older than the window on each request

\- Most accurate — no boundary burst problem

\- \*\*Best for:\*\* strict per-window enforcement



\### Fixed Window Counter

\- Divides time into fixed buckets (e.g. every 60s)

\- O(1) time and space — simplest algorithm

\- Known limitation: boundary burst — a client can send 2× requests

&#x20; at the window boundary

\- \*\*Best for:\*\* simple use cases where boundary bursts are acceptable



\### Plan-based limits



| Plan       | Requests / minute |

|------------|-------------------|

| Free       | 30                |

| Pro        | 100               |

| Enterprise | 1000              |



\---



\## Abuse Detection



Requests are scored based on five independent signals:



| Signal              | Score | Trigger                                      |

|---------------------|-------|----------------------------------------------|

| Rate surge          | 30    | More than 50 requests in 60 seconds          |

| Repeated errors     | 20    | More than 10 error responses in 5 minutes    |

| User agent rotation | 15    | More than 5 distinct UAs from same IP in 1m  |

| Payload anomaly     | 25    | Request body larger than 500KB               |

| IP blocklist        | 100   | IP already in Redis blocklist                |



\*\*Scoring thresholds:\*\*

\- Score ≥ 42 (60% of 70) → throttled, event logged

\- Score ≥ 70 → IP blocked in Redis with 1-hour TTL, event logged to MongoDB

\- Score = 100 (blocklist hit) → immediate block, no scoring needed



All signals run in parallel using `Promise.all` — zero added latency.



\---



\## Admin Dashboard



Open `dashboard/index.html` in your browser while the gateway is running.



Features:

\- Live traffic feed via Socket.IO

\- Real-time abuse event alerts

\- Gateway stats — requests, error rate, avg latency

\- IP block / unblock controls

\- Recent request log table



Login with an admin account to access the dashboard.



\### Create an admin user

```bash

\# register

curl -X POST http://localhost:3000/auth/register \\

&#x20; -H "Content-Type: application/json" \\

&#x20; -d "{\\"name\\":\\"Admin\\",\\"email\\":\\"admin@gateway.com\\",\\"password\\":\\"admin1234\\"}"



\# promote to admin via mongo shell

docker exec -it gateway\_mongo mongosh gateway\_db \\

&#x20; --eval "db.users.updateOne({email:'admin@gateway.com'},{\\$set:{role:'admin'}})"

```



\---



\## Testing

```bash

\# run all unit tests

npm run test:unit



\# run specific suite

npx jest tests/unit/rateLimiter.test.js --verbose

```



\### Test coverage



| Suite                    | Tests | What is verified                        |

|--------------------------|-------|-----------------------------------------|

| models.test.js           | 13    | Schema validation, hashing, methods     |

| auth.test.js             | 10    | Register, login, API key CRUD           |

| proxy.test.js            |  9    | Forwarding, auth layer, request ID      |

| rateLimiter.test.js      | 14    | All 3 algorithms, plan limits           |

| abuseDetection.test.js   | 15    | All 5 signals, blocker, pipeline        |

| \*\*Total\*\*                | \*\*61\*\*| \*\*61 passing\*\*                          |



\---



\## Environment Variables



| Variable                    | Default                              | Description                        |

|-----------------------------|--------------------------------------|------------------------------------|

| NODE\_ENV                    | development                          | Environment                        |

| PORT                        | 3000                                 | Server port                        |

| MONGO\_URI                   | mongodb://mongo:27017/gateway\_db     | MongoDB connection string          |

| REDIS\_HOST                  | redis                                | Redis hostname                     |

| REDIS\_PORT                  | 6379                                 | Redis port                         |

| JWT\_SECRET                  | —                                    | JWT signing secret (required)      |

| JWT\_EXPIRES\_IN              | 1d                                   | JWT expiry                         |

| API\_KEY\_CACHE\_TTL\_SECONDS   | 60                                   | Redis cache TTL for API keys       |

| RATE\_LIMIT\_ALGORITHM        | tokenBucket                          | Algorithm selector                 |

| DEFAULT\_RATE\_LIMIT\_WINDOW\_MS| 60000                                | Rate limit window in ms            |

| DEFAULT\_RATE\_LIMIT\_MAX      | 100                                  | Max requests per window            |

| ABUSE\_SCORE\_THRESHOLD       | 70                                   | Score at which IP is blocked       |

| ABUSE\_BLOCK\_TTL\_SECONDS     | 3600                                 | How long blocked IPs stay blocked  |

| UPSTREAM\_BASE\_URL           | https://jsonplaceholder.typicode.com | Default upstream service           |

| SOCKET\_CORS\_ORIGIN          | http://localhost:5173                | Dashboard origin for Socket.IO     |

| LOG\_LEVEL                   | info                                 | Pino log level                     |



\---



\## Key Design Decisions



\*\*Why MongoDB for logs?\*\*

Request logs and abuse events are write-heavy, schema-flexible, and

time-series natured. MongoDB's TTL indexes auto-delete logs after 30 days

with no cleanup job needed.



\*\*Why Redis Lua scripts for rate limiting?\*\*

A rate limit check involves read-modify-write. Without atomicity, two

concurrent requests can both read the same counter, both decide they are

under the limit, and both proceed — causing limit violations. Lua scripts

execute atomically in Redis, preventing this race condition entirely.



\*\*Why does abuse detection run before authentication?\*\*

Blocked IPs should be rejected before the gateway wastes a database

call verifying their credentials. The blocklist check is a single Redis

`EXISTS` call — effectively free.



\*\*Why fail-open on Redis errors?\*\*

A rate limiter or abuse detector that blocks all traffic when its backing

store goes down is worse than one that lets everything through temporarily.

Availability is prioritised over perfect enforcement during outages.



\*\*Why separate `server.js` from `app.js`?\*\*

`app.js` exports a pure Express app that can be imported in tests without

starting a real HTTP server. `server.js` handles the infrastructure

concerns — HTTP server, Socket.IO, database connections, background jobs.

This separation is what makes the test suite clean.



\---



\## Author



Manish Bordhan

MCA Final Semester — 2026

Intelligent API Gateway with Rate Limiting \& Abuse Detection

