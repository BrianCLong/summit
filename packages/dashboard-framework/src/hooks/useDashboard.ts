import { useCallback, useEffect } from 'react';
import { useDashboardStore } from '../store';
import { Dashboard, DashboardPage, Widget } from '../types';

export function useDashboard(dashboardId?: string) {
  const store = useDashboardStore();

  useEffect(() => {
    if (dashboardId) {
      store.setActiveDashboard(dashboardId);
    }
  }, [dashboardId, store]);

  return {
    dashboard: store.getActiveDashboard(),
    activePage: store.getActivePage(),
    editMode: store.editMode,
    ...store,
  };
}

export function useDashboardActions() {
  const store = useDashboardStore();

  return {
    createDashboard: store.createDashboard,
    updateDashboard: store.updateDashboard,
    deleteDashboard: store.deleteDashboard,
    duplicateDashboard: store.duplicateDashboard,
    setActiveDashboard: store.setActiveDashboard,
    setEditMode: store.setEditMode,
  };
}

export function usePageActions() {
  const store = useDashboardStore();

  return {
    createPage: store.createPage,
    updatePage: store.updatePage,
    deletePage: store.deletePage,
    setActivePage: store.setActivePage,
    reorderPages: store.reorderPages,
  };
}
