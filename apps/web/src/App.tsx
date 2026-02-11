import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
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
const AdvancedDashboardPage = React.lazy(
  () => import('@/pages/dashboards/AdvancedDashboardPage')
)
const UsageCostDashboard = React.lazy(
  () => import('@/pages/dashboards/UsageCostDashboard')
)
const DataSourcesPage = React.lazy(() => import('@/pages/DataSourcesPage'))
const ModelsPage = React.lazy(() => import('@/pages/ModelsPage'))
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage'))
const AdminPage = React.lazy(() => import('@/pages/AdminPage'))
const FeatureFlagsPage = React.lazy(() => import('@/pages/admin/FeatureFlags'))
const ConsistencyDashboard = React.lazy(() => import('@/pages/admin/ConsistencyDashboard').then(m => ({ default: m.ConsistencyDashboard })))
const HelpPage = React.lazy(() => import('@/pages/HelpPage'))
const ChangelogPage = React.lazy(() => import('@/pages/ChangelogPage'))
const InternalCommandDashboard = React.lazy(() => import('@/pages/internal/InternalCommandDashboard'))
const SignInPage = React.lazy(() => import('@/pages/SignInPage'))
const SignupPage = React.lazy(() => import('@/pages/SignupPage'))
const VerifyEmailPage = React.lazy(() => import('@/pages/VerifyEmailPage'))
const AccessDeniedPage = React.lazy(() => import('@/pages/AccessDeniedPage'))
const TriPanePage = React.lazy(() => import('@/pages/TriPanePage'))
const GeoIntPane = React.lazy(() => import('@/panes/GeoIntPane').then(module => ({ default: module.GeoIntPane })))
const NarrativeIntelligencePage = React.lazy(() => import('@/pages/NarrativeIntelligencePage'))
const MissionControlPage = React.lazy(() => import('@/features/mission-control/MissionControlPage'))
const DemoControlPage = React.lazy(() => import('@/pages/DemoControlPage'))
// const OnboardingWizard = React.lazy(() => import('@/pages/Onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })))
const MaestroDashboard = React.lazy(() => import('@/pages/maestro/MaestroDashboard'))
const ApprovalsPage = React.lazy(() => import('@/pages/switchboard/ApprovalsPage'))
const ApprovalDetailPage = React.lazy(() => import('@/pages/switchboard/ApprovalDetailPage'))
const IncidentsPage = React.lazy(() => import('@/pages/switchboard/IncidentsPage'))
const IncidentDetailPage = React.lazy(() => import('@/pages/switchboard/IncidentDetailPage'))
const TrustDashboard = React.lazy(() => import('@/pages/TrustDashboard'))
const CopilotPage = React.lazy(() => import('@/components/CopilotPanel').then(m => ({ default: m.CopilotPanel })))
const InvestigationCanvas = React.lazy(() => import('@/pages/InvestigationCanvas'))

// New Switchboard Pages
const ApprovalsPage = React.lazy(() => import('@/pages/ApprovalsPage'))
const ReceiptsPage = React.lazy(() => import('@/pages/ReceiptsPage'))
const TenantOpsPage = React.lazy(() => import('@/pages/TenantOpsPage'))

// Workbench
import { WorkbenchShell } from '@/workbench/shell/WorkbenchLayout'

// Global search context
import { SearchProvider } from '@/contexts/SearchContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { FeatureFlagProvider } from '@/contexts/FeatureFlagContext'
import { ResilienceProvider } from '@/contexts/ResilienceContext'
import { ErrorBoundary, NotFound, DataFetchErrorBoundary, MutationErrorBoundary } from '@/components/error'
import Explain from '@/components/Explain'
import { CommandStatusProvider } from '@/features/internal-command/CommandStatusProvider'
import { DemoIndicator } from '@/components/common/DemoIndicator'
import { DemoModeGate } from '@/components/common/DemoModeGate'
import { isDemoModeEnabled } from '@/lib/demoMode'
import { CommandPalette } from '@/components/CommandPalette'

