# 🌐 企業級 Monorepo 多專案 Docker 總管架構指南

本專案採用 **Monorepo（單一程式碼庫）** 與 **Docker 雙檔架構（Multi-file Architecture）**，將三個核心子專案統整於同一個根目錄下進行中央調度與統一管理：

1. **主作品集網站 (`portfolio`)**：Next.js 前端應用程式。
2. **AI 平台 (`ai-platform`)**：包含 Next.js 前端與 Python FastAPI 後端。
3. **AI 儀表板 (`ai-dashboard`)**：包含 Next.js (pnpm) 前端與 Python FastAPI 後端（含 SQLite `/data` 磁碟區持久化）。

---

## 🏗️ 雙檔架構運作原理 (Dual-File Architecture)

為了徹底解離 **「本地快速開發」** 與 **「正式高資安部署」**，我們不使用可能導致正式伺服器誤載開發設定的預設隱式檔，而是採用明確的雙檔分離模式：

* **`docker-compose.yml`（基礎生產版）**：
  * 專門供 **正式生產環境（Production）** 使用。
  * 採用多階段打包（Standalone Build），**不映射任何獨立 Port**，所有外網流量統一走中央 Nginx 閘道器 (Port 80/443) 與 Cloudflare Tunnel 進行子網域分流。
* **`docker-compose.dev.yml`（本機開發補丁檔）**：
  * 專門供 **本機開發測試（Development）** 使用。
  * 自動為各專案補上 **獨立 Ports 映射**（如 `3000`、`3001`、`3002`）以及 **`volumes` 程式碼目錄即時掛載**（實現儲存即更新的 Hot-Reload 熱重載）。

---

## 📁 1. 專案目錄與檔案結構

```text
my-web-empire/                    # 總根目錄 (司令部)
├── docker-compose.yml             # 1. 基礎生產 Docker Compose 檔
├── docker-compose.dev.yml         # 2. 本機開發擴充補丁檔 (Dev Patch)
├── nginx.conf                     # 中央 Nginx 反向代理與子網域分流設定檔
├── .env                           # 全局共用環境變數 (如 Cloudflare Tunnel Token)
├── README.md                      # 專案總管說明文件
│
├── portfolio/                     # 1. 主作品集專案 (Next.js)
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── ai-platform/                   # 2. AI 平台專案
│   ├── .env
│   ├── backend/                   # Python FastAPI 後端
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/                  # Next.js 前端 (Standalone 模式)
│       ├── Dockerfile
│       └── package.json
│
└── ai-dashboard/                  # 3. AI 儀表板專案
    ├── .env
    ├── backend/                   # Python FastAPI 後端
    │   ├── Dockerfile
    │   └── main.py
    └── frontend/                  # Next.js 前端 (pnpm 支援)
        ├── Dockerfile
        └── package.json
```

---

## 💻 3. 本地開發與測試流程

在本機進行程式開發時，請同時載入基礎檔與開發檔：

### 🔹 前置指令：徹底清除一切所有專案的任何啟動內容
在終端機中按下 `Ctrl + C`，或另開終端機執行：
```bash
docker stop $(docker ps -q) 2>/dev/null; docker system prune -a --volumes -f
```
徹底清理殘留的容器與孤兒網路：
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans
```

### 🔹 專案開發前必需確認supabase資料表已建立且服務連線是否成功
https://docs.google.com/document/d/1EeXTxz0sD8CIWdXSQGXvpSFZSm3h2BTN-6Tt_28ZOdw/edit?tab=t.0

### 🔹 開發模式啟動指令（含熱重載與 Port 映射）
* **啟動supabase與所有子專案**：
  ```bash
  supabase db push　&& supabase start && docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" up --build -d
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" up --build -d
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

  - 修改docker檔案之後：
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" build --no-cache
  ```
* **僅啟動主作品集 (`portfolio`)**：
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile portfolio up --build -d
  ```
* **僅啟動 AI 平台 (`ai-platform`)**：
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai-platform up --build -d
  ```
* **僅啟動 AI 儀表板 (`ai-dashboard`)**：
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile ai-dashboard up --build -d
  ```

### 🔹 檢視日誌與停止服務指令
* **查看即時動態日誌**（按下 `Ctrl+C` 可安全退出，容器持續於背景運行）：
  ```bash
  docker compose logs -f
  ```
* **停止並移除所有容器與網路**：
  ```bash
  docker compose down
  ```
* **重新啟動 Docker 服務**：
  ```bash
  sudo systemctl restart docker
  ```

