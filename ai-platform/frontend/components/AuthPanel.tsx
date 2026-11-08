// frontend/components/AuthPanel.tsx
'use client';

// 未登入時顯示的面板：登入與註冊是兩個完全獨立的表單（各自的欄位、驗證、錯誤與狀態），以頁籤切換。
import { useEffect, useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import { clearRecoveryPending } from '@/lib/recovery';
import { PasswordField, TextField } from '@/components/AuthFields';
import { PRIMARY_BUTTON } from '@/components/Modal';
import { QuickLogin } from '@/components/QuickLogin';
import { useApp } from '@/components/Providers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  mapEmailActionError,
  mapSignInError,
  mapSignUpError,
  validateConfirm,
  validateEmail,
  validateNewPassword,
  validateSignInPassword,
  type ErrorKey,
  type MappedError,
} from '@/lib/authErrors';
import {
  FORGOT_THRESHOLD,
  MAX_FAILURES,
  getSignInState,
  lockSignIn,
  recordSignInFailure,
  resetSignInState,
} from '@/lib/authLock';
import { getSupabase } from '@/lib/supabase';

export type AuthErrorKey = ErrorKey;
type AuthMode = 'signIn' | 'signUp';

const ERROR_BOX = 'rounded bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200';
const LINK_BUTTON =
  'rounded text-sm font-medium text-blue-800 underline hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-blue-300 dark:hover:text-blue-200 dark:focus-visible:outline-blue-300';

