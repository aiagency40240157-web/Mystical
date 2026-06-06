# PRIVACY_ENGINE.md — Confidential Scheduling Logic Core

## 1. Purpose

The Privacy Engine is the central decision-making layer of the system. Its primary responsibility is to ensure that no scheduling decision exposes, infers, or leaks sensitive relationships, group conflicts, or client interactions.

This engine operates as a **zero-knowledge decision system** for all non-manager roles.

It is the most critical component of the platform.

---

## 2. Core Principle

### Privacy Over Availability

If a scheduling decision improves availability but reduces privacy integrity, it MUST be rejected.

Privacy is always higher priority than:

* Scheduling efficiency
* Revenue optimization
* User convenience

---

## 3. Inputs to the Privacy Engine

The engine evaluates every appointment request using:

* Client identity
* Client group color (Red, Blue, Yellow)
* Known relationships between clients
* Historical appointments
* Existing scheduled appointments
* Time slots requested
* VIP status
* Waitlist status

---

## 4. Hidden Data Model (Critical)

The following data exists in the system but MUST NEVER be exposed to Agent or Clients:

* Relationship graph between clients
* Conflict reasons
* Group conflict logic
* Privacy scoring results
* Internal scheduling constraints
* Risk classification

Only Manager role may access this layer.

---

## 5. Conflict Types

### 5.1 Relationship Conflict

Occurs when two clients:

* Know each other personally
* Are socially or familiarly connected

Rule:

* Minimum 4-hour separation required
* Prefer next-day scheduling

---

### 5.2 Group Conflict

Defined rules:

* Red clients MUST NOT coincide with Yellow clients
* If unavoidable: 4-hour minimum separation + preference for next-day

Blue clients have no group restriction unless relationship conflict exists.

---

### 5.3 Schedule Density Conflict

Ensures buffer and privacy safety in shared spaces.

Includes:

* Overlapping arrival risk
* Waiting room overlap risk
* Transition overlap risk

---

### 5.4 VIP Conflict Override

VIP clients may receive priority scheduling but:

* NEVER override hard privacy conflicts
* NEVER override relationship restrictions

---

## 6. Privacy Decision Flow

Every scheduling request MUST follow this flow:

1. Validate working hours
2. Filter invalid time slots
3. Apply relationship conflict check
4. Apply group conflict check
5. Apply density safety buffer rules
6. Apply VIP priority rules
7. Generate safe available slots
8. If no slots exist → trigger waitlist system

---

## 7. Scheduling Decision Rules

### HARD RULES (Cannot be broken)

* Relationship conflict separation (4-hour minimum)
* Red vs Yellow conflict restrictions
* Office hours enforcement

### SOFT RULES (Manager override allowed)

* VIP priority adjustments
* Scheduling optimization
* Waitlist prioritization

---

## 8. Anti-Inference System

The system must prevent users from deducing:

* That another specific client exists at a given time
* That a relationship conflict occurred
* That group restrictions exist

### Safe Behavior Requirement

All responses must be neutral:

Allowed responses:

* "That time is unavailable"
* "No availability at that time"
* "Next available slot is Tuesday at 10:30 AM"

Forbidden responses:

* "Another client is scheduled"
* "Due to conflict"
* "Because of another appointment"
* Any reference to internal logic

---

## 9. Privacy Risk Scoring

Each scheduling scenario is assigned an internal risk score:

* LOW: No conflict detected
* MEDIUM: Potential relationship or group overlap
* HIGH: Confirmed relationship or high-risk overlap

Risk score is NEVER exposed externally.

It is used only internally to:

* Adjust buffers
* Adjust suggested times
* Trigger waitlist fallback

---

## 10. Scheduling Output Rules

The Privacy Engine ONLY outputs:

* Available time slots
* Suggested alternative slots
* Waitlist status

It must NEVER output:

* Conflict explanation
* Reasoning
* Internal logic

---

## 11. Waitlist Trigger Conditions

A client is added to waitlist when:

* No valid privacy-safe slot exists
* Client rejects all suggested slots
* VIP scheduling conflicts still cannot be resolved

Waitlist entries must preserve:

* Client identity
* Priority level
* Requested time preference

---

## 12. Emergency Privacy Mode

Triggered when:

* Multiple high-risk clients are scheduled closely
* Waiting room overlap risk is high

System actions:

* Increase buffer automatically
* Recompute schedule
* Suggest alternative slots
* Notify manager silently

---

## 13. Relationship Detection Interface

The Privacy Engine receives relationship signals from external detection system.

It does NOT:

* Confirm relationships autonomously
* Expose relationship data externally

Only Manager can confirm relationships.

---

## 14. Deterministic Behavior Requirement

The Privacy Engine must always produce consistent results for identical inputs.

No randomness is allowed in:

* Conflict detection
* Rule evaluation
* Scheduling decisions

---

## 15. System Priority Hierarchy

1. Privacy conflicts (absolute priority)
2. Group conflicts
3. Relationship conflicts
4. Safety buffers
5. VIP priority
6. Standard availability optimization

---

## 16. Failure Mode Handling

If system cannot resolve a schedule:

* Do NOT expose reason
* Trigger waitlist system
* Suggest next available safe slots

---

## 17. Output Contract

Final output MUST be one of:

* CONFIRMED_SLOT
* ALTERNATIVE_SLOTS
* WAITLIST_ENTRY

No other output types are permitted.

---

## 18. Summary

The Privacy Engine is the enforcement layer of all confidentiality rules. It ensures that:

* No sensitive data is exposed
* No inference is possible from responses
* All scheduling decisions remain privacy-safe
* The system behaves consistently and predictably

This module is the core differentiator of the entire platform.
