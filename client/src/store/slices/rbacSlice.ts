import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FeatureFlagState {
  key: string;
  enabled: boolean;
}

export interface RbacState {
  loading: boolean;
  error: string | null;
  userId: string | null;
  displayName: string | null;
  primaryRole: string | null;
  roles: string[];
  personas: string[];
  permissions: string[];
  featureFlags: Record<string, boolean>;
}

export interface RbacPayload {
  userId?: string | null;
  displayName?: string | null;
  primaryRole?: string | null;
  roles?: string[] | null;
  personas?: string[] | null;
  permissions?: string[] | null;
  featureFlags?: FeatureFlagState[] | null;
}

const initialState: RbacState = {
  loading: false,
  error: null,
  userId: null,
  displayName: null,
  primaryRole: null,
  roles: [],
  personas: [],
  permissions: [],
  featureFlags: {},
};

function normalizeFeatureFlags(flags: FeatureFlagState[] | null | undefined): Record<string, boolean> {
  if (!flags) {
    return {};
  }

  return flags.reduce<Record<string, boolean>>((acc, flag) => {
    if (flag?.key) {
      acc[flag.key] = Boolean(flag.enabled);
    }
    return acc;
  }, {});
}

const rbacSlice = createSlice({
  name: 'rbac',
  initialState,
  reducers: {
    rbacRequested(state) {
      state.loading = true;
      state.error = null;
    },
    rbacReceived(state, action: PayloadAction<RbacPayload>) {
      const { userId, displayName, primaryRole, roles, personas, permissions, featureFlags } = action.payload;
      state.loading = false;
      state.error = null;
      state.userId = userId ?? state.userId;
      state.displayName = displayName ?? state.displayName;
      state.primaryRole = primaryRole ?? state.primaryRole;
      state.roles = roles ?? state.roles;
      state.personas = personas ?? state.personas;
      state.permissions = permissions ?? state.permissions;
      state.featureFlags = {
        ...state.featureFlags,
        ...normalizeFeatureFlags(featureFlags),
      };
    },
    rbacFailed(state, action: PayloadAction<string | undefined>) {
      state.loading = false;
      state.error = action.payload ?? 'Unable to load RBAC context';
    },
    setFeatureFlag(state, action: PayloadAction<{ key: string; enabled: boolean }>) {
      state.featureFlags[action.payload.key] = action.payload.enabled;
    },
  },
});

export const { rbacRequested, rbacReceived, rbacFailed, setFeatureFlag } = rbacSlice.actions;
export default rbacSlice.reducer;
