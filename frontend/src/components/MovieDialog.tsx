import { useEffect, useRef, useState } from "react";

import { translateError } from "../api/errors";
import { useLibrary } from "../contexts/LibraryContext";
import { useToast } from "../contexts/ToastContext";
import type { Movie } from "../types";
import { Poster } from "./Poster";

interface MovieDialogProps {
  movie: Movie | null;
  onClose: () => void;
}

function formatDate(value: string): string {
  if (!value) return "Не указана";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function MovieDialog({ movie, onClose }: MovieDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { favoriteIds, toggleFavorite } = useLibrary();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (movie && !dialog.open) dialog.showModal();
    if (!movie && dialog.open) dialog.close();
  }, [movie]);

  if (!movie) {
    return <dialog ref={dialogRef} className="movie-dialog" onClose={onClose} />;
  }

  const isFavorite = favoriteIds.has(movie.tmdb_id);
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

  const handleBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (outside) event.currentTarget.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="movie-dialog"
      onClose={onClose}
      onClick={handleBackdrop}
    >
      <button
        className="dialog-close"
        type="button"
        aria-label="Закрыть"
        onClick={() => dialogRef.current?.close()}
      >
        ×
      </button>
      <div className="dialog-layout">
        <Poster movie={movie} className="dialog-poster" eager />
        <div className="dialog-copy">
          <p className="eyebrow">
            КАРТОЧКА ФИЛЬМА · <span>TMDB {movie.tmdb_id}</span>
          </p>
          <h2>{movie.original_title}</h2>
          <dl className="movie-facts">
            <div>
              <dt>Дата выхода</dt>
              <dd>{formatDate(movie.release_date)}</dd>
            </div>
            <div>
              <dt>Жанры</dt>
              <dd>{movie.genres.join(" · ") || "Не указаны"}</dd>
            </div>
            <div>
              <dt>Рейтинг</dt>
              <dd>{Number(movie.vote_average || 0).toFixed(1)} / 10</dd>
            </div>
            <div>
              <dt>Голосов</dt>
              <dd>{new Intl.NumberFormat("ru").format(movie.vote_count || 0)}</dd>
            </div>
          </dl>
          <button
            className="primary-button favorite-dialog-button"
            type="button"
            onClick={() => void handleFavorite()}
            disabled={busy}
          >
            {isFavorite ? "♥ Удалить из избранного" : "♡ Добавить в избранное"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

