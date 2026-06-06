# PAYMENT_EDGE_CASES.md — Payment Flows, Failures, Penalties & Real-World Financial Scenarios

## 1. Purpose

This document defines all edge cases related to payments within the Privacy-Aware Therapy Scheduling Platform.

It ensures deterministic financial behavior for:

* deposits
* penalties
* no-shows
* refunds
* failed transactions
* duplicate payments

All payment logic must remain isolated from scheduling privacy logic.

---

# 2. Core Principle

## Financial Determinism

All payment outcomes must resolve into one of:

* PAYMENT_SUCCESS
* PAYMENT_FAILED
* PAYMENT_PENDING
* REFUNDED
* PENALTY_APPLIED

No ambiguous financial states are allowed.

---

# 3. Standard Payment Rules

## 3.1 Deposit Requirement

* A $20 deposit is required to confirm appointments
* Appointment is NOT confirmed until deposit is successful

---

## 3.2 No-Show Policy

If a client does not attend the appointment:

* deposit is retained
* marked as PENALTY_APPLIED
* system logs a no-show event

---

## 3.3 Cancellation Policy

If cancellation occurs:

* more than allowed window → deposit refunded
* within penalty window → deposit retained

Cancellation windows are configured externally.

---

# 4. Edge Cases

## 4.1 Payment Failure (Card Declined)

### Scenario

Payment attempt fails due to card issues.

### Behavior

* appointment remains UNCONFIRMED
* user is prompted to retry payment
* slot is temporarily held for limited time

---

## 4.2 Duplicate Payment

### Scenario

User accidentally pays twice for same appointment.

### Behavior

* system detects duplicate transaction
* extra payment is automatically refunded

---

## 4.3 Payment Delay (Pending Status)

### Scenario

Stripe returns delayed confirmation.

### Behavior

* appointment status = PENDING
* slot is reserved temporarily
* final confirmation occurs after webhook resolution

---

## 4.4 Payment After Expiration

### Scenario

Client pays after slot has been released.

### Behavior

* payment is refunded OR
* system offers next available slot

---

## 4.5 Partial Payment Attempt

### Scenario

Client attempts to pay less than required deposit.

### Behavior

* payment is rejected
* appointment is not created

---

## 4.6 Chargeback Event

### Scenario

Client disputes payment after service.

### Behavior

* appointment marked for review
* future bookings may require prepayment
* flagged in audit system

---

## 4.7 No-Show Detection Edge Case

### Scenario

Client arrives late or system cannot confirm attendance.

### Behavior

* after 1-hour window → marked as no-show
* deposit is retained automatically

---

## 4.8 Multiple Bookings with Single Deposit Attempt

### Scenario

Client tries to reserve multiple slots with one payment.

### Behavior

* only first valid appointment is confirmed
* others are invalidated or require new deposit

---

## 4.9 Payment System Downtime

### Scenario

Stripe or payment provider is unavailable.

### Behavior

* system sets payment status = PENDING
* appointment is NOT confirmed
* retry queue is activated

---

## 4.10 Refund Failure

### Scenario

Refund cannot be processed automatically.

### Behavior

* system retries refund
* escalates to manual review
* logs event in audit system

---

# 5. Payment Priority Rules

When conflicts occur:

1. Successful payment confirmation
2. Deposit validation
3. Appointment confirmation
4. Scheduling finalization

---

# 6. Financial Security Rules

* no payment data stored directly (only Stripe references)
* all transactions must be logged via Audit System
* no financial reasoning exposed to AI or UI

---

# 7. AI Restrictions

AI MUST NEVER:

* explain payment failures in detail
* expose fraud detection logic
* reference internal payment processing rules

AI only receives sanitized payment status.

---

# 8. User Communication Rules

Users may only see:

* Payment successful
* Payment failed
* Payment pending
* Refund issued
* Deposit required

No technical explanations allowed.

---

# 9. Penalty Rules

## 9.1 No-Show Penalty

* $20 deposit is retained
* system logs event

## 9.2 Late Cancellation Penalty

* if within restricted window → deposit is retained

---

# 10. System Integration Rules

Payments must integrate with:

* Scheduling Service (confirmation dependency)
* Audit Service (logging)
* Waitlist Service (fallback activation)

Payments do NOT influence Privacy Engine logic.

---

# 11. Failure Handling

If payment processing fails:

* system retries automatically
* user is notified in generic terms
* no internal error details exposed

---

# 12. Security Rules

* all payment events are encrypted
* no raw card data is stored
* Stripe is the only source of truth

---

# 13. Summary

This document ensures that all financial flows are deterministic, secure, and isolated from privacy and scheduling logic.

Payment behavior is strict, predictable, and failure-safe under all real-world conditions.
