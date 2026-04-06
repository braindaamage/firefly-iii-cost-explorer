import { useState } from 'react'
import { Header } from '../components/layout/Header'
import { PageHeader } from '../components/layout/PageHeader'
import { FilterBar } from '../components/filters/FilterBar'
import { ChartHeader } from '../components/chart/ChartHeader'
import { SpendingTrendChart } from '../components/chart/SpendingTrendChart'
import { ChartLegend } from '../components/chart/ChartLegend'
import { BreakdownTable } from '../components/table/BreakdownTable'
import { TransactionDrawer } from '../components/drawer/TransactionDrawer'
import { useFilters } from '../hooks/useFilters'
import { useDashboardData } from '../hooks/useDashboardData'
import { useBreakdownData } from '../hooks/useBreakdownData'
import { exportBreakdownCSV } from '../lib/csv-export'
import { exportChartAsPNG } from '../lib/chart-export'
import type { BreakdownRow } from '../types/breakdown'

export function DashboardPage() {
  const {
    filters,
    updateFilter,
    activeOptionalFilters,
    addOptionalFilter,
    removeOptionalFilter,
    availableOptionalFilters,
  } = useFilters()

  const dashboardData = useDashboardData(filters)
  const breakdownData = useBreakdownData(filters)
  const [showCumulative, setShowCumulative] = useState(false)
  const [selectedRow, setSelectedRow] = useState<BreakdownRow | null>(null)

  function handleRowClick(row: BreakdownRow) {
    setSelectedRow(row)
  }

  function handleExportBreakdownCSV() {
    exportBreakdownCSV(breakdownData.rows, breakdownData.totals, filters.groupBy, breakdownData.currencyCode)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header showSettings={true} />
      <main
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          backgroundColor: '#121212',
        }}
      >
        <PageHeader
          title="Cost Explorer"
          subtitle="Analyze your spending trends and budget variance."
        />
        <FilterBar
          filters={filters}
          updateFilter={updateFilter}
          activeOptionalFilters={activeOptionalFilters}
          addOptionalFilter={addOptionalFilter}
          removeOptionalFilter={removeOptionalFilter}
          availableOptionalFilters={availableOptionalFilters}
        />

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

        <BreakdownTable
          rows={breakdownData.rows}
          totals={breakdownData.totals}
          currencyCode={breakdownData.currencyCode}
          isLoading={breakdownData.isLoading}
          filters={filters}
          onRowClick={handleRowClick}
          onExportCSV={handleExportBreakdownCSV}
        />
      </main>

      <TransactionDrawer
        row={selectedRow}
        filters={filters}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  )
}
