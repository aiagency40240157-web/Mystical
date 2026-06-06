# Production Environment Variables & Secrets Guide

This document describes the environment variables and secrets that must be configured in production for the Privacy-Aware Therapy Scheduling Platform.

## 🔐 Database Secrets
- `DATABASE_URL`: The connection string for your production PostgreSQL instance (e.g. Google Cloud SQL or Supabase).
  - Format: `postgresql://user:password@host:port/dbname?sslmode=require`

## 💳 Stripe Configuration (Payment Engine)
- `STRIPE_SECRET_KEY`: The production API secret key from the Stripe dashboard.
- `STRIPE_WEBHOOK_SECRET`: The webhook signing secret for verifying Stripe event payloads.
- `STRIPE_SUCCESS_URL`: Redirect URL on successful checkout (e.g., `https://yourdomain.com/payment/success`).
- `STRIPE_CANCEL_URL`: Redirect URL on checkout cancellation (e.g., `https://yourdomain.com/payment/cancel`).

## 💬 twilio & WhatsApp Configuration (AI Communication Layer)
- `TWILIO_ACCOUNT_SID`: Account SID for Twilio services.
- `TWILIO_AUTH_TOKEN`: Auth Token for Twilio API verification.
- `TWILIO_PHONE_NUMBER`: Twilio phone number configured for SMS/WhatsApp.

## 🛡️ Security & Authentication
- `JWT_SECRET`: A secure, randomly generated string for signing JWT tokens.
- `API_KEY_MANAGER`: Secret API key for Manager access.
- `API_KEY_AGENT`: Secret API key for Agent access.
- `API_KEY_ASSISTANT`: Secret API key for Assistant access.
- `API_KEY_SYSTEM`: Secret API key for System-level communication.

## ⚙️ Feature Flags
- `ENABLE_PRIVACY_ENGINE`: Set to `true` (enforces relationship and color conflict gaps).
- `ENABLE_PAYMENTS`: Set to `true` (enforces $20 deposit verification).
- `ENABLE_WAITLIST`: Set to `true` (enforces automatic waitlist promotions).
- `ENABLE_AUDIT`: Set to `true` (saves immutable logs of all scheduling and override operations).
