import os
import json
from datetime import datetime, timezone, timedelta
import requests

def send_supabase_ping():
    # 1. 從環境變數中讀取 Supabase 連線資訊
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    # ⚠️ 修正 1：若找不到環境變數，直接拋出錯誤讓 GitHub Actions 亮紅燈！
    if not supabase_url or not supabase_key:
        raise ValueError("[錯誤] 找不到完整的 Supabase 環境變數設定（SUPABASE_URL 或 SUPABASE_KEY 未傳入）。")

    # 組合完整的 REST API 寫入網址
    api_url = f"{supabase_url}/rest/v1/contact_messages"
    
    # 2. 設定符合 Supabase 規範的標準 API 標頭
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # 3. 計算台灣時間
    taiwan_time = datetime.now(timezone.utc) + timedelta(hours=8)
    current_time = taiwan_time.strftime("%Y-%m-%d %H:%M:%S")
    
    payload = {
        "name": "System_Auto_Ping",
        "email": "system@portfolio.internal",
        "message": f"此為自動發送的資料庫防休眠啟用活動。最新發送時間（台灣時間）：{current_time}"
    }
    
    try:
        print("[開始] 正在寫入最新的系統 Ping 資料至 Supabase...")
        response = requests.post(api_url, headers=headers, data=json.dumps(payload))
        
        # ⚠️ 修正 2：如果 HTTP 狀態碼不是 200/201，自動拋出 HTTPError
        response.raise_for_status()
        
        print(f"[寫入成功] 成功刺激 Supabase 外部 API 活動！最新台灣時間：{current_time}")
            
    except requests.exceptions.HTTPError as http_err:
        print(f"[API 錯誤] Supabase 回應失敗狀態碼: {response.status_code}")
        print(f"[詳細內容] {response.text}")
        raise http_err  # 強制拋出錯誤，讓 GitHub Actions 知道失敗
    except Exception as e:
        print(f"[系統錯誤] 執行寫入時連線至 Supabase 失敗: {str(e)}")
        raise e  # 強制拋出錯誤

if __name__ == "__main__":
    send_supabase_ping()