# UI_RULES.md — Frontend Design, Visibility & Privacy-Constrained UX

## 1. Purpose

This document defines the user interface rules for the Privacy-Aware Therapy Scheduling Platform.

It ensures that the frontend:

* respects privacy constraints
* never exposes sensitive scheduling logic
* provides a minimal, role-safe experience
* aligns with Response Safety Layer outputs

---

# 2. Core UI Philosophy

## 2.1 What Users See ≠ What System Knows

The UI must always display only sanitized outputs.

No frontend component may infer or reconstruct:

* client relationships
* scheduling conflicts
* privacy rules
* internal system decisions

---

## 2.2 Minimal Cognitive Exposure

Users should only see:

* availability
* confirmations
* alternatives
* waitlist status
* payment status

Never system reasoning.

---

# 3. Role-Based UI Views

## 3.1 Agent UI (Front Desk / Scheduler)

### Allowed Views

* daily calendar
* available slots
* appointment creation form
* client list (sanitized)

### Forbidden Views

* conflict reasons
* relationship graphs
* privacy engine outputs
* group rules

### UI Behavior

* show only: AVAILABLE / NOT AVAILABLE
* no explanations

---

## 3.2 Assistant UI

### Allowed Views

* reports dashboard
* audit logs
* weekly analytics
* appointment overview

### Restrictions

* cannot modify scheduling logic
* cannot view relationship data

---

## 3.3 Manager UI

### Allowed Views

* full analytics
* audit logs
* client database
* system configuration

### Privileged Views

* VIP management
* override scheduling rules
* waitlist control

---

# 4. Calendar UI Rules

## 4.1 Slot Display Logic

Calendar must show:

* available slots (green)
* unavailable slots (grey)

NO additional indicators such as:

* conflict reasons
* blocked explanations

---

## 4.2 Time Representation

* 30-minute blocks
* working hours: 9:00 AM – 7:00 PM
* break: hidden from UI logic (must appear as unavailable only)

---

# 5. Client UI Rules

## 5.1 Client List

Only display:

* first name
* last name
* phone
* email (optional)
* group color (RED / BLUE / YELLOW)

---

## 5.2 Forbidden Client Data

UI must NEVER show:

* relationships
* conflict history
* internal flags
* privacy scores

---

# 6. Appointment UI Rules

## 6.1 Booking Flow

UI steps:

1. select client
2. select desired time
3. system returns availability result
4. show one of:

   * confirmation
   * alternative slots
   * waitlist option

---

## 6.2 Reschedule Flow

* treated as new booking
* no history shown
* no conflict explanation shown

---

# 7. Messaging UI (WhatsApp / Chat Panel)

## 7.1 Message Constraints

All messages shown in UI must:

* match WhatsApp_BEHAVIOR.md
* be short
* be action-based

---

## 7.2 Allowed Buttons

* Confirm
* Cancel
* Reschedule

---

## 7.3 Reminder UI Display

Must show:

* time remaining
* action buttons

NO internal notes or system reasoning

---

# 8. Payment UI Rules

## 8.1 Deposit Display

* show $20 deposit requirement
* show payment status

---

## 8.2 Penalty Display

* show only outcome (charged / not charged)
* do NOT show reasoning

---

# 9. Waitlist UI Rules

## 9.1 Waitlist State

Show:

* position (optional)
* status: WAITLISTED

---

## 9.2 Forbidden Waitlist Info

* no priority explanation
* no conflict explanation

---

# 10. Error UI Rules

## 10.1 Generic Errors Only

Display:

"We are unable to process this request at this time."

NEVER show:

* backend errors
* system logs
* validation failures

---

# 11. Privacy UI Enforcement

UI must NEVER render:

* Privacy Engine outputs
* conflict evaluations
* relationship mapping

Even in developer mode.

---

# 12. Real-Time Updates

UI must update:

* availability changes
* cancellations
* waitlist promotions

via safe events only

---

# 13. Accessibility Requirements

* mobile responsive
* high contrast mode
* simple scheduling interface

---

# 14. Performance Rules

* calendar must load < 1s
* availability must be cached
* no heavy computations in frontend

---

# 15. Security UI Constraints

* no debug panels in production
* no internal IDs exposed
* no raw API responses rendered

---

# 16. Summary

The UI is a **presentation-only layer**.

It must NEVER:

* compute scheduling logic
* expose privacy rules
* show internal system behavior

It only displays sanitized, safe outputs from backend layers.
