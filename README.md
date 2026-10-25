# Aurum Payroll

Aurum is a payroll administration dashboard built with Node.js, Express, SQLite, and browser-native HTML, CSS, and JavaScript. It provides an authenticated workspace for managing employee records and departments.

## Screenshots

| Employee directory — dark theme | Department overview |
| --- | --- |
| ![Employee directory in dark theme](screenshots/employee-registry-dark.png) | ![Department overview](screenshots/departments-dark.png) |

| Employee directory — light theme |
| --- |
| ![Employee directory in light theme](screenshots/employee-registry-light.png) |

## Features

- Administrator sign-in with bcrypt-hashed passwords and JWT-protected API routes
- Employee records: list, create, update, and soft-delete
- Department records: list and create, including optional head and budget
- Dashboard totals for active employees, departments, and active employee salaries
- Responsive layout with a persistent light/dark theme preference
- SQLite persistence with configurable database location

Payslip generation and profile editing are not implemented yet. The payslips screen is a placeholder, and there is no report export.

## Tech stack

- **Server:** Node.js, Express
- **Database:** SQLite (`sqlite3`)
- **Authentication:** JSON Web Tokens and `bcryptjs`
- **Client:** HTML, CSS, and vanilla JavaScript

## Run locally

Requirements: Node.js 20.6 or newer and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item env.example .env
   ```

3. Edit `.env`. Set `JWT_SECRET` to a random value of at least 32 characters and set an `ADMIN_PASSWORD` of at least 16 characters. Keep `.env` private and out of version control.

   Generate a random value with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) and sign in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`.

The app creates its SQLite database on first run. `DB_PATH` controls its location and defaults to `./aurum_payroll.db`. Sample departments and employees are inserted when the database is initialized.

For more setup notes, see [SETUP.md](SETUP.md).

## API overview

All management routes require an administrator JWT. The available routes are:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/register` | Register a standard user |
| `GET` | `/api/auth/me` | Read the signed-in user |
| `GET`, `POST` | `/api/employees` | List or add employees |
| `GET`, `PUT`, `DELETE` | `/api/employees/:id` | Read, update, or deactivate an employee |
| `GET`, `POST` | `/api/departments` | List or add departments |
| `GET` | `/api/payslips` | List existing payslips |
| `GET` | `/api/stats/dashboard` | Read dashboard totals |

Registration creates a standard employee account; it does not grant administrator access. The current UI is designed for the configured administrator.

## Notes

This project is a portfolio/demo application, not payroll software for handling real employee data. Before production use, add deployment-specific security controls, operational monitoring, tested backups, and a persistent database strategy. Do not deploy SQLite to a host with ephemeral storage.