### 🌐 本地網頁開發直連測試地址
啟動後，不需要透過 Nginx 或 `.local` 網域，直接在瀏覽器輸入以下連接埠即可測試：

| 專案名稱 | 開發環境前端測試網址 | 開發環境後端 API 文件網址 | 熱重載 (Hot-Reload) |
| :--- | :--- | :--- | :--- |
| **主作品集** | `http://localhost:3000` | N/A | 支援 (`./portfolio`) |
| **AI 平台** | `http://localhost:3001` | `http://localhost:8000/docs` | 支援 (`./ai-platform`) |
| **AI 儀表板** | `http://localhost:3002` | `http://localhost:8002/docs` | 支援 (`./ai-dashboard`) |

---

## 🚀 4. 正式生產環境部署流程

當需要將程式碼部署至正式伺服器時，**不需要載入 `docker-compose.dev.yml`**：

### 🔹 正式打包啟動指令
```bash
docker compose --env-file .env --env-file ai-platform/.env --profile "*" up --build -d
```
*Docker 將會完全忽略開發補丁檔，自動採用安全且經過獨立打包的生產環境模式，並由中央 Nginx 閘道器進行 `80`/`443` 網域分流處理。*

以上指令在 Windows (PowerShell)、Ubuntu、macOS 的終端機皆可直接執行（Windows 需先啟動 Docker Desktop）。已實測 `docker compose ... --profile "*" build` 可成功建置所有映像。

### 🔹 其他常用正式指令
```bash
# 只打包、不啟動（驗證建置是否成功）
docker compose --env-file .env --env-file ai-platform/.env --profile "*" build

# 更新程式碼後重新打包並重啟
docker compose --env-file .env --env-file ai-platform/.env --profile "*" up --build -d

# 確認所有容器皆為 healthy
docker compose --profile "*" ps

# 查看閘道器 / 服務日誌
docker compose --profile "*" logs -f gateway

# 停止並移除容器
docker compose --profile "*" down --remove-orphans
```
> 從開發模式切換到正式模式時，請先執行 `docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" down --remove-orphans`，再執行上方正式指令，避免沿用開發用容器。

### 🔹 提示詞庫限制
AI 平台「提示詞庫與設定」最多儲存 10 筆（前後端皆限制）；超過時後端回傳 409，畫面提示先刪除再新增。

AI 平台前端的 Supabase URL 與 anon key 會在 Next.js 建置時嵌入前端，因此上述指令會從 `ai-platform/.env` 讀取建置變數；`env_file` 僅供容器執行時使用，不能取代建置參數。缺少任一變數時，映像建置會明確失敗，而不會產生無法登入的網站。正式環境的後端代理使用 Docker 內部服務名稱；直接在主機執行前端開發伺服器時則預設連線 `http://localhost:8000`。

---

## 🛠️ 5. 常見問題與疑難排解 (Troubleshooting)

### 忘記密碼（重設連結）設定

忘記密碼會寄出「重設密碼連結」，點擊後直接登入並提示盡快修改密碼。連結會導回使用者目前的網址（本機 http://localhost:3001/、正式網域等），因此請到 Supabase 後台 **Authentication → URL Configuration → Redirect URLs** 加入所有會使用的網址（例如 http://localhost:3001/**、https://ai-platform.shenyang.win/**），否則連結會回到 Site URL。Supabase 內建 SMTP 有寄送上限且僅能寄給團隊成員，正式環境建議設定自訂 SMTP。

開發環境（docker-compose.dev.yml）的 AI 平台前端以 --webpack 搭配 WATCHPACK_POLLING 啟動，確保 Windows / macOS 的掛載目錄也能熱更新；所有開發埠都只綁定 127.0.0.1。範本請見 i-platform/.env.example。

### Q1：執行 `docker compose up -d` 後沒有任何容器啟動？
* **原因**：所有服務均設定了 `profiles` 隔離。若未帶入 `--profile` 參數，Docker 預設不會啟動任何帶有 profile 宣告的服務。
* **解法**：執行指令時必須加上 Profile 名稱或萬用字元，例如：`docker compose --profile "*" up -d`。

### Q2：為什麼在瀏覽器輸入 `ai-platform.local` 卻顯示無法連線？
* **原因**：可能是忘記在電腦的 `hosts` 檔案中加入對應設定，或是中央 Nginx 閘道器容器還沒啟動。
* **解法**：
  1. 確認 hosts 檔案已寫入 `127.0.0.1 portfolio.local ai-platform.local ai-dashboard.local`。Windows 檔案位置為 `C:\Windows\System32\drivers\etc\hosts`（需以系統管理員權限編輯）；Linux/macOS 使用 `/etc/hosts`。
  2. 確認總 `docker-compose.yml` 中的 Nginx 網關服務已開啟並佔用 Port 80。

