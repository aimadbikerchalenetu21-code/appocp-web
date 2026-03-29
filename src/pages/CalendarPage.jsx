import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToAgentTasks, subscribeToResponsableTasks } from '../services/firestoreService';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const STATUS_CHIP = {
  completed:     'bg-green-50 text-green-700',
  'in-progress': 'bg-blue-50 text-blue-700',
  blocked:       'bg-amber-50 text-amber-700',
  pending:       'bg-gray-100 text-gray-600',
};
const STATUS_LABEL = {
  completed: 'Terminé', 'in-progress': 'En cours', blocked: 'Bloqué', pending: 'En attente',
};

function tsToDateStr(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function getTaskDate(task) {
  if (task.dueDate && task.dueDate.length === 10) {
    // dueDate stored as YYYY-MM-DD (input[type=date]) or DD/MM/YYYY
    if (task.dueDate.includes('/')) {
      const [dd, mm, yyyy] = task.dueDate.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return task.dueDate;
  }
  return tsToDateStr(task.createdAt);
}

function toYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(toYMD(today.getFullYear(), today.getMonth(), today.getDate()));

  useEffect(() => {
    if (!user) return;
    if (role === 'responsable') return subscribeToResponsableTasks(user.email, setTasks);
    return subscribeToAgentTasks(user.uid, setTasks);
  }, [user, role]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  // Build calendar grid (Mon-first)
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const tasksByDate = {};
  tasks.forEach((t) => {
    const key = getTaskDate(t);
    if (key) { if (!tasksByDate[key]) tasksByDate[key] = []; tasksByDate[key].push(t); }
  });

  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());
  const tasksForSelected = tasksByDate[selectedDay] || [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="rounded-2xl p-5 mb-6 shadow-md"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Calendrier</h1>
        <p className="text-green-200 text-sm mt-0.5">Tâches par jour</p>
      </div>

      {/* Month nav */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -translate-y-8 translate-x-8"
          style={{ background: 'radial-gradient(circle, #16a34a, transparent)' }} />
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="font-bold text-gray-800">{MONTHS_FR[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_FR.map((d) => (
            <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const ymd = toYMD(year, month, day);
            const count = tasksByDate[ymd]?.length || 0;
            const isToday    = ymd === todayStr;
            const isSelected = ymd === selectedDay;
            return (
              <button key={ymd} onClick={() => setSelectedDay(ymd)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-semibold transition-all ${
                  isSelected ? 'text-white shadow-md' :
                  isToday    ? 'border-2 border-green-600 text-green-700' :
                               'hover:bg-green-50 text-gray-700'
                }`}
                style={isSelected ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
                {day}
                {count > 0 && (
                  <span className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isSelected ? 'bg-white text-green-700' : 'bg-green-600 text-white'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks for selected day */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-700 text-sm">
            {selectedDay === todayStr ? "Aujourd'hui" : selectedDay}
          </h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-semibold">
            {tasksForSelected.length} tâche{tasksForSelected.length !== 1 ? 's' : ''}
          </span>
        </div>

        {tasksForSelected.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <ClipboardList size={36} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune tâche ce jour</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasksForSelected.map((task) => (
              <div key={task.id}
                onClick={() => navigate('/task/' + task.id, { state: { task } })}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${STATUS_CHIP[task.status] || 'bg-gray-50'}`}>
                  <ClipboardList size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{task.title}</p>
                  {task.zone && <p className="text-xs text-gray-400 truncate">{task.zone}</p>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_CHIP[task.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[task.status] || task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
