# backend/app/services/google_auth.py
# 用 google-auth 函式庫驗證前端送來的 Google ID Token（credential）。

# Google 官方的 ID Token 驗證工具與 HTTP 傳輸層（用來下載 Google 的公鑰）
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

# 讀取 GOOGLE_CLIENT_ID
from app.core.config import settings


class GoogleTokenError(Exception):
    """Google token 無效、過期、受眾不符或信箱未驗證。"""


class GoogleLoginDisabled(Exception):
    """伺服器尚未設定 GOOGLE_CLIENT_ID。"""


def verify_google_credential(credential: str) -> dict:
    # 沒設定用戶端 ID 就無法判斷 token 是不是發給我們的，一律視為停用
    if not settings.google_client_id:
        raise GoogleLoginDisabled()
    try:
        # verify_oauth2_token 會一次檢查：簽章（Google 公鑰）、是否過期、發行者是 Google、
        # 受眾 aud 是否等於我們的 client id。任何一項不符都會丟 ValueError
        info = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.google_client_id)
    except ValueError as exc:
        raise GoogleTokenError("invalid google token") from exc
    # 只信任 Google 已驗證過的信箱，避免有人拿未驗證的信箱冒用別人的帳號
    if not info.get("email") or info.get("email_verified") is not True:
        raise GoogleTokenError("email not verified")
    return info
