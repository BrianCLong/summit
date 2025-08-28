import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

const Home = lazy(() => import('./routes/HomeRoute')); // adjust if different
const ActionDetailsRoute = lazy(() => import('./routes/ActionDetailsRoute')); // ✅ v2.6 added
const OsintStudio = lazy(() => import('./routes/OsintStudio'));
const OsintHealth = lazy(() => import('./routes/OsintHealth'));
const Watchlists = lazy(() => import('./routes/Watchlists'));
const Cases = lazy(() => import('./routes/Cases'));
const CaseDetail = lazy(() => import('./routes/CaseDetail'));
const SocialNetworkPage = lazy(() => import('./components/social/SocialNetworkAnalysis'));
const BehavioralAnalyticsPage = lazy(() => import('./components/behavioral/BehavioralAnalytics'));
const ThreatHuntingPage = lazy(() => import('./components/threat/ThreatHuntingDarkWeb'));
const IntelligenceFeedsPage = lazy(() => import('./components/intelligence/IntelligenceFeedsEnrichment'));
const CaseManagementPage = lazy(() => import('./components/reporting/ReportingCaseManagement'));

function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-4">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/actions/:actionId" element={<ActionDetailsRoute />} />
            <Route path="/osint" element={<OsintStudio />} />
            <Route path="/osint/health" element={<OsintHealth />} />
            <Route path="/osint/watchlists" element={<Watchlists />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/intelligence/social-network" element={<SocialNetworkPage />} />
            <Route path="/intelligence/behavioral" element={<BehavioralAnalyticsPage />} />
            <Route path="/intelligence/threat-hunting" element={<ThreatHuntingPage />} />
            <Route path="/intelligence/feeds" element={<IntelligenceFeedsPage />} />
            <Route path="/intelligence/case-management" element={<CaseManagementPage />} />
            {/* safety: redirect unknown paths to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default AppRouter;
