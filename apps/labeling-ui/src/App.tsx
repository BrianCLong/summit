/**
 * Labeling UI - Main Application
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/common/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LabelingPage } from './pages/LabelingPage';
import { ReviewPage } from './pages/ReviewPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { QualityPage } from './pages/QualityPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="labeling" element={<LabelingPage />} />
            <Route path="labeling/:jobId" element={<LabelingPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="review/:datasetId" element={<ReviewPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="datasets/:datasetId" element={<DatasetsPage />} />
            <Route path="quality" element={<QualityPage />} />
            <Route path="quality/:datasetId" element={<QualityPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
