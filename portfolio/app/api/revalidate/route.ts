// app/api/revalidate/route.ts：這個路徑是官方規定的「強制路由規範」，規定處理 API 的後端檔案名稱必須絕對叫做 route.ts。app/hooks/ ➡️這是社群常用的「非官方習慣做法」
// On-Demand Revalidation：作品集頁面在 GitHub 狀態變更時達到即時更新（不需要等待 ISR 的計時器倒數），最現代且推薦的作法是使用（On-Demand Revalidation）
// 原來的「定時更新（例如 revalidate = 3600）」和現在新加的「Webhook 即時更新」在後台是共用同一個快取機制的。當你在 GitHub 修改專案的那一刻：Webhook 會透過 revalidatePath 直接插隊，把當下的舊快取強制清空，讓網站立刻去抓一次最新資料。更新完後，原本的定時更新計時器又會重新開始計算

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

interface GitHubWebhookPayload {
  repository?: {
    name: string;
    full_name: string;
  };
  action?: string;
}

// 驗證 GitHub 簽章的函式
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // 1. 計算出預期的正確雜湊字串
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // 2. 使用 TextEncoder 將字串轉為標準的 Uint8Array (相容於 ArrayBufferView)
  const encoder = new TextEncoder();
  const digestUint8 = encoder.encode(digest);
  const signatureUint8 = encoder.encode(signature);

  // 3. 安全性核心：長度不同時，直接回傳 false
  if (digestUint8.byteLength !== signatureUint8.byteLength) {
    return false;
  }

  // 4. 此時傳入 crypto.timingSafeEqual 絕對符合 ArrayBufferView 型別，完全不報錯！
  return crypto.timingSafeEqual(digestUint8, signatureUint8);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 取得 GitHub 的加密簽章標頭
    const signature = request.headers.get('x-hub-signature-256');
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ message: 'Missing signature or secret configuration' }, { status: 401 });
    }

    // 2. 必須取得原始的文字 Payload（Text）才能進行正確的雜湊計算
    const rawBody = await request.text();

    // 3. 驗證簽章是否正確
    const isValid = verifySignature(rawBody, signature, secret);
    if (!isValid) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
    }

    // 4. 驗證成功後，再將文字轉換為 JSON 物件
    const payload = JSON.parse(rawBody) as GitHubWebhookPayload;

    // 5. 即時更新你的作品集頁面（**此路徑必需正確對應**）
    revalidatePath('/projects');

    console.log(`[Revalidate] 安全驗證成功！已即時更新頁面。觸發專案：${payload.repository?.name || '未知'}`);

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Error revalidating', error: errorMessage },
      { status: 500 }
    );
  }
}
