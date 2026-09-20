# Taskify — Task Management Web App

Taskify is a full-stack task management application with a custom UI: a split-screen
Login/Sign-in page and a Dashboard with project task cards, a weekly progress chart,
an assignments checklist, a calendar schedule widget, and a batchmates list.

## CI/CD

[![CI/CD](https://github.com/kaushanikoner20-hub/taskify/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/kaushanikoner20-hub/taskify/actions/workflows/ci-cd.yml)

**CI Pipeline**
- Runs on pull requests targeting `main`.
- Runs on pushes to `main`.
- Installs backend dependencies and runs the backend test suite against a real PostgreSQL service container.
- Builds both Docker images (frontend, backend) to verify they build cleanly — this is also how the frontend's Tailwind CSS build gets verified, since it happens inside the frontend Dockerfile's build stage.
- Runs a full-stack integration smoke test (`docker compose up --build`, then checks the backend health endpoint and the frontend both respond).

**CD Pipeline**
- On a successful push to `main` (or a manual run via `workflow_dispatch`), both images are pushed to Docker Hub.
- Images are tagged with `latest` and the commit SHA for immutable versioning.
- Pull requests never push images or receive deployment credentials.
- Deployment to a remote Docker host can optionally be enabled once `DEPLOY_HOST`, `DEPLOY_USERNAME`, and `DEPLOY_SSH_KEY` secrets are configured — see [Enabling remote deployment](#enabling-remote-deployment) below. Until then, that job runs and exits cleanly without attempting anything.

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
- **CI/CD:** GitHub Actions (test → Docker build → Docker Hub push → optional deploy)

## Project structure

```
taskify/
├── .github/workflows/ci-cd.yml  # GitHub Actions pipeline
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile              # multi-stage: deps -> production runtime
│   ├── package.json
│   ├── server.js                # bootstrap: DB connect/retry, migration, listen
│   ├── app.js                    # Express app (imported directly by tests)
│   ├── tests/api.test.js         # backend test suite (Node's built-in test runner + supertest)
│   ├── db/
│   │   ├── init.sql             # schema (tables) — no demo data, database starts empty
│   │   └── pool.js              # pg connection pool
│   ├── middleware/auth.js       # JWT verification middleware
│   └── routes/
│       ├── auth.js              # /api/auth/register (name+email+password+role), /login, /me
│       ├── tasks.js             # /api/tasks CRUD
│       ├── assignments.js       # /api/assignments CRUD + toggle
│       ├── users.js             # /api/users/batchmates — list/add/remove team members
│       └── reports.js           # /api/reports/summary — aggregate analytics
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
- No local Node.js or PostgreSQL installation is required to *run* the app — everything runs in containers. Node.js 20+ is only needed if you want to run the backend test suite locally.

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

## Running backend tests locally

The backend test suite needs a real, disposable PostgreSQL instance (it does not use mocks
or SQLite):

```bash
cd backend
npm install
# point these at any throwaway Postgres 16 instance:
export DB_HOST=localhost DB_PORT=5432 DB_NAME=taskify_test DB_USER=postgres DB_PASSWORD=postgres
export JWT_SECRET=local_test_secret
npm test
```

In CI, these same environment variables point at a Postgres service container that GitHub
Actions starts automatically — see `.github/workflows/ci-cd.yml`.

## API endpoints

All routes are prefixed with `/api` and proxied through the frontend at `http://localhost:3000/api/...`,
or reachable directly at `http://localhost:4000/api/...`.

| Method | Endpoint                        | Auth required | Description                        |
|--------|----------------------------------|:--------------:|-------------------------------------|
| GET    | `/api/health`                   | No             | Health check (used by Docker + CI)  |
| POST   | `/api/auth/register`            | No             | Create an account (`name`, `email`, `password`, `role` all required — no defaults) |
| POST   | `/api/auth/login`               | No             | Log in, returns JWT + user          |
| GET    | `/api/auth/me`                  | Yes            | Current user's profile              |
| PATCH  | `/api/auth/me`                  | Yes            | Update name/role                    |
| POST   | `/api/auth/change-password`     | Yes            | Change password                     |
| GET    | `/api/tasks`                    | Yes            | List tasks + weekly progress log    |
| POST   | `/api/tasks`                    | Yes            | Create a task                       |
| PATCH  | `/api/tasks/:id`                | Yes            | Update a task                       |
| DELETE | `/api/tasks/:id`                | Yes            | Delete a task                       |
| POST   | `/api/tasks/progress-log`       | Yes            | Log hours for today                 |
| GET    | `/api/assignments`              | Yes            | List assignments + completion count |
| POST   | `/api/assignments`              | Yes            | Create an assignment                |
| PATCH  | `/api/assignments/:id/toggle`   | Yes            | Toggle completed state              |
| GET    | `/api/users/batchmates`         | Yes            | List the current user's team members |
| POST   | `/api/users/batchmates`         | Yes            | Add a team member (`name`, `role` — entered manually) |
| DELETE | `/api/users/batchmates/:id`     | Yes            | Remove a team member                |
| GET    | `/api/reports/summary`          | Yes            | Aggregate analytics                 |

Team members (batchmates) are per-user: each logged-in user maintains their own list, added
through the "+ Add" form on the dashboard's Batchmates card.

Authenticated requests must include `Authorization: Bearer <token>`, using the token returned
from `/api/auth/login` or `/api/auth/register`.

## Calendar behavior

The dashboard's calendar widget reads the browser's real `Date()` on every page load — it
always shows the actual current month/year and highlights the actual current day, with no
hardcoded date anywhere in the code.

## What you'll see

1. **Running containers:** after `docker compose up --build`, run `docker ps` — all three
   containers should show `Up ... (healthy)`.
2. **Login page:** open http://localhost:3000 to see the split-screen login/sign-in screen.
3. **Dashboard:** register an account (SIGN IN tab), log in, and see task cards, progress
   chart, assignments, calendar showing the real current date, and batchmates you've added.

## Enabling remote deployment

The `deploy` job in `.github/workflows/ci-cd.yml` is optional and disabled by default — it
runs on every push to `main` (and on manual `workflow_dispatch` runs), but does nothing until
you provision a server and add three secrets. To enable it:

1. Have a server reachable over SSH, with Docker and Docker Compose installed, and a copy of
   this repository (specifically `docker-compose.yml` and `.env`) at `~/taskify`.
2. Add these GitHub Actions secrets (Settings → Secrets and variables → Actions):
   - `DEPLOY_HOST` — the server's IP address or hostname
   - `DEPLOY_USERNAME` — the SSH username to connect as
   - `DEPLOY_SSH_KEY` — the private key (matching a public key already authorized on that server)
3. On the server's `docker-compose.yml`, point the `frontend`/`backend` services at
   `build:` replaced with `image: <DOCKERHUB_USERNAME>/taskify-frontend:latest` (and the
   backend equivalent), so `docker compose pull` has something to pull.

Once all three secrets exist, the next push to `main` will SSH in and run
`docker compose pull && docker compose up -d` automatically. Until then, the job runs and
exits cleanly with a message explaining that deployment is not yet configured.

## Notes on production hardening

This project is set up to run cleanly for local development and demos out of the box. Before
deploying publicly, consider: rotating `JWT_SECRET`/`POSTGRES_PASSWORD`, adding rate limiting
to `/api/auth/*`, enabling HTTPS/TLS termination in front of Nginx, and adding a
database backup strategy for the `taskify_db_data` volume.