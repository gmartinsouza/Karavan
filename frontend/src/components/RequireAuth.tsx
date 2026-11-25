import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth';

// Se não houver usuário logado, manda para o login.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="center">Carregando...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
