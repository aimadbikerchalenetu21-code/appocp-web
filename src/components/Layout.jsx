import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, Bell, Settings, Shield,
  LogOut, Menu, X, ClipboardList, Plus,
} from 'lucide-react';

const agentLinks = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/add-task',       icon: Plus,            label: 'Nouvelle tâche' },
  { to: '/calendar',       icon: CalendarDays,    label: 'Calendrier' },
  { to: '/notifications',  icon: Bell,            label: 'Notifications' },
  { to: '/safety',         icon: Shield,          label: 'Sécurité' },
  { to: '/settings',       icon: Settings,        label: 'Paramètres' },
];

const responsableLinks = [
  { to: '/dashboard',     icon: ClipboardList,  label: 'Mes tâches' },
  { to: '/calendar',      icon: CalendarDays,   label: 'Calendrier' },
  { to: '/notifications', icon: Bell,           label: 'Notifications' },
  { to: '/settings',      icon: Settings,       label: 'Paramètres' },
];

export default function Layout() {
  const { role, setRole, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = role === 'responsable' ? responsableLinks : agentLinks;

  const handleLogout = async () => {
    setRole(null);
    await signOut(auth);
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/10'
            : 'text-green-100 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">OCP Industriel</p>
            <p className="text-green-200 text-xs mt-0.5">Suivi des Travaux</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <span className="text-xs bg-white/15 text-green-100 px-3 py-1.5 rounded-full font-medium border border-white/10">
          {role === 'responsable' ? 'Intervenant externe' : 'Collaborateur OCP'}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {links.map((l) => <NavItem key={l.to} {...l} />)}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-bold">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <p className="text-green-200 text-xs truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-300 hover:text-red-200 transition-colors"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — green gradient */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #166534 0%, #14532d 60%, #052e16 100%)' }}>
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #166534 0%, #14532d 60%, #052e16 100%)' }}>
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(90deg, #166534, #15803d)' }}>
          <button onClick={() => setOpen(true)} className="text-white">
            <Menu size={22} />
          </button>
          <span className="text-white font-bold text-sm">Suivi des Travaux Journaliers</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
