# API_SPEC.md — API Contract & Endpoint Specification

## 1. Purpose

This document defines the full API contract for the Privacy-Aware Therapy Scheduling Platform.

It specifies all endpoints, request/response formats, and enforcement rules for:

* scheduling
* clients
* payments
* waitlist
* AI communication
* system administration

All API behavior MUST comply with:

* PRIVACY_ENGINE.md
* SECURITY_MODEL.md
* RESPONSE_SAFETY_LAYER.md

---

# 2. Core API Principles

## 2.1 Privacy Enforcement Mandatory

Every request MUST pass through:

1. Authentication Layer
2. RBAC Validation
3. Privacy Engine Evaluation
4. Response Safety Layer

No endpoint may bypass these layers.

---

## 2.2 No Raw Data Exposure

API responses MUST NEVER include:

* relationship data
* conflict reasoning
* internal scheduling logic
* privacy risk scores

---

## 2.3 Deterministic Outputs Only

All endpoints must return predictable, structured responses.

---

# 3. Authentication

## POST /auth/login

### Request

```json
{
  "email": "string",
  "password": "string"
}
```

### Response

```json
{
  "token": "jwt_token",
  "role": "AGENT | ASSISTANT | MANAGER"
}
```

---

# 4. Clients

## GET /clients

Returns safe client list (role-restricted)

### Response

```json
[
  {
    "id": "uuid",
    "first_name": "string",
    "last_name": "string",
    "vip_status": false
  }
]
```

---

## POST /clients

Creates a new client

### Request

```json
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "email": "string",
  "group_color": "RED | BLUE | YELLOW"
}
```

---

# 5. Scheduling

## POST /appointments/book

### Request

```json
{
  "client_id": "uuid",
  "requested_time": "ISO_TIMESTAMP"
}
```

### Internal Flow

1. Validate request
2. Send to Scheduling Engine
3. Privacy Engine evaluates conflicts
4. Response Safety Layer sanitizes output

### Response

```json
{
  "status": "CONFIRMED | ALTERNATIVES | WAITLISTED",
  "message": "string",
  "options": [
    "ISO_TIMESTAMP"
  ]
}
```

---

## POST /appointments/reschedule

### Request

```json
{
  "appointment_id": "uuid",
  "new_time": "ISO_TIMESTAMP"
}
```

### Behavior

* treated as new booking request
* previous state ignored in reasoning

---

## POST /appointments/cancel

### Request

```json
{
  "appointment_id": "uuid"
}
```

### Response

```json
{
  "status": "CANCELLED",
  "message": "Your appointment has been canceled."
}
```

---

# 6. Availability

## GET /availability

### Request

```json
{
  "date": "YYYY-MM-DD"
}
```

### Response

```json
{
  "available_slots": [
    "ISO_TIMESTAMP"
  ]
}
```

---

# 7. Waitlist

## POST /waitlist/add

### Request

```json
{
  "client_id": "uuid",
  "preferred_time": "ISO_TIMESTAMP"
}
```

### Response

```json
{
  "status": "WAITLISTED",
  "message": "You have been added to the waitlist."
}
```

---

# 8. Payments

## POST /payments/deposit

### Request

```json
{
  "client_id": "uuid",
  "appointment_id": "uuid",
  "amount": 20
}
```

### Response

```json
{
  "status": "SUCCESS | FAILED",
  "transaction_id": "string"
}
```

---

## POST /payments/webhook

Stripe webhook handler

### Behavior

* updates payment status
* triggers appointment confirmation logic

---

# 9. AI Communication

## POST /ai/message

### Request

```json
{
  "channel": "WHATSAPP | WEB",
  "client_id": "uuid",
  "message": "string"
}
```

### Internal Flow

1. AI Agent processes message
2. Privacy-safe scheduling output generated
3. Response Safety Layer sanitizes output
4. Message sent via channel

---

# 10. Admin & Reports

## GET /admin/daily-report

### Response

```json
{
  "appointments_today": 10,
  "weekly_summary": {
    "total": 50,
    "no_shows": 3
  }
}
```

---

# 11. Security Enforcement per Endpoint

Every endpoint MUST:

* validate JWT
* enforce RBAC
* call Privacy Engine (if scheduling related)
* pass through Response Safety Layer

---

# 12. Error Handling

All errors must be generic:

```json
{
  "error": "Unable to process request at this time"
}
```

NEVER expose:

* stack traces
* database errors
* conflict reasons

---

# 13. Rate Limiting

* 100 requests/min per agent
* 1000 requests/min per system service

---

# 14. Versioning

API must use versioning:

```
/api/v1/
```

---

# 15. Summary

This API layer acts as a strict enforcement boundary between:

* external users
* internal privacy system
* AI communication layer

No request bypasses Privacy Engine or Response Safety Layer.
