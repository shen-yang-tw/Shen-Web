// frontend/components/QuickLogin.tsx
'use client';

// 登入面板上方的兩個快速登入按鈕：
// 1. 「訪客一鍵快速登入」：給面試官，免輸入帳密。
// 2. 「使用 Google 帳號登入」：使用 Google Identity Services，成功後把 credential（ID Token）送到後端驗證。
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FcGoogle } from 'react-icons/fc';
import { MdRocketLaunch } from 'react-icons/md';
import { useApp } from '@/components/Providers';
import { setAppSession } from '@/lib/appSession';
import { getSupabase } from '@/lib/supabase';

// Google 用戶端 ID 是公開資訊，在建置時由環境變數帶入；沒設定就視為未啟用
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// 最小型別宣告：只描述我們用到的 Google API
type GoogleId = {
  initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

// 載入 Google 的腳本（整個頁面只載入一次，之後重複呼叫會共用同一個 Promise）
let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // 失敗時清掉快取，讓使用者重試時能重新載入
        gsiPromise = null;
        script.remove();
        reject(new Error('gsi load failed'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

const QUICK_BUTTON_BASE =
  'relative flex w-full min-w-0 items-center justify-center gap-2 rounded-md px-4 py-3 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 dark:focus-visible:outline-blue-300';

export function QuickLogin() {
  return (
    <div className="mb-5 space-y-3">
      <DemoLoginButton />
      <GoogleLoginButton />
    </div>
  );
}

function DemoLoginButton() {
  const { t } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      // 後端只會簽發專用展示帳號的憑證，不依賴可能被修改的公開密碼。
      const response = await fetch('/api/auth/demo', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error(`Demo login returned HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (
        typeof data !== 'object' || data === null ||
        !('access_token' in data) || typeof data.access_token !== 'string' || !data.access_token ||
        !('email' in data) || typeof data.email !== 'string' || !data.email ||
        !('expires_in' in data) || typeof data.expires_in !== 'number' || data.expires_in <= 0
      ) throw new Error('Demo login returned an invalid response');
      setAppSession(data.access_token, data.email, data.expires_in);
      toast.success(t('auth.demo.welcome'));
      router.replace('/');
    } catch (error) {
      console.error('Demo login failed', error);
      toast.error(t('auth.demo.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        className={`${QUICK_BUTTON_BASE} bg-gradient-to-r from-orange-700 to-red-700 text-white shadow-md hover:from-orange-800 hover:to-red-800`}
      >
        <MdRocketLaunch aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" />
        <span className="min-w-0 break-words">{t('auth.demo.button')}</span>
      </button>
      <p className="mt-1 text-center text-xs text-zinc-700 dark:text-zinc-300">{t('auth.demo.hint')}</p>
    </div>
  );
}

function GoogleLoginButton() {
  const { t } = useApp();
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // 使用者在 Google 視窗選好帳號後，Google 會呼叫這裡並給我們 credential（ID Token）
  const handleCredential = useCallback(
    async (credential?: string) => {
      if (!credential) {
        toast.error(t('auth.google.failed'));
        return;
      }
      setBusy(true);
      try {
        // 把 ID Token 交給後端 Python API 驗證；後端驗證成功才會回傳系統 JWT
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { access_token: string; email: string; expires_in: number };
        // 先清掉可能存在的 Supabase 本機登入，避免兩個身分混在一起
        await getSupabase().auth.signOut({ scope: 'local' });
        setAppSession(data.access_token, data.email, data.expires_in);
        toast.success(t('auth.google.welcome'));
        router.replace('/');
      } catch {
        toast.error(t('auth.google.failed'));
        setBusy(false);
      }
    },
    [router, t],
  );
  // Google 的 callback 只在初始化時註冊一次，所以用 ref 永遠呼叫到最新版的處理函式
  const handlerRef = useRef(handleCredential);
  useEffect(() => {
    handlerRef.current = handleCredential;
  }, [handleCredential]);

  // 量測容器寬度，讓 Google 官方按鈕剛好蓋滿（Google 限制寬度 200~400）
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, Math.min(400, Math.floor(el.clientWidth))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 載入 Google 腳本並初始化
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => void handlerRef.current(res.credential),
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('auth.google.loadFailed'), { id: 'google-load' });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 寬度改變時重新繪製 Google 官方按鈕
  useEffect(() => {
    if (!ready || !slotRef.current || !window.google) return;
    slotRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(slotRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width,
    });
  }, [ready, width]);

  function handleFallbackClick() {
    // 只有在未設定或尚未載入完成時才會點到這個按鈕（其餘情況被官方按鈕覆蓋）
    toast.error(t(GOOGLE_CLIENT_ID ? 'auth.google.loadFailed' : 'auth.google.disabled'));
  }

  return (
    <div ref={wrapperRef} className="relative w-full min-w-0 overflow-hidden rounded-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700">
      {/* 可見的按鈕：Google 標準圖示 + 文字，樣式固定，不受 Google 按鈕外觀影響 */}
      <button
        type="button"
        onClick={handleFallbackClick}
        disabled={busy}
        tabIndex={ready ? -1 : 0}
        aria-hidden={ready ? true : undefined}
        className={`${QUICK_BUTTON_BASE} border border-zinc-300 bg-white text-zinc-800 dark:bg-white! dark:hover:bg-zinc-200! hover:bg-zinc-50 dark:border-zinc-600`}
      >
        <FcGoogle aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" />
        <span className="min-w-0 break-words">{t('auth.google.button')}</span>
      </button>
      {/* Google 官方按鈕：透明疊在上面，真正的點擊與驗證由它處理（符合 Google 品牌與安全規範） */}
      {ready && !busy && (
        <div
          ref={slotRef}
          className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.01]"
          aria-label={t('auth.google.button')}
        />
      )}
    </div>
  );
}
