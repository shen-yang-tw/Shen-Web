import psycopg
import pytest
from fastapi.testclient import TestClient

from app.api import auth
from app.core import security
from app.core.app_token import verify_app_token
from app.core.config import settings
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def config(monkeypatch):
    monkeypatch.setattr(settings, "app_jwt_secret", "x" * 40)
    security._session_cache.clear()


def test_demo_is_fixed_account_and_token_authenticates(monkeypatch):
    checked = []
    monkeypatch.setattr(auth.user_repo, "demo_user_is_active", lambda uid, email: checked.append((uid, email)) or True)
    monkeypatch.setattr(security, "user_is_active", lambda uid: uid == auth.DEMO_USER_ID)
    monkeypatch.setattr(security, "_jwks_client", None)
    response = client.post("/api/auth/demo", json={"user_id": "attacker", "email": "other@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert checked == [(auth.DEMO_USER_ID, auth.DEMO_EMAIL)]
    assert data["user_id"] == auth.DEMO_USER_ID
    assert data["email"] == auth.DEMO_EMAIL
    assert data["expires_in"] > 0
    assert verify_app_token(data["access_token"]) == auth.DEMO_USER_ID
    credentials = security.HTTPAuthorizationCredentials(scheme="Bearer", credentials=data["access_token"])
    assert security.get_current_user_id(credentials) == auth.DEMO_USER_ID


def test_demo_unavailable_without_secret(monkeypatch):
    monkeypatch.setattr(settings, "app_jwt_secret", "")
    assert client.post("/api/auth/demo").status_code == 503


def test_demo_missing_or_disabled(monkeypatch):
    monkeypatch.setattr(auth.user_repo, "demo_user_is_active", lambda *_: False)
    assert client.post("/api/auth/demo").status_code == 503


def test_demo_database_failure(monkeypatch):
    def fail(*_):
        raise psycopg.OperationalError("database unavailable")

    monkeypatch.setattr(auth.user_repo, "demo_user_is_active", fail)
    assert client.post("/api/auth/demo").status_code == 503
