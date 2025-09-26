import React from 'react';
import { useDashboardPrefetch, useIntelligentPrefetch } from '../../hooks/usePrefetch';
import DashboardLayoutExperiment from '../../components/dashboard/DashboardLayoutExperiment';

export default function Dashboard() {
  // Prefetch critical dashboard data to eliminate panel pop-in
  useDashboardPrefetch();
  useIntelligentPrefetch();

  return <DashboardLayoutExperiment />;
}
