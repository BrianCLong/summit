import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import { store } from './store';
import apolloClient from './services/apollo';

const Home = lazy(() => import('./routes/HomeRoute')); // adjust if different
const ActionDetailsRoute = lazy(() => import('./routes/ActionDetailsRoute')); // ✅ v2.6 added

function AppRouter() {
  return (
    <ApolloProvider client={apolloClient}>
      <Provider store={store}>
        <BrowserRouter>
          <ErrorBoundary>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navigation />
              <main style={{ flex: 1 }}>
                <Suspense fallback={
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <div>Loading…</div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/actions/:actionId" element={<ActionDetailsRoute />} />
                    {/* safety: redirect unknown paths to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </ErrorBoundary>
        </BrowserRouter>
      </Provider>
    </ApolloProvider>
  );
}

export default AppRouter;