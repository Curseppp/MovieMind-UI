"use strict";

const PAGE_SIZE = 10;
const SEARCH_LIMIT = 100;
const FAVORITES_LIMIT = 500;

const BASE_GENRES = [
  ["Action", "Боевик"],
  ["Adventure", "Приключения"],
  ["Animation", "Анимация"],
  ["Comedy", "Комедия"],
  ["Crime", "Криминал"],
  ["Documentary", "Документальный"],
  ["Drama", "Драма"],
  ["Family", "Семейный"],
  ["Fantasy", "Фэнтези"],
  ["History", "История"],
  ["Horror", "Ужасы"],
  ["Music", "Музыка"],
  ["Mystery", "Детектив"],
  ["Romance", "Мелодрама"],
  ["Science Fiction", "Фантастика"],
  ["Thriller", "Триллер"],
  ["War", "Военный"],
  ["Western", "Вестерн"],
];

const elements = {
  bootScreen: document.querySelector("#bootScreen"),
  authScreen: document.querySelector("#authScreen"),
  appScreen: document.querySelector("#appScreen"),
  authTitle: document.querySelector("#authTitle"),
  authSubtitle: document.querySelector("#authSubtitle"),
  loginTab: document.querySelector("#loginTab"),
  registerTab: document.querySelector("#registerTab"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  loginError: document.querySelector("#loginError"),
  registerError: document.querySelector("#registerError"),
  logoutButton: document.querySelector("#logoutButton"),
  navLinks: [...document.querySelectorAll(".nav-link")],
  favoriteCount: document.querySelector("#favoriteCount"),
  channelLabel: document.querySelector("#channelLabel"),
  pageTitle: document.querySelector("#pageTitle"),
  pageSubtitle: document.querySelector("#pageSubtitle"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  filterToggle: document.querySelector("#filterToggle"),
  filterPanel: document.querySelector("#filterPanel"),
  filterCount: document.querySelector("#filterCount"),
  resetFilters: document.querySelector("#resetFilters"),
  genreOptions: document.querySelector("#genreOptions"),
  yearFrom: document.querySelector("#yearFrom"),
  yearTo: document.querySelector("#yearTo"),
  sortSelect: document.querySelector("#sortSelect"),
  ratingMin: document.querySelector("#ratingMin"),
  ratingValue: document.querySelector("#ratingValue"),
  resultsTitle: document.querySelector("#resultsTitle"),
  resultsMeta: document.querySelector("#resultsMeta"),
  loadingState: document.querySelector("#loadingState"),
  emptyState: document.querySelector("#emptyState"),
  movieGrid: document.querySelector("#movieGrid"),
  pagination: document.querySelector("#pagination"),
  movieDialog: document.querySelector("#movieDialog"),
  dialogClose: document.querySelector("#dialogClose"),
  dialogPoster: document.querySelector("#dialogPoster"),
  dialogId: document.querySelector("#dialogId"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogDate: document.querySelector("#dialogDate"),
  dialogGenres: document.querySelector("#dialogGenres"),
  dialogRating: document.querySelector("#dialogRating"),
  dialogVotes: document.querySelector("#dialogVotes"),
  dialogFavorite: document.querySelector("#dialogFavorite"),
  toast: document.querySelector("#toast"),
};

const state = {
  accessToken: null,
  view: "catalog",
  rawMovies: [],
  filteredMovies: [],
  currentPage: 1,
  currentMovie: null,
  searchTerm: "",
  favoriteIds: new Set(),
  favoriteMovies: [],
  loading: false,
};

let refreshPromise = null;
let toastTimer = null;

function setBusy(form, busy) {
  for (const control of form.elements) {
    control.disabled = busy;
  }
}

function showFormError(element, message = "") {
  element.textContent = message;
  element.hidden = !message;
}

async function responseError(response) {
  try {
    const payload = await response.json();
    if (Array.isArray(payload.detail)) {
      return payload.detail.map((item) => item.msg).join(". ");
    }
    return payload.detail || "Неизвестная ошибка";
  } catch {
    return `Ошибка соединения (${response.status})`;
  }
}

function translateError(message) {
  const translations = {
    "Incorrect email or password": "Неверная почта или пароль.",
    "Refresh token is missing": "Сессия не найдена. Войдите снова.",
    "Invalid or expired refresh token": "Сессия завершена. Войдите снова.",
  };
  if (translations[message]) return translations[message];
  if (message.toLowerCase().includes("already")) {
    return "Такая учётная запись уже существует.";
  }
  return message;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch("/auth/refresh", { method: "POST" });
      if (!response.ok) {
        state.accessToken = null;
        return false;
      }
      const payload = await response.json();
      state.accessToken = payload.access_token;
      return true;
    } catch {
      state.accessToken = null;
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function apiFetch(path, options = {}, protectedRequest = false, retry = true) {
  const headers = new Headers(options.headers || {});
  if (protectedRequest && state.accessToken) {
    headers.set("Authorization", `Bearer ${state.accessToken}`);
  }
  const response = await fetch(path, { ...options, headers });

  if (protectedRequest && response.status === 401 && retry) {
    if (await refreshSession()) {
      return apiFetch(path, options, protectedRequest, false);
    }
    showAuth("Ваша сессия завершилась. Войдите снова.");
  }
  return response;
}

function switchAuthTab(tab) {
  const loginActive = tab === "login";
  elements.loginTab.classList.toggle("is-active", loginActive);
  elements.loginTab.setAttribute("aria-selected", String(loginActive));
  elements.registerTab.classList.toggle("is-active", !loginActive);
  elements.registerTab.setAttribute("aria-selected", String(!loginActive));
  elements.loginForm.hidden = !loginActive;
  elements.registerForm.hidden = loginActive;
  elements.authTitle.textContent = loginActive ? "Вход в эфир" : "Новый зритель";
  elements.authSubtitle.textContent = loginActive
    ? "Введите данные вашей учётной записи."
    : "Создайте профиль и соберите личную видеотеку.";
  showFormError(elements.loginError);
  showFormError(elements.registerError);
  const firstField = (loginActive ? elements.loginForm : elements.registerForm).querySelector(
    "input",
  );
  firstField?.focus();
}

function showAuth(message = "") {
  state.accessToken = null;
  elements.bootScreen.hidden = true;
  elements.appScreen.hidden = true;
  elements.authScreen.hidden = false;
  switchAuthTab("login");
  if (message) showFormError(elements.loginError, message);
}

function showApp() {
  elements.bootScreen.hidden = true;
  elements.authScreen.hidden = true;
  elements.appScreen.hidden = false;
}

async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const response = await fetch("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(translateError(await responseError(response)));
  const payload = await response.json();
  state.accessToken = payload.access_token;
}

async function handleLogin(event) {
  event.preventDefault();
  showFormError(elements.loginError);
  if (!elements.loginForm.reportValidity()) return;
  const data = new FormData(elements.loginForm);
  setBusy(elements.loginForm, true);
  try {
    await login(String(data.get("email")).trim(), String(data.get("password")));
    showApp();
    await loadFavoriteIndex();
    setView("catalog");
    elements.loginForm.reset();
    showToast("Сигнал принят. Добро пожаловать в MovieMind.");
  } catch (error) {
    showFormError(elements.loginError, error.message);
  } finally {
    setBusy(elements.loginForm, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  showFormError(elements.registerError);
  if (!elements.registerForm.reportValidity()) return;
  const data = new FormData(elements.registerForm);
  const password = String(data.get("password"));
  if (password !== String(data.get("passwordConfirm"))) {
    showFormError(elements.registerError, "Пароли не совпадают.");
    return;
  }

  setBusy(elements.registerForm, true);
  try {
    const email = String(data.get("email")).trim();
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(data.get("username")).trim(),
        email,
        password,
      }),
    });
    if (!response.ok) throw new Error(translateError(await responseError(response)));
    await login(email, password);
    showApp();
    await loadFavoriteIndex();
    setView("catalog");
    elements.registerForm.reset();
    showToast("Профиль создан. Добро пожаловать в эфир.");
  } catch (error) {
    showFormError(elements.registerError, error.message);
  } finally {
    setBusy(elements.registerForm, false);
  }
}

async function logout() {
  elements.logoutButton.disabled = true;
  try {
    await fetch("/auth/logout", { method: "POST" });
  } finally {
    state.rawMovies = [];
    state.favoriteMovies = [];
    state.favoriteIds.clear();
    elements.favoriteCount.textContent = "0";
    if (elements.movieDialog.open) elements.movieDialog.close();
    elements.logoutButton.disabled = false;
    showAuth();
  }
}

function renderGenres() {
  const selected = new Set(
    [...elements.genreOptions.querySelectorAll("input:checked")].map((input) => input.value),
  );
  const known = new Map(BASE_GENRES);
  for (const movie of [...state.rawMovies, ...state.favoriteMovies]) {
    for (const genre of movie.genres || []) {
      if (!known.has(genre)) known.set(genre, genre);
    }
  }

  elements.genreOptions.replaceChildren();
  for (const [value, label] of known) {
    const wrapper = document.createElement("label");
    wrapper.className = "genre-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.checked = selected.has(value);
    const text = document.createElement("span");
    text.textContent = label;
    wrapper.append(input, text);
    elements.genreOptions.append(wrapper);
  }
}

function selectedGenres() {
  return [...elements.genreOptions.querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
}

function getMovieYear(movie) {
  const year = Number.parseInt(String(movie.release_date || "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : 0;
}

function activeFilterCount() {
  return (
    selectedGenres().length +
    Number(Boolean(elements.yearFrom.value)) +
    Number(Boolean(elements.yearTo.value)) +
    Number(Number(elements.ratingMin.value) > 0) +
    Number(elements.sortSelect.value !== "default")
  );
}

function applyFilters(resetPage = true) {
  const genres = selectedGenres().map((genre) => genre.toLocaleLowerCase("ru"));
  const yearFrom = Number(elements.yearFrom.value) || 0;
  const yearTo = Number(elements.yearTo.value) || 9999;
  const ratingMin = Number(elements.ratingMin.value) || 0;
  const localQuery = state.view === "favorites" ? state.searchTerm.toLocaleLowerCase("ru") : "";

  state.filteredMovies = state.rawMovies.filter((movie) => {
    const movieGenres = (movie.genres || []).map((genre) => genre.toLocaleLowerCase("ru"));
    const year = getMovieYear(movie);
    return (
      (!localQuery || movie.original_title.toLocaleLowerCase("ru").includes(localQuery)) &&
      genres.every((genre) => movieGenres.includes(genre)) &&
      (!yearFrom || year >= yearFrom) &&
      (!yearTo || year <= yearTo) &&
      Number(movie.vote_average || 0) >= ratingMin
    );
  });

  const collator = new Intl.Collator("ru", { sensitivity: "base" });
  const sorts = {
    "title-asc": (a, b) => collator.compare(a.original_title, b.original_title),
    "title-desc": (a, b) => collator.compare(b.original_title, a.original_title),
    "year-desc": (a, b) => getMovieYear(b) - getMovieYear(a),
    "year-asc": (a, b) => getMovieYear(a) - getMovieYear(b),
    "rating-desc": (a, b) => Number(b.vote_average || 0) - Number(a.vote_average || 0),
    "votes-desc": (a, b) => Number(b.vote_count || 0) - Number(a.vote_count || 0),
  };
  const sort = sorts[elements.sortSelect.value];
  if (sort) state.filteredMovies.sort(sort);

  if (resetPage) state.currentPage = 1;
  const count = activeFilterCount();
  elements.filterCount.textContent = String(count);
  elements.filterCount.hidden = count === 0;
  elements.ratingValue.textContent = String(ratingMin);
  renderResults();
}

function createPoster(movie, className = "poster-frame") {
  const frame = document.createElement("div");
  frame.className = className;
  if (movie.poster_url) {
    const image = document.createElement("img");
    image.src = movie.poster_url;
    image.alt = `Постер фильма «${movie.original_title}»`;
    image.loading = "lazy";
    frame.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "poster-placeholder";
    placeholder.textContent = "MM";
    frame.append(placeholder);
  }
  return frame;
}

function favoriteButton(movie) {
  const isFavorite = state.favoriteIds.has(movie.tmdb_id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `favorite-card-button${isFavorite ? " is-favorite" : ""}`;
  button.textContent = isFavorite ? "♥" : "♡";
  button.setAttribute(
    "aria-label",
    isFavorite ? "Удалить из избранного" : "Добавить в избранное",
  );
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(movie, button);
  });
  return button;
}

function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "movie-open";
  openButton.setAttribute("aria-label", `Подробнее о фильме «${movie.original_title}»`);

  const poster = createPoster(movie);
  const rating = document.createElement("span");
  rating.className = "rating-badge";
  rating.textContent = `★ ${Number(movie.vote_average || 0).toFixed(1)}`;
  poster.append(rating);

  const title = document.createElement("h3");
  title.className = "movie-title";
  title.textContent = movie.original_title;
  const year = document.createElement("p");
  year.className = "movie-year";
  year.textContent = getMovieYear(movie) || "Год неизвестен";
  openButton.append(poster, title, year);
  openButton.addEventListener("click", () => openMovie(movie));
  card.append(openButton, favoriteButton(movie));
  return card;
}

function emptyCopy() {
  const heading = elements.emptyState.querySelector("h3");
  const copy = elements.emptyState.querySelector("p");
  if (state.view === "favorites" && state.rawMovies.length === 0) {
    heading.textContent = "Видеотека пуста";
    copy.textContent = "Добавляйте фильмы из поиска — они появятся здесь.";
  } else if (state.rawMovies.length > 0) {
    heading.textContent = "Ничего не совпало";
    copy.textContent = "Ослабьте фильтры или измените поисковый запрос.";
  } else if (state.searchTerm) {
    heading.textContent = "Сигнал не найден";
    copy.textContent = "Попробуйте другое название фильма.";
  } else {
    heading.textContent = "Эфир пока пуст";
    copy.textContent = "Введите название фильма в строке выше.";
  }
}

function pageItems(totalPages, currentPage) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const valid = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const output = [];
  for (const page of valid) {
    const previous = output.at(-1);
    if (typeof previous === "number" && page - previous > 1) output.push("…");
    output.push(page);
  }
  return output;
}

function renderPagination(totalPages) {
  elements.pagination.replaceChildren();
  if (totalPages <= 1) return;

  const addButton = (label, page, active = false, ariaLabel = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-button${active ? " is-active" : ""}`;
    button.textContent = label;
    if (active) button.setAttribute("aria-current", "page");
    if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", () => {
      state.currentPage = page;
      renderResults();
      elements.resultsTitle.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    elements.pagination.append(button);
  };

  if (state.currentPage > 1) addButton("←", state.currentPage - 1, false, "Предыдущая страница");
  for (const item of pageItems(totalPages, state.currentPage)) {
    if (item === "…") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "page-ellipsis";
      ellipsis.textContent = item;
      elements.pagination.append(ellipsis);
    } else {
      addButton(String(item), item, item === state.currentPage, `Страница ${item}`);
    }
  }
  if (state.currentPage < totalPages) {
    addButton("→", state.currentPage + 1, false, "Следующая страница");
  }
}

function renderResults() {
  if (state.loading) return;
  elements.movieGrid.replaceChildren();
  const total = state.filteredMovies.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages && state.currentPage > totalPages) state.currentPage = totalPages;
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageMovies = state.filteredMovies.slice(start, start + PAGE_SIZE);

  for (const movie of pageMovies) elements.movieGrid.append(createMovieCard(movie));
  elements.emptyState.hidden = total > 0;
  emptyCopy();
  elements.resultsMeta.textContent = total
    ? `${total} ${pluralizeMovies(total)} · страница ${state.currentPage} из ${totalPages}`
    : "0 фильмов";
  renderPagination(totalPages);
}

function pluralizeMovies(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "фильм";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "фильма";
  return "фильмов";
}

function setLoading(loading) {
  state.loading = loading;
  elements.loadingState.hidden = !loading;
  elements.emptyState.hidden = true;
  elements.movieGrid.hidden = loading;
  elements.pagination.hidden = loading;
  elements.searchForm.querySelector("button").disabled = loading;
  if (!loading) {
    elements.movieGrid.hidden = false;
    elements.pagination.hidden = false;
  }
}

async function searchCatalog(query) {
  state.searchTerm = query;
  setLoading(true);
  elements.resultsMeta.textContent = "Настройка частоты…";
  try {
    const response = await apiFetch(
      `/api/movies/search?skip=0&limit=${SEARCH_LIMIT}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language: "ru-RU" }),
      },
    );
    if (!response.ok) throw new Error(await responseError(response));
    state.rawMovies = await response.json();
    renderGenres();
    applyFilters();
  } catch (error) {
    state.rawMovies = [];
    state.filteredMovies = [];
    showToast(translateError(error.message));
  } finally {
    setLoading(false);
    applyFilters();
  }
}

