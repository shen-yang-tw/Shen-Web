// frontend/components/ForgotPasswordDialog.tsx
'use client';

// 忘記密碼視窗：輸入註冊信箱後寄出「重設密碼連結」（Supabase 只儲存密碼雜湊，無法也不應寄出原本的密碼）。
// 使用者點擊信中連結會直接登入網站，並看到「請盡快修改密碼」的提醒。
// 回覆文字不透露該信箱是否已註冊，避免被用來探測帳號。
import { useState, type FormEvent } from 'react';
import { Modal, PRIMARY_BUTTON } from '@/components/Modal';
import { TextField } from '@/components/AuthFields';
import { useApp } from '@/components/Providers';
import { mapEmailActionError, validateEmail, type ErrorKey } from '@/lib/authErrors';
import { getSupabase } from '@/lib/supabase';

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail: string;
}) {
  const { t } = useApp();
  const [email, setEmail] = useState(defaultEmail);
  const [fieldError, setFieldError] = useState<ErrorKey | null>(null);
  const [formError, setFormError] = useState<{ key: ErrorKey; code: string | null } | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      setEmail(defaultEmail);
      setFieldError(null);
      setFormError(null);
      setSent(false);
    }
    onOpenChange(next);
  }

  async function sendLink() {
    setFormError(null);
    const invalid = validateEmail(email);
    setFieldError(invalid);
    if (invalid) return;
    setBusy(true);
    try {
      // 連結導回目前網址（本機、Docker 或正式網域皆自動適用）；該網址需列在 Supabase 的 Redirect URLs 允許清單
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        setFormError(mapEmailActionError(error));
        return;
      }
      setSent(true);
    } catch (error) {
      setFormError(mapEmailActionError(error));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendLink();
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title={t('auth.forgot.title')} description={t('auth.forgot.description')}>
      <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="space-y-3">
        <div role="status" aria-live="polite" className="empty:hidden rounded bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-200">
          {busy ? t('auth.forgot.sending') : sent ? t('auth.forgot.done') : ''}
        </div>
        {formError && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {t(formError.key, formError.code ? { code: formError.code } : undefined)}
          </p>
        )}
        <TextField
          label={t('auth.email')}
          hint={t('auth.hint.email')}
          errorKey={fieldError}
          value={email}
          onChange={setEmail}
          name="reset-email"
          autoComplete="email"
        />
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
          {sent ? t('auth.forgot.resend') : t('auth.forgot.submit')}
        </button>
      </form>
    </Modal>
  );
}