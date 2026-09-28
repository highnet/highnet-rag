from fastapi.testclient import TestClient

from highnet_rag.app import create_app


def test_cors_allows_listed_origin_and_vercel_previews(make_settings) -> None:
    settings = make_settings(
        cors_origins="https://rag.example.com, http://localhost:3000",
        cors_origin_regex=r"^https://highnet-rag(-[a-z0-9-]+)?\.vercel\.app$",
    )
    with TestClient(create_app(settings)) as c:
        for origin in ("https://rag.example.com", "https://highnet-rag-git-main-me.vercel.app"):
            r = c.get("/api/health", headers={"Origin": origin})
            assert r.headers["access-control-allow-origin"] == origin
        r = c.get("/api/health", headers={"Origin": "https://evil.example"})
        assert "access-control-allow-origin" not in r.headers


def test_no_cors_headers_without_configuration(client: TestClient) -> None:
    r = client.get("/api/health", headers={"Origin": "https://rag.example.com"})
    assert "access-control-allow-origin" not in r.headers
