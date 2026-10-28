import { z } from 'zod'

export const CustomerChurnSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string(),
  tenure: z.number().min(0).max(100),
  monthly_charges: z.number().positive(),
  total_charges: z.number().nonnegative(),
  contract: z.enum(['Month-to-month', 'One year', 'Two year']),
  internet_service: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  paperless_billing: z.string().nullable().optional(),
  senior_citizen: z.string().nullable().optional(),
  actual_churn: z.boolean(),
  churn_probability: z.number().min(0).max(1),
  risk_level: z.enum(['High', 'Medium', 'Low']),
  created_at: z.string().optional(),
})

export type CustomerChurnRecord = z.infer<typeof CustomerChurnSchema>

export const AIPredictionSchema = z.object({
  active_model: z.string(),
  churn_analyzed: z.number().int().nonnegative(),
  churn_method: z.enum(['logistic_regression', 'heuristic_not_calibrated']),
  churn_predictions: z.array(
    z.object({
      customer_id: z.string(),
      churn_probability: z.number().min(0).max(1),
      risk_level: z.enum(['High', 'Medium', 'Low']),
    })
  ),
  high_risk_customers: z.array(
    z.object({
      customer_id: z.string(),
      churn_probability: z.number().min(0).max(1),
      risk_level: z.literal('High'),
    })
  ),
  mrr: z.object({
    source: z.enum(['history', 'current_customer_baseline', 'snapshot_scenario']),
    forecast: z.array(
      z.object({
        month: z.string(),
        mrr: z.number().nonnegative(),
      })
    ).length(6),
    current_month: z.string().nullable().optional(),
    current_mrr: z.number().nonnegative().nullable().optional(),
    monthly_churn_rate: z.number().nonnegative().nullable().optional(),
    at_risk_mrr: z.number().nonnegative().nullable().optional(),
  }),
  modelops: z.object({
    model: z.string(),
    request_count: z.number().int().nonnegative(),
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    input_cost_usd: z.number().nonnegative(),
    output_cost_usd: z.number().nonnegative(),
    total_cost_usd: z.number().nonnegative(),
    average_latency_ms: z.number().nonnegative().nullable(),
    p95_latency_ms: z.number().nonnegative().nullable(),
    failure_rate: z.number().min(0).max(1).nullable(),
  }),
  ai_status: z.enum(['generated', 'not_configured', 'provider_error']),
  ai_error: z.string().nullable(),
  ai_summary: z
    .object({
      summary_en: z.string().min(1).max(1000),
      summary_zh: z.string().min(1).max(1000),
    })
    .nullable(),
})

export type AIPrediction = z.infer<typeof AIPredictionSchema>

export const TelemetrySchema = z.object({
  mrr_source: z.enum(['billing_csv', 'none']),
  mrr_history: z.array(z.object({ month: z.string(), mrr: z.number().nonnegative() })),
  modelops_source: z.literal('request_log'),
  modelops_daily: z.array(
    z.object({
      date: z.string(),
      requests: z.number().int().nonnegative(),
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      cost_usd: z.number().nonnegative(),
      average_latency_ms: z.number().nonnegative(),
      p95_latency_ms: z.number().nonnegative(),
      failure_rate: z.number().min(0).max(1),
    })
  ),
  modelops_summary: z.object({
    model: z.string(),
    period_days: z.number().int().positive(),
    total_requests: z.number().int().nonnegative(),
    total_input_tokens: z.number().int().nonnegative(),
    total_output_tokens: z.number().int().nonnegative(),
    total_cost_usd: z.number().nonnegative(),
    budget_usd: z.number().positive(),
    budget_used_ratio: z.number().nonnegative(),
    average_latency_ms: z.number().nonnegative(),
    p95_latency_ms: z.number().nonnegative(),
    failure_rate: z.number().min(0).max(1),
  }),
  anomalies: z.array(
    z.object({
      metric: z.enum(['latency', 'failure_rate', 'cost', 'mrr']),
      period: z.string(),
      value: z.number(),
      baseline: z.number(),
      direction: z.enum(['high', 'low']),
    })
  ),
})

export type Telemetry = z.infer<typeof TelemetrySchema>

export const RetentionActionSchema = z.object({
  customer_id: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  created_at: z.string(),
  updated_at: z.string(),
})

export type RetentionAction = z.infer<typeof RetentionActionSchema>

// 高風險門檻：流失機率 70% 以上（須與後端 churn_model.py 一致）
export const HIGH_RISK_THRESHOLD = 0.7

