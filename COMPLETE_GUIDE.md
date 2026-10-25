# Aurum Payroll: project guide

## What it does

Aurum Payroll is a small payroll administration demo. An administrator can sign in, view dashboard totals, manage employee records, and create departments. The browser UI is served by the Express application, and SQLite stores the data.

## Project layout

| File | Responsibility |
| --- | --- |
| `server.js` | Express app, authentication, SQLite schema, seed data, and API routes |
| `index.html` | Vite HTML entry point for the React client |
| `src/main.tsx` | React application bootstrap |
| `src/App.tsx` | Typed dashboard, employee, department, account, and dialog UI |
| `src/styles.css` | Application styling and light/dark themes |
| `vite.config.ts` | Vite development API proxy and production build settings |
| `env.example` | Template for local server configuration |
| `screenshots/` | Example UI screenshots displayed in the README |

## Data model

- **users** stores email, password hash, name, and role.
- **employees** stores employee ID, contact and job details, salary, and active/inactive status.
- **departments** stores a unique name and optional department head and budget.
- **payslips** stores period and compensation fields. The API can list existing records, but there is no payslip creation flow in the UI.

The database initializes its tables on startup and seeds sample employees and departments. Configure `DB_PATH` to choose a different SQLite file.

## Request flow

1. The administrator signs in through `POST /api/auth/login`.
2. The server checks the submitted password against its bcrypt hash and returns a signed JWT.
3. The browser sends the token in the `Authorization` header when calling protected management routes.
4. `authenticateToken` verifies the token, and `requireAdmin` checks the user's current role in the database.
5. Route handlers use parameterized SQLite queries for database values.

The administrator account is configured with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The registration endpoint creates an employee-role account, which does not have access to administrator-only management routes.

## Routes

| Method | Route | Access | Behavior |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Authenticate and return a JWT |
| `POST` | `/api/auth/register` | Public | Create a standard user account |
| `GET` | `/api/auth/me` | Signed in | Return the current user |
| `GET` | `/api/employees` | Administrator | List active employees |
| `GET` | `/api/employees/:id` | Administrator | Read one employee |
| `POST` | `/api/employees` | Administrator | Create an employee |
| `PUT` | `/api/employees/:id` | Administrator | Update an employee |
| `DELETE` | `/api/employees/:id` | Administrator | Mark an employee inactive |
| `GET`, `POST` | `/api/departments` | Administrator | List or create departments |
| `GET` | `/api/payslips` | Administrator | List existing payslips |
| `GET` | `/api/stats/dashboard` | Administrator | Return employee, department, and salary totals |

## Implemented UI and known gaps

The React UI includes employee and department tables, employee creation/editing/deactivation, department creation, dashboard totals by department, employee CSV export, mobile navigation, and a persisted light/dark theme.

The payslips page is a placeholder. The account page's profile fields are not connected to an update endpoint. The dashboard chart uses fixed sample values, and the export control is not wired up. These are unfinished features, not working capabilities.

## Running locally

Follow [SETUP.md](SETUP.md) to install dependencies, configure `.env`, run the Vite/Express development servers, and build the production client. The production Express server serves the compiled frontend from `dist/`. Use generated local credentials; do not add real employee or payroll information to the demo database.

## Before production use

This project is intended as a portfolio demo. It does not include production operations such as payroll compliance controls, audited change history, account recovery, rate limiting, automated test coverage, or a documented backup/restore process. A production deployment would need a security and operational review, plus durable storage; ephemeral hosting can lose the SQLite database.
