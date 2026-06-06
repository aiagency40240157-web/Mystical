# CLAUDE_MASTER_PROMPT.md — Master Build Instructions for Claude Code

## 1. Purpose

This document defines the master-level instructions for Claude Code to build the Privacy-Aware Therapy Scheduling Platform from scratch.

It is the single source of execution logic for implementation.

Claude must follow these instructions strictly and in order.

---

# 2. Core Mission

Build a production-ready system that provides:

* Privacy-first appointment scheduling
* Relationship-aware conflict prevention
* AI-powered WhatsApp communication
* Secure payment processing with deposits and penalties
* Waitlist management
* Audit logging and analytics

Above all else:

## Privacy is a system constraint, not a feature.

---

# 3. Non-Negotiable Principles

Claude must ALWAYS respect:

## 3.1 Privacy First

No implementation may allow:

* relationship inference leakage
* conflict explanation exposure
* internal scheduling logic exposure

---

## 3.2 Zero-Knowledge Agent Design

Agents must only see:

* available slots
* alternative suggestions
* confirmation messages

NEVER internal reasoning.

---

## 3.3 Separation of Concerns

The system must be split into independent modules:

* Scheduling Engine
* Privacy Engine
* AI Communication Layer
* Payment Engine
* Waitlist Engine
* Audit System
* Analytics Engine

No module should directly bypass another.

---

# 4. Required Tech Stack

## Backend

* Node.js (TypeScript)
* NestJS (preferred architecture)

## Database

* PostgreSQL
* Prisma ORM

## Queue System

* Redis + BullMQ

## AI Layer

* OpenAI API or Claude API

## Communication

* WhatsApp API provider

---

# 5. Repository Structure

Claude must generate a structured monorepo:

```
/docs
  PRD.md
  PRIVACY_ENGINE.md
  DATABASE_SCHEMA.md
  SECURITY_MODEL.md
  AI_AGENT_RULES.md
  WHATSAPP_BEHAVIOR.md

/src

  /modules
    /scheduling
    /privacy
    /ai
    /payments
    /waitlist
    /audit
    /analytics

  /core
    app.module.ts
    main.ts

  /common
    guards
    interceptors
    filters
    utils

  /integrations
    whatsapp
    stripe
    ai-provider

/prisma
  schema.prisma

```

---

# 6. System Architecture Rules

## 6.1 Mandatory Flow

Every appointment request MUST follow:

1. API receives request
2. Scheduling Engine processes request
3. Privacy Engine evaluates constraints
4. Safe availability output is generated
5. AI formats response
6. WhatsApp delivery (if applicable)

---

## 6.2 Privacy Enforcement Point

The Privacy Engine is the ONLY component allowed to evaluate:

* relationships
* group conflicts
* risk scoring
* buffer logic

No other module may replicate this logic.

---

# 7. Module Responsibilities

## 7.1 Scheduling Engine

* Handles appointment creation
* Computes availability slots
* Delegates conflict validation to Privacy Engine

---

## 7.2 Privacy Engine

* Evaluates all conflicts
* Applies group rules
* Applies relationship restrictions
* Returns SAFE / UNSAFE / ALTERNATIVE slots

---

## 7.3 AI Communication Layer

* Formats messages
* Handles WhatsApp responses
* Never accesses raw conflict data

---

## 7.4 Payment Engine

* Handles deposits ($20)
* Processes penalties
* Integrates Stripe

---

## 7.5 Waitlist Engine

* Stores fallback requests
* Promotes waitlist when slots open

---

## 7.6 Audit System

* Logs all actions
* Immutable records
* Manager + Assistant access only

---

## 7.7 Analytics Engine

* Generates daily reports
* Tracks no-shows
* Tracks occupancy

---

# 8. Scheduling Rules

## Office Constraints

* Hours: 9:00 AM – 7:00 PM
* Session length: 30 minutes
* Break: 1:30 PM – 2:15 PM

---

## Conflict Rules

* Red vs Yellow: restricted
* Related clients: 4-hour minimum separation
* Prefer next-day scheduling for sensitive cases

---

# 9. Privacy Implementation Requirements

Claude must implement:

## 9.1 Data Isolation

Sensitive tables MUST NOT be directly accessible by API layer.

---

## 9.2 Response Sanitization

All outputs must pass through:

* Privacy filter
* Role-based sanitizer

---

## 9.3 Anti-Inference System

The system must NEVER expose:

* reason for unavailability
* other client existence
* scheduling conflicts

---

# 10. AI Behavior Constraints

AI MUST:

* respond neutrally
* avoid explanations
* follow WHATSAPP_BEHAVIOR.md strictly

AI MUST NOT:

* access relationships
* expose system rules

---

# 11. API Design Rules

All endpoints must:

* enforce RBAC
* validate through Privacy Engine
* sanitize output before response

No endpoint may bypass privacy validation.

---

# 12. Error Handling Rules

All errors must be:

* generic
* non-informational
* safe for client exposure

Example:

* "Unable to process request at this time"

Forbidden:

* any system-level explanation

---

# 13. Build Order (IMPORTANT)

Claude must implement in this order:

1. Database schema (Prisma)
2. Core backend structure (NestJS)
3. Privacy Engine implementation
4. Scheduling Engine
5. AI communication layer
6. WhatsApp integration
7. Payment system
8. Waitlist system
9. Audit system
10. Analytics system

---

# 14. Testing Requirements

System must include:

* unit tests for Privacy Engine
* integration tests for scheduling flow
* security tests for data leakage

---

# 15. Success Criteria

System is valid ONLY if:

* no privacy leakage is possible
* scheduling is consistent and deterministic
* AI never exposes internal logic
* WhatsApp messages are compliant
* audit logs are complete

---

# 16. Final Instruction

Claude must treat this system as a **privacy-critical infrastructure system**, not a standard scheduling app.

Failure to enforce privacy rules is considered system failure.
