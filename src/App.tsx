import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useConfig } from './hooks/useConfig'
import { ConfigPage } from './pages/ConfigPage'
import { DashboardPage } from './pages/DashboardPage'

const queryClient = new QueryClient()

function AppRoutes() {
  const { isConfigured } = useConfig()

  return (
    <Routes>
      <Route
        path="/"
        element={
          isConfigured ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/config" replace />
          )
        }
      />
      <Route path="/config" element={<ConfigPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
