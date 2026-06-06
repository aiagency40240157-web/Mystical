# SYSTEM_ARCHITECTURE.md — High-Level System Design

## 1. Purpose

This document defines the high-level architecture of the Privacy-Aware Therapy Scheduling Platform.

It describes how all system components interact while enforcing strict privacy constraints.

---

# 2. Architectural Philosophy

## Privacy-Centric Architecture

The system is designed with privacy as a **core system layer**, not an application feature.

All components must assume:

* no trust between services
* no direct access to sensitive data
* all outputs must be sanitized

---

# 3. System Overview

The system is composed of 6 major layers:

## 3.1 Presentation Layer

* Web App (Admin / Manager / Assistant)
* Agent Interface
* WhatsApp Interface

Responsibilities:

* user interaction
* message display
* input collection

---

## 3.2 API Gateway Layer

* Authenticates requests
* Applies RBAC
* Routes requests to services
* Enforces request validation

---

## 3.3 Core Service Layer

### Modules:

* Scheduling Service
* Payment Service
* Waitlist Service
* Analytics Service
* Audit Service

---

## 3.4 Privacy Engine Layer (CRITICAL)

This is the most important system component.

Responsibilities:

* conflict detection
* relationship validation
* group rule enforcement
* risk scoring
* safe slot generation

IMPORTANT:
No other system component may replicate or bypass this layer.

---

## 3.5 AI Communication Layer

* Formats responses for WhatsApp and Web
* Receives ONLY sanitized outputs
* Applies language formatting rules

---

## 3.6 Data Layer

* PostgreSQL database
* Redis cache (queues + scheduling tasks)
* Prisma ORM

---

# 4. System Data Flow

## Standard Appointment Flow

1. Client request received (API Gateway)
2. Scheduling Service processes request
3. Privacy Engine evaluates constraints
4. Safe results returned
5. AI formats response
6. WhatsApp/Web delivers message

---

# 5. Service Communication Rules

## Rule 1: No Direct Database Access

All services must go through service layer.

---

## Rule 2: Privacy Engine Enforcement

All scheduling decisions MUST pass through Privacy Engine.

---

## Rule 3: Sanitized Outputs Only

No raw data can be returned to:

* AI layer
* API responses
* External channels

---

# 6. Scheduling Architecture

## Components:

* Availability Calculator
* Conflict Evaluator (Privacy Engine)
* Slot Generator

Flow:

Availability → Validation → Privacy Check → Safe Slots

---

# 7. AI System Architecture

AI is isolated from core business logic.

It only receives:

* approved scheduling results
* pre-formatted messages

AI CANNOT:

* query database
* evaluate conflicts
* access relationships

---

# 8. WhatsApp Integration Architecture

* Webhook receiver
* Message processor
* AI formatter
* Delivery service

All messages must pass through AI Communication Layer.

---

# 9. Payment Architecture

* Stripe integration
* Payment service isolated from scheduling logic
* Payment does NOT influence Privacy Engine decisions directly

---

# 10. Queue System

Redis + BullMQ handles:

* reminders
* notifications
* waitlist processing
* analytics jobs

---

# 11. Security Boundaries

Each layer is isolated:

* No cross-layer database access
* No bypass of Privacy Engine
* No AI direct data access

---

# 12. Scalability Design

System supports:

* horizontal scaling of API layer
* independent scaling of AI layer
* isolated scaling of scheduling engine

---

# 13. Summary

This architecture ensures:

* strict privacy enforcement
* modular scalability
* AI isolation
* deterministic scheduling behavior

The Privacy Engine remains the central decision authority of the system.
