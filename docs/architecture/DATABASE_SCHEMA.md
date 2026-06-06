# DATABASE_SCHEMA.md — Privacy-Aware Scheduling Data Model

## 1. Purpose

This document defines the data structure for the Privacy-Aware Therapy Scheduling Platform.

The schema is designed to fully support the Privacy Engine while preventing any direct or indirect leakage of sensitive relationships, conflicts, or scheduling logic.

---

## 2. Core Design Principles

### 2.1 Privacy-Isolated Data Model

Sensitive relationship and conflict data must be:

* logically separated from scheduling data
* access-controlled at schema level
* never directly queryable by agent-level services

---

### 2.2 Separation of Concerns

The database is divided into 4 logical layers:

1. Public Scheduling Layer (safe for agents)
2. Operational Layer (manager access)
3. Privacy Layer (restricted)
4. System Layer (audit + AI + analytics)

---

## 3. Main Entities

# 3.1 Clients

### Table: clients

* id (UUID)
* first_name (string)
* last_name (string)
* phone (string)
* email (string)
* group_color (ENUM: RED, BLUE, YELLOW)
* vip_status (boolean)
* created_at (timestamp)
* updated_at (timestamp)

### Notes:

* No relationship data stored here
* No conflict data stored here

---

# 3.2 Appointments

### Table: appointments

* id (UUID)
* client_id (FK → clients.id)
* start_time (timestamp)
* end_time (timestamp)
* status (ENUM: CONFIRMED, CANCELLED, COMPLETED, NO_SHOW, WAITLISTED)
* payment_status (ENUM: PAID, UNPAID, DEPOSIT_HELD)
* created_at (timestamp)

### Rules:

* All appointments are 30 minutes fixed duration
* Time validation enforced by Scheduling Engine

---

# 3.3 Waitlist

### Table: waitlist_entries

* id (UUID)
* client_id (FK)
* requested_time_preference (timestamp nullable)
* priority_level (ENUM: STANDARD, VIP)
* status (ENUM: ACTIVE, FULFILLED, CANCELLED)
* created_at (timestamp)

---

# 3.4 Payments

### Table: payments

* id (UUID)
* client_id (FK)
* appointment_id (FK)
* amount (decimal)
* currency (default: USD)
* status (ENUM: SUCCESS, FAILED, REFUNDED, HELD)
* payment_type (ENUM: DEPOSIT, PENALTY)
* provider_reference_id (string)
* created_at (timestamp)

---

# 3.5 No-Show Tracking

### Table: no_show_records

* id (UUID)
* client_id (FK)
* appointment_id (FK)
* penalty_applied (boolean)
* created_at (timestamp)

---

# 3.6 Group Rules (System Reference)

### Table: group_rules

* id (UUID)
* group_a (ENUM)
* group_b (ENUM)
* restriction_type (ENUM: HARD, SOFT)
* separation_minutes (integer)

### Default Rule:

* RED vs YELLOW = HARD conflict
* separation = 240 minutes minimum

---

# 4. Privacy Layer (CRITICAL)

## 4.1 Relationship Graph

### Table: client_relationships

⚠️ THIS TABLE IS HIGHLY RESTRICTED

* id (UUID)
* client_a_id (FK)
* client_b_id (FK)
* relationship_type (ENUM: FAMILY, FRIEND, SOCIAL, UNKNOWN)
* confidence_score (0–100)
* status (ENUM: PENDING, CONFIRMED, REJECTED)
* created_by (SYSTEM | MANAGER)
* created_at (timestamp)

### Access Rules:

* ONLY Manager role can access this table
* NEVER exposed to Agent or AI response layer
* NEVER included in scheduling output

---

## 4.2 Privacy Conflict Cache

### Table: privacy_conflicts (ephemeral)

* id (UUID)
* appointment_a_id
* appointment_b_id
* conflict_type (RELATIONSHIP | GROUP | BUFFER)
* risk_level (LOW | MEDIUM | HIGH)
* resolved_at (timestamp)

### Notes:

* Used ONLY internally by Privacy Engine
* May be cached or recomputed
* NOT persistent for agent access

---

# 5. Scheduling Safety Layer

## 5.1 Time Slots

### Table: time_slots

* id (UUID)
* start_time (timestamp)
* end_time (timestamp)
* is_available (boolean)
* blocked_reason (SYSTEM | BREAK | PRIVACY | MANUAL)

---

## 5.2 Buffer Rules

Buffers are NOT stored as fixed records.

They are computed dynamically by:

* Privacy Engine
* Scheduling Engine

---

# 6. AI & Communication Layer

## 6.1 Messages

### Table: messages

* id (UUID)
* client_id (FK)
* channel (WHATSAPP | WEB)
* direction (INBOUND | OUTBOUND)
* message_type (REMINDER | CONFIRMATION | GENERAL)
* content (text)
* created_at (timestamp)

---

## 6.2 AI Interaction Logs

### Table: ai_logs

* id (UUID)
* client_id (nullable)
* input_text
* output_text
* safety_filter_applied (boolean)
* timestamp

---

# 7. Audit System

### Table: audit_logs

* id (UUID)
* actor_role (AGENT | ASSISTANT | MANAGER | SYSTEM)
* action_type
* entity_type
* entity_id
* timestamp
* metadata (JSON)

---

# 8. Payment Integration Layer

System integrates with external provider:

* Stripe (recommended)

No raw card data is stored in the system.

Only references are stored in payments table.

---

# 9. Data Access Rules (CRITICAL)

## 9.1 Agent Access

Agent can access ONLY:

* clients (basic info)
* appointments
* availability
* waitlist (limited)

Agent CANNOT access:

* client_relationships
* privacy_conflicts
* risk_scores
* audit logs

---

## 9.2 Assistant Access

Assistant can access:

* audit logs
* analytics
* reports

---

## 9.3 Manager Access

Manager has full access including:

* relationship graph
* conflict history
* override controls

---

# 10. Data Flow Architecture

1. Client request enters system
2. Scheduling Engine queries appointments + time slots
3. Privacy Engine evaluates hidden relationships
4. Result returned as safe availability only
5. AI formats response
6. WhatsApp/Web delivers message

At no point is raw conflict data exposed externally.

---

# 11. Security Requirements

* All sensitive tables encrypted at rest
* Relationship data logically isolated
* Strict role-based access control (RBAC)
* No direct querying of privacy layer from API layer

---

# 12. Summary

This database schema is designed to fully support:

* Zero-knowledge scheduling agent
* Confidential therapy environment
* Relationship-aware scheduling constraints
* VIP prioritization system
* Payment + penalty automation
* Waitlist intelligence
* Audit compliance

The schema prioritizes privacy isolation above all operational concerns.
