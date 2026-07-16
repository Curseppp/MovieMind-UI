import { type FormEvent, useState } from "react";

import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

type AuthTab = "login" | "register";

export function AuthScreen() {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<AuthTab>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setError("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await login(
        String(data.get("email")).trim(),
        String(data.get("password")),
      );
      event.currentTarget.reset();
      showToast("Сигнал принят. Добро пожаловать в MovieMind.");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Не удалось войти в эфир.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("passwordConfirm"))) {
      setError("Пароли не совпадают.");
      return;
    }

    setBusy(true);
    try {
      await register({
        username: String(data.get("username")).trim(),
        email: String(data.get("email")).trim(),
        password,
      });
      event.currentTarget.reset();
      showToast("Профиль создан. Добро пожаловать в эфир.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось создать профиль.",
      );
    } finally {
      setBusy(false);
    }
  };

  const loginActive = tab === "login";
  return (
    <main className="auth-screen">
      <section className="auth-broadcast" aria-labelledby="authBrandTitle">
        <p className="eyebrow">КАНАЛ 08 · ЭФИР 24/7</p>
        <div className="broadcast-copy">
          <p className="signal-label">ПЕРСОНАЛЬНАЯ ВИДЕОТЕКА</p>
          <h1 id="authBrandTitle">
            MOVIE
            <br />
            MIND
          </h1>
          <p className="broadcast-lead">
            Фильмы, которые стоит найти.
            <br />
            Истории, которые хочется оставить.
          </p>
        </div>
        <div className="broadcast-footer">
          <span>Ч/Б</span>
          <span>625 СТРОК</span>
          <span>СТЕРЕО</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="authTitle">
        <div className="auth-panel-inner">
          <p className="panel-number">MM–01</p>
          <h2 id="authTitle">{loginActive ? "Вход в эфир" : "Новый зритель"}</h2>
          <p className="auth-subtitle">
            {loginActive
              ? "Введите данные вашей учётной записи."
              : "Создайте профиль и соберите личную видеотеку."}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Авторизация">
            <button
              className={`auth-tab${loginActive ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={loginActive}
              aria-controls="loginForm"
              onClick={() => switchTab("login")}
            >
              Вход
            </button>
            <button
              className={`auth-tab${!loginActive ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={!loginActive}
              aria-controls="registerForm"
              onClick={() => switchTab("register")}
            >
              Регистрация
            </button>
          </div>

          {loginActive ? (
            <form id="loginForm" className="auth-form" onSubmit={handleLogin}>
              <label className="field">
                <span>Электронная почта</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                  disabled={busy}
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Пароль</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="•••••••••••••••"
                  required
                  disabled={busy}
                />
              </label>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="primary-button auth-submit" type="submit" disabled={busy}>
                <span>{busy ? "Настраиваем сигнал" : "Начать просмотр"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <form id="registerForm" className="auth-form" onSubmit={handleRegister}>
              <label className="field">
                <span>Имя зрителя</span>
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  minLength={3}
                  maxLength={50}
                  placeholder="cinephile"
                  required
                  disabled={busy}
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Электронная почта</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                  disabled={busy}
                />
              </label>
              <label className="field">
                <span>Пароль · минимум 15 символов</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={15}
                  maxLength={128}
                  placeholder="Придумайте длинный пароль"
                  required
                  disabled={busy}
                />
              </label>
              <label className="field">
                <span>Повторите пароль</span>
                <input
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={15}
                  maxLength={128}
                  placeholder="Повторите пароль"
                  required
                  disabled={busy}
                />
              </label>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="primary-button auth-submit" type="submit" disabled={busy}>
                <span>{busy ? "Создаём профиль" : "Создать профиль"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}

          <p className="privacy-note">
            Сессия защищена · refresh-токен не виден странице
          </p>
        </div>
      </section>
    </main>
  );
}

