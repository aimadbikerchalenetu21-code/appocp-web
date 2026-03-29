import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [role, setRole]   = useState(() => sessionStorage.getItem('role'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) { setRole(null); sessionStorage.removeItem('role'); }
    });
  }, []);

  const setRolePersisted = (r) => {
    setRole(r);
    if (r) sessionStorage.setItem('role', r);
    else    sessionStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ user, role, setRole: setRolePersisted, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
