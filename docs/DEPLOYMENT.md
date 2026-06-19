# Deployment Guide

## Overview

This document explains how to deploy VoxField into a production environment.

The application consists of:

* Next.js Frontend
* Next.js API Routes
* Supabase PostgreSQL
* OpenAI Services
* AssemblyAI Services
* Progressive Web App Infrastructure

---

# Deployment Architecture

```text
Users
   │
   ▼
Vercel / Next.js
   │
   ├── Frontend
   ├── API Routes
   └── AI Agent
   │
   ▼
Supabase
   │
   ▼
PostgreSQL
```

External services:

```text
AssemblyAI
OpenAI GPT-4o
OpenAI TTS
```

---

# Prerequisites

Before deployment:

* Production Supabase project
* OpenAI API key
* AssemblyAI API key
* Vercel account
* GitHub repository

---

# Environment Variables

Configure the following variables in the deployment platform:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY

ASSEMBLYAI_API_KEY
```

Never commit secrets to source control.

---

# Database Deployment

## Step 1

Create a production Supabase project.

---

## Step 2

Apply database migrations.

Run:

```text
001_initial_schema.sql
002_rls_policies.sql
003_auth_triggers.sql
004_security_hardening.sql
```

in order.

---

## Step 3

Verify tables were created successfully.

Expected tables:

```text
users
equipment
repair_history
inspection_reports
work_orders
alerts
transcripts
activity_logs
equipment_documents
quantity_logs
error_logs
```

---

# Deploying to Vercel

## Connect Repository

1. Log into Vercel
2. Import GitHub repository
3. Select VoxField repository

---

## Configure Environment Variables

Add all required variables.

```text
Project Settings
    ↓
Environment Variables
```

---

## Deploy

Vercel automatically runs:

```bash
npm install
npm run build
```

and creates a production deployment.

---

# Post Deployment Validation

## Authentication

Verify:

* User sign up
* User login
* Session persistence
* Role-based redirects

---

## Dashboards

Verify:

* Technician dashboard loads
* Supervisor dashboard loads
* Data is visible

---

## Voice Features

Verify:

```text
Speech → STT → Agent → TTS
```

works end-to-end.

Test:

* Equipment lookup
* Inspection creation
* Work order creation

---

## Offline Features

Verify:

* PWA installability
* Service Worker registration
* IndexedDB queue creation
* Sync after reconnect

Use:

```bash
npm run build
npm run start
```

for local production validation before deployment.

---

# Monitoring

Recommended monitoring targets:

## Application

* Build failures
* Runtime exceptions
* API errors

## Database

* Query latency
* Failed transactions
* Storage growth

## AI Services

* OpenAI API failures
* AssemblyAI failures
* Rate limits

---

# Security Checklist

Before going live:

* Enable HTTPS
* Configure RLS policies
* Verify role restrictions
* Remove development credentials
* Verify environment variables
* Review API access permissions

---

# Production Validation Checklist

## Authentication

* [ ] Login works
* [ ] Logout works
* [ ] Sessions persist

## Voice

* [ ] STT works
* [ ] Agent works
* [ ] TTS works

## Database

* [ ] Work orders can be created
* [ ] Inspections can be created
* [ ] Alerts can be acknowledged

## Offline

* [ ] Service Worker active
* [ ] IndexedDB operational
* [ ] Offline queue syncs

---

# Rollback Strategy

If a deployment introduces issues:

1. Revert the Git commit
2. Trigger a new deployment
3. Restore previous environment configuration if required
4. Validate critical functionality

Critical functionality:

* Authentication
* Voice processing
* Dashboard access
* Database operations

---

# Future Improvements

Potential deployment enhancements include:

* CI/CD pipelines
* Automated migration execution
* Error monitoring integration
* Performance dashboards
* Blue-green deployments
* Multi-environment configuration

Following this deployment process ensures VoxField remains secure, reliable, and production-ready.
