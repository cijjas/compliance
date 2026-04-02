# QUESTIONS

This file captures the challenge decisions taken where the PDF leaves room for assumptions, including the
stricter choices made because the product is framed as a compliance onboarding system rather than a generic
CRUD app.

## 1. Risk-score weights

Question: The PDF defines the three factors that must affect the score, but it does not define exact weights.

Decision:

- Country risk is stored per jurisdiction in the `country_policies` table.
- Industry risk is stored per sector in the `industry_policies` table.
- Shared numeric controls such as documentation penalty and manual-review threshold are stored in
  `risk_settings`.
- The seeded default policy is:
  - high-risk jurisdictions such as `CU`, `IR`, `KP`, `SY`, `MM`, `VE`, `AF`, `YE`: `+30`
  - elevated-risk industries such as `construction`, `security`, `currency_exchange`, `casino`, `gambling`,
    `crypto`: `+25`
  - missing required documentation: `+20` once if any required document is missing
  - manual review: `score > 70`

Reasoning: In a compliance product, policy should be governed data, not scattered application constants.
Putting jurisdictions, sectors, and numeric thresholds in database reference tables makes the backend
authoritative, keeps the frontend in sync through API responses, and allows future policy changes without code
drift or a redeploy of multiple services.

## 2. What happens when the tax identifier format is invalid

Question: Should the backend reject the company creation entirely when the mock validation service marks the
identifier as invalid?

Decision: The backend rejects the creation with a `400 Bad Request` that includes the expected format for the
country (e.g. "Tax identifier … is not a valid Argentina tax ID. Expected format: 11 digits …").

Reasoning: Allowing a record with a known-invalid tax ID into the system would create dirty data that an
analyst would later have to clean up or delete. Blocking early gives the user immediate, actionable feedback
and keeps the database consistent. The error message includes the country-specific format hint returned by the
validation microservice so the user can correct the input and retry without guessing.

## 3. Notification transport

Question: The PDF allows a simple log structured event or webhook mock when company status changes. The
checklist also mentions real-time notifications in the frontend.

Decision: Status changes emit a structured JSON log event and are also pushed through SSE to the frontend.

Reasoning: This satisfies the backend requirement with a minimal transport and also supports the frontend
real-time notification requirement from the same challenge.

## 4. Supported mock identifier formats

Question: The PDF mentions validating country-specific tax IDs and says the external service is a mock.

Decision: The microservice validates:

- `AR`: CUIT
- `MX`: RFC
- `BR`: CNPJ
- Other countries: generic non-empty identifier fallback

Reasoning: This keeps the microservice simple while covering the challenge examples and demonstrating
country-based format validation over HTTP.

## 5. Where document uploads happen after company creation

Question: The PDF explicitly requires document upload in the registration flow, but it does not say whether
users can also upload or replace PDFs from the company detail page after the business already exists.

Decision:

- Yes. PDFs should also be uploadable from the company detail page.
- The company detail page remains the operational place to complete missing documentation after creation.
- Status timeline stays focused on status transitions only.
- The broader activity log should include document-upload events in addition to status changes.

Reasoning: In a compliance onboarding workflow, documentation often arrives after the initial record is
created. Allowing uploads only during registration would force users to recreate or awkwardly edit onboarding
data just to complete missing files. Supporting uploads on the detail page fits the existing
`POST /api/businesses/:businessId/documents` flow, keeps risk-score recalculation meaningful as documents are
added later, and improves analyst workflow. Document uploads should appear in the activity log because they
are relevant audit events, but they should not be mixed into the status timeline because that timeline is
specifically about onboarding state changes.

## 6. Whether company records can be hard-deleted

Question: The challenge did not require a delete endpoint, but an internal admin UI could reasonably add one.
In a compliance company, should businesses be permanently deletable?

Decision: No. The product should not expose hard delete for company onboarding records as a normal workflow.

