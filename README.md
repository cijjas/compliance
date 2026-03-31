# Complif - Company Onboarding Portal

Portal for internal users to onboard companies, manage their documentation and compliance status.

## Architecture

```
complif/
├── frontend/                  # Next.js 15 + shadcn/ui + Tailwind CSS
├── backend/                   # NestJS + TypeORM + PostgreSQL
├── microservice-format-validation/  # Country-specific tax ID validator
└── docker-compose.yml
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, shadcn/ui, Tailwind CSS, Lucide Icons |
| Backend | NestJS, TypeORM, PostgreSQL, Passport JWT |
| Microservice | NestJS (lightweight country-specific tax ID validator) |
| Database | PostgreSQL 16 |
| Containerization | Docker, Docker Compose |

## Quick Start

### With Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend npm run seed
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- Swagger Docs: http://localhost:8080/api/docs
- Format Validation: http://localhost:3001

The extra `seed` step loads the default users plus sample companies required by the challenge.

### Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 16+

```bash
# 1. Start PostgreSQL and create the database
createdb complif

# 2. Setup the format-validation microservice
cd microservice-format-validation
cp .env.example .env
npm install
npm run start:dev

# 3. Setup backend
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev

# 4. Setup frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Default Users (after seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@complif.com | admin123 | admin |
| viewer@complif.com | viewer123 | viewer |

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register user | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/logout | Logout current user | Yes |
| POST | /api/businesses | Create business | Admin |
| GET | /api/businesses | List businesses (paginated) | Yes |
| GET | /api/businesses/:id | Get business detail | Yes |
| PATCH | /api/businesses/:id/status | Change status | Admin |
| GET | /api/businesses/:id/risk-score | Get risk score | Yes |
| POST | /api/businesses/:id/documents | Upload document | Admin |
| GET | /api/businesses/:id/documents | List documents | Yes |

## Database Schema

**Tables:** `users`, `businesses`, `documents`, `status_history`

- `users` - Internal platform users (admin/viewer roles)
- `businesses` - Companies being onboarded (name, tax ID, country, industry, status, risk score)
- `documents` - Uploaded files (fiscal certificate, registration proof, insurance policy)
- `status_history` - Audit trail of status changes with timestamps and reasons

## Environment Variables

See `.env.example` at the root and in each service directory.

## Assumptions and Decisions

See `QUESTIONS.md` for the challenge assumptions that were made where the PDF leaves implementation details open, including the exact risk-score weights and the mock identifier-validation behavior.

## Agent Navigation

`AGENTS.md` at the repository root explains the module boundaries, business flow, and data model for AI/code-navigation workflows.
