import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  User, Shield, Info, Settings, Bell, Globe, Sun,
  RefreshCw, LogOut, ChevronRight,
} from 'lucide-react';

const SETTINGS_SECTIONS = (role, email) => [
  {
    title: 'Compte',
    items: [
      { icon: Shield, label: 'Rôle',       value: role === 'responsable' ? 'Intervenant externe' : 'Collaborateur OCP' },
      { icon: User,   label: 'Identifiant', value: '—' },
      { icon: User,   label: 'Email',       value: email || '—' },
    ],
  },
  {
    title: 'Application',
    items: [
      { icon: Bell,     label: 'Notifications', value: 'Activées' },
      { icon: Globe,    label: 'Langue',         value: 'Français' },
      { icon: Sun,      label: 'Thème',          value: 'Clair' },
    ],
  },
  {
    title: 'Système',
    items: [
      { icon: Info,      label: 'Version',      value: 'v4.2.0-Production' },
      { icon: RefreshCw, label: 'Dernière MAJ', value: '28 Mars 2026' },
      { icon: Shield,    label: 'Certificat SSL', value: 'Valide' },
    ],
  },
];

export default function SettingsPage() {
  const { user, role, setRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
      setRole(null);
      await signOut(auth);
      navigate('/login');
    }
  };

  const initials = user?.email?.[0]?.toUpperCase() || '?';
  const displayRole = role === 'responsable' ? 'Intervenant externe' : 'Collaborateur OCP';

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="rounded-2xl p-5 mb-6 shadow-md"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Paramètres</h1>
        <p className="text-green-200 text-sm mt-0.5">Informations du compte</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5 flex items-center gap-4"
        style={{ borderLeftWidth: 4, borderLeftColor: '#13a538' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-800 mb-1">{displayRole}</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full mb-1"
            style={{ background: '#13a538' }}>
            {role === 'responsable' ? '👔' : '🪖'} {displayRole}
          </span>
          <p className="text-xs text-gray-400 truncate">Entité / Site: Non défini</p>
        </div>
      </div>

      {/* Settings sections */}
      {SETTINGS_SECTIONS(role, user?.email).map((section) => (
        <div key={section.title} className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
            {section.title}
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {section.items.map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label}
                className={`flex items-center gap-4 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-400 font-medium truncate max-w-[160px]">{value}</p>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Logout button */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-3 text-white rounded-2xl py-4 text-base font-bold mb-5 shadow-md transition-all hover:shadow-lg hover:scale-[1.01]"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
        <LogOut size={20} /> Se déconnecter
      </button>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">© 2026 Suivi des Travaux Journaliers</p>
        <p className="text-xs text-gray-300 mt-0.5">OCP Groupe — Tous droits réservés</p>
      </div>
    </div>
  );
}
