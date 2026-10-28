'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Cpu, DollarSign, RefreshCw, ShieldCheck, Target, TrendingUp } from 'lucide-react'
import { useChurnData } from '../hooks/useChurnData'
import { MetricCard, PageHeader, ProgressBar } from '../components/dashboard'
import { AnomalyPanel, BudgetPanel, DailyLineChart, MrrTrendChart } from '../components/ops-charts'
import { ChurnModelCard, ChurnModelCardSchema, computeModelMetrics, formatCurrency, HIGH_RISK_THRESHOLD } from '../types'
import { useAppPreferences } from '../components/app-shell'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function InsightsPage() {
  const { allRows, aiPrediction, telemetry, isLoading, retry } = useChurnData()
  const { t, locale } = useAppPreferences()
  const [threshold, setThreshold] = useState(HIGH_RISK_THRESHOLD * 100)
  const [modelCard, setModelCard] = useState<ChurnModelCard | null>(null)

  useEffect(() => {
    // 取得模型在測試集上的真實成績；失敗時只是不顯示這個區塊
    const controller = new AbortController()
    fetch(`${API_BASE_URL}/api/v1/ml/churn-model`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => setModelCard(ChurnModelCardSchema.parse(data)))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  const modelMetrics = computeModelMetrics(allRows, threshold / 100)
  const confusion = modelMetrics.confusion_matrix
  const total =
    confusion.true_positive + confusion.false_positive + confusion.true_negative + confusion.false_negative
  const alertCoverage = total
    ? Math.round(((confusion.true_positive + confusion.false_positive) / total) * 100)
    : 0

  return (
    <div>
      <PageHeader
        eyebrow={t('insights.eyebrow')}
        title={t('insights.title')}
        description={t('insights.description')}
        action={
          <button
            onClick={retry}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />{' '}
            {t(isLoading ? 'ai.refreshing' : 'ai.refresh')}
          </button>
        }
      />
      <main className="flex flex-col gap-6 p-5 sm:p-8 lg:p-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t('insights.accuracy')}
            value={`${(modelMetrics.accuracy * 100).toFixed(1)}%`}
            detail={t('insights.fullCohort')}
            icon={Target}
          />
          <MetricCard
            label={t('insights.precision')}
            value={`${(modelMetrics.precision * 100).toFixed(1)}%`}
            detail={t('insights.precisionDetail')}
            accent="emerald"
            icon={ShieldCheck}
          />
          <MetricCard
            label={t('insights.recall')}
            value={`${(modelMetrics.recall * 100).toFixed(1)}%`}
            detail={t('insights.recallDetail')}
            accent="amber"
            icon={CheckCircle2}
          />
          <MetricCard
            label={t('insights.auc')}
            value={modelMetrics.roc_auc.toFixed(2)}
            detail={t('insights.aucDetail')}
            icon={Cpu}
          />
          <MetricCard
            label={t('insights.latency')}
            value={
              aiPrediction?.modelops.average_latency_ms === null ||
              aiPrediction?.modelops.average_latency_ms === undefined
                ? 'N/A'
                : `${aiPrediction.modelops.average_latency_ms.toFixed(0)} ms`
            }
            detail={
              aiPrediction?.modelops.request_count
                ? t('insights.requestStats', {
                    count: aiPrediction.modelops.request_count,
                    latency: aiPrediction.modelops.p95_latency_ms?.toFixed(0) ?? 'N/A',
                  })
                : t('insights.noTelemetry')
            }
            accent="emerald"
            icon={Clock3}
          />
          <MetricCard
            label={t('insights.modelCost')}
            value={
              aiPrediction
                ? formatCurrency(aiPrediction.modelops.total_cost_usd, locale === 'zh-TW' ? 'zh-TW' : 'en-US')
                : 'N/A'
            }
            detail={
              aiPrediction && aiPrediction.modelops.request_count > 0
                ? t('insights.modelRequests', {
                    count: aiPrediction.modelops.request_count,
                    model: aiPrediction.active_model,
                  })
                : t('insights.modelRequestsNone')
            }
            accent="amber"
            icon={DollarSign}
          />
          <MetricCard
            label={t('insights.mrrForecast')}
            value={
              aiPrediction
                ? formatCurrency(aiPrediction.mrr.forecast[0].mrr, locale === 'zh-TW' ? 'zh-TW' : 'en-US')
                : 'N/A'
            }
            detail={aiPrediction?.mrr.forecast[0].month ?? t('insights.noEndpoint')}
            accent="indigo"
            icon={TrendingUp}
          />
        </section>
        {modelCard && (
          <section className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
            <h2 className="font-semibold text-white">{t('model.title')}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {t('model.subtitle', {
                algorithm: modelCard.algorithm,
                train: modelCard.train_rows.toLocaleString(),
                test: modelCard.test_rows.toLocaleString(),
                features: modelCard.features.join(', '),
              })}
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">{t('model.auc')}</dt>
                <dd className="text-lg font-semibold text-white">{modelCard.test_roc_auc.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t('model.accuracy')}</dt>
                <dd className="text-lg font-semibold text-white">{(modelCard.test_accuracy * 100).toFixed(1)}%</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t('model.brier')}</dt>
                <dd className="text-lg font-semibold text-white">{modelCard.test_brier_score.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t('model.flagged')}</dt>
                <dd className="text-lg font-semibold text-white">{modelCard.test_flagged_high_risk}</dd>
              </div>
            </dl>
            <table className="mt-5 w-full text-left text-xs text-slate-300">
              <caption className="pb-2 text-left text-slate-400">{t('model.calibration')}</caption>
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 font-medium">{t('model.bucket')}</th>
                  <th className="py-1 font-medium">{t('model.count')}</th>
                  <th className="py-1 font-medium">{t('model.predicted')}</th>
                  <th className="py-1 font-medium">{t('model.actual')}</th>
                </tr>
              </thead>
              <tbody>
                {modelCard.calibration.map((bucket) => (
                  <tr key={bucket.range} className="border-t border-slate-800">
                    <td className="py-1.5">{bucket.range}</td>
                    <td>{bucket.count}</td>
                    <td>{(bucket.predicted * 100).toFixed(1)}%</td>
                    <td>{(bucket.actual * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs leading-5 text-slate-400">{t('model.limits')}</p>
          </section>
        )}
        {telemetry && aiPrediction && (
          <>
            <p className="text-xs leading-5 text-slate-500">
              {telemetry.mrr_source === 'billing_csv'
                ? t('ops.mrrNoteBilling')
                : t('ops.mrrNote', {
                    rate: `${((aiPrediction.mrr.monthly_churn_rate ?? 0) * 100).toFixed(2)}%`,
                    atRisk: formatCurrency(aiPrediction.mrr.at_risk_mrr ?? 0, locale === 'zh-TW' ? 'zh-TW' : 'en-US'),
                  })}
            </p>
            <section className="grid gap-6 xl:grid-cols-2">
              <MrrTrendChart
                history={
                  telemetry.mrr_history.length > 0
                    ? telemetry.mrr_history.map((point) => ({ label: point.month, value: point.mrr }))
                    : [
                        {
                          label: aiPrediction.mrr.current_month ?? aiPrediction.mrr.forecast[0].month,
                          value: aiPrediction.mrr.current_mrr ?? aiPrediction.mrr.forecast[0].mrr,
                        },
                      ]
                }
                forecast={aiPrediction.mrr.forecast.map((point) => ({ label: point.month, value: point.mrr }))}
                anomalyMonths={telemetry.anomalies.filter((item) => item.metric === 'mrr').map((item) => item.period)}
              />
              {telemetry.modelops_daily.length >= 2 ? (
                <DailyLineChart
                  title={t('ops.latencyTitle')}
                  subtitle={t('ops.latencySubtitle')}
                  ariaLabel={t('ops.latencyAria')}
                  points={telemetry.modelops_daily.map((day) => ({ label: day.date, value: day.average_latency_ms }))}
                  anomalyLabels={telemetry.anomalies.filter((item) => item.metric === 'latency').map((item) => item.period)}
                  format={(value) => `${value.toFixed(0)}`}
                />
              ) : (
                <section className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
                  <h2 className="font-semibold text-white">{t('ops.latencyTitle')}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{t('ops.noTrend')}</p>
                </section>
              )}
            </section>
            <p className="text-xs leading-5 text-slate-500">{t('ops.realNotice')}</p>
            <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
              <BudgetPanel summary={telemetry.modelops_summary} />
              {telemetry.modelops_daily.length >= 2 ? (
                <DailyLineChart
                  title={t('ops.costTitle')}
                  subtitle={t('ops.costSubtitle')}
                  ariaLabel={t('ops.costAria')}
                  tone="amber"
                  points={telemetry.modelops_daily.map((day) => ({ label: day.date, value: day.cost_usd }))}
                  anomalyLabels={telemetry.anomalies.filter((item) => item.metric === 'cost').map((item) => item.period)}
                  format={(value) => `$${value.toFixed(4)}`}
                />
              ) : (
                <section className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
                  <h2 className="font-semibold text-white">{t('ops.costTitle')}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{t('ops.noTrend')}</p>
                </section>
              )}
              <AnomalyPanel anomalies={telemetry.anomalies} />
            </section>
          </>
        )}
        {aiPrediction && !telemetry && (
          <section className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
            <div>
              <h2 className="font-semibold text-white">
                {t('insights.forecastTitle', { model: aiPrediction.active_model })}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t(
                  aiPrediction.mrr.source === 'history'
                    ? 'insights.forecastHistory'
                    : 'insights.forecastBaseline'
                )}
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {aiPrediction.mrr.forecast.map((point) => (
                <div key={point.month} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">{point.month}</p>
                  <p className="mt-2 font-semibold text-white">
                    {formatCurrency(point.mrr, locale === 'zh-TW' ? 'zh-TW' : 'en-US')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
            <div>
              <h2 className="font-semibold text-white">{t('insights.confusion')}</h2>
              <p className="mt-1 text-xs text-slate-500">{t('insights.cohort', { count: total })}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
                <p className="text-2xl font-semibold text-emerald-300">{confusion.true_negative}</p>
                <p className="mt-2 text-slate-400">{t('matrix.trueNegative')}</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-5">
                <p className="text-2xl font-semibold text-amber-300">{confusion.false_positive}</p>
                <p className="mt-2 text-slate-400">{t('matrix.falsePositive')}</p>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-5">
                <p className="text-2xl font-semibold text-rose-300">{confusion.false_negative}</p>
                <p className="mt-2 text-slate-400">{t('matrix.falseNegative')}</p>
              </div>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-5">
                <p className="text-2xl font-semibold text-indigo-300">{confusion.true_positive}</p>
                <p className="mt-2 text-slate-400">{t('matrix.truePositive')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0d1525] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">{t('insights.threshold')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('insights.sensitivity')}</p>
              </div>
              <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-200">
                {threshold}%
              </span>
            </div>
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="threshold" className="mb-2 block text-xs font-medium text-slate-400">
                  {t('insights.escalation')}
                </label>
                <input
                  id="threshold"
                  type="range"
                  min={40}
                  max={95}
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="w-full accent-indigo-400"
                />
              </div>
              <ProgressBar label={t('insights.coverage')} value={alertCoverage} />
              <ProgressBar label={t('insights.precision')} value={Math.round(modelMetrics.precision * 100)} />
              <ProgressBar label={t('insights.recall')} value={Math.round(modelMetrics.recall * 100)} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
