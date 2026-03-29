import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { registerAgent } from '../services/firestoreService';
import { Eye, EyeOff, HardHat, AlertCircle, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [showCnf, setShowCnf]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

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
      setRole('agent');
      navigate('/dashboard');
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé.',
        'auth/invalid-email':        'Adresse email invalide.',
        'auth/weak-password':        'Mot de passe trop faible.',
      };
      setError(msgs[e.code] || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  const Field = ({ label, type, value, onChange, show, onToggle, placeholder }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show !== undefined ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors pr-12"
        />
        {onToggle && (
          <button type="button" onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4 border-2 border-white/20">
            <HardHat size={40} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-extrabold">Inscription Collaborateur</h1>
          <p className="text-blue-200 text-sm mt-1">Créer votre compte OCP</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Nouveau compte</h2>
          <p className="text-gray-400 text-xs mb-6">Rôle : Collaborateur OCP</p>

          <Field label="Nom complet" type="text" value={form.name} onChange={set('name')} placeholder="Votre nom et prénom" />
          <Field label="Adresse Email" type="email" value={form.email} onChange={set('email')} placeholder="votre@email.com" />
          <Field label="Mot de passe" type="password" value={form.password} onChange={set('password')}
            placeholder="Min. 6 caractères" show={showPwd} onToggle={() => setShowPwd(!showPwd)} />
          <Field label="Confirmer le mot de passe" type="password" value={form.confirm} onChange={set('confirm')}
            placeholder="Répétez le mot de passe" show={showCnf} onToggle={() => setShowCnf(!showCnf)} />

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button onClick={handleRegister} disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-3 text-sm font-bold mb-3 hover:bg-blue-900 transition-colors disabled:opacity-50">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:underline">
            <ArrowLeft size={14} /> Déjà un compte ? Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
