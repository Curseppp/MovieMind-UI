import type { MovieFilters, SortOption } from "../types";

interface FilterPanelProps {
  open: boolean;
  genres: Array<[string, string]>;
  filters: MovieFilters;
  onChange: (filters: MovieFilters) => void;
  onReset: () => void;
}

export function FilterPanel({
  open,
  genres,
  filters,
  onChange,
  onReset,
}: FilterPanelProps) {
  const currentYear = new Date().getFullYear() + 5;
  const toggleGenre = (genre: string) => {
    const selected = filters.genres.includes(genre);
    onChange({
      ...filters,
      genres: selected
        ? filters.genres.filter((item) => item !== genre)
        : [...filters.genres, genre],
    });
  };

  return (
    <section
      id="filterPanel"
      className="filter-panel"
      aria-label="Фильтры"
      hidden={!open}
    >
      <div className="filter-heading">
        <div>
          <p className="eyebrow">ТОЧНАЯ НАСТРОЙКА</p>
          <h2>Фильтры эфира</h2>
        </div>
        <button className="text-button" type="button" onClick={onReset}>
          Сбросить всё
        </button>
      </div>

      <div className="filter-grid">
        <fieldset className="genre-filter">
          <legend>Жанры · совпадение по всем</legend>
          <div className="genre-options">
            {genres.map(([value, label]) => (
              <label className="genre-check" key={value}>
                <input
                  type="checkbox"
                  value={value}
                  checked={filters.genres.includes(value)}
                  onChange={() => toggleGenre(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="compact-filters">
          <fieldset>
            <legend>Год выпуска</legend>
            <div className="year-range">
              <label>
                <span>От</span>
                <input
                  type="number"
                  min="1888"
                  max={currentYear}
                  placeholder="1980"
                  value={filters.yearFrom}
                  onChange={(event) =>
                    onChange({ ...filters, yearFrom: event.target.value })
                  }
                />
              </label>
              <span aria-hidden="true">—</span>
              <label>
                <span>До</span>
                <input
                  type="number"
                  min="1888"
                  max={currentYear}
                  placeholder={String(new Date().getFullYear())}
                  value={filters.yearTo}
                  onChange={(event) =>
                    onChange({ ...filters, yearTo: event.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>

          <label className="select-field">
            <span>Порядок</span>
            <select
              value={filters.sort}
              onChange={(event) =>
                onChange({ ...filters, sort: event.target.value as SortOption })
              }
            >
              <option value="default">По умолчанию</option>
              <option value="title-asc">По алфавиту: А—Я</option>
              <option value="title-desc">По алфавиту: Я—А</option>
              <option value="year-desc">Сначала новые</option>
              <option value="year-asc">Сначала старые</option>
              <option value="rating-desc">По рейтингу</option>
              <option value="votes-desc">По популярности</option>
            </select>
          </label>

          <label className="range-field">
            <span>
              Рейтинг не ниже <output>{filters.ratingMin}</output>
            </span>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={filters.ratingMin}
              onChange={(event) =>
                onChange({ ...filters, ratingMin: Number(event.target.value) })
              }
            />
          </label>
        </div>
      </div>
    </section>
  );
}

