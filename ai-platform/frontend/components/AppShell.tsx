// frontend/components/AppShell.tsx
'use client';

// 應用外框：跳至內容連結、頂部導覽列、語言與主題切換、登出按鈕。所有頁面都會包在這裡面。
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/components/Providers';
import { AuthGate } from '@/components/AuthGate';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MessageKey } from '@/lib/i18n';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { RxRocket } from "react-icons/rx";
import { MdDarkMode, MdLightMode, MdTranslate } from "react-icons/md";

// 導覽列項目，固定只有 4 個路由
const NAV_ITEMS: { href: string; labelKey: MessageKey }[] = [
  { href: '/', labelKey: 'nav.chat' },
  { href: '/knowledge', labelKey: 'nav.knowledge' },
  { href: '/tuning', labelKey: 'nav.tuning' },
  { href: '/settings', labelKey: 'nav.settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  // 取得語言與主題狀態，以及翻譯函式
  const { t, locale, theme, setLocale, setTheme } = useApp();
  // 取得目前路徑，用來標示導覽列中的目前頁面
  const pathname = usePathname();
  // 是否已登入，決定要不要顯示登出按鈕
  const [hasSession, setHasSession] = useState(false);
  const signedIn = hasSession;
  // 目前登入的電子郵件，顯示在頂部讓使用者確認自己正在使用哪個帳號
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);

  // 訂閱登入狀態變化，登入或登出時自動更新按鈕與帳號顯示
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    // 回呼參數要明確標註型別：Supabase 這個方法有多載，TypeScript 無法自動推斷參數型別
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setHasSession(Boolean(session));
      setUserEmail(session?.user.email ?? null);
    });
    // 元件卸載時取消訂閱，避免記憶體洩漏
    return () => data.subscription.unsubscribe();
  }, []);

  // 登出：只登出目前這台瀏覽器（scope: 'local'），其他裝置的登入保留；全部裝置登出請到設定頁操作
  async function handleSignOut() {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) {
      toast.error(t('err.generic'));
      return;
    }
    toast.success(t('common.signedOut'));
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 跳至內容連結：平常隱藏，鍵盤按 Tab 第一次時才出現，方便跳過導覽列 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-zinc-900 focus:shadow dark:focus:bg-sky-900 dark:focus:text-zinc-100"
      >
        {t('common.skip')}
      </a>

      <header className="glass glass-bar-top">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-3">
          {/* 第一排：網站名稱靠左，語言、主題與帳號功能靠右 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* 網站名稱：用 h1 標示，但頁面主要標題由各頁自己的 h2 負責 */}
            <h1 className="order-1 flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold min-[400px]:text-base sm:flex-none sm:text-lg"><RxRocket className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">{t('common.appName')}</span></h1>
            <div className="order-2 ml-auto flex shrink-0 items-center gap-2">
              {/* 語言切換：圖示按鈕，名稱由 aria-label 提供，圖示本身對輔助科技隱藏 */}
              <button
                type="button"
                onClick={() => setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW')}
                aria-label={locale === 'zh-TW' ? t('common.switchLanguage') : t('common.switchLanguageZh')}
                title={locale === 'zh-TW' ? t('common.switchLanguage') : t('common.switchLanguageZh')}
                className="inline-flex h-9 w-9 items-center justify-center rounded text-lg hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-sky-800"
              >
                <MdTranslate aria-hidden="true" focusable="false" />
              </button>

              {/* 主題切換：aria-label 描述按下後的結果，因此不再加 aria-pressed 以免重複 */}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? t('common.themeToLight') : t('common.themeToDark')}
                title={theme === 'dark' ? t('common.themeToLight') : t('common.themeToDark')}
                className="inline-flex h-9 w-9 items-center justify-center rounded text-lg hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-sky-800"
              >
                {theme === 'dark' ? <MdLightMode aria-hidden="true" focusable="false" /> : <MdDarkMode aria-hidden="true" focusable="false" />}
              </button>
            </div>

            {/* 帳號區：手機版獨立一行，信箱可縮短，按鈕靠右；桌機版與圖示按鈕同一行 */}
            <div className="order-3 flex w-full items-center gap-2 sm:w-auto sm:justify-end">
              {/* 登出按鈕與帳號顯示只在已登入時出現 */}
              {signedIn && userEmail && (
                <span className="min-w-0 flex-1 truncate text-xs sm:max-w-[16rem] sm:flex-none text-zinc-800 dark:text-zinc-200" title={userEmail}>
                  {t('common.signedInAs', { email: userEmail })}
                </span>
              )}
              {signedIn && (
                <button type="button" onClick={() => setChangeOpen(true)} className="shrink-0 whitespace-nowrap rounded border border-zinc-500 px-2 py-1 text-xs hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-zinc-400 dark:hover:bg-sky-800 dark:focus-visible:outline-blue-300">
                  {t('auth.change.open')}
                </button>
              )}
              {signedIn && (
                <button type="button" onClick={handleSignOut} className="shrink-0 whitespace-nowrap rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-zinc-700 dark:hover:bg-sky-800 dark:focus-visible:outline-blue-300">
                  {t('common.signOut')}
                </button>
              )}
            </div>
          </div>

          {/* 第二排：主要導覽置中；nav 元素加上 aria-label，讓螢幕閱讀器知道這是哪一組連結 */}
          <nav aria-label={t('nav.label')}>
            <ul className="grid grid-cols-2 gap-1 text-center sm:flex sm:flex-wrap sm:justify-center">
              {NAV_ITEMS.map((item) => {
                // 目前頁面判斷：首頁只有完全等於 / 才算作用中
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    {signedIn ? (
                      <Link
                        href={item.href}
                        // aria-current="page" 告訴螢幕閱讀器這是目前所在的頁面
                        aria-current={active ? 'page' : undefined}
                        className={`block whitespace-nowrap rounded px-2 py-2 text-sm font-medium sm:inline-block sm:px-3 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-300 ${
                          active
                            ? 'btn-primary'
                            : 'hover:bg-white/60 dark:hover:bg-white/10'
                        }`}
                      >
                        {t(item.labelKey)}
                      </Link>
                    ) : (
                      // 未登入：不是連結，無法點擊也無法用鍵盤切換；aria-disabled 讓螢幕閱讀器知道為停用
                      <span
                        aria-disabled="true"
                        title={t('auth.nav.locked')}
                        className="block cursor-not-allowed select-none whitespace-nowrap rounded px-2 py-2 text-sm font-medium sm:inline-block sm:px-3 sm:text-base text-zinc-700 opacity-60 dark:text-zinc-300"
                      >
                        {t(item.labelKey)}
                        <span className="sr-only">（{t('auth.nav.locked')}）</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {/* 主要內容區：id="main" 是跳至內容連結的目標，tabIndex=-1 讓連結跳轉後焦點能真正移過來 */}
      <main id="main" tabIndex={-1} className="mx-auto my-4 w-[calc(100%-2rem)] max-w-6xl flex-1 glass rounded-xl px-4 py-6 focus:outline-none">
        {/* AuthGate 負責判斷登入狀態：未登入顯示登入面板，已登入才顯示頁面內容 */}
        <AuthGate>{children}</AuthGate>
      </main>
      <footer className="glass glass-bar-bottom px-4 py-4 text-center text-sm text-zinc-800 dark:text-zinc-200">
        {currentYear !== null ? t('common.copyright', { year: currentYear }) : null}
      </footer>
      <ChangePasswordDialog open={changeOpen} onOpenChange={setChangeOpen} />
    </div>
  );
}
