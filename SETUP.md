# Local setup

## Requirements

- Node.js 20.6 or newer
- npm

Node 20.6+ is needed because the server uses Node's built-in `.env` loader.

## Install and configure

From the project directory:

```bash
npm install
```

Create a local `.env` file from the template:

```powershell
Copy-Item env.example .env
```

Set `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`. The secret must contain at least 32 characters; the administrator password must contain at least 16. Generate a strong random value with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env` or paste its values into an issue or public message.

The database uses SQLite. It is created automatically at the path in `DB_PATH`, which defaults to `./aurum_payroll.db`. The project does not currently configure MySQL or Microsoft SQL Server.

## Start the app

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the administrator credentials configured in `.env`. The Express server serves both the web page and API, so the frontend and backend use the same origin.

To use another port, set `PORT` in `.env` and open that port in the browser. The frontend reads its API origin from the current page; no source edit is needed.

## Troubleshooting

- **`JWT_SECRET must be set`**: Create `.env` and set a random `JWT_SECRET` with at least 32 characters.
- **Administrator configuration error**: Set both `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the password must be at least 16 characters.
- **`Cannot find module`**: Run `npm install` from the project directory.
- **Port is busy**: Set a different `PORT` in `.env`, then restart the server.
- **Login fails**: Check the server output and verify the credentials in `.env`. There are no shared default credentials.
- **Database location**: Set `DB_PATH` to a writable path. Relative paths are resolved from the project directory.

## Current scope

Employee and department management are available to administrators. Payslip generation and account profile editing are not implemented. The project does not currently include an automated test script.
