// frontend/lib/appSession.ts
// 「系統登入狀態」：Google 或訪客登入後，後端簽發的 JWT 存在瀏覽器 localStorage。
// 它和 Supabase session 並存，任何一個存在就視為已登入。
'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ai-platform.app-session';
// 同一個分頁內修改時，localStorage 不會觸發 storage 事件，所以自己發一個事件通知訂閱者
const CHANGE_EVENT = 'ai-platform:app-session';

export type AppSession = { token: string; email: string; expiresAt: number };

// useSyncExternalStore 需要「內容沒變就回傳同一個參考」，所以用原始字串當快取鍵
let cachedRaw: string | null = null;
let cachedValue: AppSession | null = null;

function parse(raw: string | null): AppSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<AppSession>;
    if (typeof v.token !== 'string' || typeof v.email !== 'string' || typeof v.expiresAt !== 'number') return null;
    // 已過期的視為沒有登入
    if (v.expiresAt <= Date.now()) return null;
    return { token: v.token, email: v.email, expiresAt: v.expiresAt };
  } catch {
    return null;
  }
}

export function getAppSession(): AppSession | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue && cachedValue.expiresAt > Date.now() ? cachedValue : null;
}

export function setAppSession(token: string, email: string, expiresInSeconds: number): void {
  const value: AppSession = { token, email, expiresAt: Date.now() + expiresInSeconds * 1000 };
  // 無法儲存時讓呼叫端顯示登入失敗，不能假裝登入成功。
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearAppSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const notify = () => {
    if (timer !== undefined) clearTimeout(timer);
    const session = getAppSession();
    if (session) {
      timer = setTimeout(notify, Math.min(session.expiresAt - Date.now(), 2147483647));
    }
    callback();
  };
  window.addEventListener(CHANGE_EVENT, notify);
  // 其他分頁登入或登出時同步
  window.addEventListener('storage', notify);
  const session = getAppSession();
  if (session) timer = setTimeout(notify, Math.min(session.expiresAt - Date.now(), 2147483647));
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener('storage', notify);
  };
}

// React Hook：伺服器端渲染時固定回傳 null，避免 hydration 不一致
export function useAppSession(): AppSession | null {
  return useSyncExternalStore(subscribe, getAppSession, () => null);
}
