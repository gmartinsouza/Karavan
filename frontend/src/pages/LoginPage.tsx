import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth';
import { ErrorMessage } from '../components/ErrorMessage';
import { errorMessage } from '../useApi';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  // já vem preenchido com o usuário de demonstração criado pelo seed da API
  const [email, setEmail] = useState('demo@caravana.dev');
  const [password, setPassword] = useState('caravana123');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // impede o navegador de recarregar a página
    setSending(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Karavan</h1>
        <p className="muted">Controle de abastecimentos, manutenções e revisões do seu carro.</p>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <ErrorMessage message={error} />
        <button type="submit" disabled={sending}>
          {sending ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="muted">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
