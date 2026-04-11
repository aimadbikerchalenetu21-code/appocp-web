import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTask, createResponsableAccount, getAllAgentNames } from '../services/firestoreService';
import {
  User, AlertCircle, CheckCircle, Tag, MapPin, FileText,
  Send, Plus, X, ChevronDown, ChevronUp, Flag,
} from 'lucide-react';

const PRIORITIES = ['Faible', 'Moyen', 'Élevé', 'Critique'];
const PRIORITY_STYLES = {
  Faible:   { chip: 'bg-green-50 text-green-700 border-green-400',  dot: 'bg-green-500' },
  Moyen:    { chip: 'bg-blue-50 text-blue-700 border-blue-400',     dot: 'bg-blue-500' },
  Élevé:   { chip: 'bg-orange-50 text-orange-700 border-orange-400', dot: 'bg-orange-500' },
  Critique: { chip: 'bg-red-50 text-red-700 border-red-400',        dot: 'bg-red-500' },
};

const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDateStrip() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

let _id = 0;
const uid = () => ++_id;

function makeTask() {
  return { id: uid(), title: '', priority: 'Moyen', zone: '', assetTags: '', procedure: '', expanded: true };
}

/* ── Small priority picker ─────────────────────────────────────────── */
function PriorityPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRIORITIES.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
            value === p ? PRIORITY_STYLES[p].chip + ' border-2' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
          }`}>
          {p}
        </button>
      ))}
    </div>
  );
}

/* ── Task card ─────────────────────────────────────────────────────── */
function TaskCard({ task, onUpdate, onRemove }) {
  const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Moyen;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ps.dot}`} />
        <input
          value={task.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Titre de la tâche..."
          className="flex-1 text-sm font-semibold text-gray-800 outline-none placeholder-gray-300 bg-transparent"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onUpdate({ expanded: !task.expanded })}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
            {task.expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button onClick={onRemove}
            className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Expanded properties */}
      {task.expanded && (
        <div className="border-t border-gray-50 px-4 py-4 space-y-3 bg-gray-50/50">
          {/* Priority */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
              <Flag size={11} /> Priorité
            </p>
            <PriorityPicker value={task.priority} onChange={(v) => onUpdate({ priority: v })} />
          </div>

          {/* Zone */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
              <MapPin size={11} /> Zone
            </p>
            <input value={task.zone} onChange={(e) => onUpdate({ zone: e.target.value })}
              placeholder="Ex: Zone A - Ligne 4"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 transition-colors bg-white" />
          </div>

          {/* Asset tags */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
              <Tag size={11} /> Tags équipement
            </p>
            <input value={task.assetTags} onChange={(e) => onUpdate({ assetTags: e.target.value })}
              placeholder="Ex: PH-220, Conv-A3..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 transition-colors bg-white" />
          </div>

          {/* Procedure */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
              <FileText size={11} /> Description de la procédure
            </p>
            <textarea value={task.procedure} onChange={(e) => onUpdate({ procedure: e.target.value })}
              rows={3} placeholder="Décrivez la procédure à suivre..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 transition-colors resize-none bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function AddTaskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks]               = useState([makeTask()]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [responsableEmail, setResponsableEmail]     = useState('');
  const [responsablePassword, setResponsablePassword] = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [credentials, setCredentials]   = useState(null);
  const [agents, setAgents]             = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef  = useRef(null);
  const dateStrip = buildDateStrip();
  const todayYMD  = toYMD(new Date());

  useEffect(() => { getAllAgentNames().then(setAgents).catch(() => {}); }, []);

  /* ── Task management ──────────────────────────────────────────────── */
  const addTask = () => {
    const title = currentInput.trim();
    setCurrentInput('');
    if (title) {
      // fill title into last empty task, or create new
      setTasks((prev) => {
        const last = prev[prev.length - 1];
        if (last && !last.title) {
          return prev.map((t) => t.id === last.id ? { ...t, title } : t);
        }
        return [...prev.map((t) => ({ ...t, expanded: false })), { ...makeTask(), title }];
      });
    } else {
      // add a blank task card
      setTasks((prev) => [...prev.map((t) => ({ ...t, expanded: false })), makeTask()]);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
  };

  const updateTask = (id, patch) =>
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));

  const removeTask = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  /* ── Autocomplete ─────────────────────────────────────────────────── */
  const emailSuggestions = agents.filter(
    (a) => a.email && responsableEmail && a.email.toLowerCase().includes(responsableEmail.toLowerCase())
  );
  const isExistingAgent = !!agents.find(
    (a) => a.email?.toLowerCase() === responsableEmail.trim().toLowerCase()
  );

  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    // flush input
    let allTasks = [...tasks];
    if (currentInput.trim()) {
      allTasks = [...tasks, { ...makeTask(), title: currentInput.trim() }];
      setCurrentInput('');
    }

    const validTasks = allTasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) { setError('Ajoutez au moins une tâche avec un titre.'); return; }
    if (!responsableEmail.trim()) { setError("L'email de l'intervenant est obligatoire."); return; }

    setLoading(true); setError('');
    try {
      let responsableUid = agents.find(
        (a) => a.email?.toLowerCase() === responsableEmail.trim().toLowerCase()
      )?.uid || null;

      if (!isExistingAgent) {
        if (!responsablePassword.trim()) {
          setError('Mot de passe requis pour créer un nouveau compte intervenant.');
          setLoading(false); return;
        }
        try {
          const created = await createResponsableAccount(responsableEmail.trim(), responsablePassword);
          responsableUid = created.uid;
        } catch (e) {
          if (e.message !== 'EMAIL_EXISTS') throw e;
        }
      }

      await Promise.all(
        validTasks.map((task) =>
          createTask(
            {
              title:     task.title.trim(),
              procedure: task.procedure.trim(),
              priority:  task.priority,
              zone:      task.zone.trim(),
              assetTags: task.assetTags.trim(),
              dueDate:   selectedDate,
              assignedTo: { email: responsableEmail.trim().toLowerCase(), uid: responsableUid || '' },
            },
            { uid: user.uid, email: user.email }
          )
        )
      );

      setCredentials({
        email:      responsableEmail.trim(),
        password:   isExistingAgent ? null : responsablePassword,
        isExisting: isExistingAgent,
        count:      validTasks.length,
      });
    } catch (e) {
      if (e.message === 'EMAIL_EXISTS') setError('Cet email est déjà utilisé par un autre compte.');
      else setError('Erreur lors de la création des tâches.');
    } finally { setLoading(false); }
  };

  const resetForm = (keepEmail = '') => {
    setCredentials(null);
    setTasks([makeTask()]);
    setCurrentInput('');
    setSelectedDate(todayYMD);
    setResponsableEmail(keepEmail);
    setResponsablePassword('');
  };

  /* ── Success screen ───────────────────────────────────────────────── */
  if (credentials) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            {credentials.count} tâche{credentials.count > 1 ? 's créées' : ' créée'} !
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {credentials.isExisting ? 'Assignées au compte existant.' : 'Assignées à l\'intervenant externe.'}
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Intervenant</p>
            <div className="flex items-center gap-2 mb-1.5">
              <User size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">{credentials.email}</span>
            </div>
            {!credentials.isExisting && credentials.password && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">🔒</span>
                <span className="text-sm font-semibold text-gray-700">{credentials.password}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {!credentials.isExisting && (
              <button onClick={() => {
                const s = encodeURIComponent('Vos identifiants — Suivi des Travaux Journaliers');
                const b = encodeURIComponent(`Email: ${credentials.email}\nMot de passe: ${credentials.password}`);
                window.open(`mailto:${credentials.email}?subject=${s}&body=${b}`);
              }} className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg, #415d96, #2f4c84)' }}>
                <Send size={16} /> Envoyer par Email
              </button>
            )}
            <button onClick={() => resetForm(credentials.email)}
              className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold shadow-md hover:scale-[1.01] transition-all"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <Plus size={16} /> Assigner d'autres tâches
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-bold hover:bg-gray-200 transition-colors">
              Terminer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validCount = tasks.filter((t) => t.title.trim()).length + (currentInput.trim() ? 1 : 0);

  /* ── Form ─────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="rounded-2xl p-5 mb-6 shadow-md"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Nouvelle tâche</h1>
        <p className="text-green-200 text-sm mt-0.5">Créer et assigner</p>
      </div>

      <div className="space-y-4">

        {/* ── Task list ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Tâches *{' '}
              <span className="text-gray-400 font-normal">({tasks.filter(t => t.title.trim()).length})</span>
            </label>
            <button onClick={() => setTasks((p) => [...p.map((t) => ({ ...t, expanded: false })), makeTask()])}
              className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:text-green-600 transition-colors">
              <Plus size={13} /> Ajouter une tâche
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task}
                onUpdate={(patch) => updateTask(task.id, patch)}
                onRemove={() => removeTask(task.id)} />
            ))}
          </div>

          {/* Quick-add input */}
          <div className="mt-2 flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-green-400 transition-colors">
            <Plus size={15} className="text-gray-300 flex-shrink-0" />
            <input ref={inputRef} value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ajouter une tâche... (Entrée pour confirmer)"
              className="flex-1 text-sm text-gray-600 outline-none bg-transparent placeholder-gray-300" />
          </div>
        </div>

        {/* ── Date strip ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">📅 Date planifiée *</label>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {dateStrip.map((d) => {
              const ymd   = toYMD(d);
              const isSel = ymd === selectedDate;
              const isToday = ymd === todayYMD;
              return (
                <button key={ymd} onClick={() => setSelectedDate(ymd)}
                  className={`flex-shrink-0 flex flex-col items-center w-14 py-2.5 rounded-xl border-2 transition-all ${
                    isSel ? 'text-white border-transparent shadow-md' :
                    isToday ? 'border-green-500 text-green-700' :
                    'border-gray-100 text-gray-600 hover:border-green-300 hover:bg-green-50'
                  }`}
                  style={isSel ? { background: 'linear-gradient(135deg, #166534, #16a34a)' } : {}}>
                  <span className="text-xs font-medium opacity-80">{DAYS_FR[d.getDay()]}</span>
                  <span className="text-lg font-extrabold leading-tight">{d.getDate()}</span>
                  <span className="text-xs font-medium opacity-70">{MONTHS_FR[d.getMonth()]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Assign to intervenant ─────────────────────────────────── */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 space-y-3">
          <p className="text-sm font-bold text-blue-700">
            <User size={13} className="inline mr-1" />Assigner à un Intervenant externe *
          </p>
          <div className="relative">
            <input value={responsableEmail}
              onChange={(e) => { setResponsableEmail(e.target.value); setShowSuggestions(true); setError(''); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Email de l'intervenant"
              className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 transition-colors bg-white" />
            {showSuggestions && emailSuggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                {emailSuggestions.map((a) => (
                  <button key={a.uid} onMouseDown={() => { setResponsableEmail(a.email); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <User size={13} className="text-gray-400" />{a.email}
                    {a.name && <span className="text-gray-400 text-xs">({a.name})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {responsableEmail && !isExistingAgent && (
            <div>
              <p className="text-xs text-blue-600 mb-2">Laisser vide si l'intervenant a déjà un compte</p>
              <input type="password" value={responsablePassword}
                onChange={(e) => { setResponsablePassword(e.target.value); setError(''); }}
                placeholder="Mot de passe (nouveau compte)"
                className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 transition-colors bg-white" />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────── */}
        <button onClick={handleSubmit} disabled={loading || validCount === 0}
          className="w-full text-white rounded-2xl py-4 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #1c3b72, #0f2347)' }}>
          <Send size={16} />
          {loading ? 'Création en cours...' : validCount > 0 ? `Créer ${validCount} tâche${validCount > 1 ? 's' : ''}` : 'Créer les tâches'}
        </button>
      </div>
    </div>
  );
}
