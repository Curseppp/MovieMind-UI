import type { PropsWithChildren } from "react";

import type { Movie } from "../types";

interface PosterProps extends PropsWithChildren {
  movie: Movie;
  className: string;
  eager?: boolean;
}

export function Poster({ movie, className, eager = false, children }: PosterProps) {
  return (
    <div className={className}>
      {movie.poster_url ? (
        <img
          src={movie.poster_url}
          alt={`Постер фильма «${movie.original_title}»`}
          loading={eager ? "eager" : "lazy"}
        />
      ) : (
        <div className="poster-placeholder">MM</div>
      )}
      {children}
    </div>
  );
}
