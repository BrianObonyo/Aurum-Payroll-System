const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env');
if (typeof process.loadEnvFile === 'function' && fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

// Middleware
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  }
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'dist')));

const dbPath = path.resolve(process.env.DB_PATH || 'aurum_payroll.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exitCode = 1;
  } else {
    console.log('✓ Connected to SQLite database');
    initializeDatabase()
      .then(startServer)
      .catch(error => {
        console.error('Database initialization error:', error.message);
        db.close(() => {
          process.exitCode = 1;
        });
      });
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

async function initializeDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      head TEXT,
      budget REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slip_id TEXT UNIQUE NOT NULL,
      employee_id INTEGER NOT NULL,
      period_month TEXT NOT NULL,
      period_year INTEGER NOT NULL,
      basic_salary REAL NOT NULL,
      allowances REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_pay REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )`
  ];

  for (const table of tables) {
    await run(table);
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if ((ADMIN_EMAIL && !ADMIN_PASSWORD) || (!ADMIN_EMAIL && ADMIN_PASSWORD)) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to configure the administrator account.');
  }
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    if (ADMIN_PASSWORD.length < 16) {
      throw new Error('ADMIN_PASSWORD must contain at least 16 characters.');
    }
    await run("UPDATE users SET role = 'employee' WHERE role = 'admin'");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await run(`INSERT INTO users (email, password, first_name, last_name, role)
               VALUES (?, ?, 'Admin', 'User', 'super_admin')
               ON CONFLICT(email) DO UPDATE SET password = excluded.password, role = 'super_admin'`,
    [ADMIN_EMAIL.trim().toLowerCase(), hashedPassword]);
  } else {
    console.warn('No admin account configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.');
  }

  const departments = [
    ['Engineering', 'Marcus Kim', 85000],
    ['Sales', 'James Donovan', 120000],
    ['Operations', 'Sofia Reyes', 95000],
    ['Finance', 'Amara Leke', 78000],
    ['HR', 'Priya Lal', 65000]
  ];

  for (const department of departments) {
    await run('INSERT OR IGNORE INTO departments (name, head, budget) VALUES (?, ?, ?)', department);
  }

  const employees = [
    ['EMP-001', 'James', 'Donovan', 'james.donovan@aurum.io', 'Sales', 'Senior Sales Manager', 5200],
    ['EMP-002', 'Sofia', 'Reyes', 'sofia.reyes@aurum.io', 'Operations', 'Operations Lead', 4800],
    ['EMP-003', 'Marcus', 'Kim', 'marcus.kim@aurum.io', 'Engineering', 'Lead Software Engineer', 5800],
    ['EMP-004', 'Anya', 'Chen', 'anya.chen@aurum.io', 'Engineering', 'Frontend Developer', 4500],
    ['EMP-005', 'Amara', 'Leke', 'amara.leke@aurum.io', 'Finance', 'Financial Analyst', 4200],
    ['EMP-006', 'Priya', 'Lal', 'priya.lal@aurum.io', 'HR', 'HR Specialist', 3900]
  ];

  for (const employee of employees) {
    await run(`INSERT OR IGNORE INTO employees
               (emp_id, first_name, last_name, email, department, position, basic_salary)
               VALUES (?, ?, ?, ?, ?, ?, ?)`, employee);
  }
}

// ==================== AUTH MIDDLEWARE ====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  db.get('SELECT role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to verify user permissions' });
    }
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    req.user.role = user.role;
    next();
  });
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (![email, first_name, last_name].every(isNonEmptyText) ||
      typeof password !== 'string' || password.length < 12) {
    return res.status(400).json({ error: 'Provide a valid email, names, and a password of at least 12 characters' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run(`INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, 'employee')`,
      [email.trim().toLowerCase(), hashedPassword, first_name.trim(), last_name.trim()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }
        res.status(201).json({ 
          message: 'User registered successfully',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?', 
    [req.user.id], 
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch user' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// ==================== EMPLOYEE ROUTES ====================

// Get all employees
app.get('/api/employees', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM employees WHERE status = "active" ORDER BY created_at DESC', 
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch employees' });
      }
      res.json(rows);
    }
  );
});

// Get single employee
app.get('/api/employees/:id', authenticateToken, requireAdmin, (req, res) => {
  db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch employee' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  });
});

// Create employee
app.post('/api/employees', authenticateToken, requireAdmin, (req, res) => {
  const { first_name, last_name, email, department, position, basic_salary } = req.body;

  if (![first_name, last_name, email, department, position].every(isNonEmptyText) ||
      !Number.isFinite(Number(basic_salary)) || Number(basic_salary) < 0) {
    return res.status(400).json({ error: 'Provide employee details and a non-negative salary' });
  }
  
  // Generate employee ID
  db.get('SELECT COUNT(*) as count FROM employees', (err, result) => {
    if (err || !result) {
      return res.status(500).json({ error: 'Failed to create employee' });
    }
    const empId = `EMP-${String(result.count + 1).padStart(3, '0')}`;
    
    db.run(`INSERT INTO employees (emp_id, first_name, last_name, email, department, position, basic_salary) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, first_name.trim(), last_name.trim(), email.trim().toLowerCase(), department.trim(), position.trim(), Number(basic_salary)],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create employee' });
        }
        res.status(201).json({ 
          message: 'Employee created successfully',
          id: this.lastID,
          emp_id: empId
        });
      }
    );
  });
});

