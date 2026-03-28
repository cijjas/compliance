# QUESTIONS

This file captures the challenge decisions taken where the PDF leaves room for assumptions.

## 1. Risk-score weights

Question:
The PDF defines the three factors that must affect the score, but it does not define exact weights.

Decision:
- High-risk country: `+30`
- High-risk industry: `+25`
- Missing required documentation: `+20` once if any required document is missing
- Manual review: `score > 70`

Reasoning:
These weights keep the score inside `0-100`, preserve the explicit `>70` rule from the PDF, and make incomplete documentation materially relevant without counting each missing file as a separate penalty.

## 2. What happens when the tax identifier format is invalid

Question:
Should the backend reject the company creation entirely when the mock validation service marks the identifier as invalid?

Decision:
The backend still creates the business record and stores `identifierValidated=false`.

Reasoning:
The challenge asks for integration with a mock external validation service, but it does not require invalid formats to block onboarding. Keeping the record allows an analyst to continue the review while preserving the validation result.

## 3. Notification transport

Question:
The PDF allows a simple log structured event or webhook mock when company status changes. The checklist also mentions real-time notifications in the frontend.

Decision:
Status changes emit a structured JSON log event and are also pushed through SSE to the frontend.

Reasoning:
This satisfies the backend requirement with a minimal transport and also supports the frontend real-time notification requirement from the same challenge.

## 4. Supported mock identifier formats

Question:
The PDF mentions validating CUIT/RFC and says the external service is a mock.

Decision:
The microservice validates:
- `AR`: CUIT
- `MX`: RFC
- `BR`: CNPJ
- Other countries: generic non-empty identifier fallback

Reasoning:
This keeps the microservice simple while covering the challenge examples and demonstrating country-based format validation over HTTP.
