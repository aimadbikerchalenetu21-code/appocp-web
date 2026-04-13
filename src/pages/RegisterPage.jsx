import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { registerAgent } from '../services/firestoreService';
import { Eye, EyeOff, User, Mail, Lock, Check, AlertCircle, ArrowLeft, HardHat } from 'lucide-react';

function PasswordStrength({ password }) {
  const score = [/.{6,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const levels = [
    { label: 'Très faible', color: '#ef4444' },
    { label: 'Faible',      color: '#f97316' },
    { label: 'Moyen',       color: '#eab308' },
    { label: 'Fort',        color: '#22c55e' },
    { label: 'Très fort',   color: '#16a34a' },
  ];
  if (!password) return null;
  const { label, color } = levels[score] || levels[0];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? color : '#e5e7eb' }} />
        ))}
      </div>
      <p className="text-[11px] font-semibold" style={{ color }}>{label}</p>
    </div>
  );
}

export default function RegisterPage() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [showCnf, setShowCnf]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const set = (k) => (e) => { setForm((p) => ({ ...p, [k]: e.target.value })); setError(''); };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError('Veuillez remplir tous les champs.'); return;
    }
    if (form.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true); setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await registerAgent({ uid: cred.user.uid, name: form.name.trim(), email: form.email.trim() });
      setSuccess(true);
      setRole('agent');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé.',
        'auth/invalid-email':        'Adresse email invalide.',
        'auth/weak-password':        'Mot de passe trop faible.',
      };
      setError(msgs[e.code] || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  const pwdMatch = form.confirm && form.password === form.confirm;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #1a7a3c 0%, #1db954 50%, #159a3e 100%)' }}>

      <div className="w-full max-w-sm">

        {/* Logo + title */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden shadow-2xl border-4 border-white/30"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' }}>
            <img src="/ocp-logo.svg" alt="OCP" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">OCP Groupe</h1>
          <p className="text-green-100 text-sm mt-0.5">Créer votre compte collaborateur</p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
            <HardHat size={11} /> Collaborateur OCP
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">

          <h2 className="text-xl font-extrabold text-gray-900 mb-0.5">Nouveau compte</h2>
          <p className="text-gray-400 text-sm mb-5">Remplissez les informations ci-dessous</p>

          {/* Nom complet */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={form.name} onChange={set('name')}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="Votre nom et prénom"
                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" value={form.email} onChange={set('email')}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="votre@email.com"
                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="Min. 6 caractères"
                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          {/* Confirmer */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showCnf ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="Répétez le mot de passe"
                className={`w-full border-2 bg-gray-50 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:bg-white transition-all ${
                  form.confirm
                    ? pwdMatch ? 'border-green-400' : 'border-red-300'
                    : 'border-gray-100 focus:border-green-400'
                }`}
              />
              <button type="button" onClick={() => setShowCnf(!showCnf)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCnf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {form.confirm && (
                <div className={`absolute right-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center ${
                  pwdMatch ? 'bg-green-500' : 'bg-red-400'
                }`}>
                  {pwdMatch
                    ? <Check size={11} className="text-white" strokeWidth={3} />
                    : <span className="text-white text-[10px] font-bold">✕</span>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4 text-sm text-red-600">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-4 text-sm text-green-700">
              <Check size={14} className="flex-shrink-0" /> Compte créé ! Redirection...
            </div>
          )}

          {/* Submit */}
          <button onClick={handleRegister} disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3.5 text-sm font-bold mb-4 transition-all disabled:opacity-60 shadow-lg hover:shadow-xl hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' }}>
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Création du compte...
              </>
            ) : success ? (
              <><Check size={16} /> Compte créé !</>
            ) : (
              'Créer mon compte →'
            )}
          </button>

          {/* Login link */}
          <Link to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors font-medium">
            <ArrowLeft size={14} /> Déjà un compte ? Se connecter
          </Link>
        </div>

        <p className="text-center text-white/50 text-xs mt-5">© 2026 Suivi des Travaux Journaliers</p>
      </div>
    </div>
  );
}
