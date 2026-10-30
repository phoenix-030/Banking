# HHK Banking Exam Preparation Platform

An exam preparation web application for Indian banking recruitment tests. It includes student accounts, exam and question administration, mock test authoring and delivery, practice, performance history, previous year questions, current affairs, and admin reporting.

## Run on Windows

Install [Node.js 22 or later](https://nodejs.org/) and [Docker Desktop](https://www.docker.com/products/docker-desktop/). Docker Desktop supplies the PostgreSQL database used by the application.

In PowerShell, from this project folder:

```powershell
npm ci
Copy-Item .env.example .env
```

Open `.env` and replace the example values. Set `POSTGRES_PASSWORD` and use that same password in `DATABASE_URL`; set `SESSION_SECRET` to a random value with at least 32 characters; and set a unique `ADMIN_PASSWORD` with at least 12 characters. The SMTP settings are needed only for password-reset emails.

Then start Docker Desktop and run:

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed-admin
npm run dev:full
```

Open [http://localhost:5173](http://localhost:5173). Sign in to the administrator account using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`. Stop the app with `Ctrl+C`; stop the database with `docker compose stop postgres`.

Useful commands:

- `npm run dev:full` starts the Vite website and Express API.
- `npm run build` builds the website and checks TypeScript in both client and server code.
- `npm run db:migrate` applies any unapplied SQL migrations.
- `npm run db:seed-admin` creates the first administrator if the email does not already exist.
- `docker compose down` stops and removes the database container; PostgreSQL data remains in its named volume. `docker compose down -v` also deletes that database volume and its data.

## Production server

After configuring production database credentials, SMTP, and a trusted HTTPS reverse proxy, build the website and start the API/static server:

```powershell
npm ci
npm run db:migrate
npm run build
$env:NODE_ENV = "production"
npm run start:server
```

The Express server serves the built website and API on `PORT` (default `3001`). Keep the database private and terminate HTTPS at the reverse proxy; production session cookies require HTTPS.

## Features implemented

- HHK branding and student registration, sign-in, sign-out, profile, and password reset email flow.
- Role-protected admin workspace for exam configuration with cycle and official-notification provenance, topics, MCQ/image/passage/descriptive question authoring with evaluator rubric and manual grading queue, CSV/XLSX import preview and row errors, students, manual or rule-based mock tests with per-section topic/difficulty mixes, current affairs, reports, and audit history.
- Student mock-test runner with server-side attempt deadlines, optional sectional timing and lockout, saved answers, a section question palette, server-side scoring, section results, objective explanations, and pending-review tracking for written responses.
- Each mock attempt snapshots its question text, options, answer key, rubric, and scoring values so later admin edits do not change an active or completed result.
- Topic practice, bookmarks, previous year question filters, current affairs quizzes with saved responses, persisted daily challenge sets, editable student profile, dashboards, leaderboard, and milestone achievements.
- PostgreSQL persistence, session storage, password hashing, request validation, rate limits, and security headers.

## Important content setup

Starter exam names in the database are drafts. Their patterns are placeholders marked pending verification; they are not official exam specifications. Before publishing, enter the notification cycle and HTTPS URL, confirm the stages, sections, timing, question counts, marks, and penalties against that official recruitment notification, then save the pattern. Publishing is blocked until the pattern is complete and has a source URL. Use question content that HHK has permission to publish, verify its source and year, and review answer keys and explanations before publishing.

## Current limitations

- A PostgreSQL server is required; the app cannot run fully with only Vite. If Docker Desktop is not installed, install it or configure a separate PostgreSQL server and update `DATABASE_URL`.
- Password-reset email needs an SMTP provider and the `SMTP_*` values in `.env`.
- Mock tests can use either a single overall timer or server-enforced section timers. When section timers are configured, every selected section needs a duration and their total must equal the mock test duration; expired sections close and the API rejects further answer changes in them.
- Current-affairs and question content are not bundled; admins must add reviewed material. Descriptive mock and practice responses stay pending until an administrator grades them; mock grades recalculate the attempt score and leaderboard, while practice grades appear in the student response history.
- Daily challenges draw up to five published questions per available subject area. Publish questions for Reasoning, Quantitative Aptitude, English Language, and General Awareness to get the full 20-question set.
- Migrations are applied in filename order when `npm run db:migrate` runs. The repository has not been verified against a live PostgreSQL instance in this environment. Run the steps above to initialize it locally.
