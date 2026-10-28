# Docker 部署

## 開發模式

```sh
corepack pnpm install --frozen-lockfile
docker compose up --build
```

前端依賴只使用 `pnpm-lock.yaml` 與 `pnpm@12.3.4`；請勿使用 npm 安裝。前端會在 http://localhost:3000 提供熱重載，FastAPI 在 http://localhost:8000 提供 API 與 Swagger 文件。

首次啟動時，可複製 `.env.example` 為 `.env` 並填入所選模型供應商的 API 金鑰。Claude 使用 `ANTHROPIC_API_KEY`；切換至 GPT-4o 時設定 `ACTIVE_MODEL=gpt-4o` 並填入 `OPENAI_API_KEY`。請勿將真實金鑰提交至版本控制。修改模型環境變數後，執行 `docker compose up -d --force-recreate backend` 讓 FastAPI 讀取新設定。

## AI 預測 API

FastAPI 提供 `POST http://localhost:8000/api/v1/ai/predict`，接收 `customers`（或既有 API 的 `records`）、`mrr_history` 與 `modelops_events`（或 `modelops`）JSON 陣列，回傳流失風險、未來六個月 MRR、模型成本／延遲／失敗率及經 Pydantic 驗證的 JSON。MRR 歷史為空時，服務以客戶月費合計作為平坦基準；沒有 ModelOps 事件時，延遲和失敗率回傳 `null`。

預設模型為 `claude-sonnet-5-5`；舊設定 `claude-3-5-sonnet` 會自動轉換為目前可用的模型 ID。亦支援 `claude-sonnet-5`、`claude-sonnet-4-6`；使用 OpenAI 時設定 `ACTIVE_MODEL=gpt-4o`，並填入所選供應商 API 金鑰。未設定 API 金鑰時，客戶風險評分及確定性指標仍可回傳，`ai_status` 會標示 `not_configured`；模型產生的營運摘要則需要有效的供應商金鑰。若模型供應商回應錯誤、連線失敗或摘要格式無效，預測端點仍會回傳已計算的客戶風險與營收預測，並透過 `ai_status=provider_error` 和 `ai_error` 明確回報模型呼叫問題，而不會使整個 API 變成 502。流失分數是未校準的規則估計，回應會明確標註 `churn_method`。前端跨頁面共用預測結果，避免每次切換頁面都重複呼叫模型。

## 資料來源與模型（全部基於真實資料）

- **客戶資料**：Kaggle Telco Customer Churn（無日期快照，沒有登入次數、使用頻率與營收歷史）。
- **流失模型**：`backend/churn_model.py`，scikit-learn 邏輯迴歸，20% 測試集與 5 折交叉驗證。`GET /api/v1/ml/churn-model` 回傳測試集成績（ROC AUC、準確率、Brier、校準表）。風險分級：70% 以上高風險、40%–70% 中風險、低於 40% 低風險。
- **MRR 預測**：沒有歷史時為「情境預測」（以現有客戶月費與資料集實際流失率向後推 6 個月）。若放入 `backend/data/mrr_history.csv`（欄位 `month,mrr`），改用真實帳務歷史。
- **ModelOps**：每次真實呼叫大模型都會把 Token、延遲與成敗寫入 `backend/data/modelops.db`（SQLite，已加入 `.gitignore`）；`GET /api/v1/ops/telemetry` 由此彙總，紀錄少於 7 筆時不做異常偵測。月預算由環境變數 `MONTHLY_AI_BUDGET_USD` 設定（預設 250）。
- **客戶挽留處理**：總覽的高風險清單使用同一個 SQLite 檔保存處理狀態與狀態異動紀錄。流程為「排入清單 → 開始聯絡 → 標記完成」，已完成項目可重新開啟；容器透過 `./backend:/app` 掛載，資料保留在主機的 `backend/data/modelops.db`。`GET /api/v1/retention/actions` 讀取清單；`POST /api/v1/retention/actions` 新增未流失且目前屬高風險的客戶；`PATCH /api/v1/retention/actions/{customer_id}` 更新流程狀態。這是本機持久化工作佇列，並未連接外部 CRM。

## Production 模式

```sh
docker compose -f docker-compose.production.yml up --build -d
```

Production image 會在 Linux Docker build 階段依 `frontend/pnpm-lock.yaml` 安裝固定版本的依賴，執行 Next.js route type generation、TypeScript 檢查與 production build，再以同一映像啟動 standalone server。正式環境不會掛載 Windows 主機的程式碼或 `node_modules`。

部署到非本機網域時，設定 `NEXT_PUBLIC_API_URL` 為瀏覽器可連線的 API origin，並將 `CORS_ORIGINS` 設為前端 origin。預設值適用於同一台主機上的本機 Docker 測試。