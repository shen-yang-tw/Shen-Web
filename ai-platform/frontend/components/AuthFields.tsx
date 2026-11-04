// frontend/components/AuthFields.tsx
'use client';

// 表單欄位元件：標籤、輸入框、格式提示、錯誤文字都用 aria-describedby 關聯，錯誤時 aria-invalid。
import { useId, useState, type ComponentProps } from 'react';
import { useApp } from '@/components/Providers';
import type { MessageKey } from '@/lib/i18n';

const INPUT_CLASS =
  'w-full rounded border bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:bg-sky-900 dark:text-zinc-100 dark:focus-visible:outline-blue-300';

type BaseProps = {
  label: string;
  hint: string;
  // 驗證失敗時的錯誤文字 key；null 代表沒有錯誤
  errorKey: MessageKey | null;
  value: string;
  onChange: (value: string) => void;
} & Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'className'>;

function FieldShell({
  id,
  label,
  hint,
  errorKey,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  errorKey: MessageKey | null;
  children: React.ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      <p id={`${id}-hint`} className="text-xs text-zinc-700 dark:text-zinc-300">
        {hint}
      </p>
      {errorKey && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
          {t(errorKey)}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  errorKey,
  value,
  onChange,
  fieldType = 'email',
  ...rest
}: BaseProps & { fieldType?: 'email' | 'text' }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} errorKey={errorKey}>
      <input
        {...rest}
        id={id}
        type={fieldType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errorKey ? true : undefined}
        aria-describedby={errorKey ? `${id}-hint ${id}-error` : `${id}-hint`}
        className={`${INPUT_CLASS} ${errorKey ? 'border-red-700 dark:border-red-300' : 'border-zinc-500 dark:border-zinc-400'}`}
      />
    </FieldShell>
  );
}

// 密碼欄位：右側按鈕可切換顯示與隱藏，aria-pressed 讓螢幕閱讀器知道目前狀態
export function PasswordField({ label, hint, errorKey, value, onChange, ...rest }: BaseProps) {
  const id = useId();
  const { t } = useApp();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} errorKey={errorKey}>
      <div className="relative">
        <input
          {...rest}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={errorKey ? true : undefined}
          aria-describedby={errorKey ? `${id}-hint ${id}-error` : `${id}-hint`}
          className={`${INPUT_CLASS} pr-20 ${errorKey ? 'border-red-700 dark:border-red-300' : 'border-zinc-500 dark:border-zinc-400'}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 rounded px-2 text-sm font-medium text-blue-800 hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:text-blue-300 dark:hover:bg-sky-800 dark:focus-visible:outline-blue-300"
        >
          {visible ? t('auth.password.hide') : t('auth.password.show')}
        </button>
      </div>
    </FieldShell>
  );
}
