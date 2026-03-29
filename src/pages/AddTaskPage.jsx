import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTask, createResponsableAccount, createNotification, getAllAgentNames } from '../services/firestoreService';
import { ClipboardList, User, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';

const PRIORITIES = ['Faible', 'Moyen', 'Élevé', 'Critique'];
const PRIORITY_COLORS = {
  Faible:   'bg-gray-100 text-gray-600',
  Moyen:    'bg-blue-50 text-blue-600',
  Élevé:   'bg-orange-50 text-orange-600',
  Critique: 'bg-red-50 text-red-600',
};

export default function AddTaskPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Moyen', zone: '', dueDate: '',
    responsableEmail: '', responsablePassword: '',
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [lastEmail, setLastEmail] = useState('');
  const [agents, setAgents]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    getAllAgentNames().then(setAgents).catch(() => {});
  }, []);

  const set = (k) => (e) => { setForm((p) => ({ ...p, [k]: e.target.value })); setError(''); };

  const emailSuggestions = agents.filter(
    (a) => a.email && form.responsableEmail && a.email.toLowerCase().includes(form.responsableEmail.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Le titre est obligatoire.'); return; }
    if (!form.responsableEmail.trim()) { setError('L\'email de l\'intervenant est obligatoire.'); return; }
    setLoading(true); setError('');
    try {
      // Check if responsable already exists; if not, create account
      const existingAgent = agents.find((a) => a.email?.toLowerCase() === form.responsableEmail.trim().toLowerCase());
      let responsableUid = existingAgent?.uid || null;

      if (!existingAgent) {
        if (!form.responsablePassword.trim()) {
          setError('Mot de passe requis pour créer un nouveau compte intervenant.'); setLoading(false); return;
        }
        const created = await createResponsableAccount(form.responsableEmail.trim(), form.responsablePassword);
        responsableUid = created.uid;
      }

      const taskData = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        zone: form.zone.trim(),
        dueDate: form.dueDate,
        assignedTo: { email: form.responsableEmail.trim().toLowerCase(), uid: responsableUid },
      };
      await createTask(taskData, { uid: user.uid, email: user.email });

      if (responsableUid) {
        await createNotification(responsableUid, {
          type: 'task-assigned',
          title: 'Nouvelle tâche assignée',
          message: `"${form.title.trim()}" vous a été assignée`,
          icon: 'clipboard-list', iconColor: '#2563eb', iconBg: '#eff6ff',
        });
      }

      setLastEmail(form.responsableEmail.trim());
      setSuccess(true);
    } catch (e) {
      if (e.message === 'EMAIL_EXISTS') setError('Cet email est déjà utilisé par un autre compte.');
      else setError('Erreur lors de la création de la tâche.');
    } finally { setLoading(false); }
  };

  const handleAnother = () => {
    setSuccess(false);
    setForm((p) => ({ ...p, title: '', description: '', zone: '', dueDate: '', responsablePassword: '', responsableEmail: lastEmail }));
  };

  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Tâche créée !</h2>
          <p className="text-gray-500 text-sm mb-6">La tâche a été assignée à <span className="font-semibold">{lastEmail}</span>.</p>
          <div className="flex flex-col gap-3">
            <button onClick={handleAnother}
              className="w-full bg-primary text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-900 transition-colors">
              Assigner une autre tâche au même intervenant
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-bold hover:bg-gray-200 transition-colors">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Nouvelle tâche</h1>
        <p className="text-gray-500 text-sm">Créer et assigner une tâche</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre de la tâche *</label>
          <input value={form.title} onChange={set('title')} placeholder="Ex : Inspection pompe P-101"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={3}
            placeholder="Détails de la procédure..."
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priorité</label>
          <div className="flex gap-2 flex-wrap">
            {PRIORITIES.map((p) => (
              <button key={p} onClick={() => setForm((f) => ({ ...f, priority: p }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  form.priority === p ? 'border-primary ' + PRIORITY_COLORS[p] : 'border-gray-100 bg-gray-50 text-gray-400'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Zone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zone / Localisation</label>
          <input value={form.zone} onChange={set('zone')} placeholder="Ex : Atelier A, Zone 3"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>

        {/* Due date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date d'échéance</label>
          <input type="date" value={form.dueDate} onChange={set('dueDate')}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>

        {/* Responsable email */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <User size={13} className="inline mr-1" />Email Intervenant externe *
          </label>
          <input value={form.responsableEmail} onChange={(e) => { set('responsableEmail')(e); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="intervenant@email.com"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
          {showSuggestions && emailSuggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
              {emailSuggestions.map((a) => (
                <button key={a.uid} onMouseDown={() => { setForm((f) => ({ ...f, responsableEmail: a.email })); setShowSuggestions(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <User size={13} className="text-gray-400" />
                  <span>{a.email}</span>
                  {a.name && <span className="text-gray-400 text-xs">({a.name})</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Password (only if new account) */}
        {form.responsableEmail && !agents.find((a) => a.email?.toLowerCase() === form.responsableEmail.trim().toLowerCase()) && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold mb-2">Nouvel intervenant — définir un mot de passe</p>
            <input type="password" value={form.responsablePassword} onChange={set('responsablePassword')}
              placeholder="Min. 6 caractères"
              className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors bg-white" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-primary text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <ClipboardList size={16} />
          {loading ? 'Création...' : 'Créer la tâche'}
        </button>
      </div>
    </div>
  );
}
