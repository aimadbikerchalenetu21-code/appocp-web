import { useAuth } from '../context/AuthContext';
import { Settings, User, Shield, Info } from 'lucide-react';

export default function SettingsPage() {
  const { user, role } = useAuth();

  const Section = ({ title, children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );

  const Row = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-gray-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-700">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Paramètres</h1>
        <p className="text-gray-500 text-sm">Informations du compte</p>
      </div>

      <Section title="Profil">
        <Row icon={User}   label="Adresse email" value={user?.email} />
        <Row icon={Shield} label="Rôle"          value={role === 'responsable' ? 'Intervenant externe' : 'Collaborateur OCP'} />
      </Section>

      <Section title="Application">
        <Row icon={Info}     label="Version"    value="v4.2.0 — Production" />
        <Row icon={Settings} label="Plateforme" value="Web (OCP Industriel)" />
      </Section>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
        <p className="text-xs text-gray-400">© 2026 Suivi des Travaux Journaliers</p>
        <p className="text-xs text-gray-300 mt-1">OCP Industriel — Tous droits réservés</p>
      </div>
    </div>
  );
}
