import { useMemo, useState } from "react";

import { responseError, translateError } from "../api/errors";
import { useAuth } from "../contexts/AuthContext";
import { useLibrary } from "../contexts/LibraryContext";
import { useToast } from "../contexts/ToastContext";
import { BASE_GENRES } from "../data/genres";
import type { Movie, MovieFilters } from "../types";
import { FilterPanel } from "./FilterPanel";
import { MovieCard } from "./MovieCard";
import { MovieDialog } from "./MovieDialog";
import { Pagination } from "./Pagination";
import { SearchHero } from "./SearchHero";

const PAGE_SIZE = 10;
const SEARCH_LIMIT = 100;
const DEFAULT_FILTERS: MovieFilters = {
  genres: [],
  yearFrom: "",
  yearTo: "",
  ratingMin: 0,
  sort: "default",
};

interface MoviesPageProps {
  mode: "catalog" | "favorites";
}

function movieYear(movie: Movie): number {
  return Number.parseInt(movie.release_date.slice(0, 4), 10) || 0;
}

function pluralizeMovies(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "фильм";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) {
    return "фильма";
  }
  return "фильмов";
}

export function MoviesPage({ mode }: MoviesPageProps) {
  const { apiFetch } = useAuth();
  const { favoriteMovies, loadingFavorites } = useLibrary();
  const { showToast } = useToast();
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [filters, setFilters] = useState<MovieFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const favoritesMode = mode === "favorites";
  const sourceMovies = favoritesMode ? favoriteMovies : catalogMovies;
  const loading = favoritesMode ? loadingFavorites : searching;

  const genreOptions = useMemo(() => {
    const genres = new Map(BASE_GENRES);
    for (const movie of [...sourceMovies, ...favoriteMovies]) {
      for (const genre of movie.genres) {
        if (!genres.has(genre)) genres.set(genre, genre);
      }
    }
    return [...genres.entries()];
  }, [sourceMovies, favoriteMovies]);

  const filteredMovies = useMemo(() => {
    const selectedGenres = filters.genres.map((genre) =>
      genre.toLocaleLowerCase("ru"),
    );
    const yearFrom = Number(filters.yearFrom) || 0;
    const yearTo = Number(filters.yearTo) || 9999;
    const localQuery = favoritesMode
      ? appliedQuery.toLocaleLowerCase("ru")
      : "";
    const movies = sourceMovies.filter((movie) => {
      const genres = movie.genres.map((genre) => genre.toLocaleLowerCase("ru"));
      const year = movieYear(movie);
      return (
        (!localQuery || movie.original_title.toLocaleLowerCase("ru").includes(localQuery)) &&
        selectedGenres.every((genre) => genres.includes(genre)) &&
        (!yearFrom || year >= yearFrom) &&
        (!yearTo || year <= yearTo) &&
        Number(movie.vote_average || 0) >= filters.ratingMin
      );
    });

    const collator = new Intl.Collator("ru", { sensitivity: "base" });
    const sorts = {
      "title-asc": (a: Movie, b: Movie) =>
        collator.compare(a.original_title, b.original_title),
      "title-desc": (a: Movie, b: Movie) =>
        collator.compare(b.original_title, a.original_title),
      "year-desc": (a: Movie, b: Movie) => movieYear(b) - movieYear(a),
      "year-asc": (a: Movie, b: Movie) => movieYear(a) - movieYear(b),
      "rating-desc": (a: Movie, b: Movie) =>
        Number(b.vote_average || 0) - Number(a.vote_average || 0),
      "votes-desc": (a: Movie, b: Movie) =>
        Number(b.vote_count || 0) - Number(a.vote_count || 0),
    };
    const sort = filters.sort === "default" ? undefined : sorts[filters.sort];
    return sort ? movies.sort(sort) : movies;
  }, [appliedQuery, favoritesMode, filters, sourceMovies]);

  const totalPages = Math.ceil(filteredMovies.length / PAGE_SIZE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const pageMovies = filteredMovies.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const filterCount =
    filters.genres.length +
    Number(Boolean(filters.yearFrom)) +
    Number(Boolean(filters.yearTo)) +
    Number(filters.ratingMin > 0) +
    Number(filters.sort !== "default");

  const updateFilters = (nextFilters: MovieFilters) => {
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  const search = async () => {
    const normalizedQuery = query.trim();
    setAppliedQuery(normalizedQuery);
    setCurrentPage(1);
    if (favoritesMode) return;
    if (!normalizedQuery) return;

    setSearching(true);
    try {
      const response = await apiFetch(
        `/api/movies/search?skip=0&limit=${SEARCH_LIMIT}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: normalizedQuery, language: "ru-RU" }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      setCatalogMovies((await response.json()) as Movie[]);
    } catch (error) {
      setCatalogMovies([]);
      showToast(
        translateError(error instanceof Error ? error.message : "Ошибка поиска"),
      );
    } finally {
      setSearching(false);
    }
  };

  let emptyTitle = "Эфир пока пуст";
  let emptyCopy = "Введите название фильма в строке выше.";
  if (favoritesMode && sourceMovies.length === 0) {
    emptyTitle = "Видеотека пуста";
    emptyCopy = "Добавляйте фильмы из поиска — они появятся здесь.";
  } else if (sourceMovies.length > 0 && filteredMovies.length === 0) {
    emptyTitle = "Ничего не совпало";
    emptyCopy = "Ослабьте фильтры или измените поисковый запрос.";
  } else if (appliedQuery && sourceMovies.length === 0) {
    emptyTitle = "Сигнал не найден";
    emptyCopy = "Попробуйте другое название фильма.";
  }

  return (
    <main className="content">
      <SearchHero
        mode={mode}
        query={query}
        loading={loading}
        filterOpen={filterOpen}
        filterCount={filterCount}
        onQueryChange={setQuery}
        onSearch={() => void search()}
        onToggleFilters={() => setFilterOpen((open) => !open)}
      />
      <FilterPanel
        open={filterOpen}
        genres={genreOptions}
        filters={filters}
        onChange={updateFilters}
        onReset={() => updateFilters(DEFAULT_FILTERS)}
      />

      <section className="results-section" aria-labelledby="resultsTitle">
        <div className="results-heading">
          <div>
            <p className="eyebrow">ПРОГРАММА ПЕРЕДАЧ</p>
            <h2 id="resultsTitle">
              {favoritesMode ? "Моя видеотека" : "Результаты"}
            </h2>
          </div>
          <p className="results-meta">
            {filteredMovies.length
              ? `${filteredMovies.length} ${pluralizeMovies(filteredMovies.length)} · страница ${safePage} из ${totalPages}`
              : "0 фильмов"}
          </p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="test-card" aria-hidden="true">
              <span>MM</span>
            </div>
            <p>
              Ищем частоту<span className="loading-dots">...</span>
            </p>
          </div>
        ) : null}

        {!loading && filteredMovies.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              ⌁
            </span>
            <h3>{emptyTitle}</h3>
            <p>{emptyCopy}</p>
          </div>
        ) : null}

        {!loading ? (
          <div className="movie-grid" aria-live="polite">
            {pageMovies.map((movie) => (
              <MovieCard movie={movie} onOpen={setSelectedMovie} key={movie.tmdb_id} />
            ))}
          </div>
        ) : null}
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onChange={setCurrentPage}
        />
      </section>

      <MovieDialog movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </main>
  );
}
