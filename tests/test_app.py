import httpx
from fastapi.testclient import TestClient
from pathlib import Path

from app.main import create_app


def frontend_dist(tmp_path: Path) -> Path:
    dist = tmp_path / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text(
        '<main id="root">MOVIEMIND</main><script src="/assets/app.js"></script>',
        encoding="utf-8",
    )
    (assets / "app.js").write_text("console.log('MovieMind')", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg></svg>", encoding="utf-8")
    return dist


def test_index_and_security_headers(tmp_path: Path) -> None:
    with TestClient(create_app(frontend_dist=frontend_dist(tmp_path))) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert "MOVIEMIND" in response.text
    assert response.headers["x-frame-options"] == "DENY"
    assert "default-src 'self'" in response.headers["content-security-policy"]


def test_spa_route_and_built_assets(tmp_path: Path) -> None:
    with TestClient(create_app(frontend_dist=frontend_dist(tmp_path))) as client:
        route_response = client.get("/favorites")
        asset_response = client.get("/assets/app.js")

    assert route_response.status_code == 200
    assert "MOVIEMIND" in route_response.text
    assert asset_response.status_code == 200
    assert "MovieMind" in asset_response.text


def test_missing_frontend_build_returns_instructions(tmp_path: Path) -> None:
    with TestClient(create_app(frontend_dist=tmp_path / "missing")) as client:
        response = client.get("/")

    assert response.status_code == 503
    assert "pnpm build" in response.json()["detail"]


def test_auth_proxy_preserves_form_data_and_refresh_cookie() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/auth/token"
        assert request.content == b"username=user%40example.com&password=secret"
        return httpx.Response(
            200,
            json={"access_token": "access-token", "token_type": "bearer"},
            headers={
                "set-cookie": (
                    "refresh_token=refresh-token; HttpOnly; Path=/auth; SameSite=strict"
                )
            },
        )

    app = create_app(upstream_transport=httpx.MockTransport(handler))
    with TestClient(app) as client:
        response = client.post(
            "/auth/token",
            data={"username": "user@example.com", "password": "secret"},
        )

    assert response.status_code == 200
    assert response.json()["access_token"] == "access-token"
    assert "refresh_token=refresh-token" in response.headers["set-cookie"]
    assert "httponly" in response.headers["set-cookie"].lower()


def test_api_proxy_forwards_bearer_token_query_and_json() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/movies/search"
        assert request.url.query == b"skip=10&limit=100"
        assert request.headers["authorization"] == "Bearer access-token"
        assert request.content == b'{"query":"matrix"}'
        return httpx.Response(200, json=[])

    app = create_app(upstream_transport=httpx.MockTransport(handler))
    with TestClient(app) as client:
        response = client.post(
            "/api/movies/search?skip=10&limit=100",
            content=b'{"query":"matrix"}',
            headers={
                "Authorization": "Bearer access-token",
                "Content-Type": "application/json",
            },
        )

    assert response.status_code == 200
    assert response.json() == []


def test_proxy_returns_readable_error_when_api_is_unavailable() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    app = create_app(upstream_transport=httpx.MockTransport(handler))
    with TestClient(app) as client:
        response = client.post("/auth/refresh")

    assert response.status_code == 502
    assert "недоступен" in response.json()["detail"]
