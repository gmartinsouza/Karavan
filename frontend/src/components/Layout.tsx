import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth';

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
      <header className="topbar">
        <span className="logo">Karavan</span>
        <nav>
          <NavLink to="/" end>
            Painel
          </NavLink>
          <NavLink to="/veiculos">Veículos</NavLink>
        </nav>
        <span className="user">
          {user?.name}
          <button className="link" onClick={handleLogout}>
            Sair
          </button>
        </span>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
