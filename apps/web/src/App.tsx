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

// Global search context
import { SearchProvider } from '@/contexts/SearchContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotFound } from '@/components/error'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <SocketProvider>
        <TooltipProvider>
          <AuthProvider>
            <SearchProvider>
              <Router>
                <ErrorBoundary componentName="App Root">
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
                      <Route index element={<ErrorBoundary componentName="HomePage"><HomePage /></ErrorBoundary>} />
                      <Route path="explore" element={<ErrorBoundary componentName="ExplorePage"><ExplorePage /></ErrorBoundary>} />

                      {/* Tri-Pane Analysis */}
                      <Route
                        path="analysis/tri-pane"
                        element={<ErrorBoundary componentName="TriPanePage"><TriPanePage /></ErrorBoundary>}
                      />

                      {/* Alerts */}
                      <Route path="alerts" element={<ErrorBoundary componentName="AlertsPage"><AlertsPage /></ErrorBoundary>} />
                      <Route path="alerts/:id" element={<ErrorBoundary componentName="AlertDetailPage"><AlertDetailPage /></ErrorBoundary>} />

                      {/* Cases */}
                      <Route path="cases" element={<ErrorBoundary componentName="CasesPage"><CasesPage /></ErrorBoundary>} />
                      <Route path="cases/:id" element={<ErrorBoundary componentName="CaseDetailPage"><CaseDetailPage /></ErrorBoundary>} />

                      {/* Dashboards */}
                      <Route
                        path="dashboards/command-center"
                        element={<ErrorBoundary componentName="CommandCenterDashboard"><CommandCenterDashboard /></ErrorBoundary>}
                      />
                      <Route
                        path="dashboards/supply-chain"
                        element={<ErrorBoundary componentName="SupplyChainDashboard"><SupplyChainDashboard /></ErrorBoundary>}
                      />

                      {/* Data & Models */}
                      <Route
                        path="data/sources"
                        element={<ErrorBoundary componentName="DataSourcesPage"><DataSourcesPage /></ErrorBoundary>}
                      />
                      <Route path="models" element={<ErrorBoundary componentName="ModelsPage"><ModelsPage /></ErrorBoundary>} />
                      <Route path="reports" element={<ErrorBoundary componentName="ReportsPage"><ReportsPage /></ErrorBoundary>} />

                      {/* Admin */}
                      <Route path="admin/*" element={<ErrorBoundary componentName="AdminPage"><AdminPage /></ErrorBoundary>} />

                      {/* Support */}
                      <Route path="help" element={<ErrorBoundary componentName="HelpPage"><HelpPage /></ErrorBoundary>} />
                      <Route path="changelog" element={<ErrorBoundary componentName="ChangelogPage"><ChangelogPage /></ErrorBoundary>} />

                      {/* Catch all */}
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                  </React.Suspense>
                </ErrorBoundary>
              </Router>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </SocketProvider>
    </ApolloProvider>
  )
}

export default App;
