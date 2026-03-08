"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const react_2 = require("@apollo/client/react");
const Tooltip_1 = require("@/components/ui/Tooltip");
const Layout_1 = require("@/components/Layout");
// Apollo Client and Socket Context
const apollo_1 = require("@/lib/apollo");
const SocketContext_1 = require("@/contexts/SocketContext");
// Lazy load pages for better initial load performance
const HomePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/HomePage'))));
const ExplorePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ExplorePage'))));
const AlertsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/AlertsPage'))));
const AlertDetailPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/AlertDetailPage'))));
const CasesPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/CasesPage'))));
const CaseDetailPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/CaseDetailPage'))));
const CommandCenterDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/dashboards/CommandCenterDashboard'))));
const SupplyChainDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/dashboards/SupplyChainDashboard'))));
const AdvancedDashboardPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/dashboards/AdvancedDashboardPage'))));
const UsageCostDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/dashboards/UsageCostDashboard'))));
const DataSourcesPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/DataSourcesPage'))));
const ModelsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ModelsPage'))));
const ReportsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ReportsPage'))));
const AdminPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/AdminPage'))));
const FeatureFlagsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/admin/FeatureFlags'))));
const ConsistencyDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/admin/ConsistencyDashboard'))).then(m => ({ default: m.ConsistencyDashboard })));
const HelpPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/HelpPage'))));
const ChangelogPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ChangelogPage'))));
const InternalCommandDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/internal/InternalCommandDashboard'))));
const SignInPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/SignInPage'))));
const SignupPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/SignupPage'))));
const VerifyEmailPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/VerifyEmailPage'))));
const TrialSignupPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/onboarding/trial-signup'))));
const AccessDeniedPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/AccessDeniedPage'))));
const TriPanePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/TriPanePage'))));
const GeoIntPane = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/panes/GeoIntPane'))).then(module => ({ default: module.GeoIntPane })));
const NarrativeIntelligencePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/NarrativeIntelligencePage'))));
const MissionControlPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/features/mission-control/MissionControlPage'))));
const PRTriagePage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/features/pr-triage/PRTriagePage'))));
const DemoControlPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/DemoControlPage'))));
// const OnboardingWizard = React.lazy(() => import('@/pages/Onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })))
const MaestroDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/maestro/MaestroDashboard'))));
const TrustDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/TrustDashboard'))));
const CopilotPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/components/CopilotPanel'))).then(m => ({ default: m.CopilotPanel })));
const InvestigationCanvas = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/InvestigationCanvas'))));
// New Switchboard Pages
const ApprovalsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ApprovalsPage'))));
const ReceiptsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/ReceiptsPage'))));
const TenantOpsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/TenantOpsPage'))));
const OutreachDashboard = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('@/pages/outreach-dashboard'))));
// Workbench
const WorkbenchLayout_1 = require("@/workbench/shell/WorkbenchLayout");
// Global search context
const SearchContext_1 = require("@/contexts/SearchContext");
const AuthContext_1 = require("@/contexts/AuthContext");
const FeatureFlagContext_1 = require("@/contexts/FeatureFlagContext");
const ResilienceContext_1 = require("@/contexts/ResilienceContext");
const error_1 = require("@/components/error");
const Explain_1 = __importDefault(require("@/components/Explain"));
const CommandStatusProvider_1 = require("@/features/internal-command/CommandStatusProvider");
const snapshots_1 = require("@/features/snapshots");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const DemoModeGate_1 = require("@/components/common/DemoModeGate");
const demoMode_1 = require("@/lib/demoMode");
function App() {
    const [showPalette, setShowPalette] = react_1.default.useState(false);
    const [showExplain, setShowExplain] = react_1.default.useState(false);
    const demoModeEnabled = (0, demoMode_1.isDemoModeEnabled)();
    react_1.default.useEffect(() => {
        const onKey = (e) => {
            if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setShowPalette(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return (<react_2.ApolloProvider client={apollo_1.apolloClient}>
      <DemoIndicator_1.DemoIndicator />
      <SocketContext_1.SocketProvider>
        <Tooltip_1.TooltipProvider>
          <AuthContext_1.AuthProvider>
            <FeatureFlagContext_1.FeatureFlagProvider>
              <SearchContext_1.SearchProvider>
                <snapshots_1.SnapshotProvider>
                  <CommandStatusProvider_1.CommandStatusProvider>
                    <ResilienceContext_1.ResilienceProvider>
                      <react_router_dom_1.BrowserRouter>
                      <error_1.ErrorBoundary enableRetry={true} maxRetries={3} retryDelay={2000} severity="critical" boundaryName="app_root">
                    <react_1.default.Suspense fallback={<div className="flex h-screen items-center justify-center">
                          <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"/>
                            <p className="mt-4 text-sm text-muted-foreground">
                              Loading...
                            </p>
                          </div>
                        </div>}>
                      {/* Explain overlay stub */}
                      {showPalette && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowPalette(false)}>
                           <div className="bg-white p-4 rounded shadow-lg w-96" onClick={e => e.stopPropagation()}>
                             <input type="text" placeholder="Command..." className="w-full border p-2 mb-2" autoFocus/>
                             <button onClick={() => { setShowPalette(false); setShowExplain(true); }} className="block w-full text-left p-2 hover:bg-gray-100">
                               Explain this view
                             </button>
                           </div>
                         </div>)}
                      {showExplain && <Explain_1.default facts={["Linked via shared IP (1.2.3.4)", "Match score: 0.98"]}/>}

                      <react_router_dom_1.Routes>
                        {/* Auth routes */}
                      <react_router_dom_1.Route path="/signin" element={<SignInPage />}/>
                      <react_router_dom_1.Route path="/signup" element={<SignupPage />}/>
                      <react_router_dom_1.Route path="/trial-signup" element={<TrialSignupPage />}/>
                      <react_router_dom_1.Route path="/verify-email" element={<VerifyEmailPage />}/>
                      <react_router_dom_1.Route path="/access-denied" element={<AccessDeniedPage />}/>
                      <react_router_dom_1.Route path="/maestro/*" element={<error_1.DataFetchErrorBoundary dataSourceName="Maestro Orchestrator">
                          <MaestroDashboard />
                        </error_1.DataFetchErrorBoundary>}/>
                      <react_router_dom_1.Route path="/trust" element={<TrustDashboard />}/>

                      {/* Switchboard Routes */}
                      <react_router_dom_1.Route path="/approvals" element={<ApprovalsPage />}/>
                      <react_router_dom_1.Route path="/receipts" element={<ReceiptsPage />}/>
                      <react_router_dom_1.Route path="/tenant-ops" element={<TenantOpsPage />}/>

                      {/* Workbench Route */}
                      <react_router_dom_1.Route path="/workbench" element={<WorkbenchLayout_1.WorkbenchShell />}/>
                      <react_router_dom_1.Route path="/copilot" element={<CopilotPage />}/>

                      {/* Protected routes with layout */}
                      <react_router_dom_1.Route path="/" element={<Layout_1.Layout />}>
                        <react_router_dom_1.Route index element={<HomePage />}/>
                        <react_router_dom_1.Route path="explore" element={<error_1.DataFetchErrorBoundary dataSourceName="Explore">
                              <ExplorePage />
                            </error_1.DataFetchErrorBoundary>}/>

                        <react_router_dom_1.Route path="investigation" element={<error_1.DataFetchErrorBoundary dataSourceName="Investigation Canvas">
                            <InvestigationCanvas />
                          </error_1.DataFetchErrorBoundary>}/>

                        {/* Tri-Pane Analysis - Wrapped with DataFetchErrorBoundary */}
                        <react_router_dom_1.Route path="analysis/tri-pane" element={<error_1.DataFetchErrorBoundary dataSourceName="Tri-Pane Analysis">
                              <TriPanePage />
                            </error_1.DataFetchErrorBoundary>}/>
                        <react_router_dom_1.Route path="geoint" element={<error_1.DataFetchErrorBoundary dataSourceName="GeoInt">
                              <GeoIntPane />
                            </error_1.DataFetchErrorBoundary>}/>

                        {/* Narrative Intelligence */}
                        <react_router_dom_1.Route path="analysis/narrative" element={<error_1.DataFetchErrorBoundary dataSourceName="Narrative Intelligence">
                              <NarrativeIntelligencePage />
                            </error_1.DataFetchErrorBoundary>}/>

                        {/* Alerts */}
                        <react_router_dom_1.Route path="alerts" element={<AlertsPage />}/>
                        <react_router_dom_1.Route path="alerts/:id" element={<AlertDetailPage />}/>

                        {/* Cases */}
                        <react_router_dom_1.Route path="cases" element={<CasesPage />}/>
                        <react_router_dom_1.Route path="cases/:id" element={<CaseDetailPage />}/>

                        {/* Dashboards - Wrapped with DataFetchErrorBoundary */}
                        <react_router_dom_1.Route path="dashboards/command-center" element={<error_1.DataFetchErrorBoundary dataSourceName="Command Center">
                              <CommandCenterDashboard />
                            </error_1.DataFetchErrorBoundary>}/>
                        <react_router_dom_1.Route path="dashboards/supply-chain" element={<error_1.DataFetchErrorBoundary dataSourceName="Supply Chain">
                              <SupplyChainDashboard />
                            </error_1.DataFetchErrorBoundary>}/>
                        <react_router_dom_1.Route path="dashboards/advanced" element={<error_1.DataFetchErrorBoundary dataSourceName="Advanced Dashboard">
                              <AdvancedDashboardPage />
                            </error_1.DataFetchErrorBoundary>}/>
                        <react_router_dom_1.Route path="dashboards/usage-cost" element={<error_1.DataFetchErrorBoundary dataSourceName="Usage & Cost">
                              <UsageCostDashboard />
                            </error_1.DataFetchErrorBoundary>}/>
                        <react_router_dom_1.Route path="internal/command" element={<error_1.DataFetchErrorBoundary dataSourceName="Internal Command Dashboard">
                              <InternalCommandDashboard />
                            </error_1.DataFetchErrorBoundary>}/>
                        <react_router_dom_1.Route path="pr-triage" element={<error_1.DataFetchErrorBoundary dataSourceName="PR Triage">
                              <PRTriagePage />
                            </error_1.DataFetchErrorBoundary>}/>
                                                <react_router_dom_1.Route path="mission-control" element={<error_1.DataFetchErrorBoundary dataSourceName="Mission Control">
                              <MissionControlPage />
                            </error_1.DataFetchErrorBoundary>}/>

                        <react_router_dom_1.Route path="outreach" element={<error_1.DataFetchErrorBoundary dataSourceName="Outreach Dashboard">
                              <OutreachDashboard />
                            </error_1.DataFetchErrorBoundary>}/>

                        {/* Data & Models */}
                        <react_router_dom_1.Route path="data/sources" element={<DataSourcesPage />}/>
                        <react_router_dom_1.Route path="models" element={<ModelsPage />}/>
                        <react_router_dom_1.Route path="reports" element={<ReportsPage />}/>

                        {/* Admin - Wrapped with MutationErrorBoundary for critical operations */}
                        <react_router_dom_1.Route path="admin/*" element={<error_1.MutationErrorBoundary operationName="admin operation">
                              <AdminPage />
                            </error_1.MutationErrorBoundary>}/>
                        <react_router_dom_1.Route path="admin/consistency" element={<error_1.MutationErrorBoundary operationName="consistency check">
                              <ConsistencyDashboard />
                            </error_1.MutationErrorBoundary>}/>
                        <react_router_dom_1.Route path="admin/feature-flags" element={<error_1.MutationErrorBoundary operationName="feature flag update">
                              <FeatureFlagsPage />
                            </error_1.MutationErrorBoundary>}/>

                        {/* Support */}
                        <react_router_dom_1.Route path="help" element={<HelpPage />}/>
                        <react_router_dom_1.Route path="changelog" element={<ChangelogPage />}/>

                        {/* Explicitly Gated Demo Routes */}
                        <react_router_dom_1.Route path="demo" element={demoModeEnabled ? (<DemoModeGate_1.DemoModeGate>
                                <DemoControlPage />
                              </DemoModeGate_1.DemoModeGate>) : (<react_router_dom_1.Navigate to="/" replace/>)}/>
                        {/* <Route path="onboarding" element={<OnboardingWizard />} /> */}

                        {/* Catch all */}
                        <react_router_dom_1.Route path="*" element={<error_1.NotFound />}/>
                      </react_router_dom_1.Route>
                    </react_router_dom_1.Routes>
                    </react_1.default.Suspense>
                    </error_1.ErrorBoundary>
                      </react_router_dom_1.BrowserRouter>
                    </ResilienceContext_1.ResilienceProvider>
                  </CommandStatusProvider_1.CommandStatusProvider>
                </snapshots_1.SnapshotProvider>
              </SearchContext_1.SearchProvider>
            </FeatureFlagContext_1.FeatureFlagProvider>
          </AuthContext_1.AuthProvider>
        </Tooltip_1.TooltipProvider>
      </SocketContext_1.SocketProvider>
    </react_2.ApolloProvider>);
}
exports.default = App;
