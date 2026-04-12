import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS, getAgentProfile, getResponsableProfile } from '../services/firestoreService';
import {
  Eye, EyeOff, Mail, Lock, HardHat, UserCheck, ShieldCheck, Check,
} from 'lucide-react';

const ROLES = [
  { key: 'agent',       label: 'Collaborateur OCP',  icon: HardHat    },
  { key: 'responsable', label: 'Intervenant externe', icon: UserCheck  },
  { key: 'admin',       label: 'Administrateur',      icon: ShieldCheck },
];

export default function LoginPage() {
  const { setRole }  = useAuth();
  const navigate     = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [hint,     setHint]     = useState('agent'); // UI only — real role comes from Firestore
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setError(''); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const { user } = cred;

      /* ── Role auto-detection from Firestore (cannot be spoofed) ─── */
      if (ADMIN_EMAILS.includes(user.email)) {
        setRole('admin'); navigate('/admin'); return;
      }
      const agentProfile = await getAgentProfile(user.uid);
      if (agentProfile) {
        setRole('agent'); navigate('/dashboard'); return;
      }
      const respProfile = await getResponsableProfile(user.uid);
      if (respProfile) {
        setRole('responsable'); navigate('/dashboard'); return;
      }
      await signOut(auth);
      setError('Compte non reconnu. Contactez votre administrateur.');
    } catch (e) {
      const msgs = {
        'auth/user-not-found':     'Aucun compte trouvé avec cet email.',
        'auth/wrong-password':     'Mot de passe incorrect.',
        'auth/invalid-email':      'Adresse email invalide.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests':  'Trop de tentatives. Réessayez plus tard.',
      };
      setError(msgs[e.code] || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #1a7a3c 0%, #1db954 50%, #159a3e 100%)' }}>

      <div className="w-full max-w-sm">

        {/* ── Logo + title ─────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden shadow-2xl border-4 border-white/30"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' }}>
            <img src="/ocp-logo.svg" alt="OCP" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">OCP Groupe</h1>
          <p className="text-green-100 text-sm mt-0.5">Suivi des Travaux Journaliers</p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
            <ShieldCheck size={11} /> v4.2.0 · Production
          </div>
        </div>

        {/* ── Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">

          <h2 className="text-xl font-extrabold text-gray-900 mb-0.5">Connexion</h2>
          <p className="text-gray-400 text-sm mb-5">Accédez à votre espace de travail</p>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="votre@email.com"
                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Role hint selector (UI only — real role detected from Firestore) */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Choisir votre rôle</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ key, label, icon: Icon }) => {
                const active = hint === key;
                return (
                  <button key={key} onClick={() => setHint(key)}
                    className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all text-center"
                    style={active ? {
                      background: 'linear-gradient(135deg, #1e3a5f, #0f2347)',
                      borderColor: '#1e3a5f',
                    } : {
                      background: '#f8fafc',
                      borderColor: '#e2e8f0',
                    }}>
                    {/* Checkmark */}
                    {active && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-400 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      active ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      <Icon size={17} className={active ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <span className={`text-[11px] font-bold leading-tight ${
                      active ? 'text-white' : 'text-gray-500'
                    }`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4 text-sm text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Login button */}
          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3.5 text-sm font-bold mb-4 transition-all disabled:opacity-60 shadow-lg hover:shadow-xl hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2347)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {loading ? 'Vérification...' : 'Se connecter →'}
          </button>

          {/* Status */}
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            Système opérationnel
          </div>

          {/* Register */}
          <p className="text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-green-600 font-bold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="text-center text-white/50 text-xs mt-5">© 2026 Suivi des Travaux Journaliers</p>
      </div>
    </div>
  );
}