// Update employee
app.put('/api/employees/:id', authenticateToken, requireAdmin, (req, res) => {
  const { first_name, last_name, email, department, position, basic_salary } = req.body;

  if (![first_name, last_name, email, department, position].every(isNonEmptyText) ||
      !Number.isFinite(Number(basic_salary)) || Number(basic_salary) < 0) {
    return res.status(400).json({ error: 'Provide employee details and a non-negative salary' });
  }
  
  db.run(`UPDATE employees 
          SET first_name = ?, last_name = ?, email = ?, department = ?, position = ?, basic_salary = ?
          WHERE id = ?`,
    [first_name.trim(), last_name.trim(), email.trim().toLowerCase(), department.trim(), position.trim(), Number(basic_salary), req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update employee' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ message: 'Employee updated successfully' });
    }
  );
});

// Delete employee (soft delete)
app.delete('/api/employees/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run('UPDATE employees SET status = "inactive" WHERE id = ?', 
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete employee' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ message: 'Employee deleted successfully' });
    }
  );
});

// ==================== DEPARTMENT ROUTES ====================

app.get('/api/departments', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM departments ORDER BY name', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch departments' });
    }
    res.json(rows);
  });
});

app.post('/api/departments', authenticateToken, requireAdmin, (req, res) => {
  const { name, head, budget } = req.body;

  if (!isNonEmptyText(name) || (budget !== undefined && budget !== null &&
      (!Number.isFinite(Number(budget)) || Number(budget) < 0))) {
    return res.status(400).json({ error: 'Provide a department name and a non-negative budget' });
  }
  
  db.run('INSERT INTO departments (name, head, budget) VALUES (?, ?, ?)',
    [name.trim(), isNonEmptyText(head) ? head.trim() : null, budget == null || budget === '' ? null : Number(budget)],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Department already exists' });
        }
        return res.status(500).json({ error: 'Failed to create department' });
      }
      res.status(201).json({ 
        message: 'Department created successfully',
        id: this.lastID
      });
    }
  );
});

// ==================== PAYSLIP ROUTES ====================

app.get('/api/payslips', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT p.*, e.first_name, e.last_name, e.department, e.position
    FROM payslips p
    JOIN employees e ON p.employee_id = e.id
    ORDER BY p.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch payslips' });
    }
    res.json(rows);
  });
});

// ==================== DASHBOARD STATS ====================

app.get('/api/stats/dashboard', authenticateToken, requireAdmin, (req, res) => {
  db.get(`SELECT
            (SELECT COUNT(*) FROM employees WHERE status = 'active') AS totalEmployees,
            (SELECT COUNT(*) FROM departments) AS totalDepartments,
            (SELECT COALESCE(SUM(basic_salary), 0) FROM employees WHERE status = 'active') AS totalPayroll`,
  (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
    res.json(stats);
  });
});

// ==================== START SERVER ====================

let server;
function startServer() {
  server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🏆 AURUM PAYROLL BACKEND SERVER          ║
║                                            ║
║   Server running on: http://localhost:${PORT}  ║
║   API endpoint: http://localhost:${PORT}/api    ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
  });
}

// Graceful shutdown
function shutdown() {
  if (server) {
    server.close();
  }
  db.close((err) => {
    if (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
    console.log('\n✓ Database connection closed');
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
