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

- Risk scoring: one service method, never scattered.
- Status transitions: modeled explicitly, not ad hoc.
- Document completeness: one reusable function.
- Authorization: in guards/policies, never inline role checks.

### 2. **DTO-First Boundaries**

- All input through class-validator DTOs.
- Pipes validate and transform before business logic.
- No `req.body` directly; always typed DTOs.

### 3. **Constants & Enums (Centralized)**

**`backend/src/common/enums/`:**

- `BusinessStatus` (PENDING, UNDER_REVIEW, APPROVED, REJECTED, CLOSED)
- `UserRole` (ADMIN, VIEWER)
- `DocumentType` (INCORPORATION_CERT, TAX_CERT, etc.)
- `RiskLevel` (LOW, MEDIUM, HIGH, CRITICAL)

**`backend/src/common/constants/`:**

- `RISK_THRESHOLDS` (MANUAL_REVIEW: 70, CRITICAL: 85)
- `HIGH_RISK_INDUSTRIES`, `HIGH_RISK_COUNTRIES`
- `MIN_DOCUMENTS_FOR_APPROVAL`
- `RISK_WEIGHTS` (per factor)

**Rule**: Never hardcode `70`, `20`, or `'APPROVED'` inline. Always reference the constant.

### 4. **Explicit State Transition Rules**

```typescript
const VALID_TRANSITIONS = {
  PENDING: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PENDING"],
  APPROVED: ["CLOSED"],
  REJECTED: ["CLOSED"],
  CLOSED: [],
};
```

Enforce in a dedicated service method before any update.

### 5. **Role-Based Authorization via Guards**

- `JwtAuthGuard`: validates token, attaches user.
- `AdminGuard`: enforces admin-only at route level.
- `PolicyServices`: encapsulate complex authorization.
- No inline role checks inside handlers.

### 6. **Structured Audit Logging**

- Status changes: append to `status_history` transactionally.
- Risk score changes: log reason (which factor triggered recalc).
- Authorization failures: log denial with context.
- Format: structured JSON (timestamp, actor, action, before/after).

### 7. **History by Default**

- `status_history` is immutable; never update or delete.
- Every status change inserts: `previous_status`, `new_status`, `reason`, `changed_by_id`, timestamp.
- Query history to understand timeline; don't infer from `business.status` alone.

### 8. **Deterministic Scoring**

Same input → same output, always.

```typescript
function calculateRiskScore(business: Business, docs: Document[]): number {
  let score = 0;
  score += isMissingRequiredDocument(business, docs) ? 25 : 0;
  score += isHighRiskIndustry(business.industry) ? 20 : 0;
  score += isHighRiskCountry(business.country) ? 15 : 0;
  score += !business.identifier_validated ? 15 : 0;
  return Math.min(score, 100);
}
```

### 9. **Thin Controllers**

Controllers orchestrate, don't decide:

- Accept request → Delegate to service → Return response.

**Bad**: Scoring, transitions, risk logic inside handler. **Good**: Service owns domain; controller calls it.

### 10. **Configuration over Literals**

- API URLs, environment flags, microservice endpoints → `ConfigService`.
- Business rule thresholds → centralized constants (never environment-dependent).

### 11. **Testable Domain Services**

Risk, transitions, validation must be independently testable.

```typescript
// Good: pure function
function calculateRisk(business, documents): number { ... }

// Bad: tightly coupled to DB/HTTP
async function scoreAndPersist(id: string) { ... }
```

---

## Anti-Patterns (Forbidden)

- **Unsafe type casting** — No `as any`, unchecked casts bypassing DTO/schema.
- **Duplicated business logic** — Risk, document, transition rules in multiple places.
- **Inline authorization** — Role checks inside handlers instead of guards/policies.
- **Business logic in Next.js** — Frontend must not become a second compliance engine.
- **Magic numbers** — No inline `70`, `20`, risk weights. Use constants.
- **Ad hoc status mutation** — No direct `.status` updates without transition validation + history.
- **Silent failure** — No swallowed exceptions or hidden fallbacks.
- **Fat controllers** — No scoring, transitions, or authorization inside handlers.
- **Framework-coupled domain logic** — Core rules must stay portable, testable.
- **Implicit defaults** — If a rule matters, declare it explicitly.

---

## Code Quality Checklist

Every feature must answer clearly:

- Where is the business rule?
- Where is authorization enforced?
- Where is input validated?
- Where is the audit trail created?
- Where is the constant declared?

**If answer is "everywhere" or "it depends," the design is wrong.**

---

## Definition of Done

Complete when:

- ✅ Rule is **centralized** (one place, not scattered)
- ✅ Inputs are **validated** (DTOs, pipes, guards)
- ✅ Authorization is **explicit** (guards/policies, not inline)
- ✅ Side effects are **predictable** (deterministic scoring, transactional history)
- ✅ Logs/history are **traceable** (structured, machine-readable)
- ✅ Constants are **declared, not invented** inline
- ✅ Tests cover business-critical paths
- ✅ Frontend remains a client, not a source of truth

---

## Quick Refs

**Backend:**

- `src/auth`: JWT, user lookup, token issue/verify.
- `src/businesses`: Domain core — status, risk, documents, notifications.
- `src/documents`: Upload, archive, trigger risk recalc.
- `src/common`: Enums, guards, decorators, shared utilities.

**Frontend:**

- Never implement compliance logic.
- Consume typed API contracts from `lib/types.ts`.
- All state truth from backend API.
- No optimistic state changes; wait for backend confirmation.

**Local Dev:**

- `docker compose up --build` — PostgreSQL, backend, validation services.
- `cd backend && npm run start:dev` — Backend in watch mode.
- `cd backend && npm test` — Run tests.
- `cd frontend && npm run dev` — Next.js dev server.
