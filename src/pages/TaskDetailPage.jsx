import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateTaskStatus, createNotification } from '../services/firestoreService';
import { ClipboardList, MapPin, Flag, User, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

const STATUS = {
  completed:     { label: 'Terminé',    color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-400' },
  'in-progress': { label: 'En cours',   color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-400' },
  blocked:       { label: 'Bloqué',     color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-400' },
  pending:       { label: 'En attente', color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-300' },
};

const PRIORITY_COLORS = {
  Faible: 'bg-gray-100 text-gray-600', Moyen: 'bg-blue-50 text-blue-600',
  Élevé: 'bg-orange-50 text-orange-600', Critique: 'bg-red-50 text-red-600',
  Low: 'bg-gray-100 text-gray-600', Medium: 'bg-blue-50 text-blue-600',
  High: 'bg-orange-50 text-orange-600', Critical: 'bg-red-50 text-red-600',
};

export default function TaskDetailPage() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const task = location.state?.task;

  const [status, setStatus]             = useState(task?.status || 'pending');
  const [selectedAction, setSelectedAction] = useState(null);
  const [blockedDesc, setBlockedDesc]   = useState('');
  const [descError, setDescError]       = useState('');
  const [loading, setLoading]           = useState(false);

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Tâche introuvable.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary text-sm font-semibold">Retour</button>
      </div>
    );
  }

  const sc = STATUS[status] || STATUS.pending;
  const pc = PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-500';

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
    setStatus('completed');
    setSelectedAction(null);
    setLoading(false);
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
    setStatus('blocked');
    setSelectedAction(null);
    setLoading(false);
  };

  const isFinal = status === 'completed' || status === 'blocked';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <ArrowLeft size={15} /> Retour
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
            <ClipboardList size={22} className={sc.color} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-gray-800 leading-snug">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pc}`}>{task.priority}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
              {task.zone && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={11} /> {task.zone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h2 className="font-bold text-gray-700 text-sm mb-2">Description</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>
        </div>
      )}

      {/* Info grid */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 grid grid-cols-2 gap-4">
        {task.dueDate && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Date d'échéance</p>
            <p className="text-sm font-semibold text-gray-700">{task.dueDate}</p>
          </div>
        )}
        {task.assignedTo?.email && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><User size={11} />Intervenant</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{task.assignedTo.email}</p>
          </div>
        )}
        {task.createdBy?.email && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Créé par</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{task.createdBy.email}</p>
          </div>
        )}
        {task.priority && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Flag size={11} />Priorité</p>
            <p className="text-sm font-semibold text-gray-700">{task.priority}</p>
          </div>
        )}
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
                ? <><CheckCircle size={20} className="text-green-600" /><span className="font-bold text-green-700">Tâche terminée</span></>
                : <><AlertTriangle size={20} className="text-amber-600" /><span className="font-bold text-amber-700">Point bloquant signalé</span></>
              }
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 mb-3">Mettre à jour le statut</p>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => { setSelectedAction('ok'); setBlockedDesc(''); setDescError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                    selectedAction === 'ok' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}>
                  <CheckCircle size={16} /> OK
                </button>
                <button
                  onClick={() => { setSelectedAction('blocked'); setDescError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                    selectedAction === 'blocked' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}>
                  <AlertTriangle size={16} /> Point bloquant
                </button>
              </div>

              {selectedAction === 'ok' && (
                <button onClick={handleOK} disabled={loading}
                  className="w-full bg-green-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50">
                  {loading ? 'En cours...' : 'Confirmer — Tâche terminée'}
                </button>
              )}

              {selectedAction === 'blocked' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description du blocage *</label>
                  <textarea
                    value={blockedDesc}
                    onChange={(e) => { setBlockedDesc(e.target.value); setDescError(''); }}
                    rows={3}
                    placeholder="Décrivez le problème rencontré..."
                    className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none transition-colors ${
                      descError ? 'border-red-400' : 'border-gray-200 focus:border-amber-400'
                    }`}
                  />
                  {descError && <p className="text-red-500 text-xs mt-1">{descError}</p>}
                  <button onClick={handleSubmitBlocked} disabled={loading}
                    className="w-full mt-3 bg-amber-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50">
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
