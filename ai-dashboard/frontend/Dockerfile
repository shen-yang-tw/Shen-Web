# ==============================================================================
# AI Dashboard Frontend Dockerfile (Next.js with pnpm)
# ==============================================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

# 1. 依賴安裝階段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile

# 2. 開發環境目標 (對應 docker-compose_2.yml 的 target: development)
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "--", "--hostname", "0.0.0.0"]

# 3. 正式環境 - Builder 階段 (接收 NEXT_PUBLIC_API_URL 建置參數)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm build

# 4. 正式環境 - Runner 階段 (Standalone 生產運行)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]