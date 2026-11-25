// Contexto de autenticação: guarda o usuário logado e oferece login, cadastro e logout
// para qualquer tela, sem precisar passar props de componente em componente.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, refreshSession, setAccessToken } from './api';
import type { Session, User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean; // true enquanto descobrimos se já existe sessão
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir (ou recarregar) a página, o access token em memória se perdeu.
  // Tentamos renovar pelo cookie: se der certo, o usuário continua logado.
  useEffect(() => {
    async function restoreSession() {
      try {
        if (await refreshSession()) {
          setUser(await api.get<User>('/me'));
        }
      } finally {
        setLoading(false);
      }
    }
    void restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const session = await api.post<Session>('/auth/login', { email, password });
    setAccessToken(session.accessToken);
    setUser(await api.get<User>('/me'));
  }

  async function register(name: string, email: string, password: string) {
    await api.post<User>('/auth/register', { name, email, password });
    await login(email, password);
  }

  async function logout() {
    await api.post('/auth/logout', {});
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- o hook mora junto do contexto
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return value;
}