export const ChurnModelCardSchema = z.object({
  algorithm: z.string(),
  features: z.array(z.string()),
  train_rows: z.number().int().nonnegative(),
  test_rows: z.number().int().nonnegative(),
  base_churn_rate: z.number(),
  test_roc_auc: z.number(),
  test_accuracy: z.number(),
  test_brier_score: z.number(),
  high_risk_threshold: z.number(),
  test_flagged_high_risk: z.number().int().nonnegative(),
  test_high_risk_precision: z.number().nullable(),
  calibration: z.array(
    z.object({
      range: z.string(),
      count: z.number().int().nonnegative(),
      predicted: z.number(),
      actual: z.number(),
    })
  ),
})

export type ChurnModelCard = z.infer<typeof ChurnModelCardSchema>

export interface ModelMetrics {
  accuracy: number
  roc_auc: number
  precision: number
  recall: number
  confusion_matrix: {
    true_positive: number
    false_positive: number
    true_negative: number
    false_negative: number
  }
}

export const REAL_KAGGLE_CHURN_DATA: CustomerChurnRecord[] = [
  {
    customer_id: '7590-VHVEG',
    tenure: 1,
    monthly_charges: 29.85,
    total_charges: 29.85,
    contract: 'Month-to-month',
    actual_churn: true,
    churn_probability: 0.88,
    risk_level: 'High',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    customer_id: '5575-GNVDE',
    tenure: 34,
    monthly_charges: 56.95,
    total_charges: 1889.5,
    contract: 'One year',
    actual_churn: false,
    churn_probability: 0.22,
    risk_level: 'Low',
    created_at: '2026-09-01T09:40:00Z',
  },
  {
    customer_id: '3668-QPYBK',
    tenure: 2,
    monthly_charges: 53.85,
    total_charges: 108.15,
    contract: 'Month-to-month',
    actual_churn: true,
    churn_probability: 0.91,
    risk_level: 'High',
    created_at: '2026-09-01T09:00:00Z',
  },
  {
    customer_id: '7795-CFOCW',
    tenure: 45,
    monthly_charges: 42.3,
    total_charges: 1840.75,
    contract: 'One year',
    actual_churn: false,
    churn_probability: 0.15,
    risk_level: 'Low',
    created_at: '2026-09-01T09:20:00Z',
  },
  {
    customer_id: '9237-HQJGM',
    tenure: 2,
    monthly_charges: 70.7,
    total_charges: 151.65,
    contract: 'Month-to-month',
    actual_churn: true,
    churn_probability: 0.84,
    risk_level: 'High',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    customer_id: '9305-CDSKC',
    tenure: 8,
    monthly_charges: 99.65,
    total_charges: 820.5,
    contract: 'Month-to-month',
    actual_churn: true,
    churn_probability: 0.79,
    risk_level: 'High',
    created_at: '2026-09-01T08:10:00Z',
  },
  {
    customer_id: '1452-KNGTH',
    tenure: 22,
    monthly_charges: 89.1,
    total_charges: 1949.4,
    contract: 'Month-to-month',
    actual_churn: false,
    churn_probability: 0.58,
    risk_level: 'Medium',
    created_at: '2026-09-01T09:40:00Z',
  },
  {
    customer_id: '6713-OKOMC',
    tenure: 10,
    monthly_charges: 29.75,
    total_charges: 301.9,
    contract: 'Month-to-month',
    actual_churn: false,
    churn_probability: 0.42,
    risk_level: 'Medium',
    created_at: '2026-09-01T09:20:00Z',
  },
  {
    customer_id: '7892-POOKP',
    tenure: 28,
    monthly_charges: 104.8,
    total_charges: 3046.05,
    contract: 'Month-to-month',
    actual_churn: true,
    churn_probability: 0.76,
    risk_level: 'High',
    created_at: '2026-09-01T09:50:00Z',
  },
  {
    customer_id: '6388-TABGU',
    tenure: 62,
    monthly_charges: 56.15,
    total_charges: 3487.95,
    contract: 'One year',
    actual_churn: false,
    churn_probability: 0.12,
    risk_level: 'Low',
    created_at: '2026-09-01T10:20:00Z',
  },
  {
    customer_id: '9763-GRSKD',
    tenure: 13,
    monthly_charges: 49.95,
    total_charges: 587.45,
    contract: 'Month-to-month',
    actual_churn: false,
    churn_probability: 0.38,
    risk_level: 'Medium',
    created_at: '2026-09-01T09:10:00Z',
  },
  {
    customer_id: '7469-LKBCI',
    tenure: 16,
    monthly_charges: 18.95,
    total_charges: 326.8,
    contract: 'Two year',
    actual_churn: false,
    churn_probability: 0.05,
    risk_level: 'Low',
    created_at: '2026-09-01T09:30:00Z',
  },
  {
    customer_id: '8091-TTWWE',
    tenure: 58,
    monthly_charges: 100.35,
    total_charges: 5681.1,
    contract: 'One year',
    actual_churn: false,
    churn_probability: 0.18,
    risk_level: 'Low',
    created_at: '2026-09-01T10:10:00Z',
  },
  {
    customer_id: '0280-XJG2V',
    tenure: 49,
    monthly_charges: 107.2,
    total_charges: 5202.25,
    contract: 'Month-to-month',
    actual_churn: true,
    churn_probability: 0.72,
    risk_level: 'High',
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    customer_id: '5129-JLPIS',
    tenure: 25,
    monthly_charges: 105.5,
    total_charges: 2686.05,
    contract: 'Month-to-month',
    actual_churn: false,
    churn_probability: 0.49,
    risk_level: 'Medium',
    created_at: '2026-09-01T09:50:00Z',
  },
]

