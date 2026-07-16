import type { FormEvent } from "react";

interface SearchHeroProps {
  mode: "catalog" | "favorites";
  query: string;
  loading: boolean;
  filterOpen: boolean;
  filterCount: number;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
}

export function SearchHero({
  mode,
  query,
  loading,
  filterOpen,
  filterCount,
  onQueryChange,
  onSearch,
  onToggleFilters,
}: SearchHeroProps) {
  const favorites = mode === "favorites";
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <section className="hero" aria-labelledby="pageTitle">
      <p className="eyebrow">
        {favorites ? "КАНАЛ 02 · ЛИЧНАЯ ВИДЕОТЕКА" : "КАНАЛ 01 · КАТАЛОГ"}
      </p>
      <h1 id="pageTitle">{favorites ? "Избранное" : "Что смотрим?"}</h1>
      <p className="hero-subtitle">
        {favorites
          ? "Фильмы, которые вы сохранили для правильного вечера."
          : "Введите название — мы настроимся на нужную волну."}
      </p>

      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="searchInput">
          Название фильма
        </label>
        <span className="search-icon" aria-hidden="true" />
        <input
          id="searchInput"
          type="search"
          autoComplete="off"
          placeholder={favorites ? "Поиск в вашей видеотеке" : "Например, The Matrix"}
          required={!favorites}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <button className="search-submit" type="submit" disabled={loading}>
          Найти
        </button>
      </form>

      <button
        className="filter-toggle"
        type="button"
        aria-expanded={filterOpen}
        aria-controls="filterPanel"
        onClick={onToggleFilters}
      >
        <span className="tune-icon" aria-hidden="true">
          ≡
        </span>
        Настроить фильтры
        {filterCount ? <span className="filter-count">{filterCount}</span> : null}
      </button>
    </section>
  );
}

