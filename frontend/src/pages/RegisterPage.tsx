import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth';
import { ErrorMessage } from '../components/ErrorMessage';
import { errorMessage } from '../useApi';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await register(form.name, form.email, form.password);
      navigate('/veiculos'); // conta nova ainda não tem veículo
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form className="card flex w-full max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
        <h1 className="text-blue-600">Criar conta</h1>
        <label>
          Nome
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label>
          Senha (mínimo 8 caracteres)
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
        </label>
        <ErrorMessage message={error} />
        <button type="submit" disabled={sending}>
          {sending ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="text-gray-500">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
