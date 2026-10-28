# Oracle Cloud 部署步驟（Compute VM + Docker Compose + Caddy）

網站只對外開放 80/443，前端與後端留在 Docker 內部網路；前端使用同源 `/api`，VM 重開機換 IP 不需重新建置。

## 0. 費用與使用習慣
- 建議規格：`VM.Standard.E4.Flex`，1 OCPU / 8 GB，Ubuntu 24.04（x86）。
- 執行中按小時計費；**Stop** 後只收開機磁碟；不用時 **Terminate** 並勾選同時刪除開機磁碟。
- 建立後先到 Budgets 設定月預算警示。
- 準備好再建 VM，建好後立刻部署，避免空轉。

## 1. 建立 VM 並開放連接埠
1. Compute → Instances → Create instance，映像選 Canonical Ubuntu 24.04，產生並下載 SSH 私鑰。
2. 網路：VCN → Subnet → Security List，Ingress 只開：
   - 22/TCP：來源限制為你的公開 IP（`你的IP/32`）。
   - 80/TCP、443/TCP：來源 `0.0.0.0/0`。
3. 不要開 3000、8000。

## 2. 從你的電腦登入
```powershell
ssh -i $HOME\.ssh\oracle.key ubuntu@<VM公開IP>
```
私鑰只放在你的電腦，不要貼給任何人或提交到 GitHub。

## 3. 安裝 Docker（在 VM 上執行）
```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit   # 重新登入後群組才會生效
```

## 4. 放行主機防火牆（Ubuntu 映像預設會擋 80/443）
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt-get install -y iptables-persistent && sudo netfilter-persistent save
```

## 5. 下載專案並設定金鑰
```bash
git clone https://github.com/shen-yang-tw/predictflow-ai-dashboard.git
cd predictflow-ai-dashboard
cp .env.example .env
nano .env          # 自行填入 ANTHROPIC_API_KEY；有網域時填 SITE_ADDRESS
chmod 600 .env
```
API 金鑰只寫在 VM 的 `.env`，不要貼到對話或提交到 GitHub。

## 6. 啟動
```bash
docker compose -f docker-compose.oracle.yml up --build -d
docker compose -f docker-compose.oracle.yml ps
```
首次建置需數分鐘；後端啟動後約 12 秒完成模型預熱。

## 7. 驗證
- 瀏覽器開 `http://<VM公開IP>/`，三個頁面都能載入並顯示「Live API connected」。
- `curl http://<VM公開IP>/api/health` 回傳 `{"status":"ok",...}`。

## 8. HTTPS（可選，需要網域）
1. 網域的 A 記錄指向 VM 公開 IP。
2. `.env` 設 `SITE_ADDRESS=你的網域`，執行 `docker compose -f docker-compose.oracle.yml up -d`。
3. Caddy 會自動申請並續期憑證。

## 9. 日常操作
- 展示前：主控台 Start VM → 查看新的公開 IP（暫時 IP 重開機會變）；服務設有 `restart: unless-stopped`，會自動啟動。
- 展示後：主控台 **Stop**。
- 更新程式：`git pull && docker compose -f docker-compose.oracle.yml up --build -d`。
- 資料（挽留佇列、AI 呼叫紀錄）存在 Docker volume `backend_data`，停機與重建都會保留；Terminate VM 才會消失。
- 查看日誌：`docker compose -f docker-compose.oracle.yml logs -f backend`。
