# Local setup

## Requirements

- Node.js 20.19 or newer
- npm

The frontend build uses Vite, which requires Node.js 20.19 or newer. Check your installed versions from PowerShell:

```powershell
node --version
npm --version
```

## Install and configure

Open the project root in VS Code (the directory containing `package.json`) and open **Terminal → New Terminal**. Run the commands below in that directory:

```powershell
npm install
```

Create the local environment file once, then open it in VS Code:

```powershell
Copy-Item env.example .env
code .env
```

Edit and save `.env` before starting the application:

- Set `JWT_SECRET` to a random value of at least 32 characters.
- Set `ADMIN_EMAIL` to the administrator email you want to use.
- Set `ADMIN_PASSWORD` to a private password of at least 16 characters.

Generate a suitable secret in PowerShell and paste its output into `.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep `.env` private. It is excluded from Git; never commit it or paste its values into an issue or public message. If `.env` already exists, edit that file instead of copying over it.

The database uses SQLite. It is created automatically at the path in `DB_PATH`, which defaults to `./aurum_payroll.db` in the project root. Sample departments and employees are added during initial database setup. The project does not currently configure MySQL or Microsoft SQL Server.

## Start development

Start both the API and frontend in one terminal:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with the administrator credentials configured in `.env`. Vite proxies `/api` requests to Express on port `3000`. Leave the terminal open while developing; press **Ctrl+C** to stop both servers.

If port `3000` or `5173` is already in use, stop the other process using it or update the server port in `.env` and restart. The Vite development port is configured separately in `vite.config.ts`.

## Build and run for production

```powershell
npm run typecheck
npm run build
npm start
```

Express serves the built React application from `dist/` at `http://localhost:3000`. Run the build after frontend changes. To change the Express port, set `PORT` in `.env`. The production server requires the built `dist/` directory; `npm start` alone is not a substitute for `npm run build`.

## Troubleshooting

- **`JWT_SECRET must be set`**: Create `.env` and set a random `JWT_SECRET` with at least 32 characters.
- **Administrator configuration error**: Set both `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the password must be at least 16 characters.
- **`Cannot find module`**: Confirm the terminal is in the project root and run `npm install`.
- **Port is busy**: Set a different `PORT` in `.env`, then restart the server.
- **Login fails**: Check the server output and verify the credentials in `.env`. There are no shared default credentials.
- **Database location**: Set `DB_PATH` to a writable path. Relative paths are resolved from the project directory.
- **`.env` already exists**: Keep it and edit it; do not overwrite it with the template, since it may contain your existing local credentials.

## Current scope

Employee and department management are available to administrators. Payslip generation and account profile editing are not implemented. TypeScript checks and the Vite production build are available through `npm run typecheck` and `npm run build`; there is no automated test suite yet.