function App() {
  const [showPalette, setShowPalette] = React.useState(false);
  const [showExplain, setShowExplain] = React.useState(false);
  const demoModeEnabled = isDemoModeEnabled()

  React.useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.key==='k' || e.key==='K') && (e.ctrlKey||e.metaKey)){
        e.preventDefault();
        setShowPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[]);

  return (
    <ApolloProvider client={apolloClient}>
      <DemoIndicator />
      <SocketProvider>
        <TooltipProvider>
          <AuthProvider>
            <FeatureFlagProvider>
              <SearchProvider>
                <CommandStatusProvider>
                  <ResilienceProvider>
                    <Router>
                      <ErrorBoundary
                        enableRetry={true}
                        maxRetries={3}
                        retryDelay={2000}
                        severity="critical"
                        boundaryName="app_root"
                      >
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
                      {/* Explain overlay stub */}
                      {showPalette && (
                         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={()=>setShowPalette(false)}>
                           <div className="bg-white p-4 rounded shadow-lg w-96" onClick={e=>e.stopPropagation()}>
                             <input type="text" placeholder="Command..." className="w-full border p-2 mb-2" autoFocus />
                             <button onClick={()=>{ setShowPalette(false); setShowExplain(true); }} className="block w-full text-left p-2 hover:bg-gray-100">
                               Explain this view
                             </button>
                           </div>
                         </div>
                      )}
                      {showExplain && <Explain facts={["Linked via shared IP (1.2.3.4)", "Match score: 0.98"]} />}

                      <Routes>
                        {/* Auth routes */}
                      <Route path="/signin" element={<SignInPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route
                        path="/access-denied"
                        element={<AccessDeniedPage />}
                      />
                      <Route path="/maestro/*" element={
                        <DataFetchErrorBoundary dataSourceName="Maestro Orchestrator">
                          <MaestroDashboard />
                        </DataFetchErrorBoundary>
                      } />
                      <Route path="/trust" element={<TrustDashboard />} />

                      {/* Switchboard Routes */}
                      <Route path="/approvals" element={<ApprovalsPage />} />
                      <Route path="/receipts" element={<ReceiptsPage />} />
                      <Route path="/tenant-ops" element={<TenantOpsPage />} />

                      {/* Workbench Route */}
                      <Route path="/workbench" element={<WorkbenchShell />} />
                      <Route path="/copilot" element={<CopilotPage />} />

                      {/* Protected routes with layout */}
                      <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route
                          path="explore"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Explore">
                              <ExplorePage />
                            </DataFetchErrorBoundary>
                          }
                        />

                        <Route path="investigation" element={
                          <DataFetchErrorBoundary dataSourceName="Investigation Canvas">
                            <InvestigationCanvas />
                          </DataFetchErrorBoundary>
                        } />

                        {/* Tri-Pane Analysis - Wrapped with DataFetchErrorBoundary */}
                        <Route
                          path="analysis/tri-pane"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Tri-Pane Analysis">
                              <TriPanePage />
                            </DataFetchErrorBoundary>
                          }
                        />
                        <Route
                          path="geoint"
                          element={
                            <DataFetchErrorBoundary dataSourceName="GeoInt">
                              <GeoIntPane />
                            </DataFetchErrorBoundary>
                          }
                        />

                        {/* Narrative Intelligence */}
                        <Route
                          path="analysis/narrative"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Narrative Intelligence">
                              <NarrativeIntelligencePage />
                            </DataFetchErrorBoundary>
                          }
                        />

                        {/* Alerts */}
                        <Route path="alerts" element={<AlertsPage />} />
                        <Route path="alerts/:id" element={<AlertDetailPage />} />

                        {/* Cases */}
                        <Route path="cases" element={<CasesPage />} />
                        <Route path="cases/:id" element={<CaseDetailPage />} />

                        {/* Switchboard */}
                        <Route path="switchboard/approvals" element={<ApprovalsPage />} />
                        <Route path="switchboard/approvals/:id" element={<ApprovalDetailPage />} />
                        <Route path="switchboard/incidents" element={<IncidentsPage />} />
                        <Route path="switchboard/incidents/:id" element={<IncidentDetailPage />} />

                        {/* Dashboards - Wrapped with DataFetchErrorBoundary */}
                        <Route
                          path="dashboards/command-center"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Command Center">
                              <CommandCenterDashboard />
                            </DataFetchErrorBoundary>
                          }
                        />
                        <Route
                          path="dashboards/supply-chain"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Supply Chain">
                              <SupplyChainDashboard />
                            </DataFetchErrorBoundary>
                          }
                        />
                        <Route
                          path="dashboards/advanced"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Advanced Dashboard">
                              <AdvancedDashboardPage />
                            </DataFetchErrorBoundary>
                          }
                        />
                        <Route
                          path="dashboards/usage-cost"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Usage & Cost">
                              <UsageCostDashboard />
                            </DataFetchErrorBoundary>
                          }
                        />
                        <Route
                          path="internal/command"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Internal Command Dashboard">
                              <InternalCommandDashboard />
                            </DataFetchErrorBoundary>
                          }
                        />
                        <Route
                          path="mission-control"
                          element={
                            <DataFetchErrorBoundary dataSourceName="Mission Control">
                              <MissionControlPage />
                            </DataFetchErrorBoundary>
                          }
                        />

                        {/* Data & Models */}
                        <Route
                          path="data/sources"
                          element={<DataSourcesPage />}
                        />
                        <Route path="models" element={<ModelsPage />} />
                        <Route path="reports" element={<ReportsPage />} />

                        {/* Admin - Wrapped with MutationErrorBoundary for critical operations */}
                        <Route
                          path="admin/*"
                          element={
                            <MutationErrorBoundary operationName="admin operation">
                              <AdminPage />
                            </MutationErrorBoundary>
                          }
                        />
                        <Route
                          path="admin/consistency"
                          element={
                            <MutationErrorBoundary operationName="consistency check">
                              <ConsistencyDashboard />
                            </MutationErrorBoundary>
                          }
                        />
                        <Route
                          path="admin/feature-flags"
                          element={
                            <MutationErrorBoundary operationName="feature flag update">
                              <FeatureFlagsPage />
                            </MutationErrorBoundary>
                          }
                        />

                        {/* Support */}
                        <Route path="help" element={<HelpPage />} />
                        <Route path="changelog" element={<ChangelogPage />} />

                        {/* Explicitly Gated Demo Routes */}
                        <Route
                          path="demo"
                          element={
                            demoModeEnabled ? (
                              <DemoModeGate>
                                <DemoControlPage />
                              </DemoModeGate>
                            ) : (
                              <Navigate to="/" replace />
                            )
                          }
                        />
                        {/* <Route path="onboarding" element={<OnboardingWizard />} /> */}

                        {/* Catch all */}
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                    </React.Suspense>
                    </ErrorBoundary>
                  </Router>
                  </ResilienceProvider>
                </CommandStatusProvider>
              </SearchProvider>
            </FeatureFlagProvider>
          </AuthProvider>
        </TooltipProvider>
      </SocketProvider>
    </ApolloProvider>
  )
}

export default App
