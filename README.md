<p align="center">
  <img src="assets/complif-logo-readme.png" alt="Complif" width="800" style="border-radius:20px;" />
</p>

<p align="center">
  <strong>Complif Software Engineer Technical Challenge</strong><br/>
  Submission covering the data model exercise and the onboarding portal implementation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-11-ea2845?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Terraform-validated-7B42BC?logo=terraform&logoColor=white" alt="Terraform" />
</p>

This repository answers both parts of the brief described in
[`docs/software-engineer-technical-challenge.md`](docs/software-engineer-technical-challenge.md).

## Outline

- [Part 1. Data Model for Electronic Signatures](#part-1-data-model-for-electronic-signatures)
- [Part 2. Onboarding Portal Implementation](#part-2-onboarding-portal-implementation)
- [Setup and Local Development](#setup-and-local-development)
- [API Summary](#api-summary)
- [Database and Risk Scoring](#database-and-risk-scoring)
- [Testing and CI](#testing-and-ci)
- [Infrastructure (Terraform)](#infrastructure-terraform)

## Part 1. Data Model for Electronic Signatures

This part is a design exercise, not code. The challenge asks for a data model that handles signature schemas
per account, standardized faculties, signer groups, composable rules, signature requests with valid
combinations, and full traceability of who signed what.

### Raw Domain Model

<p align="center">
  <img src="assets/er-1-pure.png" alt="Exercise 1 raw data model" width="900" style="border-radius:20px;"/>
</p>

First pass, maps directly from the problem statement before any normalization.

### Refined ER Diagram

<p align="center">
  <img src="assets/er-1.jpg" alt="Exercise 1 refined ER diagram" width="900" style="border-radius:20px;"/>
</p>

The refined model supports:

- Faculties as a reusable catalog tied to account-level signature schemas.
- Groups and rules that compose, so one faculty can have multiple valid signing paths (e.g. "1 from A OR 2
  from B").
- Signature requests that reference a faculty and store which combinations were evaluated.
- Append-only tracking of who signed, who's pending, and which combinations remain valid.

## Part 2. Onboarding Portal Implementation

This is the working platform. Next.js frontend, NestJS backend, a separate tax ID validation microservice,
PostgreSQL, Docker Compose for local dev, and Terraform for the production infra definition.

### Application Demo

<p align="center">
  <img src="assets/demo.png" alt="Complif onboarding portal demo" width="900" style="border-radius:20px;"/>
</p>

### What's in it

- Dashboard with company listing, filters, search, and status visibility.
- Company registration form with document upload.
- Company detail page with status timeline, documents, and risk breakdown.
- JWT auth with `admin` (full access) and `viewer` (read-only) roles enforced at the route level.
- Deterministic risk scoring driven by database policy tables, not hardcoded weights.
- Separate microservice for CUIT/RFC/CNPJ format validation, called by the backend on company creation.
- Real-time notifications via SSE, OpenAPI docs, Postman collection, CI pipeline, and 25 seeded companies.

### Tech Stack

| Layer                | Technology                                                            |
| -------------------- | --------------------------------------------------------------------- |
| **Frontend**         | Next.js 16, React 19, shadcn/ui, Tailwind CSS 4, Lucide Icons, Sonner |
| **Backend**          | NestJS 11, TypeORM, Passport JWT, Swagger/OpenAPI, nestjs-pino        |
| **Microservice**     | NestJS (country-specific tax ID validator: AR/MX/BR)                  |
| **Database**         | PostgreSQL 16 with TypeORM migrations                                 |
| **Containerization** | Docker, Docker Compose                                                |
| **Infrastructure**   | Terraform (AWS VPC + RDS + ECS + S3 + Vercel)                         |
| **CI/CD**            | GitHub Actions (build, test, deploy validation)                       |
| **Testing**          | Jest, Supertest                                                       |

### Application Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────────────┐
│   Frontend   │────▶│   Backend API    │────▶│  Format Validation       │
│  Next.js 16  │     │   NestJS 11      │     │  Microservice (NestJS)   │
│  :3000       │     │   :8080          │     │  :3001 (internal)        │
└─────────────┘     └────────┬─────────┘     └──────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   PostgreSQL 16  │
                    │   :5432          │
                    └──────────────────┘
```

**Design choices I want to highlight:**

- **I made risk scoring a pure function.** It takes input + policy snapshot and returns a score. Policy
  weights live in DB tables (`country_policies`, `industry_policies`, `risk_settings`), not in code. This way
  you can change what "high-risk country" means without redeploying.
- **I constrained status transitions** to `pending -> in_review -> approved/rejected`, with a mandatory audit
  reason on every change. No jumping from `pending` straight to `approved`.
- **Documents get checksums and versions.** SHA-256 on upload, auto-incrementing version per
  `(business, document_type)`. Re-uploading a fiscal certificate creates version 2, not an overwrite.
- **I snapshot every risk assessment** with its full breakdown and a hash of the policy that produced it. If
  policy changes next month, you can still explain why a company scored 75 today.
- **I chose SSE for real-time notifications** because it's simpler than WebSockets for unidirectional
  server-to-client push.
- **Rate limiting** globally at 100 req/min, **structured logging** via Pino.

## Setup and Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
  (v2+)
- **Or** for local development: Node.js 20+ and PostgreSQL 16+

### Quick Start (Docker)

#### 1. Clone the repository

```bash
git clone https://github.com/cijjas/compliance
cd compliance
```

#### 2. Create environment file

```bash
cp .env.example .env
```

The defaults work out of the box. For production, change `JWT_SECRET`.

#### 3. Build and start all services

```bash
docker compose up --build
```

This starts 4 services:

- **postgres**: PostgreSQL 16 database with health checks
- **format-validation**: Tax ID validation microservice, internal only and not exposed to the host
- **backend**: NestJS API with auto-running migrations
- **frontend**: Next.js application

#### 4. Seed the database

Once all services are running (wait for the backend to log `Nest application successfully started`):

```bash
docker compose exec backend npm run seed:prod
```

This creates:

- 2 users (admin + viewer)
- 25 sample companies spread over several countries, industries, and statuses
- Documents, status history, and risk assessments for each company

#### 5. Open the application

| Service          | URL                                                              |
| ---------------- | ---------------------------------------------------------------- |
| **Frontend**     | [http://localhost:3000](http://localhost:3000)                   |
| **Backend API**  | [http://localhost:8080/api](http://localhost:8080/api)           |
| **Swagger Docs** | [http://localhost:8080/api/docs](http://localhost:8080/api/docs) |

#### 6. Log in

| Email                | Password    | Role   | Permissions                                                      |
| -------------------- | ----------- | ------ | ---------------------------------------------------------------- |
| `admin@complif.com`  | `admin123`  | Admin  | Full access: create companies, change statuses, upload documents |
| `viewer@complif.com` | `viewer123` | Viewer | Read-only: view companies, documents, and risk scores            |

#### Stopping the services

```bash
docker compose down
```

To also remove the database volume (full reset):

```bash
docker compose down -v
```

### Local Development (without Docker)

#### 1. Start PostgreSQL and create the database

```bash
createdb complif
```

#### 2. Start the format-validation microservice

```bash
cd microservice-format-validation
cp .env.example .env
npm install
npm run start:dev          # runs on :3001
```

#### 3. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run migration:run      # apply all migrations
npm run seed               # seed sample data
npm run start:dev          # runs on :8080
```

#### 4. Start the frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # runs on :3000
```

## API Summary

All endpoints are prefixed with `/api`. Full interactive documentation is available at `/api/docs` (Swagger).

### Authentication

| Method | Endpoint             | Description           | Auth   |
| ------ | -------------------- | --------------------- | ------ |
| `POST` | `/api/auth/register` | Register a new user   | No     |
| `POST` | `/api/auth/login`    | Login and receive JWT | No     |
| `POST` | `/api/auth/logout`   | Logout current user   | Bearer |

### Businesses

| Method   | Endpoint                         | Description                            | Auth   |
| -------- | -------------------------------- | -------------------------------------- | ------ |
| `POST`   | `/api/businesses`                | Create a company                       | Admin  |
| `GET`    | `/api/businesses`                | List companies (paginated, filterable) | Bearer |
| `GET`    | `/api/businesses/:id`            | Get company detail with history        | Bearer |
| `PATCH`  | `/api/businesses/:id/status`     | Change company status                  | Admin  |
| `GET`    | `/api/businesses/:id/risk-score` | Get risk assessment                    | Bearer |
| `DELETE` | `/api/businesses/:id`            | Soft-delete a company                  | Admin  |

**Query parameters for listing:** `page`, `limit`, `status`, `country`, `search` (name search).

### Documents

| Method | Endpoint                        | Description                   | Auth   |
| ------ | ------------------------------- | ----------------------------- | ------ |
| `POST` | `/api/businesses/:id/documents` | Upload a document (multipart) | Admin  |
| `GET`  | `/api/businesses/:id/documents` | List documents for a company  | Bearer |

**Document types:** `fiscal_certificate`, `registration_proof`, `insurance_policy`, `other`

### Reference Data

| Method | Endpoint                     | Description               | Auth   |
| ------ | ---------------------------- | ------------------------- | ------ |
| `GET`  | `/api/businesses/countries`  | List supported countries  | Bearer |
| `GET`  | `/api/businesses/industries` | List supported industries | Bearer |

### Notifications

| Method | Endpoint                    | Description                     | Auth   |
| ------ | --------------------------- | ------------------------------- | ------ |
| `GET`  | `/api/notifications/stream` | SSE stream for real-time events | Bearer |
| `GET`  | `/api/notifications`        | List past notifications         | Bearer |

## Database and Risk Scoring

### Database Schema

<p align="center">
  <img src="assets/db-schema.png" alt="Database schema" width="900" style="border-radius:20px;"/>
</p>

Migrations run automatically on backend start (TypeORM). Full history in `backend/src/database/migrations/`.

### Migration Path

- `InitialSchema`: core tables (users, businesses, documents, status history, enums, indexes).
- `AddComplianceReferenceData`: I moved country risk, industry risk, and thresholds into DB tables instead of
  code constants.
- `AddBusinessSoftDelete`: soft delete so you never lose compliance history.
- `AddDocumentAuditAndRiskSnapshots`: who uploaded each file, SHA-256 checksums, document versioning, and
  immutable risk assessment records with policy version hashes.
- `AddNotifications`: persisted notification table for the SSE stream and notification history.

### Risk Scoring

Score from 0 to 100, sum of three factors:

| Factor                 | Source                    | Example                                |
| ---------------------- | ------------------------- | -------------------------------------- |
| **Country risk**       | `country_policies` table  | Cuba (`CU`): +30, Argentina (`AR`): +0 |
| **Industry risk**      | `industry_policies` table | Casino: +25, Technology: +0            |
| **Documentation risk** | `risk_settings` table     | Any required document missing: +20     |

- **Score > 70** = requires manual review (configurable via `risk_settings`)
- Required documents: fiscal certificate, registration proof, insurance policy
- Every assessment is snapshotted with its full breakdown and policy version hash

I kept the scoring function pure, see `backend/src/risk-scoring/risk-assessment.policy.ts`.

## Testing and CI

### Testing

Tests run locally, not inside Docker (production images only have compiled output).

```bash
cd backend && npm test                         # 73 tests, 11 suites
cd microservice-format-validation && npm test  # 4 tests
cd backend && npm run test:cov                 # coverage report
```

### CI Pipeline

GitHub Actions on every push/PR to `main`, three stages:

| Stage      | What it does                                                            |
| ---------- | ----------------------------------------------------------------------- |
| **Build**  | Compiles backend, microservice, and frontend in parallel (Node 20)      |
| **Test**   | Runs unit tests for backend and microservice                            |
| **Deploy** | `terraform validate`, checks .tf files are valid, no credentials needed |

The deploy stage only validates that the Terraform is well-formed. In a real setup I'd add `terraform plan` on
PRs and `terraform apply` on merge to main with OIDC credentials, but that needs live AWS accounts and a state
backend, which felt like overkill for the challenge scope, so I decided to keep it at validation only.

See `.github/workflows/ci.yml`.

## Infrastructure (Terraform)

The `infrastructure/` directory has 9 `.tf` files that define the production equivalent of the Docker Compose
setup. I validate them in CI (`terraform validate`) but I didn't deploy them since the challenge only asks for
the files to be ready and validated.

<p align="center">
  <img src="assets/infrastructure.jpg" alt="Infrastructure design, what the Terraform creates" width="900" style="border-radius:20px;"/>
</p>

The diagram above is what the Terraform actually provisions. It maps 1:1 to local dev:

| Resource                             | What it does                    | Replaces (Docker Compose)       |
| ------------------------------------ | ------------------------------- | ------------------------------- |
| VPC (2 public + 2 private subnets)   | Network isolation               | Docker network                  |
| RDS PostgreSQL 16                    | Managed database                | `postgres` service              |
| S3 bucket (versioned, encrypted)     | Document storage                | `uploads` volume                |
| ECS Fargate (backend + microservice) | Application containers          | `backend` + `format-validation` |
| ALB + HTTPS                          | Load balancer / TLS termination | Port 8080 binding               |
| Vercel                               | Frontend hosting                | `frontend` service              |
| Security Groups                      | Ingress/egress rules            | N/A                             |

For networking, I put the ALB and NAT gateway in public subnets and everything else (ECS tasks, RDS) in
private subnets. The database is only reachable from the ECS security group, not from the internet.

---

## Project Structure

```
complif/
├── frontend/                          # Next.js 16 + React 19 + shadcn/ui + Tailwind
│   ├── src/app/                       # App router pages (dashboard, login, companies, etc.)
│   ├── src/components/                # UI components (shadcn + custom)
│   ├── src/lib/                       # API client, types, permissions, reference data
│   └── Dockerfile
│
├── backend/                           # NestJS 11 API
│   ├── src/auth/                      # JWT authentication (register, login, logout)
│   ├── src/businesses/                # Company CRUD, status transitions, tax ID validation
│   ├── src/documents/                 # Document upload with checksums and versioning
│   ├── src/risk-scoring/              # Pure risk engine + policy snapshots
│   ├── src/notifications/             # SSE real-time notifications
│   ├── src/common/                    # Entities, enums, guards, decorators, filters
│   ├── src/database/                  # TypeORM migrations (5) and seeds (25 companies)
│   └── Dockerfile
│
├── microservice-format-validation/    # Tax ID format validator (AR: CUIT, MX: RFC, BR: CNPJ)
│   ├── src/validation/                # Validation logic with country-specific rules
│   └── Dockerfile
│
├── assets/                            # Diagrams used in this README
│   ├── db-schema.png                  # Part 2 database schema
│   ├── demo.png                       # Part 2 application promotional image
│   ├── er-1-pure.png                  # Exercise 1 raw data model
│   ├── er-1.jpg                       # Exercise 1 refined ER diagram
│   └── infrastructure.jpg             # Infrastructure design
│
├── infrastructure/                    # Terraform (AWS + Vercel), validated in CI
│   ├── vpc.tf, rds.tf, ecs.tf        # Network, database, compute
│   ├── s3.tf, security-groups.tf      # Storage, firewall rules
│   └── vercel.tf                      # Frontend hosting
│
├── docs/                              # Challenge brief and brand assets
├── .github/workflows/ci.yml          # GitHub Actions pipeline
├── docker-compose.yml                 # Local development orchestration
├── complif.postman_collection.json    # Postman collection with all endpoints
├── AGENTS.md                          # Architecture guide for AI agents / new developers
├── QUESTIONS.md                       # Assumptions and design decisions (22 entries)
├── .env.example                       # Environment variable template
└── CHECKLIST.md                       # Implementation checklist
```

---

## Environment Variables

### Root `.env` (used by Docker Compose)

| Variable              | Default                        | Description                                |
| --------------------- | ------------------------------ | ------------------------------------------ |
| `DB_USERNAME`         | `postgres`                     | PostgreSQL username                        |
| `DB_PASSWORD`         | `postgres`                     | PostgreSQL password                        |
| `DB_NAME`             | `complif`                      | Database name                              |
| `JWT_SECRET`          | `change-me-to-a-random-secret` | Secret for signing JWT tokens              |
| `FRONTEND_URL`        | `http://localhost:3000`        | CORS origin for the backend                |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api`    | API URL used by the frontend at build time |

Each service also has its own `.env.example`, see `backend/.env.example`, `frontend/.env.example`, and
`microservice-format-validation/.env.example`.

---

## Postman Collection

Import `complif.postman_collection.json` into Postman or Thunder Client. Covers auth, all business endpoints,
document upload, and the format validation microservice. The `{{token}}` variable is set automatically when
you run the login request.

---

## Assumptions and Decisions

Every place the challenge left room for interpretation I documented in [`QUESTIONS.md`](QUESTIONS.md) (22
entries). The bigger ones: why I put risk policy in DB tables, why I constrained status transitions, why
invalid tax IDs reject the whole creation, why I chose soft delete over hard delete, and why the validation
microservice isn't exposed on the host network.

## Agent Navigation

[`AGENTS.md`](AGENTS.md) is a codebase guide I wrote for AI agents and new developers, covering module
boundaries, compliance patterns to follow, and anti-patterns to avoid.
