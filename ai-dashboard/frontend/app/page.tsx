'use client'

import { useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, DollarSign, Target, Users } from 'lucide-react'
import { useChurnData } from './hooks/useChurnData'
import { MetricCard, PageHeader, RiskBadge, RiskPanel } from './components/dashboard'
import { useAppPreferences } from './components/app-shell'

export default function Page() {
  const { allRows, highRiskRows, meanSpend, modelMetrics } = useChurnData()
  const { t } = useAppPreferences()
  const [showRiskPanel, setShowRiskPanel] = useState(false)

  const contractData = ['Month-to-month', 'One year', 'Two year'].map((contract) => {
    const rows = allRows.filter((row) => row.contract === contract)
    const averageProbability = rows.length
      ? rows.reduce((sum, row) => sum + row.churn_probability, 0) / rows.length
      : 0
    return { contract, probability: Math.round(averageProbability * 100), count: rows.length }
  })

  return (
    <div>
      <PageHeader
        eyebrow={t('overview.eyebrow')}
        title={t('overview.title')}
        description={t('overview.description')}
        action={
          <button
            onClick={() => setShowRiskPanel(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300 ring-1 ring-rose-400/20 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <AlertTriangle className="size-4" /> {t('overview.urgent')}{' '}
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-xs">{highRiskRows.length}</span>
          </button>
        }
      />
      <main className="flex flex-col gap-6 p-5 sm:p-8 lg:p-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t('overview.total')}
            value={String(allRows.length || 0)}
            detail={t('overview.cohort')}
            icon={Users}
          />
          <MetricCard
            label={t('overview.highRisk')}
            value={String(highRiskRows.length)}
            detail={t('overview.threshold80')}
            accent="rose"
            icon={AlertTriangle}
          />
          <MetricCard
            label={t('overview.meanSpend')}
            value={`$${meanSpend.toFixed(2)}`}
            detail={t('overview.cohortSpend')}
            accent="emerald"
            icon={DollarSign}
          />
          <MetricCard
            label={t('overview.accuracy')}
            value={`${(modelMetrics.accuracy * 100).toFixed(1)}%`}
            detail={t('overview.backtest')}
            icon={Target}
          />
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-white">{t('overview.contractTitle')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('overview.contractDescription')}</p>
              </div>
              <Activity className="size-5 text-indigo-300" />
            </div>
            <div className="mt-8 flex items-end justify-around gap-4 border-b border-slate-800 pb-1 pt-8">
              {contractData.map((item) => (
                <div key={item.contract} className="flex flex-1 flex-col items-center gap-3">
                  <span className="text-xs font-medium text-indigo-300">{item.probability}%</span>
                  <div
                    className="w-full max-w-20 rounded-t-lg bg-indigo-400/80"
                    style={{ height: `${Math.max(item.probability * 1.5, 30)}px` }}
                  />
                  <span className="text-center text-[11px] leading-4 text-slate-500">
                    {t(
                      item.contract === 'Month-to-month'
                        ? 'contract.monthToMonth'
                        : item.contract === 'One year'
                          ? 'contract.oneYear'
                          : 'contract.twoYear',
                    )}
                    <br />({t('overview.records', { count: item.count })})
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-white">{t('overview.tenureTitle')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('overview.tenureDescription')}</p>
              </div>
              <ArrowUpRight className="size-5 text-emerald-300" />
            </div>
            <div className="relative mt-7 h-52 overflow-hidden rounded-lg border border-slate-800 bg-[#0a1120]">
              <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-slate-700" />
              {allRows.map((row) => (
                <span
                  key={row.customer_id}
                  title={`${row.customer_id}: ${Math.round(row.churn_probability * 100)}%`}
                  className={`absolute size-2.5 rounded-full ring-2 ring-[#0a1120] ${row.risk_level === 'High' ? 'bg-rose-400' : row.risk_level === 'Medium' ? 'bg-amber-300' : 'bg-emerald-400'}`}
                  style={{
                    left: `${Math.min((row.tenure / 70) * 90 + 4, 94)}%`,
                    bottom: `${row.churn_probability * 82 + 8}%`,
                  }}
                />
              ))}
              <span className="absolute bottom-2 left-3 text-[10px] text-slate-600">
                {t('overview.month', { count: 0 })}
              </span>
              <span className="absolute bottom-2 right-3 text-[10px] text-slate-600">
                {t('overview.month', { count: 70 })}
              </span>
            </div>
            <div className="mt-4 flex gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-rose-400" />
                {t('risk.high')}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-amber-300" />
                {t('risk.medium')}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-emerald-400" />
                {t('risk.low')}
              </span>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-rose-300">
                {t('overview.priority')}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{t('overview.priorityTitle')}</h2>
            </div>
            <button
              onClick={() => setShowRiskPanel(true)}
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
            >
              {t('overview.viewAlerts')} <ArrowUpRight className="ml-1 inline size-3" />
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {highRiskRows.slice(0, 3).map((row) => (
              <div
                key={row.customer_id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4"
              >
                <div>
                  <p className="font-mono text-xs text-slate-200">{row.customer_id}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {t(
                      row.contract === 'Month-to-month'
                        ? 'contract.monthToMonth'
                        : row.contract === 'One year'
                          ? 'contract.oneYear'
                          : 'contract.twoYear',
                    )}{' '}
                    · {t('overview.month', { count: row.tenure })}
                  </p>
                </div>
                <RiskBadge risk={row.risk_level} />
              </div>
            ))}
          </div>
        </section>
      </main>
      {showRiskPanel && <RiskPanel rows={highRiskRows} onClose={() => setShowRiskPanel(false)} />}
    </div>
  )
}
