import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

const Home = lazy(() => import('./routes/HomeRoute')); // adjust if different
const ActionDetailsRoute = lazy(() => import('./routes/ActionDetailsRoute')); // ✅ v2.6 added

function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-4">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/actions/:actionId" element={<ActionDetailsRoute />} />
            {/* safety: redirect unknown paths to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default AppRouter;