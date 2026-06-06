# SCHEDULING_EDGE_CASES.md — Scheduling Conflicts, Exceptions & Real-World Scenarios

## 1. Purpose

This document defines all edge cases related to appointment scheduling within the Privacy-Aware Therapy Scheduling Platform.

It ensures the system behaves deterministically under complex real-world conditions while preserving strict privacy rules.

---

# 2. Core Principle

## Deterministic Conflict Resolution

All scheduling edge cases must resolve into one of:

* CONFIRMED
* REJECTED
* ALTERNATIVES OFFERED
* WAITLISTED

No ambiguous states are allowed.

---

# 3. Core Scheduling Constraints

## 3.1 Time Structure

* Working hours: 9:00 AM – 7:00 PM
* Session length: 30 minutes
* Mandatory break: 1:30 PM – 2:15 PM (blocked)

---

## 3.2 Minimum Separation Rule

If two clients are marked as "related" or known:

* minimum separation: 4 hours
* preferred: next-day scheduling

If conflict cannot be resolved:

* system must suggest next-day availability

---

## 3.3 Color Group Restrictions

### Critical Rule

* RED clients MUST NOT be scheduled with YELLOW clients on overlapping or same-day constrained windows when flagged as known relationship risk.

### Enforcement

* enforced via Privacy Engine only
* never exposed to UI or AI

---

# 4. Edge Cases

## 4.1 Double Booking Attempt

### Scenario

Two users attempt to book the same slot simultaneously.

### Resolution

* first confirmed transaction wins
* second request is re-evaluated automatically
* fallback: ALTERNATIVE or WAITLIST

---

## 4.2 Last Slot Conflict

If only one slot remains and violates privacy constraints:

* slot is rejected
* system suggests next available valid day

---

## 4.3 Related Clients Booking Same Day

If two related clients request same-day appointments:

* system enforces 4-hour separation
* if not possible → next-day scheduling required

---

## 4.4 Gap Rule Violation (4-Hour Buffer)

If any booking violates buffer rule:

* automatically rejected
* alternatives provided

No explanation is ever exposed to user.

---

## 4.5 Break Window Conflict

If requested slot overlaps break (1:30–2:15 PM):

* slot is automatically unavailable
* system suggests closest valid slots

---

## 4.6 Waitlist Overflow

If waitlist exceeds capacity:

* oldest low-priority entries removed
* VIP entries preserved

---

## 4.7 Rapid Rescheduling Abuse

If a client reschedules multiple times in short period:

* system flags as behavioral risk
* may require deposit confirmation again

---

## 4.8 No Availability for Multiple Days

If system cannot find valid slot for 3+ days:

* client is placed in waitlist automatically

---

## 4.9 Cross-Conflict Cascade

If booking one client causes multiple downstream conflicts:

* system recalculates entire affected schedule window
* only sanitized result is returned

---

## 4.10 Simultaneous Multi-Client Requests

If multiple related clients request overlapping times:

* Privacy Engine evaluates all requests in batch
* system returns safest non-conflicting assignment

---

# 5. Scheduling Decision Hierarchy

When conflicts occur, system prioritizes:

1. Privacy constraints (highest priority)
2. Existing confirmed appointments
3. 4-hour separation rule
4. Group color rules
5. User preference

---

# 6. Failure Handling

If scheduling engine cannot resolve a conflict:

* return WAITLISTED state
* never expose internal failure reason

---

# 7. Time Optimization Rules

System should:

* minimize idle gaps
* avoid fragmentation of schedule
* prefer continuous blocks when possible

BUT never violate privacy constraints for optimization.

---

# 8. AI Interaction Restrictions

AI MUST NEVER:

* explain why a slot is unavailable
* mention conflicts
* reference other clients

AI only receives sanitized outputs.

---

# 9. Deterministic Output Mapping

| Condition          | Output       |
| ------------------ | ------------ |
| Valid slot         | CONFIRMED    |
| Conflict detected  | REJECTED     |
| Alternative exists | ALTERNATIVES |
| No solution        | WAITLIST     |

---

# 10. System Safety Rules

* no scheduling decision bypasses Privacy Engine
* no direct calendar writes without validation
* no external system influences conflict logic

---

# 11. Summary

This document ensures scheduling behavior remains deterministic, privacy-safe, and resilient under real-world high-conflict scenarios.

All edge cases must resolve without exposing internal system logic.
