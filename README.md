# Taskify — Task Management Web App

Taskify is a full-stack task management application with a custom UI: a split-screen
Login/Sign-in page and a Dashboard with project task cards, a weekly progress chart,
an assignments checklist, a calendar schedule widget, and a batchmates list.

**Color palette** (chosen to keep the UI cohesive and minimal — one purple family used
consistently across both screens instead of mixing multiple accent colors):

| Token           | Hex       | Used for                                   |
|-----------------|-----------|---------------------------------------------|
| `primary`       | `#6D28D9` | Buttons, active nav, progress bars, accents |
| `primary-dark`  | `#5B21B6` | Login artwork, hero gradient, hover states  |
| `primary-light` | `#A78BFA` | Secondary accents, avatar rings             |
| `primary-pale`  | `#EDE9FE` | Card backgrounds, badges                    |
| `surface`       | `#F9FAFB` | Page background                             |
| `ink` / `ink-muted` | `#1F2937` / `#6B7280` | Headings / body & muted text    |
| `success` / `warning` / `danger` | `#10B981` / `#F59E0B` / `#EF4444` | Status badges |

## Tech stack

- **Frontend:** Static HTML + Tailwind CSS (compiled at build time) + vanilla JS, served by Nginx (which also reverse-proxies `/api` to the backend)
- **Backend:** Node.js + Express, JWT authentication, bcrypt password hashing
- **Database:** PostgreSQL 16
- **Orchestration:** Docker Compose (3 services: `frontend`, `backend`, `db`)

## Project structure

```
taskify/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile              # multi-stage: deps -> production runtime
│   ├── package.json
│   ├── server.js                # entry point, retries DB connection, runs schema migration
│   ├── db/
│   │   ├── init.sql             # schema (tables) — no demo data, database starts empty
│   │   └── pool.js              # pg connection pool
│   ├── middleware/auth.js       # JWT verification middleware
│   └── routes/
│       ├── auth.js              # /api/auth/register (name+email+password+role), /login, /me
│       ├── tasks.js             # /api/tasks CRUD
│       ├── assignments.js       # /api/assignments CRUD + toggle
│       └── users.js             # /api/users/batchmates — list/add/remove team members
└── frontend/
    ├── Dockerfile               # multi-stage: Tailwind build -> nginx runtime
    ├── nginx.conf                # serves static files + proxies /api to backend
    ├── package.json
    ├── tailwind.config.js        # custom purple palette + component classes
    ├── postcss.config.js
    └── public/
        ├── index.html            # Login / Sign in (split-screen)
        ├── dashboard.html        # Dashboard
        ├── css/input.css         # Tailwind source (compiled to styles.css at build)
        └── js/
            ├── api.js            # fetch wrapper + session helpers
            ├── login.js          # tab switching + auth form submit
            └── dashboard.js      # fetches + renders tasks/assignments/chart/batchmates
```

## Prerequisites

- Docker Engine 24+
- Docker Compose v2 (bundled with modern Docker Desktop, or `docker-compose-plugin` on Linux)
- No local Node.js or PostgreSQL installation is required — everything runs in containers.

## Getting started

1. Clone/copy the project, then create your environment file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set a real `POSTGRES_PASSWORD` and `JWT_SECRET` before deploying anywhere
   beyond your local machine.

2. Build and start all services:

   ```bash
   docker compose up --build
   ```

   This builds the `backend` and `frontend` images (multi-stage builds), starts PostgreSQL,
   waits for its healthcheck to pass, then starts the backend (which creates the database
   tables on first boot — no demo data is inserted) and finally the frontend.

3. Confirm all three containers are healthy:

   ```bash
   docker ps
   ```

   You should see `taskify-db`, `taskify-backend`, and `taskify-frontend` all with a
   `healthy` status once the start-up grace period elapses.

4. Open the app:

   - **Web app:** http://localhost:3000
   - **Backend API (direct):** http://localhost:4000/api/health

5. Create your account: on the login page, click the **SIGN IN** tab (this is the
   registration form) and fill in your full name, your job title/role (e.g. "UI/UX Designer",
   "Backend Engineer" — this is entered manually and shown on your profile card and in your
   greeting), email, and password. There is no demo/seeded account — every user creates their
   own login, and the dashboard greets whoever is actually signed in by their own name.

6. Stop everything:

   ```bash
   docker compose down
   ```

   Add `-v` to also remove the Postgres data volume (`docker compose down -v`).

## API endpoints

All routes are prefixed with `/api` and proxied through the frontend at `http://localhost:3000/api/...`,
or reachable directly at `http://localhost:4000/api/...`.

| Method | Endpoint                        | Auth required | Description                        |
|--------|----------------------------------|:--------------:|-------------------------------------|
| GET    | `/api/health`                   | No             | Health check (used by Docker)       |
| POST   | `/api/auth/register`            | No             | Create an account (`name`, `email`, `password`, `role` all required — no defaults) |
| POST   | `/api/auth/login`               | No             | Log in, returns JWT + user          |
| GET    | `/api/auth/me`                  | Yes            | Current user's profile              |
| GET    | `/api/tasks`                    | Yes            | List tasks + weekly progress log    |
| POST   | `/api/tasks`                    | Yes            | Create a task                       |
| PATCH  | `/api/tasks/:id`                | Yes            | Update a task                       |
| DELETE | `/api/tasks/:id`                | Yes            | Delete a task                       |
| GET    | `/api/assignments`              | Yes            | List assignments + completion count |
| POST   | `/api/assignments`               | Yes            | Create an assignment                |
| PATCH  | `/api/assignments/:id/toggle`   | Yes            | Toggle completed state              |
| GET    | `/api/users/batchmates`         | Yes            | List the current user's team members |
| POST   | `/api/users/batchmates`         | Yes            | Add a team member (`name`, `role` — entered manually) |
| DELETE | `/api/users/batchmates/:id`     | Yes            | Remove a team member                |

Team members (batchmates) are per-user: each logged-in user maintains their own list, added
through the "+ Add" form on the dashboard's Batchmates card.

## Calendar behavior

The dashboard's calendar widget reads the browser's real `Date()` on every page load — it
always shows the actual current month/year and highlights the actual current day, with no
hardcoded date anywhere in the code.

Authenticated requests must include `Authorization: Bearer <token>`, using the token returned
from `/api/auth/login` or `/api/auth/register`.

## What We See

1. **Running containers:** after `docker compose up --build`, run `docker ps` in your terminal
   and the output will be showing all three containers with `Up ... (healthy)` status.
2. **Active web UI — Login page:** open http://localhost:3000 in a browser and you will see the
   split-screen login/sign-in screen.
3. **Active web UI — Dashboard:** register an account (SIGN IN tab), log in, and screenshot the
   dashboard (task cards, progress chart, assignments, calendar showing the real current date,
   batchmates you've added).

## Notes on production hardening

This project is set up to run cleanly for local development and demos out of the box. Before
deploying publicly, consider: rotating `JWT_SECRET`/`POSTGRES_PASSWORD`, adding rate limiting
to `/api/auth/*`, enabling HTTPS/TLS termination in front of Nginx, and adding a
database backup strategy for the `taskify_db_data` volume.
