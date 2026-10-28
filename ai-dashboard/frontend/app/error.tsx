'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useAppPreferences } from './components/app-shell'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useAppPreferences()
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080d19] p-6">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-[#0d1525] p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">{t('error.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{t('error.description')}</p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <RefreshCw className="size-4" /> {t('error.retry')}
        </button>
      </div>
    </main>
  )
}
