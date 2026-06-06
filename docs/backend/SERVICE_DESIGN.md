# SERVICE_DESIGN.md — Internal Service Architecture & Domain Design

## 1. Purpose

This document defines the internal service-level architecture of the Privacy-Aware Therapy Scheduling Platform.

It translates the API specification into concrete backend services, domain boundaries, and implementation responsibilities.

It ensures strict separation between business logic, privacy enforcement, and external communication layers.

---

# 2. Core Design Philosophy

## 2.1 Domain Isolation

Each service is responsible for a single bounded context.

No service is allowed to:

* directly access another service's internal logic
* bypass the Privacy Engine
* return raw sensitive data

---

## 2.2 Privacy as a Service Dependency

The Privacy Engine is a mandatory dependency for all scheduling-related services.

No scheduling decision can be made without it.

---

# 3. Service Architecture Overview

The backend is composed of the following core services:

* Scheduling Service
* Privacy Service (Engine Wrapper)
* AI Communication Service
* Payment Service
* Waitlist Service
* Client Service
* Audit Service
* Analytics Service

---

# 4. Core Services

## 4.1 Scheduling Service

### Responsibility

Handles all appointment lifecycle operations.

### Functions

* create appointment request
* validate availability (via Privacy Service)
* request slot alternatives
* trigger waitlist if needed

### Rules

* MUST NOT evaluate conflicts directly
* MUST delegate all conflict logic to Privacy Service

---

## 4.2 Privacy Service (Wrapper Layer)

### Responsibility

Acts as the interface to the Privacy Engine.

### Functions

* evaluate scheduling conflicts
* validate group restrictions
* apply relationship constraints
* return safe scheduling outcomes

### Output Types

* SAFE_SLOT
* ALTERNATIVE_SLOTS
* NO_SLOT_AVAILABLE

### Critical Rule

This service NEVER exposes internal reasoning to other services.

---

## 4.3 AI Communication Service

### Responsibility

Handles formatting and delivery of messages.

### Functions

* format responses for WhatsApp
* format responses for web chat
* enforce Response Safety Layer rules

### Restrictions

* cannot access database directly
* cannot evaluate scheduling logic

---

## 4.4 Payment Service

### Responsibility

Handles all financial transactions.

### Functions

* process $20 deposits
* handle Stripe integration
* process penalties for no-shows
* manage payment status updates

### Rules

* payment status does NOT influence Privacy Engine decisions

---

## 4.5 Waitlist Service

### Responsibility

Manages overflow scheduling requests.

### Functions

* add client to waitlist
* prioritize VIP clients
* promote waitlisted clients when slots open

---

## 4.6 Client Service

### Responsibility

Manages client profiles and metadata.

### Functions

* create client
* update client data
* retrieve safe client information

### Restrictions

* must NOT expose relationship data
* must NOT expose privacy metadata

---

## 4.7 Audit Service

### Responsibility

Tracks all system actions.

### Functions

* log appointment changes
* log payment events
* log admin actions

### Rules

* immutable logs
* manager + assistant access only

---

## 4.8 Analytics Service

### Responsibility

Generates operational insights.

### Functions

* daily reports
* weekly summaries
* occupancy metrics
* no-show statistics

### Restrictions

* must only use sanitized data

---

# 5. Inter-Service Communication Flow

## Standard Scheduling Flow

1. Scheduling Service receives request
2. Privacy Service evaluates request
3. Scheduling Service receives safe result
4. AI Communication Service formats response
5. Response sent via WhatsApp/Web

---

# 6. Service Communication Rules

## 6.1 No Direct Database Access

All services must use repositories or domain interfaces.

---

## 6.2 Mandatory Privacy Check

All scheduling-related services MUST call Privacy Service.

---

## 6.3 Sanitized Outputs Only

No service may pass raw internal data to another service if it is user-facing.

---

# 7. Domain Boundaries

## Scheduling Domain

* Scheduling Service
* Privacy Service
* Waitlist Service

## Communication Domain

* AI Communication Service

## Financial Domain

* Payment Service

## User Domain

* Client Service

## Observability Domain

* Audit Service
* Analytics Service

---

# 8. Failure Handling Strategy

If any service fails:

* return generic error
* never expose internal state
* trigger fallback logic if needed

---

# 9. Scalability Design

Each service must be:

* independently deployable
* horizontally scalable
* stateless where possible

Stateful components:

* database
* queue system

---

# 10. Event-Driven Architecture (Recommended)

System events:

* APPOINTMENT_CREATED
* APPOINTMENT_CANCELLED
* PAYMENT_CONFIRMED
* WAITLIST_UPDATED

Events trigger:

* notifications
* analytics updates
* audit logs

---

# 11. Security Constraints

* all services enforce RBAC
* Privacy Service is mandatory gatekeeper
* no service can bypass Response Safety Layer indirectly

---

# 12. Summary

This service design ensures:

* strict separation of concerns
* privacy-first scheduling enforcement
* modular scalability
* AI-safe communication flow
* deterministic backend behavior

The Privacy Service remains the central enforcement point for all scheduling decisions.
