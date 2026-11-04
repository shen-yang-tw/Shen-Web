// frontend/lib/authLock.ts
// 登入失敗次數與鎖定：記在 localStorage，鎖定時間到期後自動解除，重新整理頁面也不會讓使用者永遠被鎖住。

import { readLocal, writeLocal } from '@/lib/prefs';

const KEY = 'auth:signin:attempts';
// 連續錯誤達此次數時開放「忘記密碼」入口
export const FORGOT_THRESHOLD = 3;
// 錯誤次數超過此值（第 4 次）就鎖定
export const MAX_FAILURES = 3;
export const LOCK_MS = 10 * 60 * 1000;

type State = { failures: number; lockedUntil: number };

function read(now: number): State {
  const raw = readLocal(KEY);
  if (!raw) return { failures: 0, lockedUntil: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<State>;
    const failures = Number.isFinite(parsed.failures) ? Number(parsed.failures) : 0;
    const lockedUntil = Number.isFinite(parsed.lockedUntil) ? Number(parsed.lockedUntil) : 0;
    // 鎖定時間已過：整組狀態歸零，使用者可重新嘗試
    if (lockedUntil > 0 && lockedUntil <= now) return { failures: 0, lockedUntil: 0 };
    // 異常的未來時間（例如被竄改）不得超過 10 分鐘
    return { failures: Math.max(0, failures), lockedUntil: Math.min(lockedUntil, now + LOCK_MS) };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function write(state: State) {
  writeLocal(KEY, JSON.stringify(state));
}

export function getSignInState(now = Date.now()): State {
  const state = read(now);
  write(state);
  return state;
}

// 記錄一次失敗；超過 MAX_FAILURES 次即鎖定 10 分鐘
export function recordSignInFailure(now = Date.now()): State {
  const current = read(now);
  const failures = current.failures + 1;
  const next: State = { failures, lockedUntil: failures > MAX_FAILURES ? now + LOCK_MS : 0 };
  write(next);
  return next;
}

// 伺服器端回報頻率限制時，直接鎖定 10 分鐘
export function lockSignIn(now = Date.now()): State {
  const next: State = { failures: Math.max(read(now).failures, MAX_FAILURES + 1), lockedUntil: now + LOCK_MS };
  write(next);
  return next;
}

export function resetSignInState() {
  write({ failures: 0, lockedUntil: 0 });
}
