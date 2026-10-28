'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'

type Locale = 'en' | 'zh-TW'
type Theme = 'dark' | 'light'
type MessageKey = keyof typeof messages.en

const messages = {
  en: {
    'nav.overview': 'Executive Overview',
    'nav.customers': 'Customer Data',
    'nav.insights': 'Model Insights',
    'nav.label': 'Primary navigation',
    'brand.subtitle': 'SaaS & ModelOps Dashboard',
    'status.title': 'Data source',
    'status.live': 'API connected',
    'status.sample': 'Sample data mode',
    'theme.dark': 'Switch to dark theme',
    'theme.light': 'Switch to light theme',
    'language.label': 'Language',
    'language.english': 'English',
    'language.chinese': 'Traditional Chinese',
    'data.loading': 'Loading customer data from the API...',
    'data.live': 'Live API connected · {count} records',
    'data.unavailable': 'The API is unavailable or returned invalid data. Showing a limited built-in sample.',
    'data.retry': 'Retry connection',
    'ai.loading': 'Running the shared AI prediction service...',
    'ai.generated': 'Model-generated summary ready · {model}',
    'ai.notConfigured': 'Customer risk scoring is active · add the model API key to enable AI-generated summaries.',
    'ai.error': 'AI prediction service is unavailable. Customer data remains available; retry to reconnect.',
    'ai.providerError': 'The {model} summary is unavailable. Customer scores and forecasts remain available.',
    'ai.refresh': 'Run AI prediction again',
    'ai.refreshing': 'Running AI prediction...',
    'overview.eyebrow': 'Executive command center',
    'overview.title': 'Churn overview',
    'overview.description':
      'A live view of customer retention signals, model confidence, and prioritized intervention opportunities.',
    'overview.urgent': 'Urgent risk',
    'overview.total': 'Total analyzed',
    'overview.cohort': 'Telco customer cohort',
    'overview.highRisk': 'High risk alerts',
    'overview.threshold80': 'Accounts at 70% or higher (high risk)',
    'overview.meanSpend': 'Mean monthly spend',
    'overview.cohortSpend': 'Across current cohort',
    'overview.accuracy': 'Model accuracy (cross-validated)',
    'overview.backtest': 'Out-of-fold, unseen by the model',
    'overview.contractTitle': 'Contract type vs churn probability',
    'overview.contractDescription': 'Average model churn probability by commitment level',
    'overview.tenureTitle': 'Tenure vs risk',
    'overview.tenureDescription': 'Customer-level churn probabilities from the trained model',
    'overview.month': '{count} mo',
    'overview.priority': 'Priority queue',
    'overview.priorityTitle': 'Accounts requiring intervention',
    'overview.viewAlerts': 'View all alerts',
    'overview.records': '{count} records',
    'risk.high': 'High',
    'risk.medium': 'Medium',
    'risk.low': 'Low',
    'risk.badge': '{risk} risk',
    'risk.dialog': 'Urgent risk accounts',
    'risk.queue': 'Action queue',
    'risk.needAttention': '{count} accounts need immediate attention.',
    'risk.probability': 'Churn probability',
    'risk.startSavePlay': 'Start save play',
    'risk.startOutreach': 'Start outreach',
    'risk.markCompleted': 'Mark completed',
    'risk.reopen': 'Reopen action',
    'risk.queued': 'Queued',
    'risk.inProgress': 'In progress',
    'risk.completed': 'Completed',
    'risk.alreadyChurned': 'Already churned',
    'risk.actionsLoading': 'Loading saved actions...',
    'risk.actionsLoadError': 'Could not load saved retention actions.',
    'risk.actionSaveError': 'Could not save this action. Please try again.',
    'risk.retryActions': 'Retry',
    'risk.close': 'Close',
    'risk.months': '{count} months',
    'matrix.trueNegative': 'True negative',
    'matrix.falsePositive': 'False positive',
    'matrix.falseNegative': 'False negative',
    'matrix.truePositive': 'True positive',
    'customers.eyebrow': 'Customer intelligence',
    'customers.title': 'Customer data',
    'customers.description':
      'Search, segment, and export the scored customer cohort powering your retention workflows.',
    'customers.export': 'Export CSV',
    'customers.filters': 'Filters',
    'customers.recordsInView': '{count} records in view',
    'customers.search': 'Search customer ID',
    'customers.filterRisk': 'Filter by risk',
    'customers.allRisk': 'All risk levels',
    'customers.highRisk': 'High risk',
    'customers.mediumRisk': 'Medium risk',
    'customers.lowRisk': 'Low risk',
    'customers.filterContract': 'Filter by contract',
    'customers.allContracts': 'All contracts',
    'customers.reset': 'Reset',
    'customers.loading': 'Loading customer records...',
    'customers.noMatch': 'No customers match these filters',
    'customers.broaden': 'Try a broader search or reset the filters.',
    'customers.customer': 'Customer',
    'customers.contract': 'Contract',
    'customers.tenure': 'Tenure',
    'customers.monthlySpend': 'Monthly spend',
    'customers.risk': 'Risk',
    'customers.probability': 'Probability',
    'customers.actual': 'Actual',
    'customers.churned': 'Churned',
    'customers.retained': 'Retained',
    'contract.monthToMonth': 'Month-to-month',
    'contract.oneYear': 'One year',
    'contract.twoYear': 'Two year',
    'insights.eyebrow': 'ModelOps control plane',
    'insights.title': 'Model insights',
    'insights.description':
      'Review the trained churn model against the Telco cohort, inspect its held-out test results, and tune the intervention threshold.',
    'insights.simulate': 'Simulate retraining',
    'insights.retraining': 'Retraining...',
    'insights.queued': 'Retraining simulation started...',
    'insights.completed': 'Simulation complete. No model was trained or deployed.',
    'insights.accuracy': 'Model accuracy',
    'insights.fullCohort': 'Out-of-fold, unseen by the model',
    'insights.precision': 'Precision',
    'insights.precisionDetail': 'Positive prediction quality',
    'insights.recall': 'Recall',
    'insights.recallDetail': 'Churn capture rate',
    'insights.auc': 'ROC AUC',
    'insights.aucDetail': 'Ranking on current cohort',
    'insights.latency': 'Inference latency',
    'insights.noEndpoint': 'No live inference endpoint configured',
    'insights.noTelemetry': 'No model requests recorded',
    'insights.modelCost': 'AI request cost',
    'insights.mrrForecast': 'Next month MRR forecast',
    'insights.forecastTitle': 'Six-month MRR forecast · {model}',
    'insights.forecastHistory': 'Forecast based on the supplied monthly revenue history.',
    'insights.forecastBaseline': 'No revenue history was supplied; values use current customer charges as a flat baseline.',
    'insights.requestStats': '{count} requests · p95 {latency} ms',
    'insights.modelRequests': '{count} model requests · {model}',
    'insights.modelRequestsNone': 'No model requests recorded',
    'insights.confusion': 'Confusion matrix',
    'insights.cohort': 'Telco customer cohort · {count} records',
    'insights.threshold': 'Intervention threshold',
    'insights.sensitivity': 'Tune model sensitivity',
    'insights.escalation': 'Escalation level',
    'insights.coverage': 'Alert coverage',
    'ops.mrrTitle': 'MRR now and 6-month scenario forecast',
    'ops.mrrSubtitle': 'Current MRR of active customers, projected forward at the churn rate observed in the data',
    'ops.mrrAria': 'MRR line chart from {first} now to a projection of {last}',
    'ops.legendHistory': 'Current / historical MRR',
    'ops.legendForecast': 'Forecast MRR',
    'ops.legendAnomaly': 'Anomaly',
    'ops.mrrNote': 'The Kaggle Telco file is a single snapshot with no dates, so there is no real MRR history. Current MRR is the monthly charges of customers who have not churned, and the projection applies the revenue churn rate measured in the data ({rate} per month). Monthly charges of customers flagged high risk: {atRisk}.',
    'model.title': 'Churn model: held-out test results',
    'model.subtitle': '{algorithm} trained on {train} customers and evaluated on {test} customers it never saw. Features: {features}.',
    'model.auc': 'ROC AUC (test)',
    'model.accuracy': 'Accuracy at 50% (test)',
    'model.brier': 'Brier score (lower is better)',
    'model.flagged': 'Test customers at 70% or higher',
    'model.calibration': 'Calibration: does a predicted 60% really mean about 60% churn?',
    'model.bucket': 'Predicted range',
    'model.count': 'Customers',
    'model.predicted': 'Average predicted',
    'model.actual': 'Actually churned',
    'model.limits': 'The Telco data has no login counts or usage frequency, so the model uses contract, tenure, charges, internet service, payment method, billing and senior status. Probabilities are calibrated. Risk levels: 70% or higher is High, 40% to 70% is Medium, below 40% is Low.',
    'ops.mrrNoteBilling': 'MRR history comes from your billing file (backend/data/mrr_history.csv).',
    'ops.realNotice': 'AI usage below is measured from real model calls made by this app and stored in a local log. It grows as predictions are run.',
    'ops.noTrend': 'Not enough real calls yet. Run AI predictions on more than one day to draw a trend.',
    'ops.latencyTitle': 'Daily AI latency',
    'ops.latencySubtitle': 'Average response latency per day (ms)',
    'ops.latencyAria': 'Line chart of daily average AI response latency',
    'ops.costTitle': 'Daily AI cost',
    'ops.costSubtitle': 'Token cost per day (USD)',
    'ops.costAria': 'Line chart of daily AI token cost',
    'ops.budgetTitle': 'AI token budget',
    'ops.budgetSubtitle': 'Last {days} days · {model}',
    'ops.budgetOf': 'of {budget} budget',
    'ops.budgetOk': '{percent}% of the budget used. Spending is on track.',
    'ops.budgetWarn': '{percent}% of the budget used. Spending is close to the limit.',
    'ops.budgetOver': '{percent}% of the budget used. The budget has been exceeded.',
    'ops.requests': 'Requests',
    'ops.inputTokens': 'Input tokens',
    'ops.outputTokens': 'Output tokens',
    'ops.failureRate': 'Failure rate',
    'ops.avgLatency': 'Average latency',
    'ops.p95Latency': 'p95 latency',
    'ops.anomalyTitle': 'Anomaly alerts',
    'ops.anomalySubtitle': 'Values far from the typical level, detected automatically',
    'ops.anomalyNone': 'No anomalies detected.',
    'ops.anomaly.latency': 'Average latency was {value} against a typical {baseline}.',
    'ops.anomaly.failure_rate': 'Failure rate was {value} against a typical {baseline}.',
    'ops.anomaly.cost': 'Daily token cost was {value} against a typical {baseline}.',
    'ops.anomaly.mrr': 'Monthly MRR change was {value} against a typical {baseline}.',
    'error.title': 'Workspace unavailable',
    'error.description': 'PredictFlow could not load this view. Retry to restore the analytics workspace.',
    'error.retry': 'Retry',
  },
  'zh-TW': {
    'nav.overview': '總覽儀表板',
    'nav.customers': '客戶資料',
    'nav.insights': '模型洞察',
    'nav.label': '主要導覽',
    'brand.subtitle': 'SaaS 與 ModelOps 儀表板',
    'status.title': '資料來源',
    'status.live': 'API 已連線',
    'status.sample': '目前為樣本資料模式',
    'theme.dark': '切換深色主題',
    'theme.light': '切換淺色主題',
    'language.label': '語言',
    'language.english': 'English',
    'language.chinese': '繁體中文',
    'data.loading': '正在從 API 載入客戶資料...',
    'data.live': 'API 即時連線 · {count} 筆資料',
    'data.unavailable': 'API 無法連線或資料格式不正確，目前顯示有限的內建樣本。',
    'data.retry': '重新連線',
    'ai.loading': '正在呼叫共用 AI 預測服務...',
    'ai.generated': 'AI 模型摘要已產生 · {model}',
    'ai.notConfigured': '客戶風險評分已啟用 · 設定模型 API 金鑰後即可產生 AI 摘要。',
    'ai.error': 'AI 預測服務目前無法使用。客戶資料仍可檢視，請重試連線。',
    'ai.providerError': '{model} 摘要目前無法使用；客戶風險分數與營收預測仍可檢視。',
    'ai.refresh': '重新執行 AI 預測',
    'ai.refreshing': '正在執行 AI 預測...',
    'overview.eyebrow': '營運總覽',
    'overview.title': '客戶流失總覽',
    'overview.description': '掌握客戶留存訊號、訓練模型的流失機率與優先介入對象。',
    'overview.urgent': '高風險客戶',
    'overview.total': '分析客戶總數',
    'overview.cohort': '電信客戶資料集',
    'overview.highRisk': '高風險警示',
    'overview.threshold80': '流失機率達 70% 以上的客戶（高風險）',
    'overview.meanSpend': '平均月費',
    'overview.cohortSpend': '目前資料集平均',
    'overview.accuracy': '模型正確率（交叉驗證）',
    'overview.backtest': '交叉驗證，模型未見過的資料',
    'overview.contractTitle': '合約類型與流失風險',
    'overview.contractDescription': '依合約類型統計平均流失機率',
    'overview.tenureTitle': '使用年資與風險',
    'overview.tenureDescription': '訓練模型對每位客戶預測的流失機率',
    'overview.month': '{count} 個月',
    'overview.priority': '優先處理清單',
    'overview.priorityTitle': '建議優先介入的客戶',
    'overview.viewAlerts': '查看所有警示',
    'overview.records': '{count} 筆',
    'risk.high': '高',
    'risk.medium': '中',
    'risk.low': '低',
    'risk.badge': '{risk}風險',
    'risk.dialog': '高風險客戶',
    'risk.queue': '處理清單',
    'risk.needAttention': '{count} 位客戶需要優先關注。',
    'risk.probability': '流失分數',
    'risk.startSavePlay': '開始挽留處理',
    'risk.startOutreach': '開始聯絡客戶',
    'risk.markCompleted': '標記已完成',
    'risk.reopen': '重新開啟處理',
    'risk.queued': '已排入清單',
    'risk.inProgress': '處理中',
    'risk.completed': '已完成',
    'risk.alreadyChurned': '客戶已流失',
    'risk.actionsLoading': '正在載入已保存的挽留處理...',
    'risk.actionsLoadError': '無法載入已保存的挽留處理。',
    'risk.actionSaveError': '無法保存此處理，請重試。',
    'risk.retryActions': '重試',
    'risk.close': '關閉',
    'risk.months': '{count} 個月',
    'matrix.trueNegative': '真陰性',
    'matrix.falsePositive': '偽陽性',
    'matrix.falseNegative': '偽陰性',
    'matrix.truePositive': '真陽性',
    'customers.eyebrow': '客戶分析',
    'customers.title': '客戶資料',
    'customers.description': '搜尋、篩選並匯出目前客戶資料集及其模型預測的流失機率。',
    'customers.export': '匯出 CSV',
    'customers.filters': '篩選條件',
    'customers.recordsInView': '目前顯示 {count} 筆',
    'customers.search': '搜尋客戶編號',
    'customers.filterRisk': '依風險篩選',
    'customers.allRisk': '所有風險等級',
    'customers.highRisk': '高風險',
    'customers.mediumRisk': '中風險',
    'customers.lowRisk': '低風險',
    'customers.filterContract': '依合約篩選',
    'customers.allContracts': '所有合約',
    'customers.reset': '重設',
    'customers.loading': '正在載入客戶資料...',
    'customers.noMatch': '沒有符合條件的客戶',
    'customers.broaden': '請放寬搜尋條件或重設篩選。',
    'customers.customer': '客戶編號',
    'customers.contract': '合約類型',
    'customers.tenure': '使用年資',
    'customers.monthlySpend': '月費',
    'customers.risk': '風險',
    'customers.probability': '流失分數',
    'customers.actual': '實際狀態',
    'customers.churned': '已流失',
    'customers.retained': '未流失',
    'contract.monthToMonth': '按月計費',
    'contract.oneYear': '一年約',
    'contract.twoYear': '兩年約',
    'insights.eyebrow': '模型分析',
    'insights.title': '流失模型洞察',
    'insights.description': '檢視訓練模型在未見過的測試集上的成績，並調整介入門檻。',
    'insights.simulate': '模擬重新訓練',
    'insights.retraining': '處理中...',
    'insights.queued': '已開始重新訓練流程模擬...',
    'insights.completed': '模擬完成；沒有實際訓練或部署模型。',
    'insights.accuracy': '模型正確率',
    'insights.fullCohort': '交叉驗證，模型未見過的資料',
    'insights.precision': '精確率',
    'insights.precisionDetail': '預測流失客戶中的實際比例',
    'insights.recall': '召回率',
    'insights.recallDetail': '實際流失客戶的捕捉比例',
    'insights.auc': 'ROC AUC',
    'insights.aucDetail': '目前資料集的排序表現',
    'insights.latency': '推論延遲',
    'insights.noEndpoint': '尚未設定即時推論服務',
    'insights.noTelemetry': '尚無模型請求紀錄',
    'insights.modelCost': 'AI 請求成本',
    'insights.mrrForecast': '下月 MRR 預測',
    'insights.forecastTitle': '未來六個月 MRR 預測 · {model}',
    'insights.forecastHistory': '依據提供的每月營收歷史進行預測。',
    'insights.forecastBaseline': '未提供營收歷史；預測以目前客戶月費合計作為固定基準。',
    'insights.requestStats': '{count} 次請求 · 第 95 百分位 {latency} 毫秒',
    'insights.modelRequests': '{count} 次模型請求 · {model}',
    'insights.modelRequestsNone': '尚無模型請求紀錄',
    'insights.confusion': '混淆矩陣',
    'insights.cohort': '電信客戶資料集 · {count} 筆',
    'insights.threshold': '介入門檻',
    'insights.sensitivity': '調整模型敏感度',
    'insights.escalation': '警示門檻',
    'insights.coverage': '警示涵蓋率',
    'ops.mrrTitle': '目前 MRR 與未來 6 個月情境預測',
    'ops.mrrSubtitle': '以仍在網客戶的目前 MRR 為起點，依資料中實測的流失率往後推算',
    'ops.mrrAria': 'MRR 折線圖，從目前的 {first} 到推算的 {last}',
    'ops.legendHistory': '目前／歷史 MRR',
    'ops.legendForecast': '預測 MRR',
    'ops.legendAnomaly': '異常',
    'ops.mrrNote': 'Kaggle Telco 檔案是單一時間點的快照、沒有日期，因此沒有真實的 MRR 歷史。目前 MRR 為尚未流失客戶的月費總和，預測則套用資料中實測的營收流失率（每月 {rate}）。被標為高風險客戶的月費合計：{atRisk}。',
    'model.title': '流失模型：測試集成績',
    'model.subtitle': '{algorithm}，以 {train} 位客戶訓練，並在模型從未見過的 {test} 位客戶上評估。使用特徵：{features}。',
    'model.auc': 'ROC AUC（測試集）',
    'model.accuracy': '50% 門檻正確率（測試集）',
    'model.brier': 'Brier 分數（越低越好）',
    'model.flagged': '測試集中機率達 70% 以上的客戶數',
    'model.calibration': '校準檢查：預測 60% 是否真的約有 60% 流失？',
    'model.bucket': '預測機率區間',
    'model.count': '客戶數',
    'model.predicted': '平均預測機率',
    'model.actual': '實際流失比例',
    'model.limits': 'Telco 資料沒有登入次數與使用頻率，因此模型使用合約、在網月數、月費、網路服務、付款方式、帳單方式與年長者身分。機率經過校準。風險分級：70% 以上為高風險、40% 至 70% 為中風險、低於 40% 為低風險。',
    'ops.mrrNoteBilling': 'MRR 歷史來自你提供的帳務檔（backend/data/mrr_history.csv）。',
    'ops.realNotice': '下方 AI 用量為本系統實際呼叫大模型所量測，存放於本機紀錄，每執行一次預測就會累積。',
    'ops.noTrend': '目前真實呼叫紀錄不足；跨多日執行 AI 預測後即可繪出趨勢。',
    'ops.latencyTitle': '每日 AI 延遲',
    'ops.latencySubtitle': '每日平均回應延遲（毫秒）',
    'ops.latencyAria': '每日 AI 平均回應延遲折線圖',
    'ops.costTitle': '每日 AI 成本',
    'ops.costSubtitle': '每日 Token 費用（美元）',
    'ops.costAria': '每日 AI Token 費用折線圖',
    'ops.budgetTitle': 'AI Token 預算',
    'ops.budgetSubtitle': '近 {days} 天 · {model}',
    'ops.budgetOf': '預算 {budget}',
    'ops.budgetOk': '已使用預算 {percent}%，支出在正常範圍。',
    'ops.budgetWarn': '已使用預算 {percent}%，接近預算上限。',
    'ops.budgetOver': '已使用預算 {percent}%，已超出預算。',
    'ops.requests': '請求數',
    'ops.inputTokens': '輸入 Token',
    'ops.outputTokens': '輸出 Token',
    'ops.failureRate': '失敗率',
    'ops.avgLatency': '平均延遲',
    'ops.p95Latency': '第 95 百分位延遲',
    'ops.anomalyTitle': '異常警示',
    'ops.anomalySubtitle': '自動偵測明顯偏離一般水準的數值',
    'ops.anomalyNone': '目前沒有偵測到異常。',
    'ops.anomaly.latency': '平均延遲為 {value}，一般水準約 {baseline}。',
    'ops.anomaly.failure_rate': '失敗率為 {value}，一般水準約 {baseline}。',
    'ops.anomaly.cost': '單日 Token 費用為 {value}，一般水準約 {baseline}。',
    'ops.anomaly.mrr': '當月 MRR 變動為 {value}，一般水準約 {baseline}。',
    'error.title': '工作區暫時無法使用',
    'error.description': 'PredictFlow 無法載入此頁面，請重試以重新載入分析工作區。',
    'error.retry': '重試',
  },
} satisfies Record<Locale, Record<string, string>>

