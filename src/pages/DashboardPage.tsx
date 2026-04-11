import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { Header } from '../components/layout/Header'
import { PageHeader } from '../components/layout/PageHeader'
import { FilterBar } from '../components/filters/FilterBar'
import { ChartHeader } from '../components/chart/ChartHeader'
import { SpendingTrendChart } from '../components/chart/SpendingTrendChart'
import { ChartLegend } from '../components/chart/ChartLegend'
import { BreakdownTable } from '../components/table/BreakdownTable'
import { TransactionDrawer } from '../components/drawer/TransactionDrawer'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { AccountBalancePanel } from '../components/balance/AccountBalancePanel'
import { useFilters } from '../hooks/useFilters'
import { useConfig } from '../hooks/useConfig'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useDashboardData } from '../hooks/useDashboardData'
import { useGranularity } from '../hooks/useGranularity'
import { transformToBreakdownRows } from '../lib/breakdown-transform'
import { exportBreakdownCSV } from '../lib/csv-export'
import { exportChartAsPNG } from '../lib/chart-export'
import { fetchAssetAndLiabilityAccountBalances } from '../api/accounts'
import { useNetWorth } from '../hooks/useNetWorth'
import type { BreakdownRow } from '../types/breakdown'

export function DashboardPage() {
  const navigate = useNavigate()
  const { config } = useConfig()
  const breakpoint = useBreakpoint()
  const spacing = breakpoint === 'mobile' ? '16px' : breakpoint === 'tablet' ? '20px' : '24px'

  const {
    filters,
    updateFilter,
    activeOptionalFilters,
    addOptionalFilter,
    removeOptionalFilter,
    availableOptionalFilters,
  } = useFilters()

  const { data: accountBalances } = useQuery({
    queryKey: ['accounts', 'asset,liability', config?.baseUrl],
    queryFn: () => fetchAssetAndLiabilityAccountBalances(config!.baseUrl, config!.apiToken),
    enabled: !!config,
    staleTime: 60_000,
  })

  const netWorth = useNetWorth(config?.baseUrl ?? '', config?.apiToken ?? '')

  const { granularity, updateGranularity } = useGranularity()
  const dashboardData = useDashboardData(filters, granularity)
  const [showCumulative, setShowCumulative] = useState(false)
  const [selectedRow, setSelectedRow] = useState<BreakdownRow | null>(null)

  const { rows, totals } = useMemo(
    () => transformToBreakdownRows(dashboardData.chartData, dashboardData.series),
    [dashboardData.chartData, dashboardData.series]
  )

  const periods = dashboardData.periods.map((p) => p.label)

  const combinedError = dashboardData.error
  const rawError = dashboardData.rawError
  const is401 = rawError instanceof ApiError && rawError.statusCode === 401

  useEffect(() => {
    if (is401) {
      navigate('/config?error=auth')
    }
  }, [is401, navigate])

  const isRefetching = dashboardData.isFetching && !dashboardData.isLoading

  function handleRowClick(row: BreakdownRow) {
    setSelectedRow(row)
  }

  function handleExportBreakdownCSV() {
    exportBreakdownCSV(rows, totals, periods, filters.groupBy)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header showSettings={true} />
      <main
        style={{
          flex: 1,
          padding: spacing,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing,
          backgroundColor: '#121212',
        }}
      >
        <PageHeader
          title="Cost Explorer"
          subtitle="Analyze your spending trends and budget variance."
        />

        <AccountBalancePanel
          netWorth={netWorth}
          accounts={accountBalances ?? []}
        />

        {combinedError && !is401 && (
          <ErrorBanner
            message={combinedError}
            onRetry={() => dashboardData.refetch()}
          />
        )}

        <FilterBar
          filters={filters}
          updateFilter={updateFilter}
          activeOptionalFilters={activeOptionalFilters}
          addOptionalFilter={addOptionalFilter}
          removeOptionalFilter={removeOptionalFilter}
          availableOptionalFilters={availableOptionalFilters}
        />

        {/* Chart card with refetch overlay */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #3c4043',
              borderRadius: '8px',
              padding: '21px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <ChartHeader
              showCumulative={showCumulative}
              onToggleCumulative={() => setShowCumulative((prev) => !prev)}
              onExportPNG={exportChartAsPNG}
              granularity={granularity}
              onGranularityChange={updateGranularity}
            />
            <SpendingTrendChart
              data={dashboardData.chartData}
              series={dashboardData.series}
              currencyCode={dashboardData.currencyCode}
              isLoading={dashboardData.isLoading}
              cumulative={showCumulative}
            />
            {!dashboardData.isLoading && dashboardData.series.length > 0 && (
              <ChartLegend series={dashboardData.series} />
            )}
          </div>
          {isRefetching && (
            <div
              aria-label="Refreshing data"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  border: '3px solid #8ab4f8',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          )}
        </div>

        <BreakdownTable
          rows={rows}
          totals={totals}
          periods={periods}
          currencyCode={dashboardData.currencyCode}
          isLoading={dashboardData.isLoading}
          groupBy={filters.groupBy}
          onRowClick={handleRowClick}
          onExportCSV={handleExportBreakdownCSV}
        />
      </main>

      <TransactionDrawer
        row={selectedRow}
        periods={dashboardData.periods}
        filters={filters}
        currencyCode={dashboardData.currencyCode}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  )
}
