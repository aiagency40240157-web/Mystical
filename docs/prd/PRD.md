# PRD.md — Privacy-Aware Therapy Scheduling Platform

## 1. Product Overview

### Product Name

Privacy-Aware Therapy Scheduling Platform

### Product Type

Confidential appointment scheduling and operational management platform for therapy offices.

### Primary Goal

Create a scheduling system that protects operational privacy between clients while providing secure appointment booking, intelligent scheduling, AI-assisted communication, online payments, waitlists, analytics, and confidential operational workflows.

---

# 2. Core Business Problem

Traditional scheduling systems only manage time availability.

This office requires a scheduling system capable of:

* Preventing sensitive client overlaps
* Preventing known clients from appearing simultaneously
* Protecting confidentiality operationally
* Preventing staff from accidentally revealing sensitive information
* Maintaining realistic scheduling behavior to avoid privacy inference
* Supporting AI communication without leaking information

The system must prioritize privacy over scheduling convenience.

---

# 3. Product Philosophy

## Privacy First Architecture

The system must be designed with privacy as the primary architectural layer.

The architecture order must be:

1. Privacy Engine
2. Conflict Evaluation
3. Scheduling Engine
4. Calendar Presentation

NOT:

1. Calendar
2. Add restrictions later

---

# 4. Office Operational Rules

## Office Hours

* Open: 9:00 AM
* Close: 7:00 PM

## Session Duration

* All sessions are fixed at 30 minutes

## Daily Break

* Break starts at 1:30 PM
* Break duration: 45 minutes

The system must automatically block unavailable times.

---

# 5. User Roles

## 5.1 Agent

### Permissions

* Create appointments
* Reschedule appointments
* Cancel appointments
* Add clients
* Manage waitlists

### Restrictions

The agent must NOT see:

* Privacy conflict reasons
* Relationship conflicts
* Group restrictions
* Sensitive scheduling logic
* Other client details
* Internal privacy flags

### Interface Philosophy

The agent only sees:

* Available
* Unavailable
* Suggested alternatives

This is considered:

## Zero Knowledge Agent Model

---

## 5.2 Assistant

### Permissions

* View operational reports
* View audit logs
* View daily summaries
* View weekly summaries
* Access analytics dashboards

### Restrictions

Assistant cannot:

* Override hard conflicts
* Disable privacy rules

---

## 5.3 Manager

### Permissions

* Full scheduling oversight
* View conflict details
* Manage relationships
* Override soft conflicts
* Access analytics
* Access privacy controls
* Access audit logs
* Configure system rules

---

# 6. Client Data Structure

Each client profile may contain:

* First name
* Last name
* Phone number
* Email
* Group color
* VIP status
* Notes
* Relationship flags
* Appointment history
* No-show history
* Payment history
* Waitlist status

---

# 7. Group Classification Rules

## Supported Groups

* Red
* Blue
* Yellow

## Restriction Rule

### Red and Yellow clients:

* Should preferably be scheduled on different days
* If same-day scheduling is unavoidable:

  * Minimum 4-hour separation required

Blue clients may coexist with all groups unless personal relationship conflicts exist.

---

# 8. Relationship Conflict Rules

## Relationship Definition

Two clients may be flagged as related if:

* They know each other personally
* They are family
* They are socially connected
* They are operationally sensitive

## Scheduling Restriction

Related clients:

* Preferably scheduled on different days
* If same-day scheduling is necessary:

  * Minimum 4-hour separation required

---

# 9. Automatic Relationship Detection

The system should support moderate automatic relationship detection.

## Detection Signals

Potential relationships may be suggested using:

* Shared last names
* Shared phone numbers
* Shared addresses
* Shared references
* Shared emergency contacts
* Similar metadata

## Workflow

The system:

* Detects possible relationships
* Assigns confidence score
* Suggests review to manager

Only managers can confirm relationships.

Agents never see relationship suggestions.

---

# 10. Scheduling Engine

## Scheduling Priorities

Priority hierarchy:

1. Hard privacy conflicts
2. Group restrictions
3. Relationship conflicts
4. Emergency privacy rules
5. VIP priority
6. Standard availability

---

## Intelligent Scheduling Rules

The scheduling engine must:

* Avoid predictable patterns
* Prevent privacy inference
* Suggest realistic alternatives
* Randomize alternative recommendations when appropriate
* Prefer next-day scheduling for sensitive conflicts

---

## Conflict Types

### Soft Conflict

Can be overridden by manager.

### Hard Conflict

Cannot be overridden except by manager-level emergency override.

---

# 11. Waitlist System

## Waitlist Conditions

Clients may be added to the waitlist if:

* No compatible slots exist
* Available appointments are too far in the future
* Client declines available dates

## Waitlist Rules

The system must:

* Preserve the next available appointment
* Add client to waitlist simultaneously
* Notify clients automatically when compatible slots open

## VIP Waitlist Priority

VIP clients receive higher waitlist priority.

---

# 12. VIP System

## VIP Capabilities

VIP clients:

* Receive higher scheduling priority
* Receive waitlist priority
* Receive earlier slot recommendations

## VIP Restrictions

VIP status does NOT bypass:

