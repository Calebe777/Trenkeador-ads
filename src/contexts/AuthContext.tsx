import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { UsuarioOut } from '../types';

interface AuthContextType {
  user: UsuarioOut | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nomeConta: string, slug: string, nome: string, email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioOut | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get<UsuarioOut>('/auth/me');
      setUser(response.data);
    } catch (err) {
      setUser(null);
      localStorage.removeItem('leadtrack_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('leadtrack_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, senha: string) => {
    // Note: FastAPI OAuth2 expect form-urlencoded
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', senha);

    const response = await apiClient.post<{ access_token: string }>('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const token = response.data.access_token;
    localStorage.setItem('leadtrack_token', token);
    
    // Fetch the authenticated user profile
    const meResponse = await apiClient.get<UsuarioOut>('/auth/me');
    setUser(meResponse.data);
  };

  const register = async (nomeConta: string, slug: string, nome: string, email: string, senha: string) => {
    await apiClient.post('/auth/register', {
      nome_conta: nomeConta,
      slug,
      nome,
      email,
      senha,
    });
  };

  const logout = () => {
    localStorage.removeItem('leadtrack_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
