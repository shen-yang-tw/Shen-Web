// frontend/components/ChangePasswordDialog.tsx
'use client';

// 修改密碼視窗：登入後由頁首開啟。
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal, PRIMARY_BUTTON } from '@/components/Modal';
import { PasswordField } from '@/components/AuthFields';
import { useApp } from '@/components/Providers';
import { mapChangePasswordError, validateConfirm, validateNewPassword, type ErrorKey } from '@/lib/authErrors';
import { clearRecoveryPending } from '@/lib/recovery';
import { getSupabase } from '@/lib/supabase';

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<ErrorKey | null>(null);
  const [confirmError, setConfirmError] = useState<ErrorKey | null>(null);
  const [formError, setFormError] = useState<{ key: ErrorKey; code: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  function handleOpenChange(next: boolean) {
    // 每次開啟與關閉都清空密碼，避免殘留在記憶體中的畫面狀態
    setPassword('');
    setConfirm('');
    setPasswordError(null);
    setConfirmError(null);
    setFormError(null);
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const pe = validateNewPassword(password);
    const ce = pe ? null : validateConfirm(password, confirm);
    setPasswordError(pe);
    setConfirmError(ce);
    if (pe || ce) return;
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) {
        setFormError(mapChangePasswordError(error));
        return;
      }
      clearRecoveryPending();
      toast.success(t('auth.change.success'));
      handleOpenChange(false);
    } catch (error) {
      setFormError(mapChangePasswordError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t('auth.change.title')}
      description={t('auth.change.description')}
    >
      <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="space-y-3">
        <div role="status" aria-live="polite" className="empty:hidden rounded bg-sky-200 p-3 text-sm text-blue-900 dark:bg-sky-950 dark:text-blue-200">
          {busy ? t('auth.change.saving') : ''}
        </div>
        {formError && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {t(formError.key, formError.code ? { code: formError.code } : undefined)}
          </p>
        )}
        <PasswordField
          label={t('auth.newPassword')}
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
          {t('auth.change.submit')}
        </button>
      </form>
    </Modal>
  );
}
