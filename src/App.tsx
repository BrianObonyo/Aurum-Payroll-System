import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

type Employee = {
  id: number;
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  position: string;
  basic_salary: number;
  status: string;
  created_at: string;
};

type Department = {
  id: number;
  name: string;
  head: string | null;
  budget: number | null;
  created_at: string;
};

type DashboardStats = {
  totalEmployees: number;
  totalDepartments: number;
  totalPayroll: number;
};

type LoginResponse = {
  token: string;
  user: User;
};

type Page = 'dashboard' | 'employees' | 'departments' | 'payslips' | 'account';
type Notice = { kind: 'success' | 'error'; message: string };

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  departments: 'Departments',
  payslips: 'Payslips',
  account: 'Account',
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, { ...options, headers });
  const body = await response.text();
  let data: unknown;

  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new ApiError('The server returned an invalid response.', response.status);
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function readStoredTheme(): 'dark' | 'light' {
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
}

function formatMoney(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

function displayError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function Spinner() {
  return <span className="spinner" role="status" aria-label="Loading" />;
}

function Brand() {
  return (
    <div className="sidebar-logo">
      <div className="logo-mark">A</div>
      <div className="logo-wordmark">Aurum</div>
    </div>
  );
}

function LoginScreen({
  message,
  loading,
  onLogin,
}: {
  message: string;
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(email, password);
  }

  return (
    <main id="login-screen">
      <div className="login-wrap">
        <section className="login-left">
          <div className="login-left-logo">
            <Brand />
          </div>
          <div className="login-tagline">
            Where <span>precision</span> meets payroll elegance
          </div>
          <div className="login-sub">
            A clear workspace for employee and department management.
          </div>
        </section>
        <section className="login-right">
          <h2>Welcome Back</h2>
          <p>Sign in with the administrator account configured on the server.</p>
          {message && <div className="error-msg show" role="alert">{message}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? <>Signing In <Spinner /></> : 'Sign In'}
            </button>
          </form>
          <div className="login-footer-note">Administrator access is configured on the server.</div>
        </section>
      </div>
    </main>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem('authToken')));
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(readStoredTheme);
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [savingForm, setSavingForm] = useState(false);

  function navigateTo(nextPage: Page) {
    setPage(nextPage);
    setMobileMenuOpen(false);
  }

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setEmployees([]);
    setDepartments([]);
    setStats(null);
    setPage('dashboard');
    setMobileMenuOpen(false);
    setEmployeeModalOpen(false);
    setDepartmentModalOpen(false);
  }, []);

  const loadData = useCallback(async (activeToken: string) => {
    setLoadingData(true);
    setDataError('');
    try {
      const [nextStats, nextEmployees, nextDepartments] = await Promise.all([
        apiRequest<DashboardStats>('/stats/dashboard', activeToken),
        apiRequest<Employee[]>('/employees', activeToken),
        apiRequest<Department[]>('/departments', activeToken),
      ]);
      setStats(nextStats);
      setEmployees(nextEmployees);
      setDepartments(nextDepartments);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        setLoginMessage('Your session has expired. Please sign in again.');
      } else {
        setDataError(displayError(error));
      }
    } finally {
      setLoadingData(false);
    }
  }, [logout]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }

    let active = true;
    setCheckingSession(true);
    apiRequest<User>('/auth/me', token)
      .then(async currentUser => {
        if (!active) return;
        if (!['admin', 'super_admin'].includes(currentUser.role)) {
          throw new ApiError('This application is available to administrators only.', 403);
        }
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
        await loadData(token);
      })
      .catch(error => {
        if (!active) return;
        logout();
        setLoginMessage(error instanceof ApiError && error.status === 401
          ? 'Your session has expired. Please sign in again.'
          : displayError(error));
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [token, loadData, logout]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!employeeModalOpen && !departmentModalOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEmployeeModalOpen(false);
        setDepartmentModalOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [employeeModalOpen, departmentModalOpen]);

  async function handleLogin(email: string, password: string) {
    setLoginLoading(true);
    setLoginMessage('');
    try {
      const result = await apiRequest<LoginResponse>('/auth/login', undefined, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!['admin', 'super_admin'].includes(result.user.role)) {
        throw new ApiError('This application is available to administrators only.', 403);
      }
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setToken(result.token);
    } catch (error) {
      setLoginMessage(displayError(error));
    } finally {
      setLoginLoading(false);
    }
  }

  function openEmployeeModal(employee: Employee | null = null) {
    setEditingEmployee(employee);
    setEmployeeModalOpen(true);
  }

  async function handleEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      first_name: String(form.get('first_name') ?? '').trim(),
      last_name: String(form.get('last_name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      department: String(form.get('department') ?? ''),
      position: String(form.get('position') ?? '').trim(),
      basic_salary: Number(form.get('basic_salary')),
    };
    setSavingForm(true);
    try {
      if (editingEmployee) {
        await apiRequest(`/employees/${editingEmployee.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/employees', token, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setEmployeeModalOpen(false);
      setNotice({ kind: 'success', message: editingEmployee ? 'Employee updated.' : 'Employee added.' });
      await loadData(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        setLoginMessage('Your session has expired. Please sign in again.');
      } else {
        setNotice({ kind: 'error', message: displayError(error) });
      }
    } finally {
      setSavingForm(false);
    }
  }

  async function handleDeactivate(employee: Employee) {
    if (!token || !window.confirm(`Deactivate ${employee.first_name} ${employee.last_name}?`)) return;
    try {
      await apiRequest(`/employees/${employee.id}`, token, { method: 'DELETE' });
      setNotice({ kind: 'success', message: 'Employee deactivated.' });
      await loadData(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        setLoginMessage('Your session has expired. Please sign in again.');
      } else {
        setNotice({ kind: 'error', message: displayError(error) });
      }
    }
  }

  async function handleDepartmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const budget = String(form.get('budget') ?? '');
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      head: String(form.get('head') ?? '').trim(),
      budget: budget === '' ? null : Number(budget),
    };
    setSavingForm(true);
    try {
      await apiRequest('/departments', token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDepartmentModalOpen(false);
      setNotice({ kind: 'success', message: 'Department created.' });
      await loadData(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        setLoginMessage('Your session has expired. Please sign in again.');
      } else {
        setNotice({ kind: 'error', message: displayError(error) });
      }
    } finally {
      setSavingForm(false);
    }
  }

  function exportEmployees() {
    if (!employees.length) {
      setNotice({ kind: 'error', message: 'There are no employees to export.' });
      return;
    }
    const columns: Array<keyof Employee> = [
      'emp_id',
      'first_name',
      'last_name',
      'email',
      'department',
      'position',
      'basic_salary',
      'status',
    ];
    const escapeCell = (value: string | number) => {
      const text = String(value);
      const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [columns.join(','), ...employees.map(employee =>
      columns.map(column => escapeCell(employee[column] ?? '')).join(','),
    )];
    const file = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aurum-employees.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const departmentPayroll = useMemo(() => {
    const totals = new Map<string, number>();
    employees.forEach(employee => {
      totals.set(employee.department, (totals.get(employee.department) ?? 0) + employee.basic_salary);
    });
    return Array.from(totals, ([name, amount]) => ({ name, amount }))
      .sort((first, second) => second.amount - first.amount);
  }, [employees]);

  if (checkingSession) {
    return <div className="session-loading"><Spinner /> Loading your workspace…</div>;
  }

  if (!token || !user) {
    return (
      <LoginScreen
        message={loginMessage}
        loading={loginLoading}
        onLogin={handleLogin}
      />
    );
  }

  const firstInitial = user.first_name.charAt(0);
  const lastInitial = user.last_name.charAt(0);

  return (
    <>
      <div id="app-screen" className="active">
        <div
          className={`mobile-overlay${mobileMenuOpen ? ' active' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside className={`sidebar${mobileMenuOpen ? ' mobile-open' : ''}`} id="sidebar">
          <div className="sidebar-top"><Brand /></div>
          <nav aria-label="Main navigation">
            <div className="nav-group">
              <div className="nav-label">Management</div>
              <NavButton icon="fa-solid fa-grid-2" page="dashboard" current={page} onClick={navigateTo}>Dashboard</NavButton>
              <NavButton icon="fa-solid fa-users" page="employees" current={page} onClick={navigateTo}>Employees</NavButton>
              <NavButton icon="fa-solid fa-sitemap" page="departments" current={page} onClick={navigateTo}>Departments</NavButton>
            </div>
            <div className="nav-group">
              <div className="nav-label">Payroll</div>
              <NavButton icon="fa-solid fa-file-invoice-dollar" page="payslips" current={page} onClick={navigateTo}>Payslips</NavButton>
            </div>
            <div className="nav-group">
              <div className="nav-label">Settings</div>
              <NavButton icon="fa-solid fa-user-circle" page="account" current={page} onClick={navigateTo}>Account</NavButton>
            </div>
          </nav>
          <div className="sidebar-bottom">
            <div className="user-row">
              <div className="avatar">{firstInitial}{lastInitial}</div>
              <div className="user-details">
                <div className="u-name">{user.first_name} {user.last_name}</div>
                <div className="u-role">{user.role === 'super_admin' ? 'Super Administrator' : 'Administrator'}</div>
              </div>
            </div>
            <button className="nav-btn sign-out" onClick={logout}>
              <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />Sign Out
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <button
              className="mobile-menu-btn"
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(open => !open)}
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
            <div className="topbar-title">{pageTitles[page]}</div>
            <div className="topbar-meta">
              {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date())}
            </div>
            <button
              className="theme-toggle"
              onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
              <span className="theme-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </header>

          <section className="content">
            {dataError && (
              <div className="inline-error" role="alert">
                {dataError}
                <button className="btn-sm btn-outline" onClick={() => loadData(token)}>Retry</button>
              </div>
            )}
            {page === 'dashboard' && (
              <Dashboard
                stats={stats}
                employees={employees}
                departmentPayroll={departmentPayroll}
                loading={loadingData}
                onAddEmployee={() => openEmployeeModal()}
                onAddDepartment={() => setDepartmentModalOpen(true)}
                onExport={exportEmployees}
                onEmployees={() => navigateTo('employees')}
              />
            )}
            {page === 'employees' && (
              <EmployeesPage
                employees={employees}
                loading={loadingData}
                onAdd={() => openEmployeeModal()}
                onEdit={openEmployeeModal}
                onDeactivate={handleDeactivate}
              />
            )}
            {page === 'departments' && (
              <DepartmentsPage
                departments={departments}
                loading={loadingData}
                onAdd={() => setDepartmentModalOpen(true)}
              />
            )}
            {page === 'payslips' && <PayslipsPage />}
            {page === 'account' && <AccountPage user={user} />}
          </section>

          <footer className="app-footer">
            <div className="footer-credits">
              <span>© {new Date().getFullYear()} Aurum Payroll</span>
              <span aria-hidden="true">•</span>
              <span>Built by Brian Obonyo</span>
            </div>
            <span>v1.0.0</span>
          </footer>
        </main>
      </div>

      {employeeModalOpen && (
        <EmployeeModal
          employee={editingEmployee}
          departments={departments}
          saving={savingForm}
          onClose={() => setEmployeeModalOpen(false)}
          onSubmit={handleEmployeeSubmit}
        />
      )}
      {departmentModalOpen && (
        <DepartmentModal
          saving={savingForm}
          onClose={() => setDepartmentModalOpen(false)}
          onSubmit={handleDepartmentSubmit}
        />
      )}
      {notice && (
        <div className={`toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.message}
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
        </div>
      )}
    </>
  );
}

function NavButton({
  icon,
  page,
  current,
  onClick,
  children,
}: {
  icon: string;
  page: Page;
  current: Page;
  onClick: (page: Page) => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`nav-btn${current === page ? ' active' : ''}`}
      aria-current={current === page ? 'page' : undefined}
      onClick={() => onClick(page)}
    >
      <i className={icon} aria-hidden="true" />{children}
    </button>
  );
}

function PageHeading({
  title,
  highlight,
  subtitle,
  action,
}: {
  title: string;
  highlight: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="pg-head">
      <div>
        <div className="pg-title">{title} <span>{highlight}</span></div>
        <div className="pg-sub">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function LoadingRow({ columns, loading }: { columns: number; loading: boolean }) {
  return (
    <tr>
      <td colSpan={columns} className="empty-cell">
        {loading ? <><Spinner /> Loading records…</> : 'No records found.'}
      </td>
    </tr>
  );
}

function Dashboard({
  stats,
  employees,
  departmentPayroll,
  loading,
  onAddEmployee,
  onAddDepartment,
  onExport,
  onEmployees,
}: {
  stats: DashboardStats | null;
  employees: Employee[];
  departmentPayroll: Array<{ name: string; amount: number }>;
  loading: boolean;
  onAddEmployee: () => void;
  onAddDepartment: () => void;
  onExport: () => void;
  onEmployees: () => void;
}) {
  const maximumPayroll = Math.max(...departmentPayroll.map(department => department.amount), 1);
  return (
    <>
      <PageHeading
        title="Payroll"
        highlight="Dashboard"
        subtitle="Overview of active workforce and monthly salary totals"
      />
      <div className="stat-row">
        <StatCard icon="fa-solid fa-users" tone="gold" label="Active Employees" value={stats?.totalEmployees ?? '—'} />
        <StatCard icon="fa-solid fa-sitemap" tone="blue" label="Departments" value={stats?.totalDepartments ?? '—'} />
        <StatCard icon="fa-solid fa-sack-dollar" tone="green" label="Monthly Payroll" value={stats ? formatMoney(stats.totalPayroll) : '—'} />
        <StatCard icon="fa-solid fa-coins" tone="warn" label="Average Salary" value={stats ? formatMoney(
          stats.totalEmployees ? stats.totalPayroll / stats.totalEmployees : 0,
        ) : '—'} />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-head">
            <h3>Monthly payroll by department</h3>
            <span className="chart-caption">Based on active employee salaries</span>
          </div>
          <div className="payroll-bars">
            {departmentPayroll.length ? departmentPayroll.map(department => (
              <div className="payroll-bar-row" key={department.name}>
                <span className="payroll-bar-name">{department.name}</span>
                <div className="payroll-bar-track">
                  <div
                    className="payroll-bar-fill"
                    style={{ width: `${Math.max(department.amount / maximumPayroll * 100, 2)}%` }}
                  />
                </div>
                <span className="payroll-bar-value">{formatMoney(department.amount)}</span>
              </div>
            )) : (
              <div className="empty-state">{loading ? <Spinner /> : 'Add employees to see payroll totals by department.'}</div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-head"><h3>Quick actions</h3></div>
          <div className="quick-actions">
            <button className="btn-sm btn-gold-sm" onClick={onAddEmployee}>
              <i className="fa-solid fa-user-plus" aria-hidden="true" />Add Employee
            </button>
            <button className="btn-sm btn-outline" onClick={onAddDepartment}>
              <i className="fa-solid fa-plus" aria-hidden="true" />New Department
            </button>
            <button className="btn-sm btn-outline" onClick={onExport} disabled={!employees.length}>
              <i className="fa-solid fa-file-arrow-down" aria-hidden="true" />Export Employees CSV
            </button>
          </div>
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-head">
          <h3>Recent employees</h3>
          <button className="btn-sm btn-outline" onClick={onEmployees}>View all</button>
        </div>
        <EmployeeTable employees={employees.slice(0, 5)} loading={loading} compact />
      </div>
    </>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: string;
  tone: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat">
      <div className="stat-top"><div className={`stat-ico ${tone}`}><i className={icon} aria-hidden="true" /></div></div>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value}</div>
    </div>
  );
}

function EmployeesPage({
  employees,
  loading,
  onAdd,
  onEdit,
  onDeactivate,
}: {
  employees: Employee[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
}) {
  return (
    <>
      <PageHeading
        title="Employee"
        highlight="Registry"
        subtitle="Manage employee contact, department, and salary details"
        action={<button className="btn-sm btn-gold-sm" onClick={onAdd}><i className="fa-solid fa-user-plus" aria-hidden="true" />Add Employee</button>}
      />
      <div className="tcard">
        <div className="tcard-body">
          <EmployeeTable
            employees={employees}
            loading={loading}
            onEdit={onEdit}
            onDeactivate={onDeactivate}
          />
        </div>
      </div>
    </>
  );
}

function EmployeeTable({
  employees,
  loading,
  compact = false,
  onEdit,
  onDeactivate,
}: {
  employees: Employee[];
  loading: boolean;
  compact?: boolean;
  onEdit?: (employee: Employee) => void;
  onDeactivate?: (employee: Employee) => void;
}) {
  const columns = compact ? 6 : 8;
  return (
    <div className="tcard-body">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th>
            {!compact && <th>Email</th>}
            <th>Department</th><th>Position</th><th>Salary</th>
            {compact ? <th>Status</th> : <th>Status</th>}
            {!compact && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <LoadingRow columns={columns} loading={loading} />
          ) : employees.map(employee => (
            <tr key={employee.id}>
              <td className="employee-id">{employee.emp_id}</td>
              <td className="employee-name">{employee.first_name} {employee.last_name}</td>
              {!compact && <td>{employee.email}</td>}
              <td>{employee.department}</td>
              <td>{employee.position}</td>
              <td className="salary-cell">{formatMoney(employee.basic_salary)}</td>
              <td><span className="status-pill">Active</span></td>
              {!compact && (
                <td>
                  <div className="table-actions">
                    <button className="btn-sm btn-outline" onClick={() => onEdit?.(employee)} aria-label={`Edit ${employee.first_name} ${employee.last_name}`}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => onDeactivate?.(employee)} aria-label={`Deactivate ${employee.first_name} ${employee.last_name}`}>Deactivate</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepartmentsPage({
  departments,
  loading,
  onAdd,
}: {
  departments: Department[];
  loading: boolean;
  onAdd: () => void;
}) {
  return (
    <>
      <PageHeading
        title="Department"
        highlight="Overview"
        subtitle="Organizational structure and budget allocation"
        action={<button className="btn-sm btn-gold-sm" onClick={onAdd}><i className="fa-solid fa-plus" aria-hidden="true" />New Department</button>}
      />
      <div className="tcard">
        <div className="tcard-body">
          <table>
            <thead><tr><th>Department</th><th>Head</th><th>Budget</th><th>Created</th></tr></thead>
            <tbody>
              {departments.length === 0 ? (
                <LoadingRow columns={4} loading={loading} />
              ) : departments.map(department => (
                <tr key={department.id}>
                  <td className="employee-name">{department.name}</td>
                  <td>{department.head || '—'}</td>
                  <td className="salary-cell">{department.budget === null ? '—' : formatMoney(department.budget)}</td>
                  <td>{formatDate(department.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PayslipsPage() {
  return (
    <>
      <PageHeading
        title="Payslip"
        highlight="Archive"
        subtitle="Payslip creation and history are not available yet"
      />
      <div className="tcard empty-state payslip-placeholder">
        Payslip generation is not implemented in this demo.
      </div>
    </>
  );
}

function AccountPage({ user }: { user: User }) {
  return (
    <>
      <PageHeading
        title="Account"
        highlight="Settings"
        subtitle="Administrator account details"
      />
      <div className="fcard account-card">
        <h3>Profile details</h3>
        <div className="fg">
          <div className="ff">
            <label htmlFor="profile-firstname">First name</label>
            <input id="profile-firstname" value={user.first_name} readOnly />
          </div>
          <div className="ff">
            <label htmlFor="profile-lastname">Last name</label>
            <input id="profile-lastname" value={user.last_name} readOnly />
          </div>
        </div>
        <div className="ff">
          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" type="email" value={user.email} readOnly />
        </div>
        <p className="account-note">Profile editing is not available yet.</p>
      </div>
    </>
  );
}

function EmployeeModal({
  employee,
  departments,
  saving,
  onClose,
  onSubmit,
}: {
  employee: Employee | null;
  departments: Department[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title={employee ? 'Edit Employee' : 'Add Employee'} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="modal-body">
          <div className="fg">
            <Field label="First name" name="first_name" defaultValue={employee?.first_name} required />
            <Field label="Last name" name="last_name" defaultValue={employee?.last_name} required />
          </div>
          <Field label="Email" name="email" type="email" defaultValue={employee?.email} required />
          <div className="fg">
            <div className="ff">
              <label htmlFor="employee-department">Department</label>
              <select id="employee-department" name="department" defaultValue={employee?.department ?? departments[0]?.name ?? ''} required>
                {departments.length === 0
                  ? <option value="">Create a department first</option>
                  : departments.map(department => <option key={department.id} value={department.name}>{department.name}</option>)}
              </select>
            </div>
            <Field label="Position" name="position" defaultValue={employee?.position} required />
          </div>
          <Field
            label="Basic salary (USD)"
            name="basic_salary"
            type="number"
            defaultValue={employee?.basic_salary}
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-sm btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-sm btn-gold-sm" disabled={saving || departments.length === 0}>
            {saving ? 'Saving…' : employee ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DepartmentModal({
  saving,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title="New Department" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="modal-body">
          <Field label="Department name" name="name" required />
          <Field label="Department head" name="head" />
          <Field label="Monthly budget (USD)" name="budget" type="number" min="0" step="0.01" />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-sm btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-sm btn-gold-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Create Department'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required = false,
  min,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="ff">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
      />
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default App;
