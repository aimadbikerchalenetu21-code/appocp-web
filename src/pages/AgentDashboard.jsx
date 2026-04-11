import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { subscribeToAllTasks, getAgentProfile, deleteTask } from '../services/firestoreService';
import {
  CheckCircle, AlertCircle, Clock, Plus, ClipboardList, Flag,
  Bell, CalendarDays, History, User, LogOut, Timer,
  ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────────────────── */
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tsToDate(ts) {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate();
  if (ts?.seconds) return new Date(ts.seconds * 1000);
  return null;
}
function fmtHour(ts) {
  const d = tsToDate(ts);
  if (!d) return null;
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtDuration(startTs, endTs) {
  const s = tsToDate(startTs), e = tsToDate(endTs);
  if (!s || !e) return null;
  const mins = Math.round((e - s) / 60000);
  if (mins < 0) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
function toYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function buildCalendarDays(year, month) {
  const firstDay   = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

/* ── SVG Donut chart ────────────────────────────────────────────────────── */
function DonutChart({ pct, size = 140 }) {
  const r    = 54;
  const sw   = 12;
  const cx   = 70;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="url(#dg)" strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <defs>
        <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#166534" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <text x={cx} y={cx - 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="#166534">{pct}%</text>
      <text x={cx} y={cx + 14} textAnchor="middle" fontSize="11" fill="#9ca3af">Réalisé</text>
    </svg>
  );
}

/* ── Small donut for daily rate ─────────────────────────────────────────── */
function MiniDonut({ pct }) {
  const r = 20; const sw = 5; const cx = 26;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={52} height={52} viewBox="0 0 52 52">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="#16a34a" strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset .4s ease' }} />
      <text x={cx} y={cx + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#166534">{pct}%</text>
    </svg>
  );
}

const STATUS_STYLES = {
  completed:     { label: 'Terminé',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-400',  dot: '#16a34a' },
  'in-progress': { label: 'En cours',   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-400',   dot: '#6366f1' },
  blocked:       { label: 'Bloqué',     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-400',  dot: '#d97706' },
  pending:       { label: 'En attente', color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-300',   dot: '#9ca3af' },
};

/* ══════════════════════════════════════════════════════════════════════════ */
export default function AgentDashboard() {
  const { user, setRole } = useAuth();
  const navigate = useNavigate();

  const [allTasks, setAllTasks]             = useState([]);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tab, setTab]                       = useState('today');   // today | upcoming | history
  const [filterMode, setFilterMode]         = useState('all');     // all | mine
  const [calMonth, setCalMonth]             = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedDay, setSelectedDay]       = useState(todayYMD());

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

  const handleLogout = async () => { setRole(null); await signOut(auth); navigate('/login'); };

  /* ── Pending / refused ───────────────────────────────────────────────── */
  if (profileLoading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Chargement...</div>
  );
  if (approvalStatus === 'pending') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4"><Clock size={32} className="text-amber-500" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Compte en attente d'approbation</h2>
        <p className="text-gray-500 text-sm mb-6">Votre compte est en cours de validation par l'administrateur.</p>
        <button onClick={handleLogout} className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600"><LogOut size={15} /> Se déconnecter</button>
      </div>
    </div>
  );
  if (approvalStatus === 'refused') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} className="text-red-500" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Accès refusé</h2>
        <p className="text-gray-500 text-sm mb-6">Votre demande d'accès a été refusée. Contactez l'administrateur.</p>
        <button onClick={handleLogout} className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-400 hover:text-gray-600"><LogOut size={15} /> Se déconnecter</button>
      </div>
    </div>
  );

  /* ── Data ────────────────────────────────────────────────────────────── */
  const today = todayYMD();

  const byTab = allTasks.filter((t) =>
    tab === 'today' ? t.dueDate === today :
    tab === 'upcoming' ? t.dueDate > today :
    t.dueDate < today
  );
  const tasks = filterMode === 'mine' ? byTab.filter((t) => t.createdBy?.uid === user?.uid) : byTab;

  const todayCount    = allTasks.filter((t) => t.dueDate === today).length;
  const upcomingCount = allTasks.filter((t) => t.dueDate  >  today).length;
  const historyCount  = allTasks.filter((t) => t.dueDate  <  today).length;

  const total      = tasks.length;
  const completed  = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const blocked    = tasks.filter((t) => t.status === 'blocked').length;
  const pending    = tasks.filter((t) => t.status === 'pending').length;
  const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group ALL tasks by date (for calendar dots and selected-day tasks)
  const tasksByDate = allTasks.reduce((acc, t) => {
    if (!t.dueDate) return acc;
    if (!acc[t.dueDate]) acc[t.dueDate] = [];
    acc[t.dueDate].push(t);
    return acc;
  }, {});

  // Selected day stats
  const selTasks  = tasksByDate[selectedDay] || [];
  const selTotal  = selTasks.length;
  const selDone   = selTasks.filter((t) => t.status === 'completed').length;
  const selPct    = selTotal > 0 ? Math.round((selDone / selTotal) * 100) : 0;

  // By collaborateur (today only)
  const byCollab = (tasksByDate[today] || []).reduce((acc, t) => {
    const email = t.assignedTo?.email || t.createdBy?.email || 'Inconnu';
    if (!acc[email]) acc[email] = { total: 0, done: 0 };
    acc[email].total++;
    if (t.status === 'completed') acc[email].done++;
    return acc;
  }, {});

  /* ── Calendar helpers ────────────────────────────────────────────────── */
  const calDays = buildCalendarDays(calMonth.year, calMonth.month);
  const prevMonth = () => setCalMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setCalMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );

  const initials = (user?.email?.[0] ?? 'O').toUpperCase();
  const TABS = [
    { key: 'today',    label: "Aujourd'hui", count: todayCount,    icon: CalendarDays },
    { key: 'upcoming', label: 'À venir',      count: upcomingCount, icon: Timer },
    { key: 'history',  label: 'Historique',   count: historyCount,  icon: History },
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      {/* Top header */}
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-6">

        {/* Tabs */}
        <div className="px-4 pt-4 grid grid-cols-3 gap-2 mb-4">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex flex-col items-center gap-0.5 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                tab === key ? 'text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
              style={tab === key ? { background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' } : {}}>
              <span className="text-base font-extrabold">{count}</span>
              <span className="text-xs font-semibold opacity-80">{label}</span>
            </button>
          ))}
        </div>

        {/* ════════════════ HISTORIQUE TAB ══════════════════════════════ */}
        {tab === 'history' ? (
          <div className="mx-4 space-y-3">

            {/* Calendar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500">
                  <ChevronLeft size={18} />
                </button>
                <span className="font-bold text-gray-800 text-sm">
                  {MONTHS_FR[calMonth.month]} {calMonth.year}
                </span>
                <button onClick={nextMonth}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_FR.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {calDays.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />;
                  const ymd    = toYMD(calMonth.year, calMonth.month, day);
                  const isToday = ymd === today;
                  const isSel  = ymd === selectedDay;
                  const dayTasks = tasksByDate[ymd] || [];
                  const hasTasks = dayTasks.length > 0;

                  // Collect up to 3 dot colors
                  const dots = [];
                  if (dayTasks.some((t) => t.status === 'completed'))   dots.push('#16a34a');
                  if (dayTasks.some((t) => t.status === 'in-progress')) dots.push('#6366f1');
                  if (dayTasks.some((t) => t.status === 'blocked'))     dots.push('#d97706');
                  if (dayTasks.some((t) => t.status === 'pending') && dots.length < 3) dots.push('#9ca3af');

                  return (
                    <button key={ymd} onClick={() => setSelectedDay(ymd)}
                      className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                        isToday && !isSel ? 'font-extrabold' : ''
                      } ${isSel ? 'text-white shadow-sm' : isToday ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      style={
                        isSel ? { background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' } :
                        isToday ? { background: 'linear-gradient(135deg, #166534, #16a34a)' } : {}
                      }>
                      <span className="text-sm font-bold">{day}</span>
                      {/* Task dots */}
                      {hasTasks && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dots.slice(0, 3).map((c, di) => (
                            <span key={di} className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: isSel || isToday ? 'rgba(255,255,255,0.8)' : c }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day: taux de réalisation */}
            {selTotal > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Taux de réalisation par jour</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedDay.split('-').reverse().join('/')} — {selTotal} tâche{selTotal > 1 ? 's' : ''}
                    </p>
                  </div>
                  <MiniDonut pct={selPct} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { label: 'Total',     v: selTotal,            color: 'text-gray-800' },
                    { label: 'Faites',    v: selDone,             color: 'text-green-600' },
                    { label: 'Restantes', v: selTotal - selDone,  color: 'text-red-500' },
                  ].map(({ label, v, color }) => (
                    <div key={label} className="text-center bg-gray-50 rounded-xl py-2">
                      <p className={`text-xl font-extrabold ${color}`}>{v}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Day progress bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${selPct}%`, background: 'linear-gradient(90deg, #166534, #4ade80)' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Selected day task list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-800">
                  Tâches — {selectedDay.split('-').reverse().join('/')}
                </p>
                <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-100">
                  {selTotal} tâche{selTotal !== 1 ? 's' : ''}
                </span>
              </div>

              {selTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                  <History size={36} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucune tâche ce jour</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selTasks.map((task) => {
                    const sc = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
                    const canDelete = task.createdBy?.uid === user?.uid;
                    return (
                      <div key={task.id}
                        onClick={() => navigate('/task/' + task.id, { state: { task } })}
                        className={`bg-white rounded-xl p-3.5 shadow-sm border-l-4 ${sc.border} cursor-pointer hover:shadow-md transition-all flex items-center gap-3`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
                          <ClipboardList size={14} className={sc.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Flag size={10} /> {task.priority || 'Moyen'}
                            </span>
                            {task.assignedTo?.email && (
                              <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                                <User size={10} /> {task.assignedTo.email}
                              </span>
                            )}
                          </div>
                          {(task.startedAt || task.completedAt || task.blockedAt) && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {fmtHour(task.startedAt) && <span className="text-xs text-blue-500 font-semibold">▶ {fmtHour(task.startedAt)}</span>}
                              {fmtHour(task.completedAt) && <span className="text-xs text-green-600 font-semibold">⏹ {fmtHour(task.completedAt)}</span>}
                              {fmtHour(task.blockedAt) && <span className="text-xs text-amber-600 font-semibold">⚠ {fmtHour(task.blockedAt)}</span>}
                              {fmtDuration(task.startedAt, task.completedAt) && (
                                <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full">⏱ {fmtDuration(task.startedAt, task.completedAt)}</span>
                              )}
                              {!fmtHour(task.completedAt) && fmtDuration(task.startedAt, task.blockedAt) && (
                                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">⏱ {fmtDuration(task.startedAt, task.blockedAt)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                        {canDelete && (
                          <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Supprimer cette tâche ?')) deleteTask(task.id); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ════════ TODAY / UPCOMING TABS ═══════════════════════════════ */
          <>
            {/* Taux de réalisation global */}
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

            {/* KPI cards */}
            <div className="mx-4 grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'OK',         value: completed,  icon: CheckCircle, bg: '#dcfce7', ic: '#16a34a', nc: '#15803d' },
                { label: 'En cours',   value: inProgress, icon: Timer,       bg: '#e0e7ff', ic: '#6366f1', nc: '#4338ca' },
                { label: 'Bloqué',     value: blocked,    icon: AlertCircle, bg: '#fef3c7', ic: '#d97706', nc: '#b45309' },
                { label: 'En attente', value: pending,    icon: Clock,       bg: '#f0fdf4', ic: '#6b7280', nc: '#374151' },
              ].map(({ label, value, icon: Icon, bg, ic, nc }) => (
                <div key={label} className="rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm"
                  style={{ backgroundColor: bg }}>
                  <Icon size={18} style={{ color: ic }} />
                  <span className="text-xl font-extrabold" style={{ color: nc }}>{String(value).padStart(2, '0')}</span>
                  <span className="text-xs font-semibold text-center leading-tight" style={{ color: nc, opacity: .75 }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Par collaborateur (today only) */}
            {tab === 'today' && Object.keys(byCollab).length > 0 && (
              <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                <p className="text-sm font-bold text-gray-800 mb-3">Tâches du jour — par collaborateur</p>
                <div className="space-y-3">
                  {Object.entries(byCollab).map(([email, { total: t, done: d }]) => {
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

            {/* Task list */}
            <div className="mx-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800 text-sm">
                  {tab === 'today' ? "Tâches d'aujourd'hui" : 'Tâches à venir'}
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
                    const canDelete = task.createdBy?.uid === user?.uid;
                    return (
                      <div key={task.id}
                        onClick={() => navigate('/task/' + task.id, { state: { task } })}
                        className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${sc.border} cursor-pointer hover:shadow-md transition-all flex items-center gap-3`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
                          <ClipboardList size={16} className={sc.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-400"><Flag size={10} /> {task.priority || 'Moyen'}</span>
                            {task.assignedTo?.email && (
                              <span className="flex items-center gap-1 text-xs text-gray-400 truncate"><User size={10} /> {task.assignedTo.email}</span>
                            )}
                            {task.dueDate && <span className="text-xs text-gray-300">{task.dueDate}</span>}
                          </div>
                          {(task.startedAt || task.completedAt || task.blockedAt) && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {fmtHour(task.startedAt) && <span className="text-xs text-blue-500 font-semibold">▶ {fmtHour(task.startedAt)}</span>}
                              {fmtHour(task.completedAt) && <span className="text-xs text-green-600 font-semibold">⏹ {fmtHour(task.completedAt)}</span>}
                              {fmtHour(task.blockedAt) && <span className="text-xs text-amber-600 font-semibold">⚠ {fmtHour(task.blockedAt)}</span>}
                              {fmtDuration(task.startedAt, task.completedAt) && (
                                <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded-full">⏱ {fmtDuration(task.startedAt, task.completedAt)}</span>
                              )}
                              {!fmtHour(task.completedAt) && fmtDuration(task.startedAt, task.blockedAt) && (
                                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">⏱ {fmtDuration(task.startedAt, task.blockedAt)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                        {canDelete && (
                          <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Supprimer cette tâche ?')) deleteTask(task.id); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
