import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { subscribeToAllAgents, updateAgentApproval, deleteAllTasks } from '../services/firestoreService';
import { Users, Clock, CheckCircle, XCircle, LogOut, ShieldCheck, Check, X, UserMinus, UserPlus, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  approved: { label: 'Approuvé',  color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  pending:  { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  refused:  { label: 'Refusé',    color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   dot: 'bg-red-500' },
};

const FILTERS = [
  { key: 'all',      label: 'Tous',       icon: Users,       color: 'text-gray-600' },
  { key: 'pending',  label: 'En attente', icon: Clock,       color: 'text-amber-600' },
  { key: 'approved', label: 'Approuvés',  icon: CheckCircle, color: 'text-green-600' },
  { key: 'refused',  label: 'Refusés',    icon: XCircle,     color: 'text-red-600' },
];

function getInitials(name, email) {
  if (name) return name.charAt(0).toUpperCase();
  return (email || '?').charAt(0).toUpperCase();
}

export default function AdminPage() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents]     = useState([]);
  const [filter, setFilter]     = useState('all');
  const [loading, setLoading]   = useState({});

  useEffect(() => {
    return subscribeToAllAgents(setAgents);
  }, []);

  const handleApproval = async (uid, status) => {
    setLoading((p) => ({ ...p, [uid]: true }));
    await updateAgentApproval(uid, status);
    setLoading((p) => ({ ...p, [uid]: false }));
  };

  const handleLogout = async () => {
    setRole(null);
    await signOut(auth);
    navigate('/login');
  };

  const counts = {
    all:      agents.length,
    pending:  agents.filter((a) => (a.approvalStatus || 'pending') === 'pending').length,
    approved: agents.filter((a) => a.approvalStatus === 'approved').length,
    refused:  agents.filter((a) => a.approvalStatus === 'refused').length,
  };

  const filtered = filter === 'all'
    ? agents
    : agents.filter((a) => (a.approvalStatus || 'pending') === filter);

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Administration</h1>
            <p className="text-gray-400 text-xs mt-0.5">Gestion des collaborateurs</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm flex-shrink-0 ml-2">
          <LogOut size={16} /> <span className="hidden sm:inline">Se déconnecter</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Danger zone */}
        <div className="mb-5 flex justify-end">
          <button
            onClick={async () => {
              if (window.confirm('Supprimer TOUTES les tâches définitivement ? Cette action est irréversible.')) {
                await deleteAllTasks();
                alert('Toutes les tâches ont été supprimées.');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors">
            <Trash2 size={15} /> Vider toutes les tâches
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {FILTERS.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded-xl p-4 text-left transition-all border ${
                filter === key
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/5 hover:bg-white/8'
              }`}>
              <p className={`text-2xl font-extrabold mb-1 ${
                key === 'pending' ? 'text-amber-400' :
                key === 'approved' ? 'text-green-400' :
                key === 'refused' ? 'text-red-400' : 'text-white'
              }`}>{counts[key]}</p>
              <p className="text-gray-400 text-xs font-medium">{label}</p>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}>
              <Icon size={13} /> {label} ({counts[key]})
            </button>
          ))}
        </div>

        {/* Agent list */}
        {filtered.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 text-center">
            <Users size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun collaborateur</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((agent) => {
              const approvalStatus = agent.approvalStatus || 'pending';
              const sc = STATUS_CONFIG[approvalStatus] || STATUS_CONFIG.pending;
              const busy = loading[agent.uid];

              return (
                <div key={agent.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                      {getInitials(agent.name, agent.email)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {agent.name || agent.email?.split('@')[0]}
                      </p>
                      <p className="text-gray-400 text-xs truncate">{agent.email}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.color} ${sc.bg} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    {approvalStatus === 'pending' && (
                      <>
                        <button onClick={() => handleApproval(agent.uid, 'approved')} disabled={busy}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                          <Check size={13} /> Approuver
                        </button>
                        <button onClick={() => handleApproval(agent.uid, 'refused')} disabled={busy}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                          <X size={13} /> Refuser
                        </button>
                      </>
                    )}
                    {approvalStatus === 'approved' && (
                      <button onClick={() => handleApproval(agent.uid, 'refused')} disabled={busy}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                        <UserMinus size={13} /> Révoquer
                      </button>
                    )}
                    {approvalStatus === 'refused' && (
                      <button onClick={() => handleApproval(agent.uid, 'approved')} disabled={busy}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                        <UserPlus size={13} /> Réactiver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
