import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateTaskStatus, createNotification, addTaskOperator, deleteTask } from '../services/firestoreService';

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
import {
  ClipboardList, Flag, User, CheckCircle, AlertTriangle, ArrowLeft,
  Cog, CheckSquare, Square, Camera, X, UserPlus, Trash2,
} from 'lucide-react';

const STATUS = {
  completed:     { label: 'Terminé',    color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-400' },
  'in-progress': { label: 'En cours',   color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-400' },
  blocked:       { label: 'Bloqué',     color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-400' },
  pending:       { label: 'En attente', color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-300' },
};

const PRIORITY_COLORS = {
  Faible:   { text: 'text-green-700',  bg: 'bg-green-50' },
  Moyen:    { text: 'text-blue-700',   bg: 'bg-blue-50' },
  Élevé:   { text: 'text-orange-700', bg: 'bg-orange-50' },
  Critique: { text: 'text-red-700',   bg: 'bg-red-50' },
  Low:      { text: 'text-green-700',  bg: 'bg-green-50' },
  Medium:   { text: 'text-blue-700',   bg: 'bg-blue-50' },
  High:     { text: 'text-orange-700', bg: 'bg-orange-50' },
  Critical: { text: 'text-red-700',   bg: 'bg-red-50' },
};

export default function TaskDetailPage() {
  const { role, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const task = location.state?.task;
  const fileInputRef = useRef(null);

  // Build checklist from procedure (each non-empty line = one step)
  const initialChecklist = task?.procedure
    ? task.procedure.split('\n').filter((l) => l.trim()).map((label, i) => ({ id: i, label: label.trim(), done: false }))
    : [];

  const [checklist, setChecklist] = useState(initialChecklist);
  const [status, setStatus]       = useState(task?.status || 'pending');
  const [selectedAction, setSelectedAction] = useState(null);
  const [blockedDesc, setBlockedDesc]   = useState('');
  const [descError, setDescError]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [images, setImages]             = useState([]);

  // Operators
  const [operators, setOperators]           = useState(task?.operators || []);
  const [showAddOp, setShowAddOp]           = useState(false);
  const [newOpEmail, setNewOpEmail]         = useState('');
  const [addingOp, setAddingOp]             = useState(false);
  const [opError, setOpError]               = useState('');

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Tâche introuvable.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-green-600 text-sm font-semibold">Retour</button>
      </div>
    );
  }

  const sc = STATUS[status] || STATUS.pending;
  const pc = PRIORITY_COLORS[task.priority] || { text: 'text-gray-600', bg: 'bg-gray-100' };
  const taskShortId = task.id ? task.id.slice(-6).toUpperCase() : '';

  const completedCount = checklist.filter((i) => i.done).length;
  const completionPct  = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  const toggleCheck = (id) =>
    setChecklist((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));

  const handleOK = async () => {
    setLoading(true);
    await updateTaskStatus(task.id, 'completed');
    if (task.createdBy?.uid) {
      await createNotification(task.createdBy.uid, {
        type: 'task-completed', taskId: task.id, taskTitle: task.title,
        title: 'Tâche terminée',
        message: `"${task.title}" a été terminée par l'intervenant externe`,
        icon: 'check-circle', iconColor: '#16a34a', iconBg: '#dcfce7',
      });
    }
    setStatus('completed'); setSelectedAction(null); setLoading(false);
  };

  const handleAddOperator = async () => {
    const email = newOpEmail.trim().toLowerCase();
    if (!email) { setOpError('Email requis.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setOpError('Email invalide.'); return; }
    if (operators.includes(email)) { setOpError('Cet intervenant est déjà ajouté.'); return; }
    setAddingOp(true); setOpError('');
    await addTaskOperator(task.id, email);
    setOperators((prev) => [...prev, email]);
    setNewOpEmail(''); setShowAddOp(false); setAddingOp(false);
  };

  const handleSubmitBlocked = async () => {
    if (!blockedDesc.trim()) { setDescError('La description est obligatoire.'); return; }
    setLoading(true);
    await updateTaskStatus(task.id, 'blocked', { blockedReason: blockedDesc.trim() });
    if (task.createdBy?.uid) {
      await createNotification(task.createdBy.uid, {
        type: 'task-blocked', taskId: task.id, taskTitle: task.title,
        title: 'Point bloquant signalé',
        message: `"${task.title}" est bloquée : ${blockedDesc.trim()}`,
        icon: 'alert-triangle', iconColor: '#d97706', iconBg: '#fef3c7',
      });
    }
    setStatus('blocked'); setSelectedAction(null); setLoading(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
    e.target.value = '';
  };

  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const isFinal = status === 'completed' || status === 'blocked';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-base font-extrabold text-white flex-1">Détails de la tâche</h1>
        {/* Delete button — only for agent who created the task */}
        {role === 'agent' && task.createdBy?.uid === user?.uid && (
          <button onClick={() => {
            if (window.confirm('Supprimer cette tâche définitivement ?')) {
              deleteTask(task.id);
              navigate(-1);
            }
          }} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors flex-shrink-0">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-6 px-4 pt-4 space-y-3">

        {/* Task ID + title */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          {taskShortId && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg mb-2 inline-block">
              Tâche #{taskShortId}
            </span>
          )}
          <h1 className="text-lg font-extrabold text-gray-800 mt-1">{task.title}</h1>
        </div>

        {/* Progression */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Progression</span>
            <span className="text-sm font-extrabold text-blue-600">{completionPct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)' }} />
          </div>
          {checklist.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {checklist.map((item) => (
                <button key={item.id} onClick={() => toggleCheck(item.id)}
                  className="w-full flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors text-left">
                  {item.done
                    ? <CheckSquare size={16} className="text-green-600 flex-shrink-0" />
                    : <Square size={16} className="text-gray-300 flex-shrink-0" />}
                  <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Détails de l'équipement */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Cog size={15} className="text-green-600" />
            <h2 className="font-bold text-gray-700 text-sm">Détails de l'équipement</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              ['Equipement',         task.assetTags || task.ordre || '—'],
              ['Localisation',       task.objTechnique || task.zone || '—'],
              ['Date planifiée',     task.dueDate    || '—'],
              ['Intervenant assigné', task.assignedTo?.email || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm font-semibold text-gray-700 text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}

            {/* Timing rows */}
            {fmtHour(task.startedAt) && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">▶ Heure de départ</span>
                <span className="text-sm font-bold text-blue-600">{fmtHour(task.startedAt)}</span>
              </div>
            )}
            {fmtHour(task.completedAt) && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">⏹ Heure de fin</span>
                <span className="text-sm font-bold text-green-600">{fmtHour(task.completedAt)}</span>
              </div>
            )}
            {fmtHour(task.blockedAt) && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">⚠ Heure de blocage</span>
                <span className="text-sm font-bold text-amber-600">{fmtHour(task.blockedAt)}</span>
              </div>
            )}
            {fmtDuration(task.startedAt, task.completedAt) && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">⏱ Durée</span>
                <span className="text-sm font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {fmtDuration(task.startedAt, task.completedAt)}
                </span>
              </div>
            )}
            {!fmtHour(task.completedAt) && fmtDuration(task.startedAt, task.blockedAt) && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-400">⏱ Durée avant blocage</span>
                <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                  {fmtDuration(task.startedAt, task.blockedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Intervenants externes ayant opéré — visible to all roles */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} className="text-green-600" />
            <h2 className="font-bold text-gray-700 text-sm">Intervenants externes ayant opéré</h2>
          </div>

          {/* Primary assignee */}
          {task.assignedTo?.email && (
            <div className="flex items-center gap-2 py-2 border-b border-gray-50">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                {task.assignedTo.email[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-700">{task.assignedTo.email}</span>
              <span className="ml-auto text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">Assigné</span>
            </div>
          )}

          {/* Additional operators */}
          {operators.length === 0 && !task.assignedTo?.email && (
            <p className="text-xs text-gray-400 text-center py-2">Aucun intervenant enregistré.</p>
          )}
          {operators.map((email) => (
            <div key={email} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                {email[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-700">{email}</span>
            </div>
          ))}

          {/* Add operator — only for responsable */}
          {role === 'responsable' && (
            <>
              {!showAddOp ? (
                <button onClick={() => setShowAddOp(true)}
                  className="w-full mt-2 border border-dashed border-blue-200 rounded-xl py-2.5 text-sm text-blue-500 font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
                  <UserPlus size={14} /> Ajouter un intervenant
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    type="email"
                    value={newOpEmail}
                    onChange={(e) => { setNewOpEmail(e.target.value); setOpError(''); }}
                    placeholder="Email de l'intervenant"
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition-colors"
                    autoFocus
                  />
                  {opError && <p className="text-xs text-red-500">{opError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleAddOperator} disabled={addingOp}
                      className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      {addingOp ? 'Ajout...' : 'Confirmer'}
                    </button>
                    <button onClick={() => { setShowAddOp(false); setNewOpEmail(''); setOpError(''); }}
                      className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Blocked reason */}
        {status === 'blocked' && task.blockedReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-amber-700">⚠ Point bloquant signalé</p>
              {fmtHour(task.blockedAt) && (
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  {fmtHour(task.blockedAt)}
                </span>
              )}
            </div>
            <p className="text-sm text-amber-800">{task.blockedReason}</p>
          </div>
        )}
      </div>

      {/* ── Bottom action area (responsable only) ─────────────────────── */}
      {role === 'responsable' && (
        <div className="flex-shrink-0 bg-white border-t border-gray-100">
          {isFinal ? (
            <div className={`flex items-center justify-center gap-3 py-5 ${status === 'completed' ? 'bg-green-50' : 'bg-amber-50'}`}>
              {status === 'completed'
                ? <><CheckCircle size={20} className="text-green-600" /><span className="font-bold text-green-700">Tâche terminée avec succès</span></>
                : <><AlertTriangle size={20} className="text-amber-600" /><span className="font-bold text-amber-700">Point bloquant signalé</span></>
              }
            </div>
          ) : (
            <>
              {/* OK + Point Bloquant buttons */}
              <div className="flex">
                <button onClick={handleOK} disabled={loading || status !== 'in-progress'}
                  className="flex-1 flex items-center justify-center gap-2 py-5 text-sm font-extrabold transition-all"
                  style={{
                    color: status !== 'in-progress' ? '#d1d5db' : 'white',
                    background: status !== 'in-progress' ? '#f3f4f6' : 'linear-gradient(135deg, #16a34a, #15803d)',
                    cursor: status !== 'in-progress' ? 'not-allowed' : 'pointer',
                  }}>
                  <CheckCircle size={18} /> OK
                </button>
                <button
                  onClick={() => { if (status !== 'in-progress') return; setSelectedAction(selectedAction === 'blocked' ? null : 'blocked'); setDescError(''); }}
                  disabled={status !== 'in-progress'}
                  className="flex-1 flex items-center justify-center gap-2 py-5 text-sm font-extrabold transition-all"
                  style={{
                    color: status !== 'in-progress' ? '#d1d5db' : 'white',
                    background: status !== 'in-progress'
                      ? '#f3f4f6'
                      : selectedAction === 'blocked'
                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    cursor: status !== 'in-progress' ? 'not-allowed' : 'pointer',
                  }}>
                  <AlertTriangle size={18} /> Point Bloquant
                </button>
              </div>

              {/* Blocking point form */}
              {selectedAction === 'blocked' && (
                <div className="bg-amber-50 border-t border-amber-200 px-4 pt-4 pb-6">
                  <label className="block text-sm font-bold text-amber-800 mb-2">
                    Description du point bloquant *
                  </label>
                  <textarea
                    value={blockedDesc}
                    onChange={(e) => { setBlockedDesc(e.target.value); setDescError(''); }}
                    rows={4}
                    placeholder="Décrivez le problème rencontré..."
                    className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none bg-white mb-2 ${
                      descError ? 'border-red-400' : 'border-amber-200 focus:border-amber-400'
                    }`}
                  />
                  {descError && <p className="text-red-500 text-xs mb-2">{descError}</p>}

                  <label className="block text-sm font-bold text-amber-800 mb-2">Photos (optionnel)</label>
                  {images.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {images.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-amber-200">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(i)}
                            className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 text-white">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange}
                    accept="image/*" multiple className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-amber-300 bg-white rounded-xl py-4 flex flex-col items-center gap-1 text-amber-500 hover:bg-amber-50 transition-colors mb-3">
                    <Camera size={22} />
                    <span className="text-xs font-bold">Ajouter une photo</span>
                    <span className="text-xs text-gray-400">Caméra ou galerie</span>
                  </button>

                  <button onClick={handleSubmitBlocked} disabled={loading}
                    className="w-full text-white rounded-xl py-4 text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    {loading ? 'En cours...' : '▶ Signaler et terminer'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
