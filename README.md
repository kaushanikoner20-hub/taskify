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
- **Orchestration:** Docker Compose (`frontend`, `backend`, `db`, plus `localstack` for the Terraform assignment — see below)
- **CI/CD:** GitHub Actions (test → Docker build → Docker Hub push → optional deploy)
- **Infrastructure as Code:** Terraform + LocalStack (provisions a local S3 bucket — see [Infrastructure Provisioning with Terraform](#infrastructure-provisioning-with-terraform))

## Project structure

```
taskify/
├── .github/workflows/ci-cd.yml  # GitHub Actions pipeline
├── docker-compose.yml
├── .env.example
├── terraform/                    # Terraform + LocalStack (S3) — see below
│   ├── versions.tf
│   ├── provider.tf
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   └── README.md
├── docs/                         # Screenshot evidence for the Terraform assignment
│   └── README.md                 # explains expected screenshot filenames
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
- **For the Terraform assignment only:** [Terraform](https://developer.hashicorp.com/terraform/install) 1.5+, and optionally the [AWS CLI](https://aws.amazon.com/cli/) for verification — see [Infrastructure Provisioning with Terraform](#infrastructure-provisioning-with-terraform).

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
   tables on first boot — no demo data is inserted) and finally the frontend. This also
   starts `localstack`, used only by the separate Terraform assignment — the app itself
   works exactly the same whether or not `localstack` is running.

3. Confirm all containers are healthy:

   ```bash
   docker ps
   ```

   You should see `taskify-db`, `taskify-backend`, `taskify-frontend`, and `taskify-localstack`
   all with a `healthy` status once the start-up grace period elapses.

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

1. **Running containers:** after `docker compose up --build`, run `docker ps` — all
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

---

## Infrastructure Provisioning with Terraform

This project uses [Terraform](https://www.terraform.io/) as Infrastructure as Code (IaC) to
provision a single, local, S3-compatible storage resource through
[LocalStack](https://www.localstack.cloud/) — an AWS-compatible emulator that runs entirely
on your machine. **This is a separate, self-contained demonstration of Terraform** and is not
wired into the running Taskify application itself; the frontend and backend never read from
or write to this bucket. Its purpose is purely to show infrastructure provisioning, plan/apply/
destroy, and state management, without requiring a real (and potentially billable) AWS account.

### Architecture

```
                  ┌─────────────────┐
                  │     Taskify     │
                  │                 │
                  │ Frontend        │
                  │ Backend         │
                  │ PostgreSQL      │
                  └────────┬────────┘
                           │
                           │  (independent — not connected)
                           │
                  ┌────────▼────────┐
                  │    LocalStack   │
                  │                 │
                  │   S3 Service    │
                  └────────▲────────┘
                           │
                           │
                    ┌──────┴──────┐
                    │ Terraform   │
                    │              │
                    │ Plan/Apply   │
                    └──────────────┘
```

LocalStack runs as a `localstack` service in the existing `docker-compose.yml` (rather than
a separate Docker setup), exposing port `4566`. Terraform, run from your host machine, talks
to that port to create/destroy the S3 bucket.

### Why Terraform?

Infrastructure as Code means describing infrastructure (servers, storage, networking) as
version-controlled configuration files instead of clicking through a cloud console by hand.
The same `.tf` files can be reviewed in a pull request, reused across environments, and
re-applied to reproduce identical infrastructure — instead of undocumented manual steps that
are easy to forget or get wrong.

### Why LocalStack?

LocalStack emulates AWS services (S3, DynamoDB, Lambda, and many more) entirely on your own
machine. Terraform's AWS provider can be pointed at LocalStack's local endpoint instead of
real AWS, so this project can demonstrate genuine `plan`/`apply`/`destroy` infrastructure
provisioning without an AWS account, without any billing risk, and without needing internet
access to AWS at all.

**A note on LocalStack versioning:** In March 2026, LocalStack changed its distribution
policy — every LocalStack Docker image released after that point requires creating a free
LocalStack account and setting a `LOCALSTACK_AUTH_TOKEN` just to start the container, even
for non-commercial/community use. To keep this project genuinely zero-signup and
zero-token, `docker-compose.yml` deliberately pins `localstack/localstack:4.14.0` — the last
version released before that policy took effect. If you'd prefer to use a newer LocalStack
version and don't mind creating a free account, get a token at
[app.localstack.cloud](https://app.localstack.cloud), set it as `LOCALSTACK_AUTH_TOKEN` in
`docker-compose.yml`'s `localstack` service, and update the image tag.

### Prerequisites

- Docker
- Docker Compose
- [Terraform](https://developer.hashicorp.com/terraform/install) 1.5 or newer
- AWS CLI (optional, only needed for the verification step below)

### Project Structure

```
terraform/
├── versions.tf              # Terraform + AWS provider version constraints
├── provider.tf              # AWS provider configured to talk to LocalStack
├── main.tf                  # The S3 bucket resource itself
├── variables.tf              # project_name, environment, bucket_name, aws_region, localstack_endpoint
├── outputs.tf                # bucket_name, bucket_arn, environment
└── terraform.tfvars.example  # copy to terraform.tfvars before running
```

### Starting LocalStack

```bash
docker compose up -d localstack
```

Wait for it to report healthy:

```bash
docker ps
```

`taskify-localstack` should show `Up ... (healthy)`.

### Terraform Initialization

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
```

`init` downloads the AWS provider plugin (pinned in `versions.tf`) and sets up the local
`.terraform/` working directory. It's required once per clone, and again any time
`versions.tf` changes.

### Formatting

```bash
terraform fmt
```

Rewrites the `.tf` files into Terraform's canonical formatting style (consistent indentation
and spacing) — purely cosmetic, has no effect on what gets provisioned.

### Validation

```bash
terraform validate
```

Checks the configuration for internal consistency (correct syntax, valid references between
resources/variables) without contacting LocalStack or provisioning anything.

### Plan

```bash
terraform plan
```

`plan` computes and displays exactly what Terraform *would* do — in this case, create one
`aws_s3_bucket` — without actually making any changes. This is the safe way to review changes
before committing to them.

### Apply

```bash
terraform apply
```

`apply` executes the plan: it actually creates the S3 bucket inside LocalStack. You'll be
prompted to type `yes` to confirm (or pass `-auto-approve` to skip the prompt). Once complete,
Terraform prints the three outputs defined in `outputs.tf`.

### Verify

Confirm the bucket genuinely exists inside LocalStack (not just that Terraform *said* it
created it):

```bash
aws --endpoint-url=http://localhost:4566 s3 ls
```

You should see the bucket name (by default `taskify-storage-local`) in the output. To inspect
just that one bucket:

```bash
aws --endpoint-url=http://localhost:4566 s3api head-bucket --bucket taskify-storage-local
```

### Terraform State

```
Configuration
      ↓
Terraform
      ↓
State
      ↓
Infrastructure
```

- **What `terraform.tfstate` is:** a JSON file Terraform writes after every `apply`. It's
  Terraform's record of exactly what infrastructure it created and with what configuration —
  effectively a map from your `.tf` resource blocks to the real (or, here, LocalStack-emulated)
  resources they correspond to.
- **Why Terraform needs it:** without state, Terraform would have no way to know that
  `aws_s3_bucket.taskify_storage` in your config corresponds to a bucket that already exists —
  every `apply` would try to create it again. State is also what lets Terraform compute a
  diff on `plan` (what changed between your config and what's actually deployed) and what it
  reads to know what to remove on `destroy`.
- **Resource tracking & drift detection:** on every `plan`/`apply`, Terraform refreshes its
  state by checking the real infrastructure's current condition. If someone manually changed
  or deleted the bucket outside of Terraform, that's called *drift* — Terraform detects it by
  comparing the live resource against what state says should exist, and will offer to
  reconcile the difference.
- **Why state should not be committed to Git:** state files can contain sensitive data
  (resource IDs, sometimes secrets or connection strings depending on the resource type), get
  out of sync easily if edited by hand or merged via Git, and are not meant to be
  human-edited. Two people applying from stale, divergently-committed state files is a classic
  way to corrupt real infrastructure. `.gitignore` in this repo excludes `*.tfstate` and
  `*.tfstate.*` for exactly this reason.
- **Local vs. remote state:** this project uses **local state** — a `terraform.tfstate` file
  sitting on your own machine in `terraform/`, which is fine for solo, local-only work like
  this assignment. **Remote state** (e.g. state stored in an S3 bucket with DynamoDB
  locking, or in Terraform Cloud) is what a team/production environment should use instead —
  it gives everyone a single shared source of truth, prevents two people from applying
  simultaneously and corrupting state (via locking), and keeps state off individual laptops.

### Variables

| Variable | Default | Purpose |
|---|---|---|
| `project_name` | `taskify` | Prefix used when building the final bucket name |
| `environment` | `local` | Environment label — suffixed onto the bucket name and applied as a tag |
| `bucket_name` | `storage` | Short/base name for the bucket — combined with `project_name` and `environment` |
| `aws_region` | `us-east-1` | Region the AWS provider is configured with (LocalStack doesn't host real regions, but the provider still requires a syntactically valid one) |
| `localstack_endpoint` | `http://localhost:4566` | URL where LocalStack's S3 service is reachable |

The final bucket name is built as `<project_name>-<bucket_name>-<environment>` (e.g.
`taskify-storage-local`) — change any of the three in `terraform.tfvars` to get a different
name without touching `main.tf`.

### Outputs

After a successful `apply`, Terraform prints:

- **`bucket_name`** — the actual name of the created bucket
- **`bucket_arn`** — its ARN (Amazon Resource Name), LocalStack's emulated equivalent of a
  real AWS ARN
- **`environment`** — the environment value that was used, echoed back for confirmation

### Destroy

```bash
terraform destroy
```

Removes everything Terraform created (the S3 bucket), using the state file to know exactly
what to remove. Destroying disposable test infrastructure like this matters even locally: it
keeps LocalStack's state clean between runs, verifies your Terraform config can cleanly tear
down what it built (a real, useful test of the configuration itself), and mirrors the habit
you want in real cloud environments, where leaving unused resources running costs real money.

### Screenshots / Evidence

See [`docs/README.md`](docs/README.md) for the exact filenames and what each screenshot
should show. In short:

1. `docs/terraform-plan.png` — `terraform plan` showing the bucket will be created
2. `docs/terraform-apply.png` — `terraform apply` showing successful creation + outputs
3. `docs/localstack-s3.png` — `aws --endpoint-url=http://localhost:4566 s3 ls` showing the bucket really exists
4. `docs/terraform-destroy.png` *(optional)* — `terraform destroy` showing successful teardown

## Notes on production hardening

This project is set up to run cleanly for local development and demos out of the box. Before
deploying publicly, consider: rotating `JWT_SECRET`/`POSTGRES_PASSWORD`, adding rate limiting
to `/api/auth/*`, enabling HTTPS/TLS termination in front of Nginx, and adding a
database backup strategy for the `taskify_db_data` volume.