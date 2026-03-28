# Complif Backend

NestJS API for the internal company-onboarding portal.

It handles:

- JWT authentication
- business onboarding and status management
- fiscal identifier validation through a small external microservice
- PDF document uploads
- risk score calculation and manual-review flags
- real-time status notifications over SSE

## What Is Built

This service exposes the backend for the onboarding workflow used by the dashboard in `../frontend`.

Core behavior:

- users can register, log in, and access protected routes with JWT
- admins can create businesses, upload required documents, and change onboarding status
- every business keeps a status history trail
- every new business is checked against the format-validation service before being saved, and invalid identifiers are rejected
- risk score is recalculated when a business is created, when documents are uploaded, and when risk is requested explicitly
- status changes emit a structured event for live notifications

## Runtime Overview

- framework: NestJS
- database: Postgres via TypeORM
- auth: JWT bearer tokens
- docs: Swagger at `/api/docs`
- API prefix: `/api`
- file storage: local disk in `./uploads`
- CORS origin: `FRONTEND_URL`

On startup the app:

- loads environment variables with `ConfigModule`
- connects to Postgres
- auto-runs TypeORM migrations
- enables request validation with DTO transforms
- registers a global HTTP exception filter

## Project Layout

```text
backend/
├── src/
│   ├── main.ts                     # Bootstrap, CORS, validation, Swagger
│   ├── app.module.ts              # Root module wiring
│   ├── auth/                      # Register, login, logout, JWT strategy
│   ├── businesses/                # Business creation, listing, detail, status, risk
│   ├── documents/                 # PDF upload, document listing, download
│   ├── notifications/             # SSE stream for status-change events
│   ├── common/                    # Entities, enums, guards, decorators, filters, utils
│   └── database/
│       ├── migrations/            # TypeORM schema migrations
│       └── seeds/                 # Seed script for local demo data
├── test/                          # e2e test setup
├── uploads/                       # Local uploaded files
├── .env.example                   # Example environment variables
└── Dockerfile                     # Container image for the API
```

## Folder Guide

### `src/auth`

Authentication and user access.

- `auth.controller.ts`: public register/login endpoints and protected logout
- `auth.service.ts`: password hashing, credential validation, JWT response payloads
- `jwt.strategy.ts`: validates bearer tokens and loads the active user
- `dto/`: input validation for login and registration

### `src/businesses`

Main onboarding domain.

- `businesses.controller.ts`: create, list, detail, status update, risk-score endpoints
- `businesses.service.ts`: orchestration for business lifecycle and status history writes
- `business-risk.service.ts`: computes risk from country, industry, and missing docs
- `business-identifier-validation.service.ts`: calls the format-validation microservice
- `business-status-notifier.service.ts`: emits status-change events after updates
- `dto/`: validated input/query objects for create, list, and status updates

### `src/documents`

Document handling tied to a business.

- only PDF files are accepted
- maximum upload size is 10 MB
- metadata is stored in Postgres and file content is stored on disk
- uploading a document triggers risk-score refresh

### `src/notifications`

Real-time updates for the frontend.

- exposes `GET /api/notifications/stream` as an SSE endpoint
- emits business status changes
- useful for live dashboard updates without polling

### `src/common`

Shared building blocks used across modules.

- `entities/`: TypeORM entities for `users`, `businesses`, `documents`, `status_history`
- `enums/`: user roles, business statuses, document types
- `guards/`: JWT auth and role-based access
- `decorators/`: `@CurrentUser()` and `@Roles()`
- `filters/`: global HTTP exception formatting
- `utils/`: string normalization helpers used by DTO transforms

### `src/database`

Database infrastructure.

- `data-source.ts`: TypeORM datasource used by CLI commands
- `migrations/`: schema definition history
- `seeds/seed.ts`: local seed data for demo/testing

## Main Business Flow

### 1. Create a business

`POST /api/businesses`

The backend:

- normalizes input in DTO transforms
- prevents duplicate `taxIdentifier` values
- calls the format-validation microservice
- rejects the request if the identifier format is invalid for the selected country
- creates the business with initial `pending` status
- writes the first `status_history` row in the same transaction
- recalculates and stores the current risk score

### 2. Upload business documents

`POST /api/businesses/:businessId/documents`

The backend:

- accepts a PDF file plus a `type`
- stores the file in `backend/uploads/`
- saves document metadata in the database
- recalculates risk so missing-document penalties stay accurate

### 3. Change onboarding status

`PATCH /api/businesses/:id/status`

The backend:

- updates the current business status
- appends a `status_history` record in a transaction
- logs and emits a structured notification event

## Risk Scoring

Risk is calculated from three inputs:

- country risk
- industry risk
- documentation completeness

Important behavior:

- required documents are `fiscal_certificate`, `registration_proof`, and `insurance_policy`
- missing required documents add documentation risk
- high-risk countries and industries increase the score
- scores are capped at `100`
- `requiresManualReview` becomes `true` when the score is greater than `70`

## API Summary

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Businesses

- `POST /api/businesses` - admin only
- `GET /api/businesses`
- `GET /api/businesses/:id`
- `PATCH /api/businesses/:id/status` - admin only
- `GET /api/businesses/:id/risk-score`

List query params:

- `status`
- `country`
- `search`
- `page` default `1`
- `limit` default `20`, max `100`

### Documents

- `POST /api/businesses/:businessId/documents` - admin only
- `GET /api/businesses/:businessId/documents`
- `GET /api/businesses/:businessId/documents/:id/download`

Document types:

- `fiscal_certificate`
- `registration_proof`
- `insurance_policy`
- `other`

### Notifications

- `GET /api/notifications/stream`

Notes:

- protected routes require a JWT
- the JWT strategy also accepts `?token=` in the query string, which is useful for SSE connections

## Roles

- `admin`: can create businesses, upload documents, and change status
- `viewer`: read-only access to protected business, document, and notification endpoints

## Local Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Environment variables:

- `PORT`: HTTP port. If unset, the app defaults to `3002`. The example file uses `8080`.
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`: allowed CORS origin
- `FORMAT_VALIDATION_URL`: base URL for the identifier-validation microservice

### 3. Start the service

```bash
npm run start:dev
```

Useful URLs:

- API: `http://localhost:3002/api` if `PORT` is not set
- Swagger: `http://localhost:3002/api/docs`

## Useful Commands

```bash
npm run start:dev
npm run build
npm run lint
npm test
npm run test:e2e
npm run migration:run
npm run migration:revert
npm run seed
```

## Seed Data

The seed script creates:

- 1 admin user
- 1 viewer user
- 25 sample businesses
- status history records
- sample document metadata

Default local users:

- `admin@complif.com` / `admin123`
- `viewer@complif.com` / `viewer123`

## Notes For Contributors

- keep business rules in services, not controllers
- keep authorization in guards and decorators
- prefer DTO transforms for input normalization
- if you touch onboarding state or documents, verify risk-score recalculation still happens
