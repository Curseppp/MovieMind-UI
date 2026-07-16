import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import type { Movie } from "./types";

const titles = [
  "The Matrix",
  "Fight Club",
  "Pulp Fiction",
  "Inception",
  "Interstellar",
  "Parasite",
  "Blade Runner",
  "Alien",
  "The Godfather",
  "Goodfellas",
  "Whiplash",
  "Arrival",
  "Memento",
  "Heat",
  "The Shining",
  "Se7en",
  "Oldboy",
  "Dune",
  "Her",
  "Moon",
];

const movies: Movie[] = titles.map((title, index) => ({
  tmdb_id: 100 + index,
  original_title: title,
  release_date: `${1980 + index}-05-17`,
  genres:
    index % 2 === 0
      ? ["Drama", "Science Fiction"]
      : ["Drama", "Thriller"],
  vote_average: 7.1 + (index % 9) * 0.2,
  vote_count: 1000 + index * 731,
  poster_url: null,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.toString() : input.url;
}

describe("MovieMind React application", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    window.history.pushState({}, "", "/");
    fetchMock.mockImplementation(async (input, init) => {
      const path = requestPath(input);
      if (path === "/auth/refresh") {
        return jsonResponse({ access_token: "access-token", token_type: "bearer" });
      }
      if (path.startsWith("/api/movies/?")) {
        const headers = new Headers(init?.headers);
        expect(headers.get("Authorization")).toBe("Bearer access-token");
        return jsonResponse(movies.slice(0, 2));
      }
      if (path.startsWith("/api/movies/search")) {
        return jsonResponse(movies);
      }
      if (path.includes("/favorite")) {
        return new Response(null, { status: init?.method === "DELETE" ? 204 : 201 });
      }
      if (path === "/auth/logout") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("restores the session, searches, paginates and opens movie details", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Что смотрим?" }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Название фильма" }), "matrix");
    await user.click(screen.getByRole("button", { name: "Найти" }));

    expect(await screen.findByText("20 фильмов · страница 1 из 2")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "Следующая страница" }));
    expect(screen.getByText("Whiplash")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Страница 1" }));
    await user.click(
      screen.getByRole("button", { name: "Подробнее о фильме «The Matrix»" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "The Matrix" })).toBeInTheDocument();
    expect(within(dialog).getByText("TMDB 100")).toBeInTheDocument();
    expect(within(dialog).getByText("Drama · Science Fiction")).toBeInTheDocument();
  });

  it("combines selected genres with AND semantics", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Что смотрим?" });
    await user.type(screen.getByRole("searchbox", { name: "Название фильма" }), "movie");
    await user.click(screen.getByRole("button", { name: "Найти" }));
    await screen.findByText("20 фильмов · страница 1 из 2");

    await user.click(screen.getByRole("button", { name: "Настроить фильтры" }));
    await user.click(screen.getByRole("checkbox", { name: "Драма" }));
    await user.click(screen.getByRole("checkbox", { name: "Фантастика" }));

    expect(screen.getByText("10 фильмов · страница 1 из 1")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.queryByText("Fight Club")).not.toBeInTheDocument();
  });

  it("opens the favorites route and logs out", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Что смотрим?" });
    await user.click(screen.getByRole("link", { name: "Избранное 2" }));

    expect(
      await screen.findByRole("heading", { name: "Избранное" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(window.location.pathname).toBe("/favorites");

    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(
      await screen.findByRole("heading", { name: "Вход в эфир" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
  });

  it("shows login and registration when refresh is unavailable", async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = requestPath(input);
      if (path === "/auth/refresh") {
        return jsonResponse({ detail: "Refresh token is missing" }, 401);
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Вход в эфир" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Регистрация" }));
    expect(screen.getByRole("heading", { name: "Новый зритель" })).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль · минимум 15 символов")).toHaveAttribute(
      "minlength",
      "15",
    );
  });

  it("updates favorite state from a movie card", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Что смотрим?" });
    await user.type(screen.getByRole("searchbox", { name: "Название фильма" }), "matrix");
    await user.click(screen.getByRole("button", { name: "Найти" }));
    await screen.findByText("20 фильмов · страница 1 из 2");

    const matrixCard = screen
      .getByRole("button", { name: "Подробнее о фильме «The Matrix»" })
      .closest("article");
    expect(matrixCard).not.toBeNull();
    await user.click(
      within(matrixCard as HTMLElement).getByRole("button", {
        name: "Удалить из избранного",
      }),
    );

    await waitFor(() => {
      expect(
        within(matrixCard as HTMLElement).getByRole("button", {
          name: "Добавить в избранное",
        }),
      ).toBeInTheDocument();
    });
  });
});
