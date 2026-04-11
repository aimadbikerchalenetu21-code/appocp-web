import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { subscribeToAllTasks, getAgentProfile } from '../services/firestoreService';
import {
  CheckCircle, AlertCircle, Clock, Plus, ClipboardList, Flag,
  Bell, CalendarDays, History, User, LogOut, Timer,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────────────────── */
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── SVG Donut chart ────────────────────────────────────────────────────── */
function DonutChart({ pct }) {
  const r   = 54;
  const sw  = 12;
  const cx  = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      {/* Progress */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="url(#donutGrad)" strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <defs>
        <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#166534" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <text x={cx} y={cx - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="#166534">
        {pct}%
      </text>
      <text x={cx} y={cx + 14} textAnchor="middle" fontSize="11" fill="#9ca3af">
        Réalisé
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AgentDashboard() {
  const { user, setRole } = useAuth();
  const navigate = useNavigate();

  const [allTasks, setAllTasks]           = useState([]);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tab, setTab]                     = useState('today');    // today | upcoming | history
  const [filterMode, setFilterMode]       = useState('all');      // all | mine

  /* ── Auth / profile ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    getAgentProfile(user.uid).then((p) => {
      setApprovalStatus(p?.approvalStatus ?? 'approved');
      setProfileLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user || approvalStatus !== 'approved') return;
    return subscribeToAllTasks(setAllTasks);
  }, [user, approvalStatus]);

  const handleLogout = async () => {
    setRole(null);
    await signOut(auth);
    navigate('/login');
  };

  /* ── Pending / refused screens ───────────────────────────────────────── */
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
          Votre compte est en cours de validation par l'administrateur.
        </p>
        <button onClick={handleLogout}
          className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600">
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
          Votre demande d'accès a été refusée. Contactez l'administrateur.
        </p>
        <button onClick={handleLogout}
          className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    </div>
  );

  /* ── Data ────────────────────────────────────────────────────────────── */
  const today = todayYMD();

  // Filter by tab (date)
  const byTab = allTasks.filter((t) => {
    if (tab === 'today')    return t.dueDate === today;
    if (tab === 'upcoming') return t.dueDate  >  today;
    if (tab === 'history')  return t.dueDate  <  today;
    return true;
  });

  // Filter mine vs all
  const tasks = filterMode === 'mine'
    ? byTab.filter((t) => t.createdBy?.uid === user?.uid)
    : byTab;

  const todayTasks    = allTasks.filter((t) => t.dueDate === today);
  const upcomingTasks = allTasks.filter((t) => t.dueDate  >  today);
  const historyTasks  = allTasks.filter((t) => t.dueDate  <  today);

  const total      = tasks.length;
  const completed  = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const blocked    = tasks.filter((t) => t.status === 'blocked').length;
  const pending    = tasks.filter((t) => t.status === 'pending').length;
  const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group today's tasks by assignedTo email (always all)
  const byCollaborateur = todayTasks.reduce((acc, t) => {
    const email = t.assignedTo?.email || t.createdBy?.email || 'Inconnu';
    if (!acc[email]) acc[email] = { total: 0, done: 0 };
    acc[email].total++;
    if (t.status === 'completed') acc[email].done++;
    return acc;
  }, {});

  const STATUS_STYLES = {
    completed:     { label: 'Terminé',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-400' },
    'in-progress': { label: 'En cours',   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-400' },
    blocked:       { label: 'Bloqué',     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-400' },
    pending:       { label: 'En attente', color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-300' },
  };

  const TABS = [
    { key: 'today',    label: "Aujourd'hui", count: todayTasks.length,    icon: CalendarDays },
    { key: 'upcoming', label: 'À venir',      count: upcomingTasks.length, icon: Timer },
    { key: 'history',  label: 'Historique',   count: historyTasks.length,  icon: History },
  ];

  const initials = (user?.email?.[0] ?? 'O').toUpperCase();

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      {/* ── Top header ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <div>
          <h1 className="text-lg font-extrabold text-white leading-tight">Bonjour, Collaborateur OCP</h1>
          <p className="text-green-200 text-xs mt-0.5">Tableau de bord</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <Bell size={17} />
          </button>
          <button onClick={() => navigate('/add-task')}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <Plus size={18} />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>
            {initials}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-6">

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 grid grid-cols-3 gap-2 mb-4">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex flex-col items-center gap-0.5 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                tab === key
                  ? 'text-white shadow-md'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
              style={tab === key ? { background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' } : {}}>
              <span className="text-base font-extrabold">{count}</span>
              <span className="text-xs font-semibold opacity-80">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Taux de réalisation global ────────────────────────────────── */}
        <div className="mx-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-800 text-sm">Taux de réalisation global</p>
            <button onClick={() => setFilterMode(filterMode === 'all' ? 'mine' : 'all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                filterMode === 'all'
                  ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                  : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}>
              {filterMode === 'all' ? 'Tous collaborateurs' : 'Mes tâches'}
            </button>
          </div>

          <div className="flex items-center gap-6">
            <DonutChart pct={pct} />
            <div className="flex flex-col gap-3 flex-1">
              {[
                { label: 'Total',     value: total,            color: 'text-gray-800' },
                { label: 'Faites',    value: completed,        color: 'text-green-600' },
                { label: 'Restantes', value: total - completed, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className={`text-xl font-extrabold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────── */}
        <div className="mx-4 grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'OK',          value: completed,  icon: CheckCircle, bg: '#dcfce7', iconColor: '#16a34a', numColor: '#15803d' },
            { label: 'En cours',    value: inProgress, icon: Timer,       bg: '#e0e7ff', iconColor: '#6366f1', numColor: '#4338ca' },
            { label: 'Bloqué',      value: blocked,    icon: AlertCircle, bg: '#fef3c7', iconColor: '#d97706', numColor: '#b45309' },
            { label: 'En attente',  value: pending,    icon: Clock,       bg: '#f0fdf4', iconColor: '#6b7280', numColor: '#374151' },
          ].map(({ label, value, icon: Icon, bg, iconColor, numColor }) => (
            <div key={label} className="rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm"
              style={{ backgroundColor: bg }}>
              <Icon size={18} style={{ color: iconColor }} />
              <span className="text-xl font-extrabold" style={{ color: numColor }}>
                {String(value).padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold text-center leading-tight" style={{ color: numColor, opacity: 0.75 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tâches du jour — par collaborateur ───────────────────────── */}
        {tab === 'today' && Object.keys(byCollaborateur).length > 0 && (
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <p className="text-sm font-bold text-gray-800 mb-3">
              Tâches du jour — par collaborateur
            </p>
            <div className="space-y-3">
              {Object.entries(byCollaborateur).map(([email, { total: t, done: d }]) => {
                const p = t > 0 ? Math.round((d / t) * 100) : 0;
                return (
                  <div key={email}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate">{email}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">{d}/{t}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tasks list ───────────────────────────────────────────────── */}
        <div className="mx-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-sm">
              {tab === 'today' ? "Tâches d'aujourd'hui" : tab === 'upcoming' ? 'Tâches à venir' : 'Historique'}
            </h2>
            <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-100">
              {total} tâche{total !== 1 ? 's' : ''}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <ClipboardList size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucune tâche pour cette période</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => {
                const sc = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
                return (
                  <div key={task.id}
                    onClick={() => navigate('/task/' + task.id, { state: { task } })}
                    className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${sc.border} cursor-pointer hover:shadow-md transition-all flex items-center gap-3`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
                      <ClipboardList size={16} className={sc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Flag size={10} /> {task.priority || 'Moyen'}
                        </span>
                        {task.assignedTo?.email && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                            <User size={10} /> {task.assignedTo.email}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-gray-300">{task.dueDate}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
