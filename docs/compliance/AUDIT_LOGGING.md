# AUDIT_LOGGING.md — Audit System, Traceability & Immutable Event Logging

## 1. Purpose

This document defines the audit logging system for the Privacy-Aware Therapy Scheduling Platform.

Its purpose is to ensure full system traceability while maintaining strict privacy constraints.

Audit logs are designed to track **actions, not sensitive content**.

---

# 2. Core Principle

## Log Actions, Never Sensitive Context

The audit system MUST record:

* what happened
* when it happened
* which system component triggered it

It MUST NOT record:

* client relationships
* conflict reasons
* privacy engine outputs
* internal scheduling logic

---

# 3. Audit Log Structure

Each audit event must follow this schema:

```json
{
  "event_id": "uuid",
  "timestamp": "ISO_TIMESTAMP",
  "actor": "SYSTEM | AGENT | ASSISTANT | MANAGER",
  "action": "string",
  "entity_type": "APPOINTMENT | PAYMENT | CLIENT | WAITLIST",
  "entity_id": "uuid",
  "status": "SUCCESS | FAILED",
  "metadata": {}
}
```

---

# 4. Logged Events

## 4.1 Appointment Events

* APPOINTMENT_CREATED
* APPOINTMENT_CANCELLED
* APPOINTMENT_RESCHEDULED
* APPOINTMENT_CONFIRMED

---

## 4.2 Payment Events

* PAYMENT_INITIATED
* PAYMENT_SUCCESS
* PAYMENT_FAILED
* DEPOSIT_APPLIED
* PENALTY_CHARGED

---

## 4.3 Waitlist Events

* WAITLIST_ADDED
* WAITLIST_PROMOTED
* WAITLIST_REMOVED

---

## 4.4 Client Events

* CLIENT_CREATED
* CLIENT_UPDATED

---

## 4.5 System Events

* PRIVACY_ENGINE_EVALUATED
* RESPONSE_SAFETY_APPLIED
* AI_RESPONSE_GENERATED

---

# 5. Restricted Logging Rules

## 5.1 Forbidden Log Data

The following MUST NEVER be stored in logs:

* client relationships
* group conflict rules
* scheduling conflict reasons
* privacy engine reasoning
* internal decision graphs

---

## 5.2 Safe Metadata Only

Allowed metadata includes:

* appointment time (sanitized)
* status changes
* system component identifiers
* generic flags (no sensitive context)

---

# 6. Immutability Rules

## 6.1 Append-Only System

Audit logs MUST be:

* immutable
* append-only
* non-editable

No update or delete operations are allowed.

---

## 6.2 Tamper Protection

Logs must be protected via:

* hash chaining (recommended)
* database-level restrictions
* restricted admin access

---

# 7. Access Control

## 7.1 Who Can Access Logs

* Manager: full access
* Assistant: read-only access

---

## 7.2 Agent Restrictions

Agents MUST NOT access audit logs.

---

## 7.3 AI Restrictions

AI systems MUST NOT access audit logs.

---

# 8. Logging Pipeline

Every system action passes through:

1. Action execution
2. Audit event generation
3. Metadata sanitization
4. Log persistence
5. Optional analytics processing

---

# 9. Privacy Alignment

Audit logs must be aligned with:

* PRIVACY_ENGINE.md
* RESPONSE_SAFETY_LAYER.md
* SECURITY_MODEL.md

No audit event may bypass privacy constraints.

---

# 10. Error Logging Rules

Errors must be logged as:

```json
{
  "action": "ERROR",
  "status": "FAILED",
  "metadata": {
    "error_type": "GENERIC"
  }
}
```

No stack traces or system errors allowed.

---

# 11. Event Correlation

Each action may include:

* correlation_id
* request_id

Used only for tracing system flow, NOT for exposing sensitive relationships.

---

# 12. Analytics Integration

Audit logs feed into analytics engine in a sanitized form.

No raw logs are exposed to analytics directly.

---

# 13. Performance Requirements

* logging must be asynchronous
* must not block API responses
* must be highly scalable

---

# 14. Retention Alignment

Audit logs follow DATA_RETENTION_POLICY.md rules.

---

# 15. Summary

The audit system ensures full traceability of system actions while maintaining absolute privacy boundaries.

It records behavior, not sensitive meaning.

It is a compliance and observability layer, not a data exposure layer.
