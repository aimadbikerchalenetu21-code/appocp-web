import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS, getAgentProfile, getResponsableProfile } from '../services/firestoreService';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { setRole } = useAuth();
  const navigate    = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setError(''); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const { user } = cred;

      /* ── 1. Admin ─────────────────────────────────────────────────── */
      if (ADMIN_EMAILS.includes(user.email)) {
        setRole('admin');
        navigate('/admin');
        return;
      }

      /* ── 2. Collaborateur OCP (agent) ─────────────────────────────── */
      const agentProfile = await getAgentProfile(user.uid);
      if (agentProfile) {
        setRole('agent');
        navigate('/dashboard');
        return;
      }

      /* ── 3. Intervenant externe (responsable) ─────────────────────── */
      const respProfile = await getResponsableProfile(user.uid);
      if (respProfile) {
        setRole('responsable');
        navigate('/dashboard');
        return;
      }

      /* ── Not registered in any collection ────────────────────────── */
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
      style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 40%, #14532d 100%)' }}>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #86efac, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative">

        {/* Header */}
        <div className="text-center mb-8">
          <img src="/ocp-logo.svg" alt="OCP" className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-xl" />
          <h1 className="text-white text-2xl font-extrabold">OCP Groupe</h1>
          <p className="text-green-200 text-sm mt-1">Suivi des Travaux Journaliers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Connexion</h2>
          <p className="text-gray-500 text-sm mb-6">Votre rôle est détecté automatiquement</p>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse Email</label>
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="votre@email.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors pr-12"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold mb-4 transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            {loading ? 'Vérification...' : 'Se connecter →'}
          </button>

          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            Système opérationnel
          </div>

          <p className="text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-green-600 font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="text-center text-green-200/60 text-xs mt-6">© 2026 Suivi des Travaux Journaliers</p>
      </div>
    </div>
  );
}
