import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import AgentDashboard     from './pages/AgentDashboard';
import ResponsableDashboard from './pages/ResponsableDashboard';
import AddTaskPage        from './pages/AddTaskPage';
import TaskDetailPage     from './pages/TaskDetailPage';
import CalendarPage       from './pages/CalendarPage';
import NotificationsPage  from './pages/NotificationsPage';
import SettingsPage       from './pages/SettingsPage';
import SafetyPage         from './pages/SafetyPage';
import AdminPage          from './pages/AdminPage';

/* ── Route guards ────────────────────────────────────────────────────── */

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" replace />;
}

function AgentRoute({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user)           return <Navigate to="/login" replace />;
  if (role !== 'agent') return <Navigate to="/dashboard" replace />;
  return children;
}

function ResponsableRoute({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user)                  return <Navigate to="/login" replace />;
  if (role !== 'responsable') return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user)          return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function Loader() {
  return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Chargement...</div>;
}

/* ── Dashboard router — sends each role to its own view ─────────────── */
function DashboardRouter() {
  const { role } = useAuth();
  if (role === 'admin')       return <Navigate to="/admin" replace />;
  if (role === 'responsable') return <ResponsableDashboard />;
  return <AgentDashboard />;
}

/* ── Routes ─────────────────────────────────────────────────────────── */
function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  return (
    <Routes>
      <Route path="/login"    element={!user ? <LoginPage />    : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" replace />} />

      {/* Admin — standalone, no sidebar */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

      {/* Shared layout */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Both agent and responsable */}
        <Route path="dashboard"     element={<DashboardRouter />} />
        <Route path="task/:id"      element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} />
        <Route path="calendar"      element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
        <Route path="notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="settings"      element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

        {/* Agent only */}
        <Route path="add-task" element={<AgentRoute><AddTaskPage /></AgentRoute>} />
        <Route path="safety"   element={<AgentRoute><SafetyPage /></AgentRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
