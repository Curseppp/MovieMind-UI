# MovieMind UI

React-интерфейс для `MovieMind-API` в стилистике старого чёрно-белого
телевизора и печатной рекламы 80–90-х.

## Возможности

- вход, регистрация, автоматическое восстановление и обновление сессии;
- logout с отзывом серверной сессии;
- поиск фильмов с выдачей по 10 карточек на страницу;
- постеры, названия и подробная карточка со всеми полями `PublicMovie`;
- добавление фильмов в избранное и удаление из него;
- отдельный маршрут личной видеотеки `/favorites`;
- поиск и одинаковые фильтры в каталоге и избранном;
- AND-фильтр по жанрам, диапазон лет и минимальный рейтинг;
- сортировка по алфавиту, году, рейтингу и популярности;
- адаптивная вёрстка и управление с клавиатуры.

## Стек и архитектура

- React 19 + TypeScript;
- Vite для development-сервера и production-сборки;
- React Router;
- Vitest + Testing Library;
- FastAPI как небольшой BFF-прокси;
- `uv` для Python-зависимостей и `pnpm` для frontend-зависимостей.

Браузер работает с одним origin, а FastAPI передаёт запросы в
`MovieMind-API`. Благодаря этому refresh-токен остаётся в `HttpOnly` cookie,
access-токен хранится только в памяти React-приложения, а CORS не требуется.

```text
MovieMind-UI/
├── app/                 # FastAPI BFF и production-сервер
├── frontend/
│   ├── src/
│   │   ├── components/  # UI-компоненты
│   │   ├── contexts/    # сессия, избранное, уведомления
│   │   └── pages/       # страницы каталога и избранного
│   └── dist/            # production-сборка, не хранится в Git
└── tests/               # тесты Python-прокси
```

## Подготовка API

Нужны Python 3.13, [uv](https://docs.astral.sh/uv/), Node.js и `pnpm`.

Запустите API на порту `8001`:

```bash
cd ../MovieMind-API
docker compose up --build
```

Если таблица жанров ещё не заполнена, один раз выполните:

```bash
curl -X POST http://127.0.0.1:8001/movies/genre/list
```

## Development-запуск

Установите зависимости:

```bash
uv sync
cd frontend
pnpm install
cd ..
```

Запустите BFF в первом терминале:

```bash
cp .env.example .env
uv run uvicorn app.main:app --reload --env-file .env --port 8080
```

Во втором терминале запустите Vite:

```bash
cd frontend
pnpm dev
```

Откройте [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite автоматически
проксирует `/auth`, `/api` и `/health` в BFF на порту `8080`.

## Production-запуск

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..
cp .env.example .env
uv sync --frozen
uv run uvicorn app.main:app --env-file .env --port 8080
```

После сборки FastAPI отдаёт React-приложение по адресу
[http://127.0.0.1:8080](http://127.0.0.1:8080), включая прямые переходы на
`/favorites`.

## Проверки

```bash
uv run ruff check app tests
uv run pytest

cd frontend
pnpm lint
pnpm test
pnpm build
```

Frontend-тесты покрывают восстановление сессии, каталог, пагинацию, AND-фильтр
жанров, подробную карточку, избранное, маршрутизацию и logout. Прокси-тесты
проверяют передачу формы входа, Bearer-токена, JSON, query-параметров,
refresh-cookie, SPA fallback и ошибку при недоступном API.
