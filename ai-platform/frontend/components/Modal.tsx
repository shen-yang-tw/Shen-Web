// frontend/components/Modal.tsx
'use client';

// 無障礙對話視窗：Radix Dialog 提供焦點鎖定、Esc 關閉、aria-modal 與焦點還原。
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { useApp } from '@/components/Providers';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { t } = useApp();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto glass-strong rounded-xl p-6 text-zinc-900 dark:text-zinc-100">
          <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</Dialog.Description>
          <div className="mt-4">{children}</div>
          <Dialog.Close className="absolute right-3 top-3 rounded px-2 py-1 text-sm text-zinc-800 hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:text-zinc-200 dark:hover:bg-sky-800 dark:focus-visible:outline-blue-300">
            {t('auth.close')}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const PRIMARY_BUTTON =
  'btn-primary w-full rounded bg-sky-900 px-4 py-2 font-medium text-white hover:bg-sky-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:bg-sky-200 dark:text-zinc-900 dark:hover:bg-sky-300 dark:focus-visible:outline-blue-300';
