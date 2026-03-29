import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, HardHat, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (role) => {
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setRole(role);
      navigate('/dashboard');
    } catch (e) {
      const msgs = {
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-email':  'Adresse email invalide.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      };
      setError(msgs[e.code] || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 40%, #14532d 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #86efac, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white/20"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <HardHat size={40} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-extrabold">OCP Industriel</h1>
          <p className="text-green-200 text-sm mt-1">Suivi des Travaux Journaliers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Connexion</h2>
          <p className="text-gray-500 text-sm mb-6">Accédez à votre espace de travail</p>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse Email</label>
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="votre@email.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">Choisir le rôle</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Buttons */}
          <button onClick={() => handleLogin('agent')} disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold mb-3 transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <HardHat size={18} />
            Se connecter en tant que Collaborateur OCP
          </button>
          <button onClick={() => handleLogin('responsable')} disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold mb-4 transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #166534, #14532d)' }}>
            <UserCheck size={18} />
            Se connecter en tant qu'Intervenant externe
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
              Créer un compte Collaborateur
            </Link>
          </p>
        </div>

        <p className="text-center text-green-200/60 text-xs mt-6">© 2026 Suivi des Travaux Journaliers</p>
      </div>
    </div>
  );
}