Reasoning: Compliance systems are audit systems. A permanent delete would erase the business row, the status
history, and the document linkage that explain how and why a case was reviewed. That is the opposite of what
an onboarding ledger should preserve. If record removal is ever needed later, it should be handled as a
deliberate retention/archive workflow with explicit policy, not as a convenience action in the dashboard.

## 7. Whether status transitions need workflow guardrails

Question: The PDF requires status changes and a status history, but it does not define whether any status can
move directly to any other status.

Decision: Status transitions are constrained and every transition requires a written reason.

- `pending -> in_review` or `rejected`
- `in_review -> approved` or `rejected`
- `approved -> in_review`
- `rejected -> in_review`

Reasoning: In a compliance process, status is not just presentation state; it represents a review workflow.
Allowing arbitrary jumps like `pending -> approved` weakens control evidence and makes the audit trail less
credible. Requiring a reason on each transition ensures that every decision is traceable to analyst intent
rather than just a button click.

## 8. What to do when the tax-ID validation service is unavailable

Question: If the external mock validation service is down, should the API reject the business as if the
identifier were invalid?

Decision: No. A dependency outage is treated as `503 Service Unavailable`, not as "invalid tax ID".

Reasoning: An unavailable validator is an operational failure, not an adverse compliance finding. Returning
`400 invalid identifier` would incorrectly tell the user their data is wrong when the real issue is that the
system could not complete the check. In a compliance product, distinguishing "negative result" from "control
unavailable" matters because they lead to different remediation and support paths.

## 9. Where risk policy should be defined

Question: The challenge needs a risk score in both backend and frontend flows. Should the frontend mirror the
country and industry policy tables?

Decision: Risk policy is backend-owned, persisted in database reference tables, and exposed to the UI through
API responses such as the persisted risk score, the preview endpoint, and the reference-data endpoint.

Reasoning: A compliance rulebook should have one authoritative implementation. Duplicating jurisdiction lists,
high-risk industries, or threshold logic across the frontend and backend creates drift risk, especially when
analysts later change policy. Centralizing the policy in backend-owned database tables keeps scoring
consistent, easier to test, easier to govern, and more realistic for a compliance operations team that may
need to update policy without changing frontend code.

## 10. How document access should be scoped

Question: The route shape is `/businesses/:businessId/documents/:id/download`. Should the document id alone be
sufficient to fetch the file?

Decision: No. Document download must be scoped by both `businessId` and `documentId`.

Reasoning: In a compliance tool, uploaded PDFs are evidence files and often sensitive. If the backend trusts
the document UUID alone, a caller who somehow learns a valid document id could retrieve evidence outside its
parent business context. Requiring both ids keeps the route semantics honest and reduces accidental cross-case
exposure.

## 11. How bearer tokens should be transported

Question: SSE often tempts teams to pass JWTs through query parameters for convenience. Is that acceptable
here?

Decision: No. The application accepts JWT bearer tokens through the `Authorization` header only.

Reasoning: Query-string tokens leak too easily into logs, browser history, referrers, screenshots, and
monitoring tools. That is especially undesirable in a compliance environment where access to case data should
be narrowly controlled and auditable. Header-based bearer auth is the safer default and is already sufficient
for the current frontend implementation.

## 12. Whether archived records free up the tax identifier

Question: If a business is archived or soft-deleted, should a new onboarding record be allowed to reuse the
same tax identifier?

Decision: No. A tax identifier stays reserved even if the prior business record has been archived.

Reasoning: In a compliance ledger, the tax identifier is the core link to the legal entity. Reusing it after
archival would let operators recreate the same company as if it were a brand-new case, which weakens
traceability and can bypass historical review context. Keeping the identifier globally unique across active
and archived records preserves continuity of the entity history.

## 13. Whether country and industry are free text

Question: Should the API accept any country or industry string provided by the client?

Decision: No. The backend only accepts countries and industries that are active in the compliance policy
tables.

