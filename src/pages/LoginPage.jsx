import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS } from '../services/firestoreService';
import { Eye, EyeOff, AlertCircle, HardHat, UserCheck, ShieldCheck } from 'lucide-react';

const ROLES = [
  { key: 'agent',       label: 'Collaborateur OCP',    icon: HardHat,    desc: 'Suivi des tâches' },
  { key: 'responsable', label: 'Intervenant externe',   icon: UserCheck,  desc: 'Gestion des interventions' },
  { key: 'admin',       label: 'Administrateur',        icon: ShieldCheck, desc: 'Gestion des accès' },
];

export default function LoginPage() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [selectedRole, setSelectedRole] = useState('agent');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      if (selectedRole === 'admin') {
        if (!ADMIN_EMAILS.includes(email.trim())) {
          setError('Accès administrateur non autorisé pour cet email.');
          setLoading(false);
          return;
        }
        setRole('admin');
        navigate('/admin');
        return;
      }

      setRole(selectedRole);
      navigate('/dashboard');
    } catch (e) {
      const msgs = {
        'auth/user-not-found':       'Aucun compte trouvé avec cet email.',
        'auth/wrong-password':       'Mot de passe incorrect.',
        'auth/invalid-email':        'Adresse email invalide.',
        'auth/invalid-credential':   'Email ou mot de passe incorrect.',
        'auth/too-many-requests':    'Trop de tentatives. Réessayez plus tard.',
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

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Connexion</h2>
          <p className="text-gray-500 text-sm mb-6">Accédez à votre espace de travail</p>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse Email</label>
            <input type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="votre@email.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors" />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors pr-12" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Choisir votre rôle</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ key, label, icon: Icon, desc }) => (
                <button key={key} onClick={() => { setSelectedRole(key); setError(''); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    selectedRole === key
                      ? key === 'admin'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-green-600 bg-green-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedRole === key
                      ? key === 'admin' ? 'bg-blue-600' : 'bg-green-600'
                      : 'bg-gray-200'
                  }`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className={`text-xs font-bold leading-tight ${
                    selectedRole === key
                      ? key === 'admin' ? 'text-blue-700' : 'text-green-700'
                      : 'text-gray-500'
                  }`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Login button */}
          <button onClick={handleLogin} disabled={loading}
            className={`w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold mb-4 transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-[1.01] ${
              selectedRole === 'admin' ? '' : ''
            }`}
            style={{
              background: selectedRole === 'admin'
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : 'linear-gradient(135deg, #16a34a, #15803d)',
            }}>
            {loading ? 'Connexion...' : `Se connecter →`}
          </button>

          {/* Status */}
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            Système opérationnel | v4.2.0-Production
          </div>

          {/* Register link */}
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
