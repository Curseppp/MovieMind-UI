function pageItems(totalPages: number, currentPage: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const valid = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const output: Array<number | "…"> = [];
  for (const page of valid) {
    const previous = output.at(-1);
    if (typeof previous === "number" && page - previous > 1) output.push("…");
    output.push(page);
  }
  return output;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return <nav className="pagination" aria-label="Страницы результатов" />;

  const changePage = (page: number) => {
    onChange(page);
    document.querySelector("#resultsTitle")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <nav className="pagination" aria-label="Страницы результатов">
      {currentPage > 1 ? (
        <button
          className="page-button"
          type="button"
          aria-label="Предыдущая страница"
          onClick={() => changePage(currentPage - 1)}
        >
          ←
        </button>
      ) : null}
      {pageItems(totalPages, currentPage).map((item, index) =>
        item === "…" ? (
          <span className="page-ellipsis" key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <button
            className={`page-button${item === currentPage ? " is-active" : ""}`}
            type="button"
            aria-label={`Страница ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            onClick={() => changePage(item)}
            key={item}
          >
            {item}
          </button>
        ),
      )}
      {currentPage < totalPages ? (
        <button
          className="page-button"
          type="button"
          aria-label="Следующая страница"
          onClick={() => changePage(currentPage + 1)}
        >
          →
        </button>
      ) : null}
    </nav>
  );
}