Reasoning: Risk scoring is only defensible when the jurisdiction and sector are mapped to governed policy
entries. Accepting arbitrary free-text values would create profiles that the rulebook does not actually cover,
which could silently score an unsupported business as low risk. Rejecting unsupported or inactive options
keeps onboarding inside the configured compliance perimeter.

## 14. Whether risk score should automatically decide status

Question: When a company crosses the manual-review threshold or is missing required documents, should the
system automatically approve, reject, or advance the onboarding status?

Decision: No. Risk score informs triage and manual review, but final status changes remain analyst-controlled
workflow actions.

Reasoning: In a compliance company, risk scoring is a decision-support control, not the decision itself. A
high score should surface additional scrutiny, not silently produce an approval or rejection without analyst
rationale. Keeping workflow transitions explicit preserves auditability and makes it clear which outcomes came
from human review versus automated assessment.

## 15. Whether the format-validation microservice should be publicly reachable

Question: The backend depends on the format-validation microservice, but should that service also be directly
accessible from the host machine or external API clients?

Decision: No. The format-validation microservice is kept internal to the Docker network and is intended to be
reachable only by the backend service.

Reasoning: This service is an implementation detail of the onboarding API, not a user-facing product surface.
Publishing it on a host port would expose an unauthenticated internal dependency directly to browsers,
Postman, and any process on the machine, which weakens the intended trust boundary and increases accidental
misuse. Keeping only `expose: 3001` allows the backend to continue calling `http://format-validation:3001`
over Docker service discovery while removing direct host access to the microservice.

## 16. Whether risk scoring should be a separate microservice or an internal module

Question: Should the risk-scoring engine be deployed as a standalone microservice, or kept as a separate
module/domain service inside the main backend?

Decision: Keep risk scoring as a separate NestJS module inside the main backend, cleanly isolated behind an
interface so it can be extracted later if needed. The module persists the score result, individual scoring
factors, and the rule version used at computation time for full auditability.

Reasoning: The scoring engine is tightly coupled to business and document data that already lives in the main
database. Splitting it into a separate microservice would add network hops, data synchronization complexity,
and deployment overhead without a clear operational benefit at this scale. A well-defined module boundary
achieves the same separation of concerns: the scoring logic is testable in isolation, the interface is narrow
enough to extract behind an HTTP boundary later, and the backend retains transactional consistency when
persisting scores alongside the business record. Storing the full assessment breakdown (score, contributing
factors, and the policy/rule version) ensures that every historical score can be explained and reproduced even
after policy changes, which is the core auditability requirement for a compliance system.

## 17. Deploy strategy and CI pipeline design

Question: The challenge mentions Terraform files should be "ready and validated" but not necessarily deployed.
How should the CI pipeline reflect this, and what would a real deployment look like?

Decision: The CI pipeline has three stages: **build** (compile all projects in parallel), **test** (run unit
tests for backend and microservice), and **deploy** (validate Terraform configuration). The deploy stage runs
`terraform init -backend=false` and `terraform validate` without any cloud credentials—it only checks that the
`.tf` files are syntactically correct and internally consistent.

Reasoning: The goal is to catch infrastructure regressions in CI without requiring AWS/Vercel secrets in the
repository. A full `terraform plan` would need real credentials and a state backend, which adds operational
overhead that is unnecessary for a challenge submission. The validation-only approach proves the Terraform is
well-formed and ready to be applied. In a real production scenario, the deploy stage would use OIDC-based
credentials, run `terraform plan` on PRs for review, and `terraform apply` on merge to main—but that requires
live cloud accounts and is explicitly out of scope.

