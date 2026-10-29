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

### 🔹 開發模式啟動指令（含熱重載與 Port 映射）
* **啟動所有子專案**：
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" --build -d
  - 修改docker檔案之後：
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" build --no-cache
  docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile "*" up -d
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
docker compose --profile "*" up --build -d
```
*Docker 將會完全忽略開發補丁檔，自動採用安全且經過獨立打包的生產環境模式，並由中央 Nginx 閘道器進行 `80`/`443` 網域分流處理。*

---

## 🛠️ 5. 常見問題與疑難排解 (Troubleshooting)

### Q1：執行 `docker compose up -d` 後沒有任何容器啟動？
* **原因**：所有服務均設定了 `profiles` 隔離。若未帶入 `--profile` 參數，Docker 預設不會啟動任何帶有 profile 宣告的服務。
* **解法**：執行指令時必須加上 Profile 名稱或萬用字元，例如：`docker compose --profile "*" up -d`。

### Q2：為什麼在瀏覽器輸入 `ai-platform.local` 卻顯示無法連線？
* **原因**：可能是忘記在電腦的 `hosts` 檔案中加入對應設定，或是中央 Nginx 閘道器容器還沒啟動。
* **解法**：
  1. 確認電腦的 `/etc/hosts` 檔案已正確寫入 `127.0.0.1 portfolio.local ai-platform.local ai-dashboard.local`。
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