CustomerChurnSchema.array().parse(REAL_KAGGLE_CHURN_DATA)

export const computeModelMetrics = (rows: CustomerChurnRecord[], threshold = HIGH_RISK_THRESHOLD): ModelMetrics => {
  let true_positive = 0
  let false_positive = 0
  let true_negative = 0
  let false_negative = 0

  for (const row of rows) {
    const predictedPositive = row.churn_probability >= threshold
    const actualPositive = row.actual_churn

    if (predictedPositive && actualPositive) true_positive += 1
    else if (predictedPositive && !actualPositive) false_positive += 1
    else if (!predictedPositive && actualPositive) false_negative += 1
    else true_negative += 1
  }

  const total = rows.length || 1
  const accuracy = (true_positive + true_negative) / total
  const precision = true_positive + false_positive ? true_positive / (true_positive + false_positive) : 0
  const recall = true_positive + false_negative ? true_positive / (true_positive + false_negative) : 0
  const positiveCount = rows.filter((row) => row.actual_churn).length
  const negativeCount = rows.length - positiveCount
  let positiveRankSum = 0
  const sortedRows = [...rows].sort((left, right) => left.churn_probability - right.churn_probability)

  for (let start = 0; start < sortedRows.length;) {
    let end = start + 1
    while (end < sortedRows.length && sortedRows[end].churn_probability === sortedRows[start].churn_probability) {
      end += 1
    }

    const averageRank = ((start + 1) + end) / 2
    positiveRankSum += sortedRows.slice(start, end).filter((row) => row.actual_churn).length * averageRank
    start = end
  }

  const roc_auc = positiveCount && negativeCount
    ? (positiveRankSum - (positiveCount * (positiveCount + 1)) / 2) / (positiveCount * negativeCount)
    : 0

  return {
    accuracy,
    roc_auc,
    precision,
    recall,
    confusion_matrix: {
      true_positive,
      false_positive,
      true_negative,
      false_negative,
    },
  }
}

export const MODEL_METRICS: ModelMetrics = computeModelMetrics(REAL_KAGGLE_CHURN_DATA)

export type Filters = {
  search: string
  risk: 'All' | 'High' | 'Medium' | 'Low'
  contract: 'All' | 'Month-to-month' | 'One year' | 'Two year'
}

export const FiltersSchema = z.object({
  search: z.string(),
  risk: z.enum(['All', 'High', 'Medium', 'Low']),
  contract: z.enum(['All', 'Month-to-month', 'One year', 'Two year']),
})

export const riskTone = (risk: CustomerChurnRecord['risk_level']) =>
  risk === 'High' ? 'high' : risk === 'Medium' ? 'medium' : 'low'

export const formatCurrency = (value: number, locale: 'en-US' | 'zh-TW' = 'en-US') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(value)

export const csvEscape = (value: string | number | boolean) =>
  `"${String(value).replaceAll('"', '""')}"`

export const exportRowsToCsv = (rows: CustomerChurnRecord[]) =>
  [
    'customer_id,tenure,monthly_charges,total_charges,contract,actual_churn,churn_probability,risk_level',
    ...rows.map((r) =>
      [
        r.customer_id,
        r.tenure,
        r.monthly_charges,
        r.total_charges,
        r.contract,
        r.actual_churn,
        r.churn_probability,
        r.risk_level,
      ]
        .map(csvEscape)
        .join(',')
    ),
  ].join('\n')

export const emptyFilters: Filters = { search: '', risk: 'All', contract: 'All' }

export const tableColumns = [
  'Customer',
  'Contract',
  'Tenure',
  'Monthly spend',
  'Risk',
  'Probability',
  'Actual',
] as const
