# backend/app/core/app_token.py
# 「系統專屬 JWT」：Google 登入驗證成功後，由後端自己簽發給前端的登入憑證。
# 它和 Supabase 發的 JWT 並存：簽章演算法（HS256）、發行者（iss）與受眾（aud）都不同，兩邊不會互相冒用。

# 時間工具：用來計算簽發與到期時間
import time

# PyJWT：簽發與驗證 JWT
import jwt

# 讀取密鑰與有效期限設定
from app.core.config import settings

# 發行者與受眾名稱：和 Supabase 的值不同，讓兩種 token 在驗證時一定分得開
APP_TOKEN_ISSUER = "ai-platform-backend"
APP_TOKEN_AUDIENCE = "ai-platform-app"
# 只允許 HS256；驗證時不接受其他演算法，防止演算法混淆攻擊
APP_TOKEN_ALGORITHM = "HS256"
# 密鑰太短等於沒有保護，要求至少 32 字元
_MIN_SECRET_LENGTH = 32


def app_token_enabled() -> bool:
    # 密鑰有設定而且夠長，才算啟用這套登入機制
    return len(settings.app_jwt_secret) >= _MIN_SECRET_LENGTH


def issue_app_token(user_id: str, email: str) -> tuple[str, int]:
    # 沒設定密鑰就拒絕簽發，避免用空密鑰簽出任何人都能偽造的 token
    if not app_token_enabled():
        raise RuntimeError("APP_JWT_SECRET 尚未設定或長度不足 32 字元")
    now = int(time.time())
    expires_in = settings.app_jwt_expire_minutes * 60
    payload = {
        # sub 就是資料庫 auth.users 的使用者 uuid，之後所有資料查詢都以它為準
        "sub": user_id,
        "email": email,
        "iss": APP_TOKEN_ISSUER,
        "aud": APP_TOKEN_AUDIENCE,
        "iat": now,
        "exp": now + expires_in,
    }
    token = jwt.encode(payload, settings.app_jwt_secret, algorithm=APP_TOKEN_ALGORITHM)
    return token, expires_in


def verify_app_token(token: str) -> str:
    # 驗證簽章、到期時間、發行者與受眾；任何一項失敗都會丟出 jwt.PyJWTError，由呼叫端轉成 401
    if not app_token_enabled():
        raise jwt.InvalidTokenError("app token disabled")
    payload = jwt.decode(
        token,
        settings.app_jwt_secret,
        algorithms=[APP_TOKEN_ALGORITHM],
        audience=APP_TOKEN_AUDIENCE,
        issuer=APP_TOKEN_ISSUER,
        options={"require": ["exp", "sub", "iss", "aud"]},
    )
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise jwt.InvalidTokenError("missing sub")
    return user_id
