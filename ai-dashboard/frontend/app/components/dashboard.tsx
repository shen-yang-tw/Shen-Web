'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { ChurnRow, useChurnDataStatus } from '../hooks/useChurnData'
import { formatCurrency, RetentionAction, RetentionActionSchema, riskTone } from '../types'
import { useAppPreferences } from './app-shell'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const contractMessageKey = {
  'Month-to-month': 'contract.monthToMonth',
  'One year': 'contract.oneYear',
  'Two year': 'contract.twoYear',
} as const

function displayContract(contract: ChurnRow['contract'], t: ReturnType<typeof useAppPreferences>['t']) {
  return t(contractMessageKey[contract])
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  const { dataSource, rowCount, retry, aiStatus, aiModel, aiSummary } = useChurnDataStatus()
  const { t, locale } = useAppPreferences()

  return (
    <header className="flex flex-col gap-5 border-b border-slate-800/80 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        {dataSource === 'loading' ? (
          <p role="status" className="mt-2 text-xs text-slate-500">
            {t('data.loading')}
          </p>
        ) : dataSource === 'api' ? (
          <p role="status" className="mt-2 text-xs text-emerald-400">
            {t('data.live', { count: rowCount.toLocaleString() })}
          </p>
        ) : (
          <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-300">
            <span>{t('data.unavailable')}</span>
            <button
              type="button"
              onClick={retry}
              className="rounded border border-amber-400/30 px-2 py-1 font-medium hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {t('data.retry')}
            </button>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p
            role="status"
            className={`text-xs ${
              aiStatus === 'generated'
                ? 'text-emerald-400'
                : aiStatus === 'error' || aiStatus === 'provider_error'
                  ? 'text-amber-300'
                  : 'text-slate-500'
            }`}
          >
            {aiStatus === 'loading'
              ? t('ai.loading')
              : aiStatus === 'generated'
                ? t('ai.generated', { model: aiModel ?? 'AI' })
                : aiStatus === 'error'
                  ? t('ai.error')
                  : aiStatus === 'provider_error'
                    ? t('ai.providerError', {
                        model: aiModel ?? 'AI',
                      })
                    : t('ai.notConfigured')}
          </p>
          {dataSource === 'api' && (
            <button
              type="button"
              onClick={retry}
              disabled={aiStatus === 'loading'}
              className="inline-flex items-center gap-1.5 rounded border border-indigo-400/30 px-2 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className={`size-3 ${aiStatus === 'loading' ? 'animate-spin' : ''}`} />
              {t(aiStatus === 'loading' ? 'ai.refreshing' : 'ai.refresh')}
            </button>
          )}
        </div>
        {aiSummary && (
          <p className="mt-2 max-w-3xl rounded-lg border border-indigo-400/15 bg-indigo-500/5 px-3 py-2 text-xs leading-5 text-slate-300">
            {locale === 'zh-TW' ? aiSummary.summary_zh : aiSummary.summary_en}
          </p>
        )}
      </div>
      {action}
    </header>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  accent = 'indigo',
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose'
  icon: React.ElementType
}) {
  const tones = {
    indigo: 'text-indigo-300 bg-indigo-500/10 ring-indigo-400/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20',
    amber: 'text-amber-300 bg-amber-500/10 ring-amber-400/20',
    rose: 'text-rose-300 bg-rose-500/10 ring-rose-400/20',
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className={`flex size-9 items-center justify-center rounded-lg ring-1 ${tones[accent]}`}>
          <Icon aria-hidden="true" className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

export function RiskBadge({ risk }: { risk: ChurnRow['risk_level'] }) {
  const { t } = useAppPreferences()
  const tone = riskTone(risk)
  const classes = {
    high: 'bg-rose-500/10 text-rose-300 ring-rose-400/20',
    medium: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
    low: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  }
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${classes[tone]}`}>
      {t('risk.badge', { risk: t(`risk.${risk.toLowerCase()}` as 'risk.high' | 'risk.medium' | 'risk.low') })}
    </span>
  )
}

export function RiskPanel({ rows, onClose }: { rows: ChurnRow[]; onClose: () => void }) {
  const [actions, setActions] = useState<Record<string, RetentionAction>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingCustomerId, setSavingCustomerId] = useState<string | null>(null)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [hasSaveError, setHasSaveError] = useState(false)
  const { t } = useAppPreferences()

  const loadActions = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setHasLoadError(false)
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/retention/actions`, { signal })
      if (!response.ok) throw new Error(`Retention action request failed: ${response.status}`)
      const parsed = RetentionActionSchema.array().parse(await response.json())
      setActions(Object.fromEntries(parsed.map((action) => [action.customer_id, action])))
    } catch (error) {
      if (signal?.aborted) return
      console.error('Could not load retention actions.', error)
      setHasLoadError(true)
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadActions(controller.signal)
    return () => controller.abort()
  }, [loadActions])

  const updateAction = async (customerId: string) => {
    const action = actions[customerId]
    const nextStatus = action
      ? action.status === 'queued'
        ? 'in_progress'
        : action.status === 'in_progress'
          ? 'completed'
          : 'queued'
      : null
    setSavingCustomerId(customerId)
    setHasSaveError(false)
    try {
      const response = await fetch(
        action
          ? `${API_BASE_URL}/api/v1/retention/actions/${encodeURIComponent(customerId)}`
          : `${API_BASE_URL}/api/v1/retention/actions`,
        {
          method: action ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action ? { status: nextStatus } : { customer_id: customerId }),
        },
      )
      if (!response.ok) throw new Error(`Retention action request failed: ${response.status}`)
      const updated = RetentionActionSchema.parse(await response.json())
      setActions((current) => ({ ...current, [customerId]: updated }))
    } catch (error) {
      console.error(`Could not save retention action for ${customerId}.`, error)
      setHasSaveError(true)
    } finally {
      setSavingCustomerId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={t('risk.dialog')}
    >
      <button className="absolute inset-0 cursor-default" aria-label={t('risk.close')} onClick={onClose} />
      <aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-[#0b1220] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">
              {t('risk.queue')}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">{t('risk.dialog')}</h2>
            <p className="mt-2 text-sm text-slate-400">{t('risk.needAttention', { count: rows.length })}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={t('risk.close')}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {isLoading && <p role="status" className="text-sm text-slate-400">{t('risk.actionsLoading')}</p>}
          {hasLoadError && (
            <div role="alert" className="flex items-center justify-between gap-3 text-sm text-amber-300">
              <span>{t('risk.actionsLoadError')}</span>
              <button type="button" onClick={() => void loadActions()} className="underline">
                {t('risk.retryActions')}
              </button>
            </div>
          )}
          {hasSaveError && <p role="alert" className="text-sm text-amber-300">{t('risk.actionSaveError')}</p>}
          {rows.map((row) => {
            const action = actions[row.customer_id]
            const buttonKey = !action
              ? 'risk.startSavePlay'
              : action.status === 'queued'
                ? 'risk.startOutreach'
                : action.status === 'in_progress'
                  ? 'risk.markCompleted'
                  : 'risk.reopen'
            return (
              <div key={row.customer_id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm text-white">{row.customer_id}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {displayContract(row.contract, t)} · {t('risk.months', { count: row.tenure })}
                    </p>
                  </div>
                  <RiskBadge risk={row.risk_level} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {t('risk.probability')}{' '}
                    <strong className="text-rose-300">{Math.round(row.churn_probability * 100)}%</strong>
                  </span>
                  <button
                    type="button"
                    disabled={
                      isLoading ||
                      savingCustomerId === row.customer_id ||
                      (!action && row.actual_churn)
                    }
                    onClick={() => void updateAction(row.customer_id)}
                    className="rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-indigo-400 hover:text-white disabled:cursor-default disabled:border-emerald-500/30 disabled:text-emerald-300"
                  >
                    {savingCustomerId === row.customer_id
                      ? t('risk.actionsLoading')
                      : row.actual_churn && !action
                        ? t('risk.alreadyChurned')
                        : t(buttonKey)}
                  </button>
                </div>
                {action && (
                  <p className="mt-2 text-right text-[11px] text-slate-400">
                    {t(
                      action.status === 'queued'
                        ? 'risk.queued'
                        : action.status === 'in_progress'
                          ? 'risk.inProgress'
                          : 'risk.completed',
                    )}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

export function CustomerTable({ rows, isLoading }: { rows: ChurnRow[]; isLoading: boolean }) {
  const { t, locale } = useAppPreferences()
  if (isLoading)
    return (
      <div className="p-6 text-sm text-slate-400" role="status" aria-live="polite">
        {t('customers.loading')}
      </div>
    )
  if (rows.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-14 text-center">
        <Search className="size-6 text-slate-600" />
        <p className="text-sm font-medium text-slate-300">{t('customers.noMatch')}</p>
        <p className="text-xs text-slate-500">{t('customers.broaden')}</p>
      </div>
    )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-190 text-left text-sm">
        <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            {[
              t('customers.customer'),
              t('customers.contract'),
              t('customers.tenure'),
              t('customers.monthlySpend'),
              t('customers.risk'),
              t('customers.probability'),
              t('customers.actual'),
            ].map((heading) => (
              <th key={heading} className="px-6 py-4 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {rows.map((row) => (
            <tr key={row.customer_id} className="transition hover:bg-slate-800/30">
              <td className="px-6 py-4 font-mono text-xs text-slate-200">{row.customer_id}</td>
              <td className="px-6 py-4 text-xs text-slate-400">{displayContract(row.contract, t)}</td>
              <td className="px-6 py-4 text-xs text-slate-400">
                {t('overview.month', { count: row.tenure })}
              </td>
              <td className="px-6 py-4 text-xs text-slate-300">
                {formatCurrency(row.monthly_charges, locale === 'zh-TW' ? 'zh-TW' : 'en-US')}
              </td>
              <td className="px-6 py-4">
                <RiskBadge risk={row.risk_level} />
              </td>
              <td className="px-6 py-4 text-xs font-medium text-slate-200">
                {Math.round(row.churn_probability * 100)}%
              </td>
              <td className="px-6 py-4 text-xs text-slate-400">
                {row.actual_churn ? t('customers.churned') : t('customers.retained')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export { AlertTriangle, ArrowUpRight, CheckCircle2, Download, RefreshCw, ShieldAlert, SlidersHorizontal }
