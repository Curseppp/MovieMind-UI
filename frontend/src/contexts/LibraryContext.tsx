import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { responseError, translateError } from "../api/errors";
import type { Movie } from "../types";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const FAVORITES_LIMIT = 500;

interface LibraryContextValue {
  favoriteMovies: Movie[];
  favoriteIds: Set<number>;
  loadingFavorites: boolean;
  refreshFavorites: (showError?: boolean) => Promise<void>;
  toggleFavorite: (movie: Movie) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const { apiFetch } = useAuth();
  const { showToast } = useToast();
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  const fetchFavoriteMovies = useCallback(async () => {
    const response = await apiFetch(
      `/api/movies/?skip=0&limit=${FAVORITES_LIMIT}`,
      { method: "GET" },
      true,
    );
    if (!response.ok) throw new Error(await responseError(response));
    return (await response.json()) as Movie[];
  }, [apiFetch]);

  const refreshFavorites = useCallback(
    async (showError = true) => {
      setLoadingFavorites(true);
      try {
        setFavoriteMovies(await fetchFavoriteMovies());
      } catch (error) {
        if (showError) {
          showToast(
            translateError(
              error instanceof Error ? error.message : "Не удалось открыть избранное",
            ),
          );
        }
      } finally {
        setLoadingFavorites(false);
      }
    },
    [fetchFavoriteMovies, showToast],
  );

  useEffect(() => {
    let active = true;
    void fetchFavoriteMovies()
      .then((movies) => {
        if (active) setFavoriteMovies(movies);
      })
      .catch(() => {
        if (active) setFavoriteMovies([]);
      })
      .finally(() => {
        if (active) setLoadingFavorites(false);
      });
    return () => {
      active = false;
    };
  }, [fetchFavoriteMovies]);

  const favoriteIds = useMemo(
    () => new Set(favoriteMovies.map((movie) => movie.tmdb_id)),
    [favoriteMovies],
  );

  const toggleFavorite = useCallback(
    async (movie: Movie) => {
      const wasFavorite = favoriteIds.has(movie.tmdb_id);
      const response = await apiFetch(
        `/api/movies/${movie.tmdb_id}/favorite${wasFavorite ? "" : "?language=ru-RU"}`,
        { method: wasFavorite ? "DELETE" : "POST" },
        true,
      );
      if (!response.ok && !(response.status === 409 && !wasFavorite)) {
        throw new Error(translateError(await responseError(response)));
      }

      if (wasFavorite) {
        setFavoriteMovies((movies) =>
          movies.filter((item) => item.tmdb_id !== movie.tmdb_id),
        );
        showToast("Фильм удалён из избранного.");
      } else {
        setFavoriteMovies((movies) =>
          movies.some((item) => item.tmdb_id === movie.tmdb_id)
            ? movies
            : [movie, ...movies],
        );
        showToast("Фильм добавлен в избранное.");
      }
    },
    [apiFetch, favoriteIds, showToast],
  );

  const value = useMemo(
    () => ({
      favoriteMovies,
      favoriteIds,
      loadingFavorites,
      refreshFavorites,
      toggleFavorite,
    }),
    [
      favoriteMovies,
      favoriteIds,
      loadingFavorites,
      refreshFavorites,
      toggleFavorite,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside LibraryProvider");
  return context;
}
