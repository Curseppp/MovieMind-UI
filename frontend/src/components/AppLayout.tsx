import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { useLibrary } from "../contexts/LibraryContext";

export function AppLayout() {
  const { logout } = useAuth();
  const { favoriteIds } = useLibrary();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  return (
    <div className="app-screen">
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="MovieMind — главная">
          <span className="brand-box">M</span>
          <span>MOVIEMIND</span>
        </NavLink>

        <nav className="main-nav" aria-label="Основная навигация">
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            to="/"
            end
          >
            Поиск
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            to="/favorites"
          >
            Избранное <span className="nav-count">{favoriteIds.size}</span>
          </NavLink>
        </nav>

        <div className="header-actions">
          <span className="on-air">
            <i aria-hidden="true" /> В эфире
          </span>
          <button
            className="text-button"
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            {loggingOut ? "Выходим" : "Выйти"}
          </button>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <span>MOVIEMIND © 2026</span>
        <span>ВАША ЛИЧНАЯ ЧАСТОТА КИНО</span>
        <span>СИГНАЛ: ЧЁТКИЙ</span>
      </footer>
    </div>
  );
}
