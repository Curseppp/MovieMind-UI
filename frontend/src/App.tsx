import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { AuthScreen } from "./components/AuthScreen";
import { BootScreen } from "./components/BootScreen";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LibraryProvider } from "./contexts/LibraryContext";
import { ToastProvider } from "./contexts/ToastContext";
import { CatalogPage } from "./pages/CatalogPage";
import { FavoritesPage } from "./pages/FavoritesPage";

function Application() {
  const { status } = useAuth();
  if (status === "booting") return <BootScreen />;
  if (status === "unauthenticated") return <AuthScreen />;

  return (
    <BrowserRouter>
      <LibraryProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<CatalogPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LibraryProvider>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="screen-noise" aria-hidden="true" />
        <Application />
      </AuthProvider>
    </ToastProvider>
  );
}

