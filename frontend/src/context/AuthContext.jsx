import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api/gateway';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gw_token'));

  useEffect(() => {
    const stored = localStorage.getItem('gw_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = async (email, password) => {
    const res  = await apiLogin({ email, password });
    const data = res.data.data;

    if (data.user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    localStorage.setItem('gw_token', data.token);
    localStorage.setItem('gw_user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('gw_token');
    localStorage.removeItem('gw_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);