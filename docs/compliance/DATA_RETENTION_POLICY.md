# DATA_RETENTION_POLICY.md — Data Lifecycle, Retention & Deletion Policy

## 1. Purpose

This document defines how long data is stored, how it is processed over time, and how it is securely deleted within the Privacy-Aware Therapy Scheduling Platform.

It ensures that data minimization and privacy principles are enforced throughout the entire system lifecycle.

---

# 2. Core Principle

## Data Must Not Outlive Its Purpose

Every piece of data must have:

* a defined purpose
* a retention window
* a deletion rule

If data is no longer required for system functionality, it must be removed or anonymized.

---

# 3. Data Classification Retention Rules

## 3.1 Public Data

Examples:

* available appointment slots
* generic availability messages

Retention:

* ephemeral (real-time only)
* no long-term storage required

---

## 3.2 Operational Data

Examples:

* appointment records
* payment status
* waitlist entries

Retention:

* 12 months maximum
* archived after 90 days of inactivity

After retention period:

* anonymized or deleted

---

## 3.3 Client Profile Data

Examples:

* name
* contact information
* group color

Retention:

* active duration of client relationship
* +12 months after last interaction

After retention:

* anonymized or deleted

---

## 3.4 Sensitive Data (HIGH RESTRICTION)

Examples:

* internal scheduling metadata
* privacy engine outputs
* relationship mappings

Retention:

* NOT stored permanently
* must be ephemeral or immediately discarded

No long-term persistence is allowed.

---

# 4. Audit Logs Retention

Audit logs are treated as compliance records.

Retention:

* 24 months maximum
* immutable during retention period

After expiration:

* secure deletion or cryptographic destruction

---

# 5. Payment Data Retention

## Stored Data Only

* transaction ID
* status
* amount
* timestamp

Retention:

* 7 years (legal/compliance requirement)

Sensitive payment details are NEVER stored.

---

# 6. AI & Messaging Data Retention

## WhatsApp Messages

Retention:

* 90 days maximum

After retention:

* deleted or anonymized

---

## AI Interaction Data

Retention:

* 30 days maximum

Used only for:

* debugging
* system improvements

---

# 7. Waitlist Data Retention

Retention:

* 6 months maximum

After expiration:

* automatically removed

---

# 8. Deletion Rules

## 8.1 Hard Deletion

Applies to:

* sensitive scheduling metadata
* relationship data
* privacy engine outputs

Must be permanently removed immediately after use.

---

## 8.2 Soft Deletion

Applies to:

* client profiles
* appointment history

Marked as deleted but retained for limited period before purge.

---

## 8.3 Anonymization

Before long-term storage, data must be:

* stripped of identifiers
* aggregated if necessary
* made non-reversible

---

# 9. Backup Policy

Backups must:

* follow same retention rules
* be encrypted
* be automatically purged after retention window

No backup may extend data retention beyond policy limits.

---

# 10. Legal Compliance Alignment

This policy aligns with:

* privacy-first architecture principles
* GDPR-style minimization standards (conceptual alignment)
* internal security model constraints

---

# 11. Data Minimization Enforcement

System must ensure:

* only necessary data is stored
* unnecessary fields are never persisted
* temporary computation data is discarded immediately

---

# 12. Automated Cleanup System

The system must include scheduled jobs for:

* expired appointment cleanup
* old waitlist removal
* audit log archival
* anonymization processes

---

# 13. Failure Handling

If deletion fails:

* retry automatically
* escalate to system alert
* never expose failure externally

---

# 14. Cross-System Consistency

All services must comply:

* Scheduling Service
* Payment Service
* AI Service
* Audit Service

No service may override retention rules.

---

# 15. Security Considerations

Deleted data must be:

* unrecoverable
* cryptographically removed where possible
* excluded from analytics pipelines

---

# 16. Summary

This policy ensures that data exists only as long as it is operationally required.

The system enforces strict lifecycle control to minimize privacy risk and data exposure.
