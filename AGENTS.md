# AGENTS

## Handoff Essentials

This is a **compliance-grade onboarding portal**. Not a typical CRUD app.

- **Backend owns all decisions** — risk scoring, state transitions, auth, notifications. Frontend is UI only.
- **Rules must be explicit and centralized** — no magic numbers, no scattered logic.
- **Audit trails are immutable** — `status_history` is append-only, never modified.
- **Same input = same output** — risk scoring is deterministic.
- **Authorization is in guards, not inline** — role checks happen at the route level, not buried in business
  logic.

---

## Required Patterns

### 1. **Centralized Compliance Logic**

- Risk scoring: isolated in the `risk-scoring` module, never scattered.
- Status transitions: modeled explicitly in `business-status-policy.ts`, not ad hoc.
- Document completeness: checked by the risk assessment policy via `REQUIRED_DOCUMENT_TYPES`.
- Authorization: in guards (`JwtAuthGuard`, `RolesGuard`), never inline role checks.

### 2. **DTO-First Boundaries**

- All input through class-validator DTOs.
- Pipes validate and transform before business logic.
- No `req.body` directly; always typed DTOs.

### 3. **Enums (Centralized in `backend/src/common/enums/`)**

- `BusinessStatus` — `pending`, `in_review`, `approved`, `rejected`
- `UserRole` — `admin`, `viewer`
- `DocumentType` — `fiscal_certificate`, `registration_proof`, `insurance_policy`, `other`

There is no `RiskLevel` enum or `common/constants/` directory. Risk thresholds and weights live in database
policy tables (`country_policies`, `industry_policies`, `risk_settings`), not in code constants.

### 4. **Database-Driven Risk Policy**

Risk scoring configuration is governed data, not code constants:

- **Country risk**: `country_policies` table (e.g. CU +30, AR +0).
- **Industry risk**: `industry_policies` table (e.g. casino +25, technology +0).
- **Risk settings**: `risk_settings` table (`documentation_risk_points`, `manual_review_threshold`).
- **Required documents**: `REQUIRED_DOCUMENT_TYPES` in `risk-scoring/risk-assessment.policy.ts`.

The `risk-scoring` module loads its own policy snapshot from these tables. The pure scoring function
(`calculateRiskAssessment`) takes input + snapshot and returns a deterministic result.

### 5. **Explicit State Transition Rules**

Defined in `businesses/business-status-policy.ts`:

```
pending    → in_review, rejected
in_review  → approved, rejected
approved   → in_review
rejected   → in_review
```

Enforced before any status update. Every transition requires a written reason.

### 6. **Role-Based Authorization via Guards**

- `JwtAuthGuard` (`common/guards/jwt-auth.guard.ts`): validates token, attaches user.
- `RolesGuard` (`common/guards/roles.guard.ts`): enforces role requirement at route level.
- `@Roles()` decorator (`common/decorators/roles.decorator.ts`): declares required role on endpoints.
- `@CurrentUser()` decorator: extracts authenticated user from request.
- No inline role checks inside handlers.

### 7. **History by Default**

- `status_history` is immutable; never update or delete.
- Every status change inserts: `previous_status`, `new_status`, `reason`, `changed_by_id`, timestamp.
- Query history to understand timeline; don't infer from `business.status` alone.

### 8. **Deterministic Scoring**

Same input + same policy = same output, always. The scoring function is pure:

```typescript
// risk-scoring/risk-assessment.policy.ts
function calculateRiskAssessment(input: RiskInput, policy: RiskPolicySnapshot): RiskAssessment
```

The `RiskAssessmentService` handles orchestration (load business, compute, persist score). The pure function
handles math.

### 9. **Thin Controllers**

Controllers orchestrate, don't decide:

- Accept request → Delegate to service → Return response.

**Bad**: Scoring, transitions, risk logic inside handler. **Good**: Service owns domain; controller calls it.

### 10. **Configuration over Literals**

- API URLs, environment flags, microservice endpoints → `ConfigService`.
- Business rule thresholds → database policy tables (never hardcoded, never environment-dependent).

---

## Anti-Patterns (Forbidden)

- **Unsafe type casting** — No `as any`, unchecked casts bypassing DTO/schema.
- **Duplicated business logic** — Risk, document, transition rules in multiple places.
- **Inline authorization** — Role checks inside handlers instead of guards.
- **Business logic in Next.js** — Frontend must not become a second compliance engine.
- **Magic numbers** — No inline `70`, `20`, risk weights. Policy lives in database tables.
- **Ad hoc status mutation** — No direct `.status` updates without transition validation + history.
- **Silent failure** — No swallowed exceptions or hidden fallbacks.
- **Fat controllers** — No scoring, transitions, or authorization inside handlers.
- **Framework-coupled domain logic** — Core scoring rules stay pure and testable.
- **Implicit defaults** — If a rule matters, declare it explicitly.

---

## Code Quality Checklist

Every feature must answer clearly:

- Where is the business rule?
- Where is authorization enforced?
- Where is input validated?
- Where is the audit trail created?

**If answer is "everywhere" or "it depends," the design is wrong.**

---

## Backend Module Map

- `src/auth` — JWT strategy, login/register, token issue/verify.
- `src/businesses` — Domain core: status transitions, reference data, identifier validation, notifications.
- `src/risk-scoring` — Isolated risk assessment: policy loading, scoring engine, score persistence.
- `src/documents` — Upload, retrieval, triggers risk recalculation on new uploads.
- `src/notifications` — SSE event stream for real-time frontend updates.
- `src/common` — Enums, entities, guards, decorators, shared utilities.
- `src/database` — TypeORM config, migrations, seed data.

## Frontend

- Never implement compliance logic.
- All state truth from backend API.
- No optimistic state changes; wait for backend confirmation.

## Local Dev

- `docker compose up --build` — PostgreSQL, backend, validation microservice.
- `cd backend && npm run start:dev` — Backend in watch mode.
- `cd backend && npm test` — Run tests.
- `cd frontend && npm run dev` — Next.js dev server.
