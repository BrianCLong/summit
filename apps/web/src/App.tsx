import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Layout } from '@/components/Layout'

// Apollo Client and Socket Context
import { apolloClient } from '@/lib/apollo'
import { SocketProvider } from '@/contexts/SocketContext'

// Lazy load pages for better initial load performance
const HomePage = React.lazy(() => import('@/pages/HomePage'))
const ExplorePage = React.lazy(() => import('@/pages/ExplorePage'))
const AlertsPage = React.lazy(() => import('@/pages/AlertsPage'))
const AlertDetailPage = React.lazy(() => import('@/pages/AlertDetailPage'))
const CasesPage = React.lazy(() => import('@/pages/CasesPage'))
const CaseDetailPage = React.lazy(() => import('@/pages/CaseDetailPage'))
const CommandCenterDashboard = React.lazy(
  () => import('@/pages/dashboards/CommandCenterDashboard')
)
const SupplyChainDashboard = React.lazy(
  () => import('@/pages/dashboards/SupplyChainDashboard')
)
const DataSourcesPage = React.lazy(() => import('@/pages/DataSourcesPage'))
const ModelsPage = React.lazy(() => import('@/pages/ModelsPage'))
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage'))
const AdminPage = React.lazy(() => import('@/pages/AdminPage'))
const HelpPage = React.lazy(() => import('@/pages/HelpPage'))
const ChangelogPage = React.lazy(() => import('@/pages/ChangelogPage'))
const SignInPage = React.lazy(() => import('@/pages/SignInPage'))
const AccessDeniedPage = React.lazy(() => import('@/pages/AccessDeniedPage'))
const TriPanePage = React.lazy(() => import('@/pages/TriPanePage'))
const GovernanceDashboard = React.lazy(() => import('@/features/governance/GovernanceDashboard'))

// Global search context
import { SearchProvider } from '@/contexts/SearchContext'
import { AuthProvider } from '@/contexts/AuthContext'

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <SocketProvider>
        <TooltipProvider>
          <AuthProvider>
            <SearchProvider>
              <Router>
                <React.Suspense
                  fallback={
                    <div className="flex h-screen items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          Loading...
                        </p>
                      </div>
                    </div>
                  }
                >
                  <Routes>
                    {/* Auth routes */}
                    <Route path="/signin" element={<SignInPage />} />
                    <Route
                      path="/access-denied"
                      element={<AccessDeniedPage />}
                    />

                    {/* Protected routes with layout */}
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />
                      <Route path="explore" element={<ExplorePage />} />

                      {/* Tri-Pane Analysis */}
                      <Route
                        path="analysis/tri-pane"
                        element={<TriPanePage />}
                      />

                      {/* Alerts */}
                      <Route path="alerts" element={<AlertsPage />} />
                      <Route path="alerts/:id" element={<AlertDetailPage />} />

                      {/* Cases */}
                      <Route path="cases" element={<CasesPage />} />
                      <Route path="cases/:id" element={<CaseDetailPage />} />

                      {/* Dashboards */}
                      <Route
                        path="dashboards/command-center"
                        element={<CommandCenterDashboard />}
                      />
                      <Route
                        path="dashboards/supply-chain"
                        element={<SupplyChainDashboard />}
                      />
                      <Route
                        path="dashboards/governance"
                        element={<GovernanceDashboard />}
                      />

                      {/* Data & Models */}
                      <Route
                        path="data/sources"
                        element={<DataSourcesPage />}
                      />
                      <Route path="models" element={<ModelsPage />} />
                      <Route path="reports" element={<ReportsPage />} />

                      {/* Admin */}
                      <Route path="admin/*" element={<AdminPage />} />

                      {/* Support */}
                      <Route path="help" element={<HelpPage />} />
                      <Route path="changelog" element={<ChangelogPage />} />

                      {/* Catch all */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </React.Suspense>
              </Router>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </SocketProvider>
    </ApolloProvider>
  )
}

export default App
