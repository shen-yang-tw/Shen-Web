'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  AIPrediction,
  AIPredictionSchema,
  computeModelMetrics,
  CustomerChurnRecord,
  CustomerChurnSchema,
  emptyFilters,
  exportRowsToCsv,
  Filters,
  FiltersSchema,
  HIGH_RISK_THRESHOLD,
  REAL_KAGGLE_CHURN_DATA,
  Telemetry,
  TelemetrySchema,
} from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type ChurnDataSource = 'loading' | 'api' | 'sample'
export type AIServiceStatus = 'loading' | 'generated' | 'not_configured' | 'provider_error' | 'error'

export interface ChurnDataStatus {
  dataSource: ChurnDataSource
  rowCount: number
  loadError: string | null
  aiStatus: AIServiceStatus
  aiModel: string | null
  aiSummary: AIPrediction['ai_summary']
  aiError: string | null
  retry: () => void
}

interface ChurnDataSnapshot {
  rows: CustomerChurnRecord[]
  dataSource: Exclude<ChurnDataSource, 'loading'>
  loadError: string | null
  aiPrediction: AIPrediction | null
  aiStatus: Exclude<AIServiceStatus, 'loading'>
  aiError: string | null
  telemetry: Telemetry | null
}

const initialDataStatus: ChurnDataStatus = {
  dataSource: 'loading',
  rowCount: 0,
  loadError: null,
  aiStatus: 'loading',
  aiModel: null,
  aiSummary: null,
  aiError: null,
  retry: () => undefined,
}
let currentDataStatus = initialDataStatus
const dataStatusListeners = new Set<() => void>()
let cachedSnapshot: ChurnDataSnapshot | null = null

function publishDataStatus(status: ChurnDataStatus) {
  currentDataStatus = status
  dataStatusListeners.forEach((listener) => listener())
}

export function useChurnDataStatus() {
  return useSyncExternalStore(
    (listener) => {
      dataStatusListeners.add(listener)
      return () => dataStatusListeners.delete(listener)
    },
    () => currentDataStatus,
    () => initialDataStatus
  )
}

