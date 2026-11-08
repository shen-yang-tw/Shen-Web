# backend/app/core/security.py
# 驗證前端送來的 Supabase 登入 JWT，並取出使用者 id。所有需要登入的 API 都透過這裡進入。

# jwt 套件負責解析與驗證 JSON Web Token 的簽章與有效期限
import jwt
# PyJWKClient 會從 Supabase 的 JWKS 端點下載公鑰，並自動快取
from jwt import PyJWKClient
# FastAPI 的依賴注入與 HTTP 錯誤型別
from fastapi import Depends, HTTPException, status
# HTTPBearer 會從 Authorization 標頭取出 "Bearer <token>" 的 token 部分
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# 設定檔，取得 JWKS 位址與發行者
from app.core.config import settings
# 資料庫連線工具，用來查詢 Supabase Auth 的登入紀錄
from app.core.db import db_connection
# psycopg 的錯誤型別，資料庫失敗時用來回傳 503
import psycopg
# time.monotonic 是單調時鐘，快取到期判斷不受系統時間調整影響
import time
# 系統專屬 JWT（Google 登入後由後端簽發）的驗證與使用者狀態查詢
from app.core.app_token import verify_app_token
from app.repositories.user_repo import user_is_active
# uuid 用來檢查 session_id 格式，避免無效字串送進資料庫
import uuid

# 建立 Bearer 解析器；auto_error=False 讓我們自行回傳統一格式的 401 錯誤
bearer_scheme = HTTPBearer(auto_error=False)

# 建立 JWKS 客戶端；lifespan 不需要，因為 PyJWKClient 會在第一次使用時載入並快取金鑰
_jwks_client = PyJWKClient(settings.supabase_jwks_url, cache_keys=True) if settings.supabase_jwks_url else None

# 允許的簽章演算法：Supabase 新專案用 ES256 或 RS256 非對稱金鑰，不接受 none 或 HS256 共用密鑰
_ALLOWED_ALGORITHMS = ["ES256", "RS256"]

# 已確認有效的登入 session 快取：session_id -> (user_id, 快取到期的單調時間)
_session_cache: dict[str, tuple[str, float]] = {}
# 快取筆數上限，超過時清掉已過期的項目，避免記憶體無限成長
_SESSION_CACHE_MAX = 5000


def _is_session_active(session_id: str, user_id: str) -> bool:
    # 先看快取：近期已確認有效的 session 不必再查資料庫
    cached = _session_cache.get(session_id)
    if cached is not None and cached[0] == user_id and cached[1] > time.monotonic():
        return True

    # 查 Supabase Auth 的 sessions 表；local 或 global 登出時，對應的列會被刪除
    # not_after 是 Supabase 的時間上限，超過時同樣視為失效
    with db_connection() as conn:
        row = conn.execute(
            "select 1 from auth.sessions where id = %s and user_id = %s and (not_after is null or not_after > now())",
            (session_id, user_id),
        ).fetchone()

    if row is None:
        # 已登出或已失效，清掉可能殘留的快取
        _session_cache.pop(session_id, None)
        return False

    # 快取期滿後會重新查詢，撤銷最遲在快取秒數後生效
    now = time.monotonic()
    if len(_session_cache) >= _SESSION_CACHE_MAX:
        # 先清掉已過期的項目；若仍超過上限，就整批清空，確保記憶體上限
        expired = [key for key, (_, expires) in _session_cache.items() if expires <= now]
        for key in expired:
            _session_cache.pop(key, None)
        if len(_session_cache) >= _SESSION_CACHE_MAX:
            _session_cache.clear()
    _session_cache[session_id] = (user_id, now + settings.session_check_cache_seconds)
    return True


def _authenticate_app_token(token: str) -> str:
    # 驗證後端自己簽發的 JWT：簽章、期限、發行者、受眾都要對
    try:
        user_id = verify_app_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登入憑證無效或已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 再確認使用者還存在且沒被停權；沿用 session 快取，避免每個請求都查資料庫
    cache_key = f"app:{user_id}"
    cached = _session_cache.get(cache_key)
    if cached is not None and cached[1] > time.monotonic():
        return user_id
    try:
        active = user_is_active(user_id)
    except psycopg.Error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="驗證服務暫時無法使用，請稍後再試")
    if not active:
        _session_cache.pop(cache_key, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登入已失效，請重新登入",
            headers={"WWW-Authenticate": "Bearer"},
        )
    _session_cache[cache_key] = (user_id, time.monotonic() + settings.session_check_cache_seconds)
    return user_id


def get_current_user_id(
    # 從請求標頭取得 Bearer token，沒有就是 None
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    # 系統 JWT 不需要 Supabase JWKS；仍必須提供憑證。
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登入或驗證尚未設定",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 取出 token 字串本身
    token = credentials.credentials

    # 系統專屬 JWT（HS256）走自己的驗證；Supabase 的 JWT 是 ES256/RS256，不會進到這裡
    try:
        is_app_token = jwt.get_unverified_header(token).get("alg") == "HS256"
    except jwt.PyJWTError:
        is_app_token = False
    if is_app_token:
        return _authenticate_app_token(token)

    if _jwks_client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登入或驗證尚未設定",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # 依 token 標頭的 kid 找到對應公鑰
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        # 驗證簽章、過期時間、受眾 authenticated 與發行者
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALLOWED_ALGORITHMS,
            audience="authenticated",
            issuer=settings.supabase_jwt_issuer,
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except jwt.PyJWTError:
        # 任何驗證失敗都回傳相同的錯誤訊息，避免洩漏驗證細節給攻擊者
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登入憑證無效或已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # sub 欄位即為 Supabase 的使用者 uuid，之後所有資料查詢都以它為準
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登入憑證無效")

    # session_id 對應 Supabase 的 auth.sessions 列；沒有或格式錯誤代表憑證無效
    session_id = payload.get("session_id")
    try:
        uuid.UUID(str(session_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登入憑證無效")

    # 檢查此登入是否已被登出（local 或 global）；資料庫失敗時一律拒絕，不放行
    try:
        active = _is_session_active(str(session_id), user_id)
    except psycopg.Error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="驗證服務暫時無法使用，請稍後再試")
    if not active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登入已失效，請重新登入",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


# 給路由使用的型別別名，讓函式參數一眼就看出需要登入
CurrentUserId = Depends(get_current_user_id)