export function AuthPanel({ initialError }: { initialError?: AuthErrorKey }) {
  const { t } = useApp();
  const [mode, setMode] = useState<AuthMode>('signIn');
  // 切換頁籤時帶入已輸入的信箱，減少重打
  const [sharedEmail, setSharedEmail] = useState('');

  return (
    <section className="mx-auto max-w-md glass-strong rounded-lg p-6 text-zinc-900 dark:text-zinc-100">
      {initialError && (
        <p role="alert" className={`${ERROR_BOX} mb-4`}>
          {t(initialError)}
        </p>
      )}
      <QuickLogin />
      <Tabs value={mode} onValueChange={(next) => setMode(next as AuthMode)} className="gap-4">
        <TabsList aria-label={t('auth.modeGroup')}>
          <TabsTrigger value="signIn">{t('auth.signIn')}</TabsTrigger>
          <TabsTrigger value="signUp">{t('auth.signUp')}</TabsTrigger>
        </TabsList>
        <TabsContent value="signIn">
          <SignInForm initialEmail={sharedEmail} onEmailChange={setSharedEmail} />
        </TabsContent>
        <TabsContent value="signUp">
          <SignUpForm initialEmail={sharedEmail} onEmailChange={setSharedEmail} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function SignInForm({ initialEmail, onEmailChange }: { initialEmail: string; onEmailChange: (v: string) => void }) {
  const { t } = useApp();
  const headingId = useId();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<ErrorKey | null>(null);
  const [passwordError, setPasswordError] = useState<ErrorKey | null>(null);
  const [formError, setFormError] = useState<MappedError | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resent, setResent] = useState(false);

  function applyState(state: { failures: number; lockedUntil: number }) {
    setFailures(state.failures);
    setLockedUntil(state.lockedUntil);
  }

  // 載入時還原失敗次數
  useEffect(() => {
    applyState(getSignInState());
  }, []);

  // 鎖定到期的那一刻自動解除，不需要重新整理頁面
  useEffect(() => {
    if (lockedUntil <= 0) return;
    const unlock = () => {
      const state = getSignInState();
      applyState(state);
      if (state.lockedUntil === 0) setFormError(null);
    };
    const wait = lockedUntil - Date.now();
    if (wait <= 0) {
      unlock();
      return;
    }
    const timer = window.setTimeout(unlock, wait + 50);
    return () => window.clearTimeout(timer);
  }, [lockedUntil]);

  const locked = lockedUntil > Date.now();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResent(false);
    const current = getSignInState();
    applyState(current);
    if (current.lockedUntil > Date.now()) return;
    const ee = validateEmail(email);
    const pe = validateSignInPassword(password);
    setEmailError(ee);
    setPasswordError(pe);
    setFormError(null);
    setAttemptsLeft(null);
    if (ee || pe) return;

    setBusy(true);
    try {
      clearRecoveryPending();
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const mapped = mapSignInError(error);
        setFormError(mapped);
        if (mapped.rateLimited) {
          applyState(lockSignIn());
        } else if (mapped.key === 'auth.invalidCredentials') {
          // 只有「密碼錯誤」才累計次數；網路或服務問題不應讓使用者被鎖
          const next = recordSignInFailure();
          applyState(next);
          if (next.lockedUntil === 0) setAttemptsLeft(Math.max(0, MAX_FAILURES + 1 - next.failures));
        }
        return;
      }
      resetSignInState();
      toast.success(t('auth.signInSuccess'));
    } catch (error) {
      setFormError(mapSignInError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    const ee = validateEmail(email);
    setEmailError(ee);
    if (ee) return;
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resend({ type: 'signup', email: email.trim() });
      if (error) {
        setFormError(mapEmailActionError(error));
        return;
      }
      setFormError(null);
      setResent(true);
    } catch (error) {
      setFormError(mapEmailActionError(error));
    } finally {
      setBusy(false);
    }
  }

  const showForgot = failures >= FORGOT_THRESHOLD;
  const alertKey: ErrorKey | null = locked ? 'auth.signInLocked' : (formError?.key ?? null);

  return (
    <div className="space-y-4">
      <h2 id={headingId} className="text-xl font-semibold">
        {t('auth.title')}
      </h2>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('auth.description')}</p>

      <div role="status" aria-live="polite" className="empty:hidden rounded bg-sky-200 p-3 text-sm text-blue-900 dark:bg-sky-950 dark:text-blue-200">
        {busy ? t('auth.signingIn') : resent ? t('auth.resendDone') : ''}
      </div>

      {alertKey && (
        <div role="alert" className={ERROR_BOX}>
          <p>{t(alertKey, !locked && formError?.code ? { code: formError.code } : undefined)}</p>
          {!locked && attemptsLeft !== null && attemptsLeft > 0 && <p className="mt-1">{t('auth.attemptsLeft', { n: attemptsLeft })}</p>}
          {!locked && alertKey === 'auth.emailNotConfirmed' && (
            <button type="button" onClick={handleResend} disabled={busy} className={`${LINK_BUTTON} mt-2`}>
              {t('auth.resendConfirm')}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-labelledby={headingId} aria-busy={busy} className="space-y-3">
        <TextField
          label={t('auth.email')}
          hint={t('auth.hint.email')}
          errorKey={emailError}
          value={email}
          onChange={(v) => {
            setEmail(v);
            onEmailChange(v);
          }}
          name="email"
          autoComplete="username"
          placeholder="name@example.com"
          disabled={locked}
        />
        <PasswordField
          label={t('auth.password')}
          hint={t('auth.hint.signInPassword')}
          errorKey={passwordError}
          value={password}
          onChange={setPassword}
          name="password"
          autoComplete="current-password"
          disabled={locked}
        />
        <button type="submit" disabled={busy || locked} className={PRIMARY_BUTTON}>
          {t('auth.signIn')}
        </button>
      </form>

      {showForgot && (
        <div className="rounded border border-zinc-500 p-3 text-sm">
          <p>{t('auth.forgot.hint', { n: failures })}</p>
          <button type="button" onClick={() => setForgotOpen(true)} className={`${LINK_BUTTON} mt-1`}>
            {t('auth.forgot.open')}
          </button>
        </div>
      )}
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
    </div>
  );
}

function SignUpForm({ initialEmail, onEmailChange }: { initialEmail: string; onEmailChange: (v: string) => void }) {
  const { t } = useApp();
  const headingId = useId();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState<ErrorKey | null>(null);
  const [passwordError, setPasswordError] = useState<ErrorKey | null>(null);
  const [confirmError, setConfirmError] = useState<ErrorKey | null>(null);
  const [formError, setFormError] = useState<MappedError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDone(false);
    const ee = validateEmail(email);
    const pe = validateNewPassword(password);
    const ce = pe ? null : validateConfirm(password, confirm);
    setEmailError(ee);
    setPasswordError(pe);
    setConfirmError(ce);
    setFormError(null);
    if (ee || pe || ce) return;

    setBusy(true);
    try {
      const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
      if (error) {
        setFormError(mapSignUpError(error));
        return;
      }
      // Supabase 為避免洩漏已註冊信箱，對已存在且已驗證的信箱會回傳 identities 為空的假成功
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setFormError({ key: 'auth.emailAlreadyExists', code: null });
        return;
      }
      if (data.session) {
        toast.success(t('auth.signUpSuccess'));
      } else {
        setDone(true);
        setPassword('');
        setConfirm('');
      }
    } catch (error) {
      setFormError(mapSignUpError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 id={headingId} className="text-xl font-semibold">
        {t('auth.signUpTitle')}
      </h2>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{t('auth.signUpDescription')}</p>

      <div
        role="status"
        aria-live="polite"
        className={`empty:hidden rounded p-3 text-sm ${
          done ? 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200' : 'bg-sky-200 text-blue-900 dark:bg-sky-950 dark:text-blue-200'
        }`}
      >
        {busy ? t('auth.signingUp') : done ? t('auth.signUpDone') : ''}
      </div>
      {formError && (
        <p role="alert" className={ERROR_BOX}>
          {t(formError.key, formError.code ? { code: formError.code } : undefined)}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate aria-labelledby={headingId} aria-busy={busy} className="space-y-3">
        <TextField
          label={t('auth.email')}
          hint={t('auth.hint.email')}
          errorKey={emailError}
          value={email}
          onChange={(v) => {
            setEmail(v);
            onEmailChange(v);
          }}
          name="email"
          autoComplete="email"
          placeholder="name@example.com"
        />
        <PasswordField
          label={t('auth.password')}
          hint={t('auth.hint.signUpPassword')}
          errorKey={passwordError}
          value={password}
          onChange={setPassword}
          name="new-password"
          autoComplete="new-password"
        />
        <PasswordField
          label={t('auth.confirmPassword')}
          hint={t('auth.hint.confirmPassword')}
          errorKey={confirmError}
          value={confirm}
          onChange={setConfirm}
          name="confirm-password"
          autoComplete="new-password"
        />
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
          {t('auth.submitSignUp')}
        </button>
      </form>
    </div>
  );
}