export function useChurnData() {
  const [allRows, setAllRows] = useState<CustomerChurnRecord[]>([])
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'loading' | 'api' | 'sample'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [aiPrediction, setAIPrediction] = useState<AIPrediction | null>(null)
  const [aiStatus, setAIStatus] = useState<AIServiceStatus>('loading')
  const [aiError, setAIError] = useState<string | null>(null)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [requestId, setRequestId] = useState(0)

  const retry = useCallback(() => {
    cachedSnapshot = null
    setAllRows([])
    setAIPrediction(null)
    setTelemetry(null)
    setDataSource('loading')
    setLoadError(null)
    setAIStatus('loading')
    setAIError(null)
    setIsLoading(true)
    publishDataStatus({
      dataSource: 'loading',
      rowCount: 0,
      loadError: null,
      aiStatus: 'loading',
      aiModel: null,
      aiSummary: null,
      aiError: null,
      retry,
    })
    setRequestId((current) => current + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (cachedSnapshot) {
      const snapshot = cachedSnapshot
      setAllRows(snapshot.rows)
      setAIPrediction(snapshot.aiPrediction)
      setDataSource(snapshot.dataSource)
      setLoadError(snapshot.loadError)
      setAIStatus(snapshot.aiStatus)
      setAIError(snapshot.aiError)
      setTelemetry(snapshot.telemetry)
      setIsLoading(false)
      publishDataStatus({
        dataSource: snapshot.dataSource,
        rowCount: snapshot.rows.length,
        loadError: snapshot.loadError,
        aiStatus: snapshot.aiStatus,
        aiModel: snapshot.aiPrediction?.active_model ?? null,
        aiSummary: snapshot.aiPrediction?.ai_summary ?? null,
        aiError: snapshot.aiError,
        retry,
      })
      return () => controller.abort()
    }

    publishDataStatus({
      dataSource: 'loading',
      rowCount: 0,
      loadError: null,
      aiStatus: 'loading',
      aiModel: null,
      aiSummary: null,
      aiError: null,
      retry,
    })

    const fetchRows = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/customers`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to load customer data: ${response.status}`)
        }

        const payload: unknown = await response.json()
        const records = CustomerChurnSchema.array().min(1).parse(
          typeof payload === 'object' && payload !== null && 'records' in payload ? payload.records : undefined
        )

        let scoredRows = records
        let prediction: AIPrediction | null = null
        let predictionError: string | null = null
        let telemetry: Telemetry | null = null
        try {
          const telemetryResponse = await fetch(`${API_BASE_URL}/api/v1/ops/telemetry`, {
            signal: controller.signal,
          })
          if (!telemetryResponse.ok) throw new Error(`Telemetry failed: ${telemetryResponse.status}`)
          telemetry = TelemetrySchema.parse(await telemetryResponse.json())
        } catch (error) {
          if (controller.signal.aborted) return
          console.warn('Operations telemetry is unavailable.', error)
        }
        try {
          const predictionResponse = await fetch(`${API_BASE_URL}/api/v1/ai/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              mrr_history: telemetry?.mrr_history ?? [],
              customers: records.map((record) => ({
                customer_id: record.customer_id,
                actual_churn: record.actual_churn,
                tenure: record.tenure,
                monthly_charges: record.monthly_charges,
                contract: record.contract,
                internet_service: record.internet_service,
                payment_method: record.payment_method,
                paperless_billing: record.paperless_billing,
                senior_citizen: record.senior_citizen,
              })),
            }),
          })
          if (!predictionResponse.ok) {
            throw new Error(`AI prediction failed: ${predictionResponse.status}`)
          }

          prediction = AIPredictionSchema.parse(await predictionResponse.json())
          const predictionsByCustomer = new Map(
            prediction.churn_predictions.map((item) => [item.customer_id, item])
          )
          scoredRows = records.map((record) => {
            const scoredRecord = predictionsByCustomer.get(record.customer_id)
            return scoredRecord
              ? CustomerChurnSchema.parse({
                  ...record,
                  churn_probability: scoredRecord.churn_probability,
                  risk_level: scoredRecord.risk_level,
                })
              : record
          })
        } catch (error) {
          if (controller.signal.aborted) return
          console.warn('AI prediction is unavailable; keeping the customer API scores.', error)
          predictionError = error instanceof Error ? error.message : 'Unknown AI prediction error.'
        }

        cachedSnapshot = {
          rows: scoredRows,
          dataSource: 'api',
          loadError: null,
          aiPrediction: prediction,
          aiStatus: prediction ? prediction.ai_status : 'error',
          aiError: predictionError,
          telemetry,
        }
        setAllRows(scoredRows)
        setTelemetry(telemetry)
        setAIPrediction(prediction)
        setAIStatus(prediction ? prediction.ai_status : 'error')
        setAIError(predictionError)
        setDataSource('api')
        setLoadError(null)
        publishDataStatus({
          dataSource: 'api',
          rowCount: scoredRows.length,
          loadError: null,
          aiStatus: prediction ? prediction.ai_status : 'error',
          aiModel: prediction?.active_model ?? null,
          aiSummary: prediction?.ai_summary ?? null,
          aiError: predictionError,
          retry,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        console.warn('Using fallback customer data because the backend is unavailable.', error)
        setAllRows(REAL_KAGGLE_CHURN_DATA)
        setAIPrediction(null)
        setDataSource('sample')
        setAIStatus('error')
        const message = error instanceof Error ? error.message : 'Unknown API connection error.'
        setAIError(message)
        const loadMessage = '無法連線或資料格式不符，現在顯示有限的內建樣本資料。'
        cachedSnapshot = {
          rows: REAL_KAGGLE_CHURN_DATA,
          dataSource: 'sample',
          loadError: loadMessage,
          aiPrediction: null,
          aiStatus: 'error',
          aiError: message,
          telemetry: null,
        }
        setLoadError(loadMessage)
        publishDataStatus({
          dataSource: 'sample',
          rowCount: REAL_KAGGLE_CHURN_DATA.length,
          loadError: loadMessage,
          aiStatus: 'error',
          aiModel: null,
          aiSummary: null,
          aiError: message,
          retry,
        })
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void fetchRows()

    return () => controller.abort()
  }, [requestId, retry])

  const filteredRows = useMemo(() => allRows.filter((row) => {
    const matchesSearch = row.customer_id.toLowerCase().includes(filters.search.toLowerCase())
    const matchesRisk = filters.risk === 'All' || row.risk_level === filters.risk
    const matchesContract = filters.contract === 'All' || row.contract === filters.contract
    return matchesSearch && matchesRisk && matchesContract
  }), [allRows, filters])

  const highRiskRows = useMemo(() => allRows.filter((row) => row.churn_probability >= HIGH_RISK_THRESHOLD), [allRows])
  const meanSpend = useMemo(() => allRows.length ? allRows.reduce((sum, row) => sum + row.monthly_charges, 0) / allRows.length : 0, [allRows])
  const modelMetrics = useMemo(() => computeModelMetrics(allRows), [allRows])

  const updateFilters = (next: Partial<Filters>) => setFilters((current) => FiltersSchema.parse({ ...current, ...next }))
  const resetFilters = () => setFilters(emptyFilters)
  const exportToCSV = () => {
    const blob = new Blob([exportRowsToCsv(filteredRows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'predictflow-churn-customers.csv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return {
    rows: filteredRows,
    allRows,
    highRiskRows,
    meanSpend,
    filters,
    updateFilters,
    resetFilters,
    exportToCSV,
    isLoading,
    dataSource,
    loadError,
    aiPrediction,
    aiStatus,
    aiError,
    telemetry,
    retry,
    modelMetrics,
  }
}

export type ChurnDataState = ReturnType<typeof useChurnData>
export type ChurnRow = CustomerChurnRecord
