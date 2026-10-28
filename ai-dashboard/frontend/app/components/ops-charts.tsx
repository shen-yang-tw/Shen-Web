'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, Telemetry } from '../types'
import { useAppPreferences } from './app-shell'

type Point = { label: string; value: number }

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 16, bottom: 28, left: 56 }

function scale(points: Point[], extra: number[] = []) {
  const values = [...points.map((point) => point.value), ...extra]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return { min: min - span * 0.08, max: max + span * 0.08 }
}

function toXY(index: number, count: number, value: number, min: number, max: number) {
  const x = PAD.left + (count <= 1 ? 0 : (index / (count - 1)) * (WIDTH - PAD.left - PAD.right))
  const y = PAD.top + (1 - (value - min) / (max - min)) * (HEIGHT - PAD.top - PAD.bottom)
  return { x, y }
}

function Axis({ min, max, format }: { min: number; max: number; format: (value: number) => string }) {
  return (
    <>
      {[0, 0.5, 1].map((ratio) => {
        const value = min + (max - min) * ratio
        const y = PAD.top + (1 - ratio) * (HEIGHT - PAD.top - PAD.bottom)
        return (
          <g key={ratio}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="stroke-slate-700" strokeDasharray="3 4" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
              {format(value)}
            </text>
          </g>
        )
      })}
    </>
  )
}

function ChartFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function MrrTrendChart({
  history,
  forecast,
  anomalyMonths,
}: {
  history: Point[]
  forecast: Point[]
  anomalyMonths: string[]
}) {
  const { t, locale } = useAppPreferences()
  const currency = locale === 'zh-TW' ? 'zh-TW' : 'en-US'
  const all = [...history, ...forecast]
  const { min, max } = scale(all)
  const coords = all.map((point, index) => ({ ...point, ...toXY(index, all.length, point.value, min, max) }))
  const historyCoords = coords.slice(0, history.length)
  const forecastCoords = coords.slice(history.length - 1)
  const line = (items: { x: number; y: number }[]) => items.map((item) => `${item.x},${item.y}`).join(' ')
  const step = Math.max(1, Math.ceil(all.length / 6))
  const compact = (value: number) => `$${(value / 1000).toFixed(0)}k`

  return (
    <ChartFrame title={t('ops.mrrTitle')} subtitle={t('ops.mrrSubtitle')}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('ops.mrrAria', {
          first: formatCurrency(history[0]?.value ?? 0, currency),
          last: formatCurrency(forecast[forecast.length - 1]?.value ?? 0, currency),
        })}
        className="w-full"
      >
        <Axis min={min} max={max} format={compact} />
        <polyline points={line(historyCoords)} fill="none" className="stroke-indigo-400" strokeWidth="2.5" />
        <polyline points={line(forecastCoords)} fill="none" className="stroke-emerald-400" strokeWidth="2.5" strokeDasharray="6 5" />
        {coords.map((point, index) => (
          <g key={point.label}>
            {anomalyMonths.includes(point.label) && (
              <circle cx={point.x} cy={point.y} r="6" className="fill-rose-500" />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              className={index < history.length ? 'fill-indigo-400' : 'fill-emerald-400'}
            />
            {index % step === 0 && (
              <text x={point.x} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {point.label.slice(2)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <Legend
        items={[
          { className: 'bg-indigo-400', label: t('ops.legendHistory') },
          { className: 'bg-emerald-400', label: t('ops.legendForecast') },
          { className: 'bg-rose-500', label: t('ops.legendAnomaly') },
        ]}
      />
    </ChartFrame>
  )
}

export function DailyLineChart({
  title,
  subtitle,
  points,
  anomalyLabels,
  format,
  ariaLabel,
  tone = 'indigo',
}: {
  title: string
  subtitle: string
  points: Point[]
  anomalyLabels: string[]
  format: (value: number) => string
  ariaLabel: string
  tone?: 'indigo' | 'amber'
}) {
  const { t } = useAppPreferences()
  const { min, max } = scale(points)
  const coords = points.map((point, index) => ({ ...point, ...toXY(index, points.length, point.value, min, max) }))
  const step = Math.max(1, Math.ceil(points.length / 6))
  const stroke = tone === 'amber' ? 'stroke-amber-400' : 'stroke-indigo-400'
  const fill = tone === 'amber' ? 'fill-amber-400' : 'fill-indigo-400'

  return (
    <ChartFrame title={title} subtitle={subtitle}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="w-full">
        <Axis min={min} max={max} format={format} />
        <polyline points={coords.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" className={stroke} strokeWidth="2.5" />
        {coords.map((point, index) => (
          <g key={point.label}>
            {anomalyLabels.includes(point.label) && <circle cx={point.x} cy={point.y} r="6" className="fill-rose-500" />}
            <circle cx={point.x} cy={point.y} r="2.5" className={fill} />
            {index % step === 0 && (
              <text x={point.x} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {point.label.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <Legend
        items={[
          { className: tone === 'amber' ? 'bg-amber-400' : 'bg-indigo-400', label: title },
          { className: 'bg-rose-500', label: t('ops.legendAnomaly') },
        ]}
      />
    </ChartFrame>
  )
}

function Legend({ items }: { items: { className: string; label: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2 rounded-full ${item.className}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function BudgetPanel({ summary }: { summary: Telemetry['modelops_summary'] }) {
  const { t, locale } = useAppPreferences()
  const currency = locale === 'zh-TW' ? 'zh-TW' : 'en-US'
  const percent = Math.round(summary.budget_used_ratio * 100)
  const tone = percent >= 100 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
  const status = percent >= 100 ? 'ops.budgetOver' : percent >= 80 ? 'ops.budgetWarn' : 'ops.budgetOk'

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
      <h2 className="font-semibold text-white">{t('ops.budgetTitle')}</h2>
      <p className="mt-1 text-xs text-slate-500">
        {t('ops.budgetSubtitle', { days: summary.period_days, model: summary.model })}
      </p>
      <div className="mt-5 flex items-end justify-between">
        <p className="text-3xl font-semibold text-white">{formatCurrency(summary.total_cost_usd, currency)}</p>
        <p className="text-xs text-slate-400">
          {t('ops.budgetOf', { budget: formatCurrency(summary.budget_usd, currency) })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-label={t('ops.budgetTitle')}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="mt-3 text-xs text-slate-300">{t(status, { percent })}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
        {[
          [t('ops.requests'), summary.total_requests.toLocaleString()],
          [t('ops.inputTokens'), summary.total_input_tokens.toLocaleString()],
          [t('ops.outputTokens'), summary.total_output_tokens.toLocaleString()],
          [t('ops.failureRate'), `${(summary.failure_rate * 100).toFixed(2)}%`],
          [t('ops.avgLatency'), `${summary.average_latency_ms.toFixed(0)} ms`],
          [t('ops.p95Latency'), `${summary.p95_latency_ms.toFixed(0)} ms`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-1 font-semibold text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function AnomalyPanel({ anomalies }: { anomalies: Telemetry['anomalies'] }) {
  const { t, locale } = useAppPreferences()
  const currency = locale === 'zh-TW' ? 'zh-TW' : 'en-US'
  const describe = (item: Telemetry['anomalies'][number]) => {
    const values = {
      value:
        item.metric === 'latency'
          ? `${item.value.toFixed(0)} ms`
          : item.metric === 'failure_rate'
            ? `${(item.value * 100).toFixed(1)}%`
            : formatCurrency(item.value, currency),
      baseline:
        item.metric === 'latency'
          ? `${item.baseline.toFixed(0)} ms`
          : item.metric === 'failure_rate'
            ? `${(item.baseline * 100).toFixed(1)}%`
            : formatCurrency(item.baseline, currency),
    }
    return t(`ops.anomaly.${item.metric}` as 'ops.anomaly.latency', values)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
      <h2 className="font-semibold text-white">{t('ops.anomalyTitle')}</h2>
      <p className="mt-1 text-xs text-slate-500">{t('ops.anomalySubtitle')}</p>
      {anomalies.length === 0 ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 aria-hidden="true" className="size-4" /> {t('ops.anomalyNone')}
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {anomalies.map((item) => (
            <li
              key={`${item.metric}-${item.period}`}
              className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-300" />
              <div>
                <p className="font-medium text-white">{item.period}</p>
                <p className="mt-0.5 text-slate-300">{describe(item)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
