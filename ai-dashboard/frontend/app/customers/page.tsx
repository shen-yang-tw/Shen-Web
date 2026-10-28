'use client'

import { Download, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { CustomerTable, PageHeader } from '../components/dashboard'
import { useChurnData } from '../hooks/useChurnData'
import { useAppPreferences } from '../components/app-shell'

export default function CustomersPage() {
  const { rows, filters, updateFilters, resetFilters, exportToCSV, isLoading } = useChurnData()
  const { t } = useAppPreferences()
  return (
    <div>
      <PageHeader
        eyebrow={t('customers.eyebrow')}
        title={t('customers.title')}
        description={t('customers.description')}
        action={
          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <Download className="size-4" /> {t('customers.export')}
          </button>
        }
      />
      <main className="flex flex-col gap-5 p-5 sm:p-8 lg:p-10">
        <section className="rounded-xl border border-slate-800 bg-[#0d1525] p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-300">
            <SlidersHorizontal className="size-4 text-indigo-300" /> {t('customers.filters')}{' '}
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">{t('customers.recordsInView', { count: rows.length })}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <label className="relative">
              <span className="sr-only">{t('customers.search')}</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder={t('customers.search')}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/70 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              />
            </label>
            <label>
              <span className="sr-only">{t('customers.filterRisk')}</span>
              <select
                value={filters.risk}
                onChange={(event) => updateFilters({ risk: event.target.value as typeof filters.risk })}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              >
                <option value="All">{t('customers.allRisk')}</option>
                <option value="High">{t('customers.highRisk')}</option>
                <option value="Medium">{t('customers.mediumRisk')}</option>
                <option value="Low">{t('customers.lowRisk')}</option>
              </select>
            </label>
            <label>
              <span className="sr-only">{t('customers.filterContract')}</span>
              <select
                value={filters.contract}
                onChange={(event) =>
                  updateFilters({ contract: event.target.value as typeof filters.contract })
                }
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              >
                <option value="All">{t('customers.allContracts')}</option>
                <option value="Month-to-month">{t('contract.monthToMonth')}</option>
                <option value="One year">{t('contract.oneYear')}</option>
                <option value="Two year">{t('contract.twoYear')}</option>
              </select>
            </label>
            <button
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <RotateCcw className="size-3.5" /> {t('customers.reset')}
            </button>
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1525]">
          <CustomerTable rows={rows} isLoading={isLoading} />
        </section>
      </main>
    </div>
  )
}
