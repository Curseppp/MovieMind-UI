from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles


FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
PROXY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
FORWARDED_REQUEST_HEADERS = {"accept", "authorization", "content-type", "cookie"}
FORWARDED_RESPONSE_HEADERS = {
    "cache-control",
    "content-language",
    "content-type",
    "www-authenticate",
}


def create_app(
    api_url: str | None = None,
    upstream_transport: httpx.AsyncBaseTransport | None = None,
    frontend_dist: Path | None = None,
) -> FastAPI:
    upstream_url = (
        api_url or os.getenv("MOVIEMIND_API_URL", "http://127.0.0.1:8001")
    ).rstrip("/")
    frontend_path = frontend_dist or FRONTEND_DIST

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient(
            base_url=upstream_url,
            follow_redirects=True,
            timeout=httpx.Timeout(20.0),
            transport=upstream_transport,
        ) as client:
            app.state.upstream = client
            yield

    app = FastAPI(
        title="MovieMind UI",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: https:; "
            "style-src 'self'; script-src 'self'; connect-src 'self'; "
            "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        )
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    async def forward(request: Request, upstream_path: str) -> Response:
        query = request.url.query
        target = f"{upstream_path}?{query}" if query else upstream_path
        headers = {
            key: value
            for key, value in request.headers.items()
            if key.lower() in FORWARDED_REQUEST_HEADERS
        }

        try:
            upstream_response = await request.app.state.upstream.request(
                method=request.method,
                url=target,
                headers=headers,
                content=await request.body(),
            )
        except httpx.RequestError:
            return JSONResponse(
                status_code=502,
                content={
                    "detail": "MovieMind API недоступен. Проверьте, что он запущен."
                },
            )

        response_headers = {
            key: value
            for key, value in upstream_response.headers.items()
            if key.lower() in FORWARDED_RESPONSE_HEADERS
        }
        response = Response(
            content=upstream_response.content,
            status_code=upstream_response.status_code,
            headers=response_headers,
        )
        for cookie in upstream_response.headers.get_list("set-cookie"):
            response.headers.append("set-cookie", cookie)
        return response

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.api_route("/auth/{path:path}", methods=PROXY_METHODS, include_in_schema=False)
    async def auth_proxy(request: Request, path: str) -> Response:
        return await forward(request, f"/auth/{path}")

    @app.api_route("/api/{path:path}", methods=PROXY_METHODS, include_in_schema=False)
    async def api_proxy(request: Request, path: str) -> Response:
        return await forward(request, f"/{path}")

    assets_path = frontend_path / "assets"
    if assets_path.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    favicon_path = frontend_path / "favicon.svg"
    if favicon_path.is_file():

        @app.get("/favicon.svg", include_in_schema=False)
        async def favicon() -> FileResponse:
            return FileResponse(favicon_path)

    @app.get("/{spa_path:path}", include_in_schema=False)
    async def spa(spa_path: str) -> Response:
        index_path = frontend_path / "index.html"
        if not index_path.is_file():
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "React-приложение не собрано. Выполните pnpm build."
                },
            )
        return FileResponse(index_path)

    return app


app = create_app()
