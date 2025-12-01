import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MaestroLayout } from './layouts/MaestroLayout';
import { DashboardPage } from './pages/DashboardPage';
import { RunsPage } from './pages/RunsPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { AgentsPage } from './pages/AgentsPage';
import { AutonomicPage } from './pages/AutonomicPage';
import { MergeTrainsPage } from './pages/MergeTrainsPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { GovernancePage } from './pages/GovernancePage';

const MaestroApp: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/maestro" replace />} />
        <Route path="/maestro" element={<MaestroLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="runs/:id" element={<RunDetailPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="autonomic" element={<AutonomicPage />} />
          <Route path="merge-trains" element={<MergeTrainsPage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="policy" element={<GovernancePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default MaestroApp;
