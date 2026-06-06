# SECURITY_MODEL.md — System Security & Access Control Architecture

## 1. Purpose

This document defines the security architecture for the Privacy-Aware Therapy Scheduling Platform.

Its purpose is to ensure that:

* Sensitive client data cannot be accessed by unauthorized roles
* The Privacy Engine cannot be bypassed
* AI systems cannot leak or infer restricted information
* External channels (WhatsApp, Web) remain safe communication layers only

Security is enforced at multiple layers: database, API, service, and AI response layer.

---

# 2. Security Philosophy

## Zero Trust Internal System

No component is inherently trusted.
Every request must be validated against:

* Role permissions
* Data classification rules
* Privacy Engine constraints
* Context-based access rules

---

## Privacy Over Accessibility

If a system feature improves usability but introduces data exposure risk, it must be rejected.

---

# 3. Role-Based Access Control (RBAC)

## 3.1 Roles

### Agent (Zero Knowledge Role)

Agent is the primary user interacting with scheduling operations.

Allowed:

* Create appointments
* Reschedule appointments
* Cancel appointments
* View available time slots
* View basic client information

NOT allowed:

* View relationships
* View conflict reasons
* View group rules
* View privacy engine outputs
* Access audit logs
* Access analytics

Agent must only receive:

* AVAILABLE
* UNAVAILABLE
* SUGGESTED ALTERNATIVES

---

### Assistant (Operational Observer)

Allowed:

* View reports
* View audit logs
* View analytics dashboards
* View system summaries

NOT allowed:

* Override privacy engine
* Modify relationship graph

---

### Manager (Full Privileged Access)

Allowed:

* View all system data
* Confirm relationships
* Override soft conflicts
* Access audit logs
* Modify scheduling rules
* Manage VIP rules

Manager is the only role with visibility into Privacy Layer.

---

### System (Automated Services)

Includes:

* Privacy Engine
* Scheduling Engine
* AI Communication Engine
* Payment Engine
* Waitlist Engine

System components must follow internal access boundaries strictly.

---

# 4. Data Access Security Layers

## 4.1 Layered Security Model

1. API Layer (request validation)
2. Service Layer (business logic enforcement)
3. Privacy Engine Layer (conflict evaluation)
4. Database Layer (data isolation)

No layer may bypass the layer above it.

---

## 4.2 Sensitive Data Classification

### Public Data

* Available appointment slots
* Basic client metadata (non-sensitive)

### Internal Data

* Appointment history
* Payment status
* Waitlist status

### Restricted Data

* Client relationships
* Conflict mappings
* Privacy risk scores
* Group conflict rules

Restricted data MUST NEVER reach Agent or AI response layer.

---

# 5. API Security Rules

## 5.1 Request Validation

Every API request must include:

* Authentication token
* Role identifier
* Session validation

---

## 5.2 Response Filtering

Before returning any response:

ALL data must pass through:

* Privacy Engine Filter
* Role-based sanitizer

No raw database output is allowed.

---

# 6. AI Security Layer

## 6.1 AI Isolation Principle

The AI system must never access:

* Relationship graphs
* Conflict logic
* Internal scheduling rules

AI only receives:

* Safe availability slots
* Pre-sanitized responses
* Approved scheduling outcomes

---

## 6.2 AI Output Constraints

AI responses must be limited to:

* Confirmations
* Alternative suggestions
* Neutral scheduling messages

Forbidden outputs:

* Explanations of conflicts
* References to other clients
* System logic disclosures

---

## 6.3 Prompt Injection Protection

The system must assume all external inputs are untrusted.

Protection measures:

* Input sanitization
* Role context enforcement
* Response validation layer

---

# 7. WhatsApp & External Channel Security

## 7.1 Channel Isolation

WhatsApp is a communication layer only.
It does NOT have access to internal system logic.

---

## 7.2 Message Restrictions

Messages sent via WhatsApp MUST NOT include:

* Client relationships
* Scheduling conflict explanations
* Internal system rules

---

## 7.3 Allowed Message Types

* Appointment confirmation
* Appointment reminders
* Reschedule options
* Cancellation confirmation
* Payment notifications

---

# 8. Payment Security

## 8.1 External Provider

Payments are handled via external provider (e.g. Stripe).

The system stores ONLY:

* Transaction ID
* Status
* Amount

No sensitive payment data is stored internally.

---

## 8.2 Fraud Prevention

System must detect:

* Repeated failed payments
* Suspicious cancellations
* Abuse of no-show policy

---

# 9. Session Security

## 9.1 Session Rules

* Sessions expire automatically after inactivity
* Role elevation requires re-authentication

---

## 9.2 Device Tracking

System may track:

* Device ID
* Login time
* IP address (for anomaly detection only)

---

# 10. Audit Protection

Audit logs are:

* Immutable
* Append-only
* Time-stamped

Only Manager and Assistant roles can view logs.

---

# 11. Privacy Engine Protection

The Privacy Engine is a protected internal module.

Rules:

* Cannot be bypassed by API calls
* Cannot be accessed directly by AI
* Cannot expose raw evaluation data

Outputs are strictly limited to:

* AVAILABLE
* UNAVAILABLE
* ALTERNATIVES

---

# 12. Data Leakage Prevention

System must prevent leakage through:

* AI responses
* API responses
* Error messages
* Logs
* Notifications

All error messages must be generic and non-revealing.

Example:

* Allowed: "This time slot is unavailable"
* Forbidden: "Conflict with another client"

---

# 13. Threat Model

## 13.1 Internal Threats

* Agent attempting to infer relationships
* Assistant accessing restricted reasoning

## 13.2 External Threats

* API abuse
* Prompt injection attacks
* WhatsApp message manipulation

---

# 14. Security Principles Summary

* Never expose internal reasoning
* Never expose client relationships
* Never expose conflict logic
* Always sanitize AI outputs
* Always enforce role-based filtering
* Always treat external inputs as untrusted

---

# 15. Final Statement

This system is designed as a high-confidentiality scheduling platform where privacy is enforced at architectural level, not at application level.

Security is not optional. It is structural.
