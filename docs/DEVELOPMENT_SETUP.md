# Development Setup Guide

## Overview

This guide explains how to set up a local VoxField development environment from scratch.

By the end of this guide, you will have:

* A running local application
* Supabase configured
* Development users created
* Seed data loaded
* Voice functionality enabled

---

# Prerequisites

Before starting, ensure the following are installed:

* Node.js 18+
* npm 9+
* Git
* A Supabase project
* OpenAI API key
* AssemblyAI API key

Verify installation:

```bash
node -v
npm -v
git --version
```

---

# Clone Repository

Clone the repository and install dependencies.

```bash
git clone https://github.com/<org>/voxfield.git
cd voxfield
npm install
```

---

# Environment Configuration

Create a local environment file.

```bash
cp .env.example .env.local
```

Configure the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# AssemblyAI
ASSEMBLYAI_API_KEY=your-key
```

---

# Database Setup

## Apply Migrations

Run the SQL files in Supabase SQL Editor in the following order:

```text
001_initial_schema.sql
002_rls_policies.sql
003_auth_triggers.sql
004_security_hardening.sql
```

These scripts create:

* Tables
* Relationships
* Enums
* Indexes
* RLS Policies
* Authentication Triggers

---

## Seed Development Data

Execute:

```text
supabase/seed_dev.sql
```

This populates:

* Equipment
* Repair history
* Inspections
* Work orders
* Alerts
* Activity logs
* Voice transcripts

---

# Create Development Users

Open:

```text
http://localhost:3000/login
```

Select **Sign Up**.

Create:

## Technician

```text
Email: technician@gmail.com
Password: tech123
```

## Supervisor

```text
Email: supervisor@gmail.com
Password: sup123
```

After creating both accounts:

```text
Run seed_dev.sql
```

to associate operational data with the users.

---

# Running the Application

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The application automatically redirects to:

```text
/login
```

---

# Testing Voice Features

Requirements:

* Chrome, Edge, or Safari
* Microphone permissions enabled
* Localhost or HTTPS

Voice pipeline:

```text
Microphone
      ↓
AssemblyAI STT
      ↓
GPT-4o Agent
      ↓
OpenAI TTS
      ↓
Audio Response
```

---

# Testing Offline Features

Important:

```text
Service Workers are disabled in development mode.
```

To test offline functionality:

```bash
npm run build
npm run start
```

Then:

1. Open Developer Tools
2. Enable Offline mode
3. Create voice interactions
4. Verify IndexedDB queue creation
5. Reconnect network
6. Verify synchronization

---

# Project Structure

```text
src/
├── app/
├── components/
├── services/
├── lib/
├── hooks/
├── context/
└── types/
```

Important directories:

| Directory  | Purpose                          |
| ---------- | -------------------------------- |
| app        | Pages and API routes             |
| components | UI components                    |
| services   | Business logic                   |
| lib        | Agent, sync, IndexedDB, Supabase |
| hooks      | React hooks                      |
| context    | Global state                     |
| types      | Database types                   |

---

# Common Development Tasks

## Run Tests

```bash
npm test
```

---

## Create Feature Branch

```bash
git checkout main
git pull upstream main

git checkout -b feature/my-change
```

---

## Submit Pull Request

```bash
git push origin feature/my-change
```

Open a Pull Request from your fork to the upstream repository.

---

# Troubleshooting

## Authentication Required Error

Cause:

```text
Expired session
```

Solution:

```text
Sign out and sign in again
```

---

## Voice Input Not Working

Cause:

```text
Microphone access denied
```

Solution:

```text
Allow microphone permissions
Use localhost or HTTPS
```

---

## Empty Dashboard

Cause:

```text
Development data not loaded
```

Solution:

```text
Execute seed_dev.sql
```

---

## Missing Environment Variables

Cause:

```text
.env.local not configured
```

Solution:

```text
Verify all required environment variables exist
```

---

# Recommended Development Workflow

1. Pull latest changes from upstream
2. Create a new branch
3. Implement changes
4. Test locally
5. Push to fork
6. Open Pull Request
7. Address review comments
8. Merge into main

Following this workflow keeps contributions isolated and easy to review.