async function fetchFavorites() {
  const response = await apiFetch(
    `/api/movies/?skip=0&limit=${FAVORITES_LIMIT}`,
    { method: "GET" },
    true,
  );
  if (!response.ok) throw new Error(await responseError(response));
  return response.json();
}

async function loadFavoriteIndex(showError = true) {
  try {
    state.favoriteMovies = await fetchFavorites();
    state.favoriteIds = new Set(state.favoriteMovies.map((movie) => movie.tmdb_id));
    elements.favoriteCount.textContent = String(state.favoriteIds.size);
    renderGenres();
  } catch (error) {
    if (showError) showToast(translateError(error.message));
  }
}

async function loadFavorites() {
  setLoading(true);
  elements.resultsMeta.textContent = "Открываем видеотеку…";
  try {
    await loadFavoriteIndex();
    state.rawMovies = [...state.favoriteMovies];
    renderGenres();
  } finally {
    setLoading(false);
    applyFilters();
  }
}

function setView(view) {
  state.view = view;
  state.searchTerm = "";
  state.rawMovies = [];
  state.filteredMovies = [];
  state.currentPage = 1;
  elements.searchInput.value = "";
  for (const link of elements.navLinks) {
    const active = link.dataset.view === view;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  const favorites = view === "favorites";
  elements.searchInput.required = !favorites;
  elements.channelLabel.textContent = favorites
    ? "КАНАЛ 02 · ЛИЧНАЯ ВИДЕОТЕКА"
    : "КАНАЛ 01 · КАТАЛОГ";
  elements.pageTitle.textContent = favorites ? "Избранное" : "Что смотрим?";
  elements.pageSubtitle.textContent = favorites
    ? "Фильмы, которые вы сохранили для правильного вечера."
    : "Введите название — мы настроимся на нужную волну.";
  elements.searchInput.placeholder = favorites
    ? "Поиск в вашей видеотеке"
    : "Например, The Matrix";
  elements.resultsTitle.textContent = favorites ? "Моя видеотека" : "Результаты";
  elements.emptyState.hidden = false;
  elements.resultsMeta.textContent = "";
  emptyCopy();
  renderPagination(0);
  elements.movieGrid.replaceChildren();
  if (favorites) loadFavorites();
}

async function toggleFavorite(movie, button = elements.dialogFavorite) {
  const wasFavorite = state.favoriteIds.has(movie.tmdb_id);
  button.disabled = true;
  try {
    const response = await apiFetch(
      `/api/movies/${movie.tmdb_id}/favorite${wasFavorite ? "" : "?language=ru-RU"}`,
      { method: wasFavorite ? "DELETE" : "POST" },
      true,
    );
    if (!response.ok && !(response.status === 409 && !wasFavorite)) {
      throw new Error(await responseError(response));
    }

    if (wasFavorite) {
      state.favoriteIds.delete(movie.tmdb_id);
      state.favoriteMovies = state.favoriteMovies.filter(
        (item) => item.tmdb_id !== movie.tmdb_id,
      );
      if (state.view === "favorites") {
        state.rawMovies = state.rawMovies.filter((item) => item.tmdb_id !== movie.tmdb_id);
      }
      showToast("Фильм удалён из избранного.");
    } else {
      state.favoriteIds.add(movie.tmdb_id);
      if (!state.favoriteMovies.some((item) => item.tmdb_id === movie.tmdb_id)) {
        state.favoriteMovies.unshift(movie);
      }
      showToast("Фильм добавлен в избранное.");
    }
    elements.favoriteCount.textContent = String(state.favoriteIds.size);
    applyFilters(false);
    if (state.currentMovie?.tmdb_id === movie.tmdb_id) updateDialogFavorite(movie);
  } catch (error) {
    showToast(translateError(error.message));
  } finally {
    button.disabled = false;
  }
}

function formatDate(value) {
  if (!value) return "Не указана";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function updateDialogFavorite(movie) {
  const isFavorite = state.favoriteIds.has(movie.tmdb_id);
  elements.dialogFavorite.textContent = isFavorite
    ? "♥ Удалить из избранного"
    : "♡ Добавить в избранное";
}

function openMovie(movie) {
  state.currentMovie = movie;
  elements.dialogPoster.replaceChildren(...createPoster(movie, "dialog-poster-inner").children);
  elements.dialogId.textContent = `TMDB ${movie.tmdb_id}`;
  elements.dialogTitle.textContent = movie.original_title;
  elements.dialogDate.textContent = formatDate(movie.release_date);
  elements.dialogGenres.textContent = (movie.genres || []).join(" · ") || "Не указаны";
  elements.dialogRating.textContent = Number(movie.vote_average || 0).toFixed(1);
  elements.dialogVotes.textContent = new Intl.NumberFormat("ru").format(movie.vote_count || 0);
  updateDialogFavorite(movie);
  elements.movieDialog.showModal();
}

function resetFilters() {
  for (const checkbox of elements.genreOptions.querySelectorAll("input")) {
    checkbox.checked = false;
  }
  elements.yearFrom.value = "";
  elements.yearTo.value = "";
  elements.ratingMin.value = "0";
  elements.sortSelect.value = "default";
  applyFilters();
}

function handleSearch(event) {
  event.preventDefault();
  const query = elements.searchInput.value.trim();
  if (!query && state.view === "catalog") {
    elements.searchInput.focus();
    return;
  }
  state.searchTerm = query;
  if (state.view === "catalog") searchCatalog(query);
  else applyFilters();
}

function bindEvents() {
  elements.loginTab.addEventListener("click", () => switchAuthTab("login"));
  elements.registerTab.addEventListener("click", () => switchAuthTab("register"));
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.logoutButton.addEventListener("click", logout);
  elements.searchForm.addEventListener("submit", handleSearch);
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => setView(link.dataset.view));
  });
  elements.filterToggle.addEventListener("click", () => {
    const open = elements.filterPanel.hidden;
    elements.filterPanel.hidden = !open;
    elements.filterToggle.setAttribute("aria-expanded", String(open));
  });
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.genreOptions.addEventListener("change", () => applyFilters());
  elements.yearFrom.addEventListener("input", () => applyFilters());
  elements.yearTo.addEventListener("input", () => applyFilters());
  elements.ratingMin.addEventListener("input", () => applyFilters());
  elements.sortSelect.addEventListener("change", () => applyFilters());
  elements.dialogClose.addEventListener("click", () => elements.movieDialog.close());
  elements.dialogFavorite.addEventListener("click", () => {
    if (state.currentMovie) toggleFavorite(state.currentMovie);
  });
  elements.movieDialog.addEventListener("click", (event) => {
    const bounds = elements.movieDialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (outside) elements.movieDialog.close();
  });
  elements.movieDialog.addEventListener("close", () => {
    state.currentMovie = null;
  });
}

async function boot() {
  bindEvents();
  renderGenres();
  const currentYear = new Date().getFullYear();
  elements.yearFrom.max = String(currentYear + 5);
  elements.yearTo.max = String(currentYear + 5);
  if (await refreshSession()) {
    showApp();
    await loadFavoriteIndex(false);
    setView("catalog");
  } else {
    showAuth();
  }
}

boot();