The infrastructure itself mirrors the Docker Compose architecture: ECS Fargate replaces container services
(backend + microservice with service discovery replacing Docker's internal DNS), RDS replaces the local
PostgreSQL container, S3 replaces the local `uploads/` volume, an ALB handles HTTPS termination, and Vercel
hosts the frontend. The VPC uses public subnets for the ALB and NAT gateway, and private subnets for ECS tasks
and RDS—keeping the database and application containers unreachable from the internet.

## 18. How to structure AGENTS.md for agent guidance

Question: How should AGENTS.md be organized to help agents (and new developers) understand the project without
bloating the system prompt?

Decision: Keep a single `AGENTS.md` at the root with only the essential handoff knowledge. Do not use nested
AGENTS.md files in this monorepo. Focus on non-obvious patterns, gotchas, and domain-specific rules rather
than framework basics.

Reasoning: AGENTS.md is appended to the system prompt for every interaction, so every byte counts. A developer
should already know how to write TypeScript or Next.js; what they need are the project-specific guardrails,
compliance patterns, and architectural decisions that prevent common mistakes. Inspired by community
discussion on minimal, focused AGENTS.md patterns—the goal is to be a reference card for project DNA, not a
textbook.

## 19. Document upload audit trail — who uploaded the file

Question: The `documents` table tracks `created_at` but not who performed the upload. For a compliance
system, is that sufficient?

Decision: Every document now records an `uploaded_by_id` foreign key to the `users` table, set at upload time
from the authenticated user's JWT.

Reasoning: In a compliance onboarding workflow, knowing *when* evidence was submitted is only half the audit
trail. Knowing *who* submitted it is equally important for accountability, internal reviews, and regulatory
inquiries. Without this field, the system could not attribute a document to the analyst or operator who
provided it. The column is nullable to gracefully handle edge cases (system-generated records, legacy data),
but the controller always passes the current user.

## 20. Risk score breakdown snapshots at evaluation time

Question: The `businesses.risk_score` column stores the final numeric score, but not the individual factors
that produced it. If policy tables change later, can the original assessment be reconstructed?

Decision: Every risk score evaluation now persists a `risk_assessment_records` row that captures the full
breakdown (country risk, industry risk, documentation risk, missing document types) along with a
`policy_version` hash derived from the active policy tables at computation time.

Reasoning: A compliance score that cannot be explained after the fact is not auditable. Storing only the total
means that if country risk points or the documentation penalty change next quarter, historical scores become
opaque — you know the result but not the reasoning. The snapshot table solves this by freezing the assessment
at the moment it was computed. The `policy_version` is a truncated SHA-256 hash of the full policy state
(country risk map, industry risk map, thresholds, required document types), so two assessments can be compared
to determine whether they were evaluated under the same rulebook. This makes it possible to answer questions
like "was this score calculated before or after we raised the crypto industry penalty?" without re-reading
migration history.

## 21. Document integrity and versioning fields

Question: Documents have `file_path`, `mime_type`, and `file_size`, but no mechanism to verify file integrity
over time or track re-uploads of the same document type.

Decision: Documents now include:

- `checksum`: SHA-256 hash of the file contents, computed at upload time.
- `version`: Auto-incrementing integer scoped to `(business_id, document_type)`, so re-uploading a fiscal
  certificate for the same business produces version 2, 3, etc.

Reasoning: In a compliance evidence store, the ability to prove that a file has not been tampered with after
submission is a basic integrity control. The SHA-256 checksum provides a verifiable fingerprint that can be
checked against the stored file at any point. Versioning supports the common workflow where an analyst uploads
an updated document (e.g. a corrected fiscal certificate) — the system preserves the full history of prior
versions rather than silently overwriting them, which is important for audit continuity.

## 22. Structured logging for document upload events

Question: Status changes are logged as structured events and pushed through SSE. Should document uploads
follow the same pattern?

Decision: Yes. Every document upload now emits a structured `document.uploaded` log event that includes the
document ID, business ID, business name, document type, file name, file size, SHA-256 checksum, version
number, and uploader ID.

Reasoning: Document uploads are audit-relevant events in a compliance onboarding system — they change the
risk profile (by potentially removing the documentation penalty) and represent evidence submission. Logging
them with the same structured format used for status changes ensures that operational monitoring, alerting, and
audit log aggregation can treat both event types uniformly. Including the checksum and version in the log event
means that integrity and lineage information is captured in the log stream as well as in the database, which
supports forensic analysis even if database records are later modified.
