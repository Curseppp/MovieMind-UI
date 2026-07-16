import { useState } from "react";

import { translateError } from "../api/errors";
import { useLibrary } from "../contexts/LibraryContext";
import { useToast } from "../contexts/ToastContext";
import type { Movie } from "../types";
import { Poster } from "./Poster";

interface MovieCardProps {
  movie: Movie;
  onOpen: (movie: Movie) => void;
}

export function MovieCard({ movie, onOpen }: MovieCardProps) {
  const { favoriteIds, toggleFavorite } = useLibrary();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const isFavorite = favoriteIds.has(movie.tmdb_id);
  const year = Number.parseInt(movie.release_date.slice(0, 4), 10) || 0;

  const handleFavorite = async () => {
    setBusy(true);
    try {
      await toggleFavorite(movie);
    } catch (error) {
      showToast(
        translateError(error instanceof Error ? error.message : "Ошибка избранного"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="movie-card">
      <button
        type="button"
        className="movie-open"
        aria-label={`Подробнее о фильме «${movie.original_title}»`}
        onClick={() => onOpen(movie)}
      >
        <Poster movie={movie} className="poster-frame">
          <span className="rating-badge">
            ★ {Number(movie.vote_average || 0).toFixed(1)}
          </span>
        </Poster>
        <h3 className="movie-title">{movie.original_title}</h3>
        <p className="movie-year">{year || "Год неизвестен"}</p>
      </button>
      <button
        type="button"
        className={`favorite-card-button${isFavorite ? " is-favorite" : ""}`}
        aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
        onClick={() => void handleFavorite()}
        disabled={busy}
      >
        {isFavorite ? "♥" : "♡"}
      </button>
    </article>
  );
}
