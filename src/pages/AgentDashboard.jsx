import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { subscribeToAgentTasks, getAgentProfile } from '../services/firestoreService';
import { CheckCircle, AlertCircle, Clock, Plus, ClipboardList, Flag, User, LogOut } from 'lucide-react';

const STATUS = {
  completed:     { label: 'Terminé',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-400' },
  'in-progress': { label: 'En cours',   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-400' },
  blocked:       { label: 'Bloqué',     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-400' },
  pending:       { label: 'En attente', color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-300' },
};

export default function AgentDashboard() {
  const { user, setRole } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks]           = useState([]);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getAgentProfile(user.uid).then((p) => {
      setApprovalStatus(p?.approvalStatus ?? 'approved');
      setProfileLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user || approvalStatus !== 'approved') return;
    return subscribeToAgentTasks(user.uid, setTasks);
  }, [user, approvalStatus]);

  const handleLogout = async () => {
    setRole(null);
    await signOut(auth);
    navigate('/login');
  };

  if (profileLoading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Chargement...</div>
  );

  if (approvalStatus === 'pending') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Compte en attente d'approbation</h2>
        <p className="text-gray-500 text-sm mb-6">
          Votre compte est en cours de validation par l'administrateur. Vous serez notifié une fois approuvé.
        </p>
        <button onClick={handleLogout}
          className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    </div>
  );

  if (approvalStatus === 'refused') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Accès refusé</h2>
        <p className="text-gray-500 text-sm mb-6">
          Votre demande d'accès a été refusée. Contactez l'administrateur pour plus d'informations.
        </p>
        <button onClick={handleLogout}
          className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    </div>
  );

  const total     = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const blocked   = tasks.filter((t) => t.status === 'blocked').length;
  const pending   = tasks.filter((t) => t.status === 'pending').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header banner */}
      <div className="rounded-2xl p-5 mb-6 flex items-center justify-between shadow-md"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <div>
          <h1 className="text-xl font-extrabold text-white">Bonjour, Collaborateur OCP</h1>
          <p className="text-green-200 text-sm mt-0.5">Tableau de bord — Aujourd'hui</p>
        </div>
        <button onClick={() => navigate('/add-task')}
          className="flex items-center gap-2 bg-white text-green-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-50 transition-colors shadow-md">
          <Plus size={18} /> Nouvelle tâche
        </button>
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -translate-y-8 translate-x-8"
          style={{ background: 'radial-gradient(circle, #16a34a, transparent)' }} />
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-700">Taux de réalisation</span>
          <span className="text-2xl font-extrabold text-green-600">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)' }} />
        </div>
        <div className="flex gap-6 mt-4 text-center">
          {[['Total', total, 'text-gray-700'], ['Réalisées', completed, 'text-green-600'], ['Restantes', total - completed, 'text-amber-600']].map(([l, v, c]) => (
            <div key={l}>
              <p className={`text-xl font-extrabold ${c}`}>{v}</p>
              <p className="text-xs text-gray-400">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-4 shadow-sm text-white"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <CheckCircle size={22} className="mb-2 opacity-90" />
          <p className="text-2xl font-extrabold">{String(completed).padStart(2, '0')}</p>
          <p className="text-xs text-green-100 mt-1">OK</p>
        </div>
        <div className="rounded-2xl p-4 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
          <AlertCircle size={22} className="mb-2 text-amber-600" />
          <p className="text-2xl font-extrabold text-amber-700">{String(blocked).padStart(2, '0')}</p>
          <p className="text-xs text-amber-600 mt-1">Bloqué</p>
        </div>
        <div className="rounded-2xl p-4 shadow-sm bg-gray-50 border border-gray-200">
          <Clock size={22} className="mb-2 text-gray-400" />
          <p className="text-2xl font-extrabold text-gray-600">{String(pending).padStart(2, '0')}</p>
          <p className="text-xs text-gray-400 mt-1">En attente</p>
        </div>
      </div>

      {/* Tasks list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">Mes tâches</h2>
        <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-100">
          {total} tâche{total !== 1 ? 's' : ''}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <ClipboardList size={44} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune tâche. Créez-en une avec le bouton +</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const sc = STATUS[task.status] || STATUS.pending;
            return (
              <div key={task.id} onClick={() => navigate('/task/' + task.id, { state: { task } })}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${sc.border} cursor-pointer hover:shadow-md transition-all flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
                  <ClipboardList size={18} className={sc.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{task.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Flag size={10} /> {task.priority}
                    </span>
                    {task.assignedTo?.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                        <User size={10} /> {task.assignedTo.email}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
