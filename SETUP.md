# 🚀 Quick Setup Guide

## Step 1: Install Node.js (if not already installed)

Download and install from: https://nodejs.org/
- Use Node.js 20.6 or newer (required for built-in `.env` loading)
- Verify installation: Open terminal/command prompt and type:
  ```bash
  node --version
  npm --version
  ```

## Step 2: Set Up the Project

1. Open a terminal in the project folder.
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure local secrets.** A local `.env` file is provided. If it is missing, copy `env.example` to `.env`, then replace `JWT_SECRET` and `ADMIN_PASSWORD` with random values. The admin password must contain at least 16 characters. Generate each value with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Never commit `.env` or share its contents.

This version uses SQLite. The database file is created automatically at `DB_PATH` (default: `./aurum_payroll.db`). MySQL and Microsoft SQL Server are not configured yet.

## Step 3: Start the Backend Server

```bash
npm start
```

The API listens on `http://localhost:3000`. Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`; there are no shared default credentials.

## Step 4: Open the App

Open http://localhost:3000 in your browser. The Express server serves the frontend and API from the same origin.

## Step 5: Login and Test

1. **Login** with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

2. **Try these features:**
   - Toggle dark/light mode (top-right button)
   - Add a new employee
   - Add a new department
   - View the dashboard stats
   - Test on mobile (resize browser window)

## Step 6: Customize

### Add Your Name in Footer
Edit `index.html`, find:
```html
<span>Built with ♥ by <a href="#" class="footer-link">Your Name</a></span>
```
Replace "Your Name" with your actual name and add your portfolio/LinkedIn link.

### Change Colors (Optional)
In `index.html`, find the `:root` section around line 50 and modify the color variables.

## 🎯 What to Show Recruiters

### 1. Live Demo Points
- "This is a full-stack application I built from scratch"
- "It has real authentication with JWT tokens"
- "The database persists data between sessions"
- "It's fully responsive - watch it work on mobile"
- "I implemented dark/light mode with theme persistence"

### 2. Code Walkthrough
Be ready to explain:
- **Authentication flow**: Login → JWT → Protected routes
- **API architecture**: RESTful endpoints with proper HTTP methods
- **Database design**: Normalized schema with foreign keys
- **Frontend state**: How data flows from API to UI
- **Responsive design**: CSS Grid/Flexbox without frameworks

### 3. Technical Decisions
"I chose [technology] because..."
- JWT: Stateless auth scales better than sessions
- SQLite: Fast development, easy to migrate to PostgreSQL
- Vanilla JS: Demonstrates core JavaScript skills
- Express: Industry-standard Node.js framework

## 🚨 Common Issues & Fixes

### Issue: "Cannot find module 'express'"
**Fix:** Run `npm install` in the project folder

### Issue: "Port 3000 already in use"
**Fix:** Set `PORT=3001` in `.env` and update the `API_URL` constant in `index.html` to use port `3001`.

### Issue: "Connection error" when logging in
**Fix:** Make sure the backend server is running (`npm start`)

### Issue: Dark mode not working
**Fix:** Your browser may not support CSS custom properties. Try Chrome or Firefox.

## 📱 Mobile Testing

1. **Get your computer's local IP:**
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update API URL in index.html:**
   ```javascript
   const API_URL = 'http://192.168.1.XXX:3000/api';
   ```
   Replace XXX with your actual IP

3. **Open on phone:**
   ```
   http://192.168.1.XXX:8080
   ```

## 🌐 Deploy to Production

Do not deploy this SQLite configuration to an ephemeral filesystem: the database may be lost on restart. Configure a persistent supported database and production secrets before deployment.

## 📝 Checklist Before Showing to Recruiters

- [ ] Backend server starts without errors
- [ ] Can log in with the administrator credentials configured in `.env`
- [ ] Can add new employee
- [ ] Can add new department
- [ ] Dark/light mode toggle works
- [ ] Responsive on mobile (test with browser dev tools)
- [ ] Footer has your name
- [ ] No console errors
- [ ] GitHub repo has good README
- [ ] Live demo link (if deployed)

## 🎤 Practice Your Demo

**30-Second Pitch:**
"I built a full-stack payroll management system with Node.js, Express, and vanilla JavaScript. It features JWT authentication, a RESTful API with CRUD operations, and a responsive UI with dark/light mode. The backend uses SQLite with proper data relationships, and the frontend is mobile-friendly without any frameworks. I deployed it to [platform] and it's handling user authentication and data persistence."

**2-Minute Deep Dive:**
1. Show login and authentication (30s)
2. Dashboard - explain the stats API calls (20s)
3. Add employee - show form validation and API integration (30s)
4. Toggle dark/light mode (10s)
5. Show mobile responsive (20s)
6. Briefly mention backend architecture (10s)

## Need Help?

- Check server logs in the terminal
- Open browser DevTools → Console for frontend errors
- Read error messages carefully - they usually tell you what's wrong
- Google the error message if stuck

---

**You're ready to impress! 🌟**

Remember: Confidence comes from understanding your code. Review the files, understand what each part does, and be ready to explain your decisions.
