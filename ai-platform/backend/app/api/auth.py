# backend/app/api/auth.py
# Google 登入路由：接收前端傳來的 Google ID Token，驗證後（必要時自動註冊）回傳系統專屬 JWT。

# 時間與鎖：做簡單的「每個來源 IP 每分鐘次數」限制，擋掉暴力嘗試
import time
import logging
from collections import defaultdict, deque
from threading import Lock

# psycopg 錯誤：資料庫出問題時回 503
import psycopg
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.app_token import app_token_enabled, issue_app_token
from app.repositories import user_repo
from app.services.google_auth import GoogleLoginDisabled, GoogleTokenError, verify_google_credential

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)

# 只允許使用這個專用展示帳號，絕不接受前端指定的帳號或使用者 ID。
DEMO_USER_ID = "a2abd11c-9bd8-4e12-ae01-e8438043eb60"
DEMO_EMAIL = "demo@shenyang.win"

# 每個 IP 每分鐘最多嘗試次數
_MAX_ATTEMPTS_PER_MINUTE = 10
_attempts: dict[str, deque[float]] = defaultdict(deque)
_attempts_lock = Lock()


class GoogleLoginRequest(BaseModel):
    # Google 回傳的 credential（ID Token，是一長串 JWT）；限制長度避免被塞入超大內容
    credential: str = Field(min_length=20, max_length=4096)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    email: str
    is_new_user: bool


@router.post("/api/auth/demo", response_model=LoginResponse)
def demo_login() -> LoginResponse:
    # 展示帳號不依賴公開的 Supabase 密碼；停用、刪除或更換信箱後不再簽發。
    if not app_token_enabled():
        logger.error("Demo login is unavailable: APP_JWT_SECRET is not configured")
        raise HTTPException(status_code=503, detail="訪客登入尚未啟用")
    try:
        active = user_repo.demo_user_is_active(DEMO_USER_ID, DEMO_EMAIL)
    except psycopg.Error:
        logger.exception("Demo login could not check the account")
        raise HTTPException(status_code=503, detail="資料庫暫時無法使用") from None
    if not active:
        logger.error("Demo login is unavailable: the designated account is not active")
        raise HTTPException(status_code=503, detail="訪客帳號暫時無法使用")
    token, expires_in = issue_app_token(DEMO_USER_ID, DEMO_EMAIL)
    return LoginResponse(access_token=token, expires_in=expires_in, user_id=DEMO_USER_ID, email=DEMO_EMAIL, is_new_user=False)


def _client_ip(request: Request) -> str:
    # 經過 Next.js 代理與 gateway 時，真實 IP 在 X-Forwarded-For 的第一段
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    with _attempts_lock:
        window = _attempts[ip]
        # 丟掉 60 秒以前的紀錄
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= _MAX_ATTEMPTS_PER_MINUTE:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="嘗試次數過多，請稍後再試")
        window.append(now)
        # 避免字典無限成長：偶爾清掉已空的項目
        if len(_attempts) > 5000:
            for key in [k for k, v in _attempts.items() if not v]:
                _attempts.pop(key, None)


# 這是同步函式（def）：FastAPI 會自動放到執行緒池執行，下載 Google 公鑰與查資料庫都不會卡住事件迴圈
@router.post("/api/auth/google", response_model=LoginResponse)
def google_login(body: GoogleLoginRequest, request: Request) -> LoginResponse:
    _check_rate_limit(_client_ip(request))

    # 1. 伺服器沒設定好就明確告知，而不是回一個讓人看不懂的錯誤
    if not app_token_enabled():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google 登入尚未啟用")

    # 2. 驗證 Google ID Token（簽章、期限、受眾、信箱已驗證）
    try:
        info = verify_google_credential(body.credential)
    except GoogleLoginDisabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google 登入尚未啟用")
    except GoogleTokenError:
        # 統一回傳相同訊息，不透露是哪一項驗證失敗
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google 憑證無效或已過期")

    email = str(info["email"]).strip().lower()
    # 3. 信箱存在就直接登入；不存在就自動建立使用者
    try:
        user_id, is_new = user_repo.find_or_create_google_user(
            email=email,
            google_sub=str(info.get("sub", "")),
            name=str(info.get("name") or email.split("@")[0])[:100],
            picture=str(info.get("picture") or "")[:500],
        )
    except psycopg.Error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="資料庫暫時無法使用，請稍後再試")

    # 4. 簽發系統專屬 JWT 給前端，之後呼叫其他 API 都帶它
    token, expires_in = issue_app_token(user_id, email)
    return LoginResponse(access_token=token, expires_in=expires_in, user_id=user_id, email=email, is_new_user=is_new)