* Hard privacy rules
* Relationship restrictions
* Critical confidentiality protections

---

# 13. Privacy Engine

## Privacy Philosophy

The system must NEVER reveal:

* Why a slot is unavailable
* Which client caused a conflict
* Internal restriction logic
* Relationship details
* Group conflict details

---

## Safe Agent Responses

Examples:

* "That time is no longer available."
* "The closest availability is Tuesday at 10:30 AM."
* "We recommend scheduling further in advance."

The system should vary responses naturally to reduce inference risk.

---

# 14. AI Communication System

## Supported Channels

* WhatsApp
* Web chat
* Mobile app
* Web app

## Supported Languages

* English
* Spanish

## AI Responsibilities

The AI assistant must:

* Schedule appointments
* Confirm appointments
* Cancel appointments
* Reschedule appointments
* Send reminders
* Handle waitlists
* Process safe scheduling responses
* Prevent privacy leaks

---

# 15. Reminder System

## Reminder Timing

Clients receive WhatsApp reminders:

* 5 hours before appointment
* 1 hour before appointment

## Reminder Actions

Each reminder must support:

* Confirm
* Cancel
* Reschedule

---

## Final Reminder Warning

The 1-hour reminder must include a cancellation warning.

Example:

"If you cannot attend your appointment, please cancel before your scheduled time. Missed appointments may result in deposit retention."

---

# 16. No-Show Policy

## No-Show Definition

A no-show occurs if:

* Client receives the 1-hour reminder
* Client does not cancel
* Client fails to attend appointment

---

## No-Show Penalty

The system automatically retains the client's $20 deposit.

---

## Repeated No-Shows

After 3 no-shows:

* Client receives formal warning
* Manager may review account behavior
* Future restrictions may be applied

---

# 17. Payments

## Payment Provider

Recommended provider:

* Stripe

---

## Deposit System

Clients may optionally pay:

* $20 appointment deposit

---

## Payment Rules

If no-show occurs:

* Deposit is retained automatically

If payment fails:

* Client may be moved to waitlist
* System retries may occur

---

## Receipts

Payment confirmations and receipts are sent via WhatsApp.

---

# 18. Emergency Privacy Mode

The system must support emergency privacy handling.

Examples:

* Unexpected simultaneous arrivals
* Delayed departures
* Waiting room conflicts
* Sensitive overlaps

The system may:

* Trigger alerts
* Increase buffers
* Reorganize appointments
* Notify manager discreetly

---

# 19. Audit & Logging

## Audit Scope

The system must log:

* Appointment creation
* Appointment changes
* Appointment cancellations
* Login events
* Data access
* Relationship modifications
* Override actions
* AI scheduling actions
* Payment events

---

## Audit Access

Audit logs are visible only to:

* Manager
* Assistant

---

# 20. Analytics & Reporting

## Daily Reports

The system automatically sends WhatsApp summaries to:

* Manager
* Assistant

Reports include:

* Daily appointments
* Weekly appointments
* No-show counts
* Waitlist status
* Occupancy metrics
* Cancellations

---

## Dashboard Metrics

Suggested analytics:

* No-show rate
* Waitlist pressure
* Appointment occupancy
* Privacy conflict frequency
* VIP utilization
* AI scheduling success rate

---

# 21. Security Requirements

## Security Priorities

* Encrypted communications
* Secure authentication
* Role-based access control
* Audit logging
* Data isolation
* Secure payment processing

---

## Agent Restrictions

Agents must never:

* Access conflict details
* Export sensitive data
* View relationship networks

---

# 22. Technical Recommendations

## Recommended Frontend

* Next.js
* TailwindCSS
* Progressive Web App support

---

## Recommended Backend

* NestJS
* TypeScript

---

## Recommended Database

* PostgreSQL

---

## Recommended ORM

* Prisma

---

## Queue System

* Redis
* BullMQ

Used for:

* reminders
* waitlists
* analytics jobs
* scheduled reports
* notifications

---

## AI Layer

Recommended:

* OpenAI APIs
* Claude APIs

---

# 23. Suggested Core Architecture

/core
scheduling-engine
privacy-engine
ai-communication-engine
payment-engine
waitlist-engine
audit-engine
analytics-engine
relationship-detection-engine

---

# 24. Future Scalability

Future versions may include:

* Multi-office support
* Multiple calendars
* Therapist assignment logic
* Video appointments
* Insurance integration
* Advanced AI analytics
* Dynamic privacy scoring
* Predictive scheduling
* Mobile native apps

---

# 25. Edge Cases

The system must handle:

* Late arrivals
* Early arrivals
* Simultaneous arrivals
* Failed WhatsApp delivery
* Payment failures
* Emergency overrides
* Waitlist race conditions
* AI communication failures
* Duplicate client detection
* Relationship false positives
* VIP conflicts
* Last-minute cancellations

---

# 26. Product Success Criteria

The platform is considered successful if it:

* Prevents sensitive scheduling overlaps
* Maintains operational confidentiality
* Reduces manual scheduling complexity
* Minimizes privacy leaks
* Automates communication safely
* Reduces no-shows
* Improves scheduling efficiency
* Provides secure operational oversight
