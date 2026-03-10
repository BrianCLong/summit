import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCaseLoading, setCaseSuccess, setCaseError } from '../store/workspaceSlice';
import { analystAdapter } from '../services/analystAdapter';
import EntityExplorer from './EntityExplorer';
import MainCanvas from './MainCanvas';
import DetailPanel from './DetailPanel';
import './AnalystWorkspace.css';

// ---------------------------------------------------------------------------
// Inner component — inside the Redux Provider
// ---------------------------------------------------------------------------
const DEFAULT_CASE_ID = 'case-001';

const WorkspaceInner: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loadingState, error } = useAppSelector((s) => s.workspace);

  useEffect(() => {
    dispatch(setCaseLoading());
    analystAdapter
      .getCase(DEFAULT_CASE_ID)
      .then((data) => dispatch(setCaseSuccess(data)))
      .catch((err: Error) =>
        dispatch(setCaseError(err.message ?? 'Unknown error')),
      );
  }, [dispatch]);

  return (
    <div className="analyst-workspace" data-testid="analyst-workspace">
      {/* Top navigation bar */}
      <header className="workspace-topbar" role="banner">
        <div className="workspace-topbar-left">
          <a href="/" className="workspace-home-link" aria-label="Summit home">
            <span className="workspace-logo">Summit</span>
          </a>
          <span className="workspace-breadcrumb" aria-label="Current section">
            / Analyst Workspace
          </span>
        </div>
        <div className="workspace-topbar-center">
          {loadingState === 'success' && (
            <span className="workspace-case-id" aria-label="Active case">
              Case: {DEFAULT_CASE_ID}
            </span>
          )}
          {loadingState === 'loading' && (
            <span className="workspace-loading-indicator" aria-live="polite">
              Loading…
            </span>
          )}
          {loadingState === 'error' && (
            <span
              className="workspace-error-indicator"
              role="alert"
              aria-live="assertive"
            >
              ⚠ {error}
            </span>
          )}
        </div>
        <div className="workspace-topbar-right">
          <span className="workspace-version">v4.2.3</span>
        </div>
      </header>

      {/* Three-pane layout */}
      <div className="workspace-body">
        <EntityExplorer />
        <MainCanvas />
        <DetailPanel />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Public export — wraps with Redux Provider so the workspace is self-contained
// ---------------------------------------------------------------------------
const AnalystWorkspace: React.FC = () => (
  <Provider store={store}>
    <WorkspaceInner />
  </Provider>
);

export default AnalystWorkspace;