### Q3：Next.js 打包建置時出現 `"/app/.next/standalone": not found`？
* **原因**：Dockerfile 採用了 Standalone 獨立輸出優化，但 Next.js 專案未啟用該模式。
* **解法**：請開啟子專案前端的 `next.config.js` (或 `.mjs` / `.ts`)，確認已包含以下設定：
  ```javascript
  const nextConfig = {
    output: "standalone",
  };
  module.exports = nextConfig;
  ```

### Q4：Nginx 啟動失敗並報錯 `[emerg] "events" directive is not allowed here`？
* **原因**：完整的 `nginx.conf` 設定檔包含了 `events { ... }` 頂層區塊，但被掛載到了 `/etc/nginx/conf.d/default.conf`。
* **解法**：在 `docker-compose.yml` 中將掛載目標修改為覆蓋 Nginx 主設定檔：
  ```yaml
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
  ```

### Q5：修改了子專案程式碼，重啟後網頁卻沒有更新？
* **原因**：Docker 生產環境映像檔在 Build 階段就已將程式碼寫入快取中。
* **解法**：重啟時必須加上 `--build` 參數強制重新編譯：
  ```bash
  docker compose --profile "*" up --build -d
  ```

### Q6：後端 SQLite 或模型資料在重啟容器後遺失？
* **原因**：未配置 Docker Volume 進行實體持久化。
* **解法**：請確認 `docker-compose.yml` 中後端服務有正確設定 Volume 掛載，例如：
  ```yaml
  volumes:
    - ai-dashboard-db-data:/data
  ```
### Q7：Ollama 啟動出現 `exec /entrypoint.sh: no such file or directory`？
原因是 Windows 檢出時 `entrypoint.sh` 被轉成 CRLF 換行。現已以 `.gitattributes` 強制 `*.sh`、`Dockerfile*`、`*.yml`、`nginx.conf` 使用 LF，且 `docker/ollama/Dockerfile` 會再去除 `\r`。若仍遇到，執行 `git add --renormalize .` 後重新 `docker compose build --no-cache ollama`。

### Q8：ai-platform 登入後出現「登入已過期或尚未登入」？
前端使用的 Supabase 專案必須與後端一致。`ai-platform/.env` 需設定遠端專案的 `DATABASE_URL`（Docker 內請用 Supabase **Session pooler** 連線字串，直連主機僅支援 IPv6）、`SUPABASE_JWKS_URL`（`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`）與 `SUPABASE_JWT_ISSUER`（`https://<ref>.supabase.co/auth/v1`）。密碼中的特殊字元需 URL 編碼。

### Q9：忘記密碼流程與信件範本設定
Supabase 只儲存密碼雜湊，**無法也不應**在信中寄出原密碼。ai-platform 改用「驗證碼」流程：輸入信箱 → 收到信中的一次性驗證碼 → 輸入驗證碼 → 設定新密碼。驗證後網站仍維持鎖定（導覽列停用），直到新密碼設定完成並重新登入。

必須修改信件範本：Supabase Dashboard → Authentication → Email Templates → **Reset Password**，內容改為顯示 `{{ .Token }}`，例如：
```html
<h2>重設密碼 / Reset password</h2>
<p>您的驗證碼 / Your code：<strong>{{ .Token }}</strong></p>
<p>驗證碼短時間內有效；若非本人操作請忽略此信。</p>
```
驗證碼位數可於 Authentication → Providers → Email 的 OTP Length 調整（本站接受 6–8 位數）。若仍使用舊的連結範本，連結流程同樣會先顯示「設定新密碼」畫面，不會直接登入。連結流程需將網站來源加入 URL Configuration 的 Redirect URLs。

### 背景圖片授權
`ai-platform/frontend/public/bg-light.jpg`、`bg-dark.jpg` 為 Unsplash 照片，依 Unsplash License 可免費商用，無需署名。

### 啟動順序與 Ollama
`ollama`（healthcheck 通過後）→ `ai-platform-backend` → `ai-platform-frontend`；`ai-dashboard-backend` → `ai-dashboard-frontend`。首次啟動 Ollama 會在背景下載 `OLLAMA_CHAT_MODEL`（預設 `qwen2.5:3b`），需要一些時間。主機連接埠可用 `OLLAMA_HOST_PORT` 調整。Windows/Mac 開發模式已啟用 `WATCHPACK_POLLING` 讓熱重載生效。