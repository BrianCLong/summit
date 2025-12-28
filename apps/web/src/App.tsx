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
const OnboardingWizard = React.lazy(() => import('@/pages/Onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })))
const MaestroDashboard = React.lazy(() => import('@/pages/maestro/MaestroDashboard'))

// Global search context
import { SearchProvider } from '@/contexts/SearchContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary, NotFound } from '@/components/error'
import Explain from '@/components/Explain'
import { CommandStatusProvider } from '@/features/internal-command/CommandStatusProvider'
import { ExposureIndicator } from '@/components/common/ExposureIndicator'
import { ExposureGuard } from '@/components/common/ExposureGuard'
import type { ExposureSurfaceId } from '@/exposure/exposureConfig'

function App() {
  const [showPalette, setShowPalette] = React.useState(false);
  const [showExplain, setShowExplain] = React.useState(false);
  const withExposure = (surface: ExposureSurfaceId, element: React.ReactElement) => (
    <ExposureGuard surface={surface}>{element}</ExposureGuard>
  )

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
      <ExposureIndicator />
      <SocketProvider>
        <TooltipProvider>
          <AuthProvider>
            <SearchProvider>
              <CommandStatusProvider>
                <Router>
                  <ErrorBoundary>
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
                    <Route path="/signin" element={withExposure('auth.signin', <SignInPage />)} />
                    <Route path="/signup" element={withExposure('auth.signup', <SignupPage />)} />
                    <Route path="/verify-email" element={withExposure('auth.verify', <VerifyEmailPage />)} />
                    <Route
                      path="/access-denied"
                      element={withExposure('access_denied', <AccessDeniedPage />)}
                    />
                    <Route path="/maestro/*" element={withExposure('maestro', <MaestroDashboard />)} />

                    {/* Protected routes with layout */}
                    <Route path="/" element={<Layout />}>
                      <Route index element={withExposure('home', <HomePage />)} />
                      <Route path="explore" element={withExposure('explore', <ExplorePage />)} />

                      {/* Tri-Pane Analysis */}
                      <Route
                        path="analysis/tri-pane"
                        element={withExposure('analysis.tri_pane', <TriPanePage />)}
                      />
                      <Route
                        path="geoint"
                        element={withExposure('analysis.geoint', <GeoIntPane />)}
                      />

                      {/* Narrative Intelligence */}
                      <Route
                        path="analysis/narrative"
                        element={withExposure('analysis.narrative', <NarrativeIntelligencePage />)}
                      />

                      {/* Alerts */}
                      <Route path="alerts" element={withExposure('alerts', <AlertsPage />)} />
                      <Route path="alerts/:id" element={withExposure('alert_detail', <AlertDetailPage />)} />

                      {/* Cases */}
                      <Route path="cases" element={withExposure('cases', <CasesPage />)} />
                      <Route path="cases/:id" element={withExposure('case_detail', <CaseDetailPage />)} />

                      {/* Dashboards */}
                      <Route
                        path="dashboards/command-center"
                        element={withExposure('dashboards.command_center', <CommandCenterDashboard />)}
                      />
                      <Route
                        path="dashboards/supply-chain"
                        element={withExposure('dashboards.supply_chain', <SupplyChainDashboard />)}
                      />
                      <Route
                        path="dashboards/advanced"
                        element={withExposure('dashboards.advanced', <AdvancedDashboardPage />)}
                      />
                      <Route
                        path="internal/command"
                        element={withExposure('internal.command', <InternalCommandDashboard />)}
                      />
                      <Route path="mission-control" element={withExposure('mission_control', <MissionControlPage />)} />

                      {/* Data & Models */}
                      <Route
                        path="data/sources"
                        element={withExposure('data.sources', <DataSourcesPage />)}
                      />
                      <Route path="models" element={withExposure('models', <ModelsPage />)} />
                      <Route path="reports" element={withExposure('reports', <ReportsPage />)} />

                      {/* Admin */}
                      <Route path="admin/*" element={withExposure('admin', <AdminPage />)} />
                      <Route path="admin/consistency" element={withExposure('admin.consistency', <ConsistencyDashboard />)} />
                      <Route path="admin/feature-flags" element={withExposure('admin.feature_flags', <FeatureFlagsPage />)} />

                      {/* Support */}
                      <Route path="help" element={withExposure('help', <HelpPage />)} />
                      <Route path="changelog" element={withExposure('changelog', <ChangelogPage />)} />

                      <Route path="demo" element={withExposure('demo_control', <DemoControlPage />)} />
                      <Route path="onboarding" element={withExposure('onboarding', <OnboardingWizard />)} />

                      {/* Catch all */}
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                  </React.Suspense>
                </ErrorBoundary>
              </Router>
              </CommandStatusProvider>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </SocketProvider>
    </ApolloProvider>
  )
}

export default App
