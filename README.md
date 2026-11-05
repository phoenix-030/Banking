# HHK Banking Exam Preparation Platform

An exam preparation web application for Indian banking recruitment tests. It includes student accounts, exam and question administration, mock test authoring and delivery, topic practice, performance history, previous year questions, current affairs, and admin reporting.

---

## Prerequisites

- **Node.js**: Version 20 or 22+ installed ([nodejs.org](https://nodejs.org/))
- **PostgreSQL**: Either installed locally (via pgAdmin 4 / PostgreSQL installer) or via Docker Desktop.

---

## Quick Start & Setup

### 1. Install Dependencies
Open PowerShell or your terminal in the project directory:

```powershell
npm install
```

### 2. Configure Environment (`.env`)
Create your `.env` file from the example template:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure your credentials:

```env
# Database Configuration
POSTGRES_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/your_database_name
DATABASE_SSL=false

# Server & Session
PORT=3001
NODE_ENV=development
SESSION_SECRET=replace-with-at-least-32-random-characters
APP_URL=http://localhost:5173

# Admin Account Seeding
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password-12-or-more-characters
ADMIN_FULL_NAME=HHK Administrator
ADMIN_MOBILE=+919876543210

# SMTP Email (Optional - needed for password reset emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

> [!NOTE]
> If your database name has spaces (e.g., `HHK Administrator`), encode the space as `%20`:
> `DATABASE_URL=postgresql://postgres:TIGER@localhost:5432/HHK%20Administrator`

### 3. Setup the Database

Make sure your PostgreSQL server is running. Then apply migrations and create your administrator account:

```powershell
# Run all database migrations (creates all 31 tables)
npm run db:migrate

# Seed your first administrator account
npm run db:seed-admin
```

*(If using Docker Desktop for PostgreSQL instead of local install, run `docker compose up -d postgres` before running `npm run db:migrate`)*.

---

## How to Run the Project

### Option 1: Run Full Application Together (Recommended)
This runs both the backend Express API and the Vite frontend simultaneously with a single command:

```powershell
npm run dev:full
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

### Option 2: Run in Separate Terminals

If you prefer separate terminal windows for frontend and backend:

**Terminal 1 (Backend API):**
```powershell
npm run dev:server
```
*Starts the Express server with file watching on `http://localhost:3001`.*

**Terminal 2 (Frontend UI):**
```powershell
npm run dev
```
*Starts the Vite dev server on `http://localhost:5173`.*

---

## All Available Commands

| Command | Description |
| :--- | :--- |
| `npm run dev:full` | **Starts both backend API server and frontend website together** |
| `npm run dev:server` | Starts the Express backend server in watch mode (`port 3001`) |
| `npm run dev` | Starts the Vite frontend development server (`port 5173`) |
| `npm run db:migrate` | Runs all pending SQL migrations against the database |
| `npm run db:seed-admin` | Creates the default administrator user from `.env` values |
| `npm run typecheck:server` | Type-checks server TypeScript files without emitting code |
| `npm run build` | Builds the project: client bundle + server type check |
| `npm run preview` | Previews the production client build locally |
| `npm run start:server` | Runs the compiled server in production mode |

---

## Production Deployment

To run in production mode:

```powershell
npm ci
npm run db:migrate
npm run build
$env:NODE_ENV = "production"
npm run start:server
```

In production, the Express server serves both the built website and API routes on `PORT` (default `3001`).

---

## Troubleshooting

### "Unexpected end of JSON input" or "Unable to reach the server"
- This means your frontend is running, but the backend Express API on port `3001` is not started.
- **Fix**: Run `npm run dev:full` instead of just `npm run dev`, or start `npm run dev:server` in a separate terminal.

### Database Connection Error
- Check that your PostgreSQL service is running on `localhost:5432`.
- Verify the username, password, and database name in `DATABASE_URL` inside `.env`.
- Test running `npm run db:migrate` to verify connection.

---

## Features Implemented

- **Student Workspace**: Registration, sign-in, profile, password reset, mock test runner with sectional timers, question palette, review status, daily challenges, and topic practice.
- **Eye View Password Toggle**: Easy visibility toggle on sign-up, sign-in, and reset password forms.
- **Admin Dashboard**: Exam pattern authoring, section configuration, MCQ / passage / descriptive questions, question bank import via CSV/Excel, student attempt grading queue, current affairs manager, and audit logs.
- **Robust Security**: Bcrypt password hashing, session management with PostgreSQL session store, rate limiting, and HTTP security headers.
