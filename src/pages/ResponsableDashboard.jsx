import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToResponsableTasks, updateTaskStatus, createNotification } from '../services/firestoreService';
import { ClipboardList, MapPin, Play, Square, CheckCircle, Timer } from 'lucide-react';

const PRIORITY_HIGH = ['Élevé', 'Critique', 'High', 'Critical'];

const fmt = (s = 0) => {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

export default function ResponsableDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks]   = useState([]);
  const [timers, setTimers] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToResponsableTasks(user.email, setTasks);
  }, [user]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        tasks.forEach((t) => { if (t.status === 'in-progress') next[t.id] = (next[t.id] || 0) + 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [tasks]);

  const handleStart = async (task) => {
    await updateTaskStatus(task.id, 'in-progress');
    if (task.createdBy?.uid) {
      await createNotification(task.createdBy.uid, {
        type: 'task-started', taskId: task.id, taskTitle: task.title,
        title: 'Tâche démarrée',
        message: `"${task.title}" a été démarrée par l'intervenant externe`,
        icon: 'play-circle', iconColor: '#2563eb', iconBg: '#eff6ff',
      });
    }
  };

  const handleEnd = async (task) => {
    await updateTaskStatus(task.id, 'completed');
    if (task.createdBy?.uid) {
      await createNotification(task.createdBy.uid, {
        type: 'task-completed', taskId: task.id, taskTitle: task.title,
        title: 'Tâche terminée',
        message: `"${task.title}" a été terminée par l'intervenant externe`,
        icon: 'check-circle', iconColor: '#16a34a', iconBg: '#dcfce7',
      });
    }
  };

  const active = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Tableau de bord</h1>
        <p className="text-gray-500 text-sm">Bonjour, Intervenant externe</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">Tâches Prioritaires</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">{active} actives</span>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <ClipboardList size={44} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune tâche assignée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isInProgress = task.status === 'in-progress';
            const isDone = task.status === 'completed';
            const isHigh = PRIORITY_HIGH.includes(task.priority);
            return (
              <div key={task.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 transition-all ${
                  isInProgress ? 'border-blue-500' : isDone ? 'border-green-500 opacity-70' : 'border-gray-200'
                }`}>
                <div className="flex items-start gap-3 mb-3 cursor-pointer"
                  onClick={() => navigate('/task/' + task.id, { state: { task } })}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isInProgress ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <ClipboardList size={18} className={isInProgress ? 'text-blue-600' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.zone && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={10} />{task.zone}</span>}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isHigh ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {isInProgress && (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 mb-3">
                    <Timer size={15} className="text-blue-600" />
                    <span className="font-bold text-blue-700 tabular-nums">{fmt(timers[task.id])}</span>
                    <span className="text-xs text-gray-400">en cours</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {isDone ? (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-bold flex-1 justify-center">
                      <CheckCircle size={16} /> Terminé
                    </div>
                  ) : (
                    <>
                      {!isInProgress && (
                        <button onClick={() => handleStart(task)}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-blue-900 transition-colors">
                          <Play size={14} /> DÉMARRER
                        </button>
                      )}
                      <button onClick={() => handleEnd(task)}
                        className={`flex-1 flex items-center justify-center gap-2 bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-600 transition-colors`}>
                        <Square size={14} /> {isInProgress ? 'TERMINER' : 'FIN'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
