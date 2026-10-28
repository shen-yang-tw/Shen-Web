# ==============================================================================
# Next.js 支援 pnpm 的獨立輕量版 Dockerfile
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# 1. 啟用 corepack 內建的 pnpm 支援
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. 複製 package.json 與 pnpm 鎖定檔（包含 pnpm-lock.yaml 與工作區設定）
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 3. 使用 pnpm 進行穩定安裝（對應原本的 npm ci）
RUN pnpm install --frozen-lockfile

# 4. 複製其餘專案原始碼
COPY . .

# 5. 執行專案打包
RUN pnpm run build

# ==============================================================================
# 運行階段 (Runner)
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]