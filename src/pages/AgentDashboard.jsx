import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToAgentTasks } from '../services/firestoreService';
import { CheckCircle, AlertCircle, Clock, Plus, ClipboardList, Flag, User } from 'lucide-react';

const STATUS = {
  completed:     { label: 'Terminé',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-400' },
  'in-progress': { label: 'En cours',   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-400' },
  blocked:       { label: 'Bloqué',     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-400' },
  pending:       { label: 'En attente', color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-300' },
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToAgentTasks(user.uid, setTasks);
  }, [user]);

  const total     = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const blocked   = tasks.filter((t) => t.status === 'blocked').length;
  const pending   = tasks.filter((t) => t.status === 'pending').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Bonjour, Collaborateur OCP</h1>
          <p className="text-gray-500 text-sm">Tableau de bord — Aujourd'hui</p>
        </div>
        <button onClick={() => navigate('/add-task')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors shadow-md">
          <Plus size={18} /> Nouvelle tâche
        </button>
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-700">Taux de réalisation</span>
          <span className="text-2xl font-extrabold text-primary">{pct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
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
        {[
          { label: 'OK', count: completed, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          { label: 'Bloqué', count: blocked, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
          { label: 'En attente', count: pending, color: 'text-gray-500', bg: 'bg-gray-50', icon: Clock },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-white shadow-sm`}>
            <Icon size={22} className={`${color} mb-2`} />
            <p className={`text-2xl font-extrabold ${color}`}>{String(count).padStart(2, '0')}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tasks list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">Mes tâches</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">
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
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${sc.border} cursor-pointer hover:shadow-md transition-shadow flex items-center gap-4`}>
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
