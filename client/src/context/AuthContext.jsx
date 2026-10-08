import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, jsonBody } from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token || !storedUser) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      try {
        const currentUser = await apiRequest('/auth/me');
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    };

    window.addEventListener('quizarena:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('quizarena:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: jsonBody({
          email,
          password,
        }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      setUser(data);

      return {
        success: true,
        user: data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: jsonBody({
          name,
          email,
          password,
        }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      setUser(data);

      return {
        success: true,
        user: data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });

    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Server logout failed:', error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);