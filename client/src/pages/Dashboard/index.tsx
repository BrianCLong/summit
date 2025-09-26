import React from 'react';
import { useDashboardPrefetch, useIntelligentPrefetch } from '../../hooks/usePrefetch';
import RoleBasedDashboard from '../../features/rbac/RoleBasedDashboard';

export default function Dashboard() {
  useDashboardPrefetch();
  useIntelligentPrefetch();

  return <RoleBasedDashboard />;
}
