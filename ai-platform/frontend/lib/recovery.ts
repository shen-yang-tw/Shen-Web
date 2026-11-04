// frontend/lib/recovery.ts
// 「已透過重設連結登入、尚未修改密碼」提醒旗標。使用者點擊重設連結會直接登入，
// 但在修改密碼或按下「稍後提醒」之前，畫面上方會持續顯示請修改密碼的提醒。
// 旗標存在 localStorage 並附期限，關閉分頁再回來也仍會提醒。

import { useEffect, useState } from 'react';

const KEY = 'auth:recovery-pending';
const EVENT = 'auth-recovery-change';
const TTL_MS = 24 * 60 * 60 * 1000;

export function isRecoveryPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    if (Date.now() - Number(raw) > TTL_MS) {
      window.localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function setRecoveryPending() {
  try {
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // localStorage 不可用時，仍以事件通知目前頁面
  }
  emit();
}

export function clearRecoveryPending() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 同上
  }
  emit();
}

// 網址帶有 type=recovery 代表從「重設連結」回到網站，需顯示修改密碼提醒
export function detectRecoveryInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = `${window.location.hash}&${window.location.search}`;
  return /(^|[#&?])type=recovery(&|$)/.test(raw);
}

export function useRecoveryPending(): boolean {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (detectRecoveryInUrl()) setRecoveryPending();
    const sync = () => setPending(isRecoveryPending());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return pending;
}