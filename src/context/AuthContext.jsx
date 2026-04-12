import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { ADMIN_EMAILS, getAgentProfile, getResponsableProfile } from '../services/firestoreService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [role,    setRoleRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setRoleRaw(null);
        sessionStorage.removeItem('role');
        setLoading(false);
        return;
      }

      /* Restore from session first (instant) then verify */
      const cached = sessionStorage.getItem('role');
      if (cached) setRoleRaw(cached);

      /* Always re-derive the real role from Firestore to prevent spoofing */
      try {
        if (ADMIN_EMAILS.includes(u.email)) {
          setRoleRaw('admin');
          sessionStorage.setItem('role', 'admin');
        } else {
          const agent = await getAgentProfile(u.uid);
          if (agent) {
            setRoleRaw('agent');
            sessionStorage.setItem('role', 'agent');
          } else {
            const resp = await getResponsableProfile(u.uid);
            if (resp) {
              setRoleRaw('responsable');
              sessionStorage.setItem('role', 'responsable');
            } else {
              /* Unregistered — clear role */
              setRoleRaw(null);
              sessionStorage.removeItem('role');
            }
          }
        }
      } catch {
        /* Network error — keep cached role if any */
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const setRole = (r) => {
    setRoleRaw(r);
    if (r) sessionStorage.setItem('role', r);
    else   sessionStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ user, role, setRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
