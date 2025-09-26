import React, { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useQuery } from '@apollo/client';
import { useAppDispatch, useAppSelector } from '../../store';
import { GET_RBAC_CONTEXT } from '../../graphql/rbac.gql.js';
import { rbacFailed, rbacReceived, rbacRequested } from '../../store/slices/rbacSlice';
import AnalystDashboardView from './views/AnalystDashboardView';
import AdminDashboardView from './views/AdminDashboardView';
import MaestroConductorDashboardView from './views/MaestroConductorDashboardView';

function normalizePersonas(personas: Array<string | null | undefined> | null | undefined): string[] {
  if (!personas) {
    return [];
  }
  return personas.filter((persona): persona is string => Boolean(persona));
}

export const RoleBasedDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, primaryRole, roles, personas, permissions, featureFlags } = useAppSelector(
    (state) => state.rbac,
  );

  const { loading: queryLoading } = useQuery(GET_RBAC_CONTEXT, {
    onCompleted: (payload) => {
      const me = payload?.me ?? {};
      dispatch(
        rbacReceived({
          userId: me.id ?? null,
          displayName: me.displayName ?? null,
          primaryRole: me.primaryRole ?? me.role ?? null,
          roles: Array.isArray(me.roles) && me.roles.length > 0 ? me.roles : me.role ? [me.role] : [],
          personas: normalizePersonas(me.personas),
          permissions: Array.isArray(me.permissions) ? me.permissions : [],
          featureFlags: Array.isArray(me.featureFlags) ? me.featureFlags : [],
        }),
      );
    },
    onError: (apolloError) => {
      dispatch(rbacFailed(apolloError.message));
    },
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    if (queryLoading) {
      dispatch(rbacRequested());
    }
  }, [queryLoading, dispatch]);

  const activeRole = useMemo(() => {
    const normalizedPrimary = primaryRole?.toLowerCase();
    if (normalizedPrimary) {
      return normalizedPrimary;
    }
    const firstRole = roles.map((role) => role?.toLowerCase?.()).find(Boolean);
    return firstRole ?? null;
  }, [primaryRole, roles]);

  const personaKey = useMemo(() => {
    return personas
      .map((persona) => persona.toLowerCase())
      .find((persona) => persona.includes('maestro'))
      ? 'maestro-conductor'
      : null;
  }, [personas]);

  if (loading || queryLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="40vh">
        <CircularProgress role="status" aria-label="Loading dashboards" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error" data-testid="rbac-error">
          Failed to load RBAC context: {error}
        </Alert>
      </Box>
    );
  }

  if (personaKey === 'maestro-conductor') {
    return (
      <MaestroConductorDashboardView
        role={activeRole}
        permissions={permissions}
        featureFlags={featureFlags}
      />
    );
  }

  if (activeRole === 'admin') {
    return <AdminDashboardView />;
  }

  if (roles.some((role) => role?.toLowerCase?.() === 'admin')) {
    return <AdminDashboardView />;
  }

  return <AnalystDashboardView />;
};

export default RoleBasedDashboard;
