# backend/app/repositories/user_repo.py
# 以信箱查詢或建立使用者。使用者資料存在 Supabase 的 auth.users，其他資料表都以它的 id 關聯。

# JSON 序列化：寫入 jsonb 欄位用
import json

# psycopg 的唯一鍵衝突錯誤，處理兩個請求同時註冊同一信箱的情況
from psycopg import errors as pg_errors

from app.core.db import db_connection

# Supabase 單一專案固定使用的 instance_id
_INSTANCE_ID = "00000000-0000-0000-0000-000000000000"


def _find_user_id(conn, email: str) -> str | None:
    # 信箱不分大小寫比對；已刪除的帳號不算
    row = conn.execute(
        "select id from auth.users where lower(email) = lower(%s) and deleted_at is null limit 1",
        (email,),
    ).fetchone()
    return str(row["id"]) if row else None


def find_or_create_google_user(email: str, google_sub: str, name: str, picture: str) -> tuple[str, bool]:
    # 回傳 (使用者 id, 是否為這次新建立)。已存在就直接用，不存在就自動註冊
    with db_connection() as conn:
        existing = _find_user_id(conn, email)
        if existing:
            return existing, False
        try:
            # 建立 auth.users：和 Supabase 自己註冊的使用者欄位一致，
            # 密碼留空代表這個帳號只能用 Google 登入；email_confirmed_at 設為現在，因為 Google 已驗證過信箱
            row = conn.execute(
                """
                insert into auth.users
                  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
                values
                  (%s, gen_random_uuid(), 'authenticated', 'authenticated', %s, '', now(),
                   %s::jsonb, %s::jsonb, now(), now())
                returning id
                """,
                (
                    _INSTANCE_ID,
                    email,
                    json.dumps({"provider": "google", "providers": ["google"]}),
                    json.dumps({"display_name": name, "name": name, "avatar_url": picture, "email": email}),
                ),
            ).fetchone()
            user_id = str(row["id"])
            # 建立 Google 身分紀錄，之後若改用 Supabase 官方 Google 登入也能對得上
            conn.execute(
                """
                insert into auth.identities
                  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                values (%s, %s, %s::jsonb, 'google', now(), now(), now())
                """,
                (
                    google_sub,
                    user_id,
                    json.dumps({"sub": google_sub, "email": email, "email_verified": True, "name": name}),
                ),
            )
            # profiles 資料列由資料庫觸發器 on_auth_user_created 自動建立
            return user_id, True
        except pg_errors.UniqueViolation:
            # 別的請求剛好先建立了同一信箱：回滾後重新查詢，直接使用那筆
            conn.rollback()
            again = _find_user_id(conn, email)
            if again is None:
                raise
            return again, False


def demo_user_is_active(user_id: str, email: str) -> bool:
    with db_connection() as conn:
        row = conn.execute(
            "select 1 from auth.users where id = %s and lower(email) = lower(%s) "
            "and email_confirmed_at is not null and deleted_at is null "
            "and (banned_until is null or banned_until < now())",
            (user_id, email),
        ).fetchone()
    return row is not None


def user_is_active(user_id: str) -> bool:
    # 確認使用者仍存在、沒被刪除或停權；用於每次 API 驗證系統 JWT 時
    with db_connection() as conn:
        row = conn.execute(
            "select 1 from auth.users where id = %s and deleted_at is null "
            "and (banned_until is null or banned_until < now())",
            (user_id,),
        ).fetchone()
    return row is not None
