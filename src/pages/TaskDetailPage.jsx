import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateTaskStatus, createNotification } from '../services/firestoreService';
import {
  ClipboardList, MapPin, Flag, User, CheckCircle, AlertTriangle, ArrowLeft,
  Cog, CheckSquare, Square, Camera, X,
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
  const { role } = useAuth();
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
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <ArrowLeft size={15} /> Retour
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {taskShortId && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg">
              Tâche #{taskShortId}
            </span>
          )}
          {task.priority && (
            <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${pc.bg} ${pc.text}`}>
              <Flag size={11} /> {task.priority}
            </span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
            {sc.label}
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-gray-800 leading-snug mb-2">{task.title}</h1>
        {task.procedure && (
          <p className="text-sm text-gray-500 leading-relaxed">{task.procedure}</p>
        )}
      </div>

      {/* Progress / Checklist */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700 text-sm">Progression</h2>
            <span className="text-lg font-extrabold text-green-600">{completionPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)' }} />
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button key={item.id} onClick={() => toggleCheck(item.id)}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                {item.done
                  ? <CheckSquare size={18} className="text-green-600 flex-shrink-0" />
                  : <Square size={18} className="text-gray-300 flex-shrink-0" />
                }
                <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Asset details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Cog size={16} className="text-green-600" />
          <h2 className="font-bold text-gray-700 text-sm">Détails de l'équipement</h2>
        </div>
        <div className="space-y-3">
          {[
            ['Équipement',         task.assetTags  || '—'],
            ['Localisation',       task.zone       || '—'],
            ['Date limite',        task.dueDate    || '—'],
            ['Intervenant assigné', task.assignedTo?.email || '—'],
            ['Créé par',           task.createdBy?.email  || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-gray-700 text-right max-w-[60%] truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked reason (if blocked) */}
      {status === 'blocked' && task.blockedReason && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-amber-700 mb-1">Point bloquant</p>
          <p className="text-sm text-amber-800">{task.blockedReason}</p>
        </div>
      )}

      {/* Actions (only for responsable role) */}
      {role === 'responsable' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {isFinal ? (
            <div className={`flex items-center justify-center gap-3 rounded-xl py-4 ${status === 'completed' ? 'bg-green-50' : 'bg-amber-50'}`}>
              {status === 'completed'
                ? <><CheckCircle size={20} className="text-green-600" /><span className="font-bold text-green-700">Tâche terminée avec succès</span></>
                : <><AlertTriangle size={20} className="text-amber-600" /><span className="font-bold text-amber-700">Point bloquant signalé</span></>
              }
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 mb-3">Mettre à jour le statut</p>
              <div className="flex gap-3 mb-4">
                {/* OK button */}
                <button onClick={handleOK} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-extrabold text-white transition-all hover:shadow-lg hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.35)' }}>
                  <CheckCircle size={18} /> OK
                </button>
                {/* Point Bloquant button */}
                <button
                  onClick={() => { setSelectedAction(selectedAction === 'blocked' ? null : 'blocked'); setDescError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-extrabold text-white transition-all hover:shadow-lg ${
                    selectedAction === 'blocked' ? 'scale-[0.98]' : 'hover:scale-[1.01]'
                  }`}
                  style={{
                    background: selectedAction === 'blocked'
                      ? 'linear-gradient(135deg, #d97706, #b45309)'
                      : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
                  }}>
                  <AlertTriangle size={18} /> Point Bloquant
                </button>
              </div>

              {selectedAction === 'blocked' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-amber-800 mb-2">
                    Description du point bloquant *
                  </label>
                  <textarea
                    value={blockedDesc}
                    onChange={(e) => { setBlockedDesc(e.target.value); setDescError(''); }}
                    rows={4}
                    placeholder="Décrivez le problème rencontré..."
                    className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none transition-colors bg-white mb-3 ${
                      descError ? 'border-red-400' : 'border-amber-200 focus:border-amber-400'
                    }`}
                  />
                  {descError && <p className="text-red-500 text-xs mb-3">{descError}</p>}

                  {/* Photo upload */}
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
                    className="w-full border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl py-4 flex flex-col items-center gap-1 text-amber-600 hover:bg-amber-100 transition-colors mb-3">
                    <Camera size={22} />
                    <span className="text-xs font-bold">Ajouter une photo</span>
                    <span className="text-xs text-gray-400">Depuis votre appareil</span>
                  </button>

                  <button onClick={handleSubmitBlocked} disabled={loading}
                    className="w-full bg-amber-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? 'En cours...' : 'Signaler le point bloquant'}
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
