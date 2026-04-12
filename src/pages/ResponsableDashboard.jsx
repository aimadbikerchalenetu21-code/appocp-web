import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToResponsableTasks, updateTaskStatus, createNotification } from '../services/firestoreService';
import {
  Bell, ClipboardList, Lock, CheckCircle, AlertTriangle,
  Play, StopCircle, Timer, Calendar,
} from 'lucide-react';

/* ── Today as YYYY-MM-DD ─────────────────────────────────────────────────── */
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── Format elapsed seconds → HH:MM:SS ──────────────────────────────────── */
const fmtTime = (s = 0) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ResponsableDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [tasks, setTasks]   = useState([]);
  const [timers, setTimers] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user?.email) return;
    return subscribeToResponsableTasks(user.email, setTasks);
  }, [user]);

  /* Live timer for in-progress tasks */
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

  const today = todayYMD();

  /* ── Split tasks ─────────────────────────────────────────────────────── */
  const todayTasks    = tasks.filter((t) => t.dueDate === today);
  const overdueTasks  = tasks.filter((t) => t.dueDate < today && !['completed', 'blocked'].includes(t.status));
  const futureTasks   = tasks.filter((t) => t.dueDate  >  today);
  const activeTodayCount = todayTasks.filter((t) => !['completed', 'blocked'].includes(t.status)).length;

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const handleStart = async (task) => {
    await updateTaskStatus(task.id, 'in-progress');
    if (task.createdBy?.uid) {
      await createNotification(task.createdBy.uid, {
        type: 'task-started', taskId: task.id, taskTitle: task.title,
        title: 'Tâche démarrée',
        message: `"${task.title}" a été démarrée par l'intervenant externe`,
        icon: 'play-circle', iconColor: '#16a34a', iconBg: '#dcfce7',
      });
    }
  };

  /* FIN → navigate to detail page for OK / Point Bloquant */
  const handleFin = (task) => {
    navigate('/task/' + task.id, { state: { task } });
  };

  const initials = (user?.email?.[0] ?? 'O').toUpperCase();

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <div>
          <h1 className="text-lg font-extrabold text-white leading-tight">Tableau de bord</h1>
          <p className="text-green-200 text-xs mt-0.5">Bonjour, Intervenant externe</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <Bell size={17} />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>
            {initials}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-8">

        {/* ── Tâches en retard ───────────────────────────────────────── */}
        {overdueTasks.length > 0 && (
          <div className="px-4 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-red-700">En retard</h2>
              <span className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full font-semibold border border-red-200">
                {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {overdueTasks.map((task) => {
                const isInProgress = task.status === 'in-progress';
                return (
                  <div key={task.id}
                    className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => navigate('/task/' + task.id, { state: { task } })}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50">
                        <AlertTriangle size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                        {task.dueDate && (
                          <p className="flex items-center gap-1 text-xs text-red-400 mt-0.5">
                            <Calendar size={10} /> Prévu le {task.dueDate}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 bg-red-100 text-red-700">
                        En retard
                      </span>
                    </div>
                    <div className="flex">
                      {!isInProgress && (
                        <button onClick={() => handleStart(task)}
                          className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-extrabold text-white"
                          style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>
                          <Play size={15} fill="white" /> DÉMARRER
                        </button>
                      )}
                      <button onClick={() => handleFin(task)}
                        className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-extrabold text-white"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <StopCircle size={15} /> FIN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tâches du jour ─────────────────────────────────────────── */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Tâches du jour</h2>
            <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-100">
              {activeTodayCount} actives
            </span>
          </div>

          {todayTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <ClipboardList size={36} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucune tâche pour aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => {
                const isInProgress = task.status === 'in-progress';
                const isCompleted  = task.status === 'completed';
                const isBlocked    = task.status === 'blocked';
                const isFinal      = isCompleted || isBlocked;

                return (
                  <div key={task.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Task info row */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => navigate('/task/' + task.id, { state: { task } })}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-green-50' : isBlocked ? 'bg-amber-50' : isInProgress ? 'bg-blue-50' : 'bg-gray-50'
                      }`}>
                        {isCompleted
                          ? <CheckCircle size={18} className="text-green-600" />
                          : isBlocked
                            ? <AlertTriangle size={18} className="text-amber-500" />
                            : <ClipboardList size={18} className={isInProgress ? 'text-blue-500' : 'text-gray-400'} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                        {task.objTechnique && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{task.objTechnique}</p>
                        )}
                      </div>
                      {/* Status badge */}
                      {isFinal && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                          isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isCompleted ? 'Terminé' : 'Bloqué'}
                        </span>
                      )}
                    </div>

                    {/* Timer strip (in-progress only) */}
                    {isInProgress && (
                      <div className="mx-4 mb-2 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-1.5">
                        <Timer size={13} className="text-blue-500" />
                        <span className="font-bold text-blue-600 text-sm tabular-nums">{fmtTime(timers[task.id])}</span>
                        <span className="text-xs text-blue-400">en cours</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isFinal && (
                      <div className="flex">
                        {/* DÉMARRER — only if pending */}
                        {!isInProgress && (
                          <button onClick={() => handleStart(task)}
                            className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-extrabold text-white transition-all hover:brightness-110"
                            style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>
                            <Play size={15} fill="white" /> DÉMARRER
                          </button>
                        )}
                        {/* FIN */}
                        <button onClick={() => handleFin(task)}
                          className={`flex items-center justify-center gap-2 py-4 text-sm font-extrabold text-white transition-all hover:brightness-110 ${
                            isInProgress ? 'flex-1' : 'flex-1'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                          <StopCircle size={15} /> FIN
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── À venir (locked) ───────────────────────────────────────── */}
        {futureTasks.length > 0 && (
          <div className="px-4 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">À venir</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">
                {futureTasks.length} tâche{futureTasks.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {futureTasks.map((task) => (
                <div key={task.id}
                  className="bg-white/70 rounded-2xl border border-dashed border-gray-200 px-4 py-3 flex items-center gap-3 opacity-70">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Lock size={15} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-500 text-sm truncate">{task.title}</p>
                    {task.dueDate && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Calendar size={10} /> {task.dueDate}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-400 font-semibold bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">
                    <Lock size={10} /> Pas encore
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="px-4 pt-8">
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <ClipboardList size={44} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold">Aucune tâche assignée</p>
              <p className="text-gray-300 text-sm mt-1">Vos tâches apparaîtront ici</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
