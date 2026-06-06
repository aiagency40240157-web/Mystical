# WHATSAPP_BEHAVIOR.md — Messaging, Interaction Flows & Communication Rules

## 1. Purpose

This document defines how the system communicates with clients via WhatsApp.

It governs:

* message structure
* tone
* interaction flows
* reminders
* confirmations
* cancellations
* rescheduling
* failure handling

All WhatsApp communication must be fully aligned with the Privacy Engine and AI Agent Rules.

---

# 2. Core Communication Principle

## Minimal, Neutral, Action-Oriented Communication

WhatsApp messages must always be:

* short
* clear
* neutral
* action-based

No explanations are ever allowed regarding scheduling logic.

---

# 3. Message Types

## 3.1 Appointment Confirmation

### Format

* Confirmation message must include:

  * date
  * time
  * action confirmation

### Example

"Your appointment is confirmed for Tuesday at 10:30 AM."

---

## 3.2 Appointment Reminder (5 hours before)

### Purpose

To remind the client and allow action.

### Required Elements

* Appointment time
* Confirmation option
* Cancellation option
* Reschedule option

### Example

"Reminder: your appointment is today at 3:00 PM.
Please reply:

1. Confirm
2. Cancel
3. Reschedule"

---

## 3.3 Final Reminder (1 hour before)

### Purpose

Last warning before appointment.

### Required Elements

* Clear urgency
* Cancellation warning
* Deposit policy warning

### Example

"Reminder: your appointment is in 1 hour.
If you cannot attend, please cancel now to avoid deposit retention."

---

## 3.4 Cancellation Confirmation

### Rule

Must be simple and final.

### Example

"Your appointment has been canceled."

---

## 3.5 Rescheduling Flow

### Rule

Rescheduling = new scheduling request

### Behavior

* Do NOT reference previous appointment conflicts
* Only offer new available options

### Example

"Sure, here are the next available times:

* Wednesday 2:00 PM
* Thursday 11:00 AM"

---

## 3.6 Waitlist Notification

### Trigger

When a slot becomes available.

### Example

"Good news — a time slot is now available.
Would you like to confirm your appointment?"

---

## 3.7 Payment Notifications

### Includes

* deposit request
* payment confirmation
* penalty notification

### Example

"A $20 deposit is required to confirm your appointment."

---

## 3.8 No-Show Notification

### Rule

Must be factual, non-emotional.

### Example

"We did not receive a check-in for your appointment. The deposit has been retained according to policy."

---

# 4. Interaction Rules

## 4.1 User Requests

The system must always respond with:

* options
* availability
* confirmations

Never explanations.

---

## 4.2 Confusion Handling

If user is unclear:

Example input:
"What time do you have?"

Response:
"We have availability at:

* Tuesday 10:30 AM
* Wednesday 2:00 PM"

---

## 4.3 Pressure Handling

If user insists or pushes:

* do NOT escalate explanation
* repeat available options
* remain neutral

---

# 5. Message Constraints

## 5.1 Length Rules

Messages must:

* stay under 6 lines when possible
* avoid long paragraphs

---

## 5.2 Forbidden Content

WhatsApp messages must NEVER include:

* other client references
* scheduling logic
* conflict explanations
* privacy rules
* internal system behavior

---

# 6. Button / Response Options

All interactive messages should support:

* Confirm
* Cancel
* Reschedule

These must be consistent across all reminders.

---

# 7. Language Rules

System must support:

* English
* Spanish

Rules:

* match user language automatically
* never mix languages in one message

---

# 8. Failure Handling

If WhatsApp delivery fails:

* retry automatically
* fallback to next available channel if configured

Never expose delivery failure to client.

---

# 9. Privacy Alignment

WhatsApp messages must:

* align with Privacy Engine outputs
* never expose internal scheduling logic
* never reveal reasons for availability

---

# 10. Emergency Messaging Rules

In urgent cases:

* maintain neutrality
* avoid panic language

Example:
"Please contact us to reschedule your appointment."

---

# 11. System Summary

WhatsApp is a communication-only channel.

It is NOT allowed to:

* compute scheduling
* evaluate conflicts
* access private relationships

It only:

* receives safe outputs
* formats messages
* delivers communication
