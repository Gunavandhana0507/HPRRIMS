import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
  ADMIN: '/admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  STAFF: '/staff/dashboard',
};

export const ROLE_LABEL = { ADMIN: 'Admin', DOCTOR: 'Doctor', STAFF: 'Hospital Staff' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (session.token() ? session.user() : null));
  const [notice, setNotice] = useState(null);

  const logout = useCallback(async (reason) => {
    if (!reason && session.token()) {
      try {
        await api.post('/auth/logout');
      } catch {
        /* sign-out still clears local state */
      }
    }
    session.clear();
    setUser(null);
    setNotice(reason === 'expired' ? 'Your session has expired. Sign in again.'
      : reason === 'invalid' ? 'Your session is no longer valid. Sign in again.' : null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((reason) => logout(reason));
  }, [logout]);

  useEffect(() => {
    if (!session.token()) return;
    api.get('/auth/me').then((res) => {
      setUser(res.data);
      session.save(session.token(), res.data);
    }).catch(() => {});
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    session.save(res.data.token, res.data.user);
    setNotice(null);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(() => ({
    user, login, logout, notice, clearNotice: () => setNotice(null),
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [user, login, logout, notice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