interface AppPreferences {
  locale: Locale
  theme: Theme
  setLocale: (locale: Locale) => void
  toggleTheme: () => void
  t: (key: MessageKey, values?: Record<string, string | number>) => string
}

const AppPreferencesContext = createContext<AppPreferences | null>(null)

export function useAppPreferences() {
  const preferences = useContext(AppPreferencesContext)
  if (!preferences) throw new Error('useAppPreferences must be used inside AppShell')
  return preferences
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [locale, setLocale] = useState<Locale>('en')
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('predictflow-locale')
    const savedTheme = window.localStorage.getItem('predictflow-theme')
    if (savedLocale === 'en' || savedLocale === 'zh-TW') setLocale(savedLocale)
    if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('predictflow-locale', locale)
    document.documentElement.lang = locale === 'zh-TW' ? 'zh-Hant' : 'en'
  }, [locale])

  useEffect(() => {
    window.localStorage.setItem('predictflow-theme', theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1120' : '#f3f6fb')
  }, [theme])

  useEffect(() => {
    const titleKey =
      pathname === '/'
        ? 'overview.title'
        : pathname.startsWith('/customers')
          ? 'customers.title'
          : 'insights.title'
    const localizedTitle = `${messages[locale][titleKey]} | PredictFlow AI`
    const syncTitle = () => {
      if (document.title !== localizedTitle) document.title = localizedTitle
    }
    syncTitle()
    const observer = new MutationObserver(syncTitle)
    observer.observe(document.head, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }, [locale, pathname])

  const t = (key: MessageKey, values: Record<string, string | number> = {}) => {
    let text = messages[locale][key]
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value))
    return text
  }

  const links: { href: string; key: MessageKey; glyph: string }[] = [
    { href: '/', key: 'nav.overview', glyph: '◫' },
    { href: '/customers', key: 'nav.customers', glyph: '◌' },
    { href: '/insights', key: 'nav.insights', glyph: '▣' },
  ]
  const preferences = {
    locale,
    theme,
    setLocale,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    t,
  }

  return (
    <AppPreferencesContext.Provider value={preferences}>
      <div data-theme={theme} className="app-shell min-h-screen">
        <div className="min-h-screen lg:flex">
          <aside className="app-sidebar border-b border-slate-800 bg-[#0b1220] lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
            <Link href="/" aria-label="PredictFlow AI" className="flex items-center gap-3 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="size-9 shrink-0">
                <defs>
                  <linearGradient id="brand-gradient" x1="2" y1="28" x2="30" y2="4" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1" />
                    <stop offset="1" stopColor="#0891B2" />
                  </linearGradient>
                </defs>
                <path
                  d="M3 22c4 0 5-9 9-9s5 9 9 9 4-12 8-12"
                  stroke="url(#brand-gradient)"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="27" cy="10" r="2.6" fill="#0891B2" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight">PredictFlow AI</p>
                <p className="text-[11px] text-slate-500">{t('brand.subtitle')}</p>
              </div>
            </Link>
            <nav
              aria-label={t('nav.label')}
              className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-2 lg:px-3 lg:py-4"
            >
              {links.map(({ href, key, glyph }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-w-max items-center gap-3 rounded-lg border px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${active ? 'border-indigo-400/20 bg-indigo-500/15 text-white' : 'border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-sm ${active ? 'text-indigo-300' : 'text-slate-500 group-hover:text-indigo-300'}`}
                    >
                      {glyph}
                    </span>
                    <span>{t(key)}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-800 px-4 py-4">
              <p className="w-full text-[10px] font-medium uppercase text-slate-500">{t('language.label')}</p>
              <button
                type="button"
                aria-label={t('language.english')}
                aria-pressed={locale === 'en'}
                onClick={() => setLocale('en')}
                className={`rounded-md border px-2.5 py-1.5 text-xs ${locale === 'en' ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              >
                EN
              </button>
              <button
                type="button"
                aria-label={t('language.chinese')}
                aria-pressed={locale === 'zh-TW'}
                onClick={() => setLocale('zh-TW')}
                className={`rounded-md border px-2.5 py-1.5 text-xs ${locale === 'zh-TW' ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              >
                繁中
              </button>
              <button
                type="button"
                aria-label={t(theme === 'dark' ? 'theme.light' : 'theme.dark')}
                aria-pressed={theme === 'light'}
                title={t(theme === 'dark' ? 'theme.light' : 'theme.dark')}
                onClick={preferences.toggleTheme}
                className="ml-auto inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {theme === 'dark' ? (
                  <Sun aria-hidden="true" className="size-4" />
                ) : (
                  <Moon aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          </aside>
          <main className="min-w-0 flex-1 lg:ml-64">{children}</main>
        </div>
      </div>
    </AppPreferencesContext.Provider>
  )
}
