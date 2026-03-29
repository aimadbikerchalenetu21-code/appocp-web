import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import AgentDashboard   from './pages/AgentDashboard';
import ResponsableDashboard from './pages/ResponsableDashboard';
import AddTaskPage      from './pages/AddTaskPage';
import TaskDetailPage   from './pages/TaskDetailPage';
import CalendarPage     from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage     from './pages/SettingsPage';
import SafetyPage       from './pages/SafetyPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Chargement...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function DashboardRouter() {
  const { role } = useAuth();
  return role === 'responsable' ? <ResponsableDashboard /> : <AgentDashboard />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Chargement...</div>;

  return (
    <Routes>
      <Route path="/login"    element={!user ? <LoginPage />    : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" replace />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<DashboardRouter />} />
        <Route path="add-task"      element={<AddTaskPage />} />
        <Route path="task/:id"      element={<TaskDetailPage />} />
        <Route path="calendar"      element={<CalendarPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings"      element={<SettingsPage />} />
        <Route path="safety"        element={<SafetyPage />} />
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
