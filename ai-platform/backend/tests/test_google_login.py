# backend/tests/test_google_login.py
# Google 登入與系統 JWT 的測試：Google 驗證用假資料取代，資料庫部分用真實連線並在結束後清除測試使用者。
import time
import uuid

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core import app_token, security
from app.core.config import settings
from app.main import app
from app.services import google_auth

client = TestClient(app)
SECRET = "x" * 40


@pytest.fixture(autouse=True)
def _config(monkeypatch):
    monkeypatch.setattr(settings, "app_jwt_secret", SECRET)
    monkeypatch.setattr(settings, "google_client_id", "client-id.apps.googleusercontent.com")
    from app.api import auth as auth_api

    auth_api._attempts.clear()
    security._session_cache.clear()


def _post(credential="c" * 30):
    return client.post("/api/auth/google", json={"credential": credential})


def _signed(key=SECRET, **overrides):
    payload = {"sub": str(uuid.uuid4()), "iss": app_token.APP_TOKEN_ISSUER, "aud": app_token.APP_TOKEN_AUDIENCE, "exp": int(time.time()) + 600}
    payload.update(overrides)
    return jwt.encode(payload, key, algorithm="HS256")


def test_invalid_google_token_returns_401():
    # 隨便一串字不是合法的 Google token，google-auth 會拒絕
    assert _post().status_code == 401


def test_short_credential_rejected_by_validation():
    assert _post("abc").status_code == 422


def test_disabled_without_secret(monkeypatch):
    monkeypatch.setattr(settings, "app_jwt_secret", "")
    assert _post().status_code == 503


def test_disabled_without_client_id(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    assert _post().status_code == 503


def test_unverified_email_rejected(monkeypatch):
    monkeypatch.setattr(google_auth.id_token, "verify_oauth2_token", lambda *a, **k: {"email": "a@b.com", "email_verified": False})
    assert _post().status_code == 401


def test_rate_limit():
    codes = [_post().status_code for _ in range(12)]
    assert codes[:10] == [401] * 10 and codes[10] == 429


def test_register_login_and_use_token(monkeypatch):
    email = f"pytest-{uuid.uuid4().hex[:8]}@example.com"
    monkeypatch.setattr(
        google_auth.id_token,
        "verify_oauth2_token",
        lambda *a, **k: {"email": email, "email_verified": True, "sub": uuid.uuid4().hex, "name": "Pytest"},
    )
    from app.core.db import db_connection

    try:
        first = _post()
        assert first.status_code == 200, first.text
        body = first.json()
        assert body["is_new_user"] is True and body["email"] == email
        # 第二次登入：同一個信箱不會重複建立，回傳同一個使用者
        second = _post().json()
        assert second["is_new_user"] is False and second["user_id"] == body["user_id"]
        # 系統 JWT 可以呼叫需要登入的 API
        ok = client.get("/api/prompts", headers={"Authorization": f"Bearer {body['access_token']}"})
        assert ok.status_code == 200, ok.text
    finally:
        with db_connection() as conn:
            conn.execute("delete from auth.users where lower(email) = lower(%s)", (email,))


@pytest.mark.parametrize(
    "token",
    [
        _signed(exp=int(time.time()) - 5),
        _signed(iss="evil"),
        _signed(aud="authenticated"),
        _signed(key="y" * 40),
        "not-a-jwt",
    ],
)
def test_forged_or_expired_tokens_rejected(token):
    r = client.get("/api/prompts", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_unknown_user_with_valid_signature_rejected():
    # 簽章正確但使用者不存在於資料庫，仍須拒絕
    r = client.get("/api/prompts", headers={"Authorization": f"Bearer {_signed()}"})
    assert r.status_code == 401
