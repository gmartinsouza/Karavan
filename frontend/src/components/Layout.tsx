import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth';

// NavLink avisa se o link é a página atual (isActive), para destacar no menu
function menuClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'border-b-2 border-blue-600 py-1 font-semibold text-gray-900 hover:no-underline'
    : 'py-1 text-gray-500 hover:no-underline';
}

// Moldura das telas logadas: barra de cima com menu e, embaixo, a tela atual (<Outlet />).
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      <header className="flex items-center gap-8 border-b border-gray-200 bg-white px-6 py-3">
        <span className="text-xl font-bold text-blue-600">Karavan</span>
        <nav className="flex flex-1 gap-4">
          <NavLink to="/" end className={menuClass}>
            Painel
          </NavLink>
          <NavLink to="/veiculos" className={menuClass}>
            Veículos
          </NavLink>
        </nav>
        <span className="flex items-center gap-3 text-gray-500">
          {user?.name}
          <button
            className="bg-transparent p-0 text-blue-600 hover:bg-transparent hover:underline"
            onClick={handleLogout}
          >
            Sair
          </button>
        </span>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </>
  );
}
