import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API calls
jest.mock('../../api/auth', () => ({
  initiateLogin: jest.fn(() =>
    Promise.resolve({ authorizeUrl: 'http://mock-auth.com/authorize' }),
  ),
  exchangeCodeForTokens: jest.fn(() =>
    Promise.resolve({
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
      expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
      user: {
        id: 'test-user',
        email: 'test@example.com',
        roles: ['viewer', 'editor'],
        tenant: 'tenantA',
        tenants: ['tenantA', 'tenantB'],
      },
    }),
  ),
  logoutApi: jest.fn(() => Promise.resolve()),
  refreshTokenApi: jest.fn(() =>
    Promise.resolve({
      idToken: 'new-mock-id-token',
      accessToken: 'new-mock-access-token',
      expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
      user: {
        id: 'test-user',
        email: 'test@example.com',
        roles: ['viewer', 'editor'],
        tenant: 'tenantA',
        tenants: ['tenantA', 'tenantB'],
      },
    }),
  ),
  getUserInfo: jest.fn(() =>
    Promise.resolve({
      idToken: 'mock-id-token',
      accessToken: 'mock-access-token',
      expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
      user: {
        id: 'test-user',
        email: 'test@example.com',
        roles: ['viewer', 'editor'],
        tenant: 'tenantA',
        tenants: ['tenantA', 'tenantB'],
      },
    }),
  ),
}));

// Mock oidc utils
jest.mock('../../utils/oidc', () => ({
  generateCodeVerifier: jest.fn(() => Promise.resolve('mock-code-verifier')),
  generateCodeChallenge: jest.fn(() => Promise.resolve('mock-code-challenge')),
}));

const TestComponent: React.FC = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="isAuthenticated">
        {auth.isAuthenticated ? 'true' : 'false'}
      </span>
      <span data-testid="loading">{auth.loading ? 'true' : 'false'}</span>
      <span data-testid="user-email">{auth.user?.email}</span>
      <span data-testid="user-tenant">{auth.user?.tenant}</span>
      <span data-testid="access-token">{auth.accessToken}</span>
      <span data-testid="id-token">{auth.idToken}</span>
      <span data-testid="expires-at">{auth.expiresAt}</span>
      <button onClick={() => auth.login('auth0')}>Login</button>
      <button onClick={auth.logout}>Logout</button>
      <button onClick={auth.refreshToken}>Refresh Token</button>
      <button onClick={() => auth.switchTenant('tenantB')}>
        Switch Tenant
      </button>
      <span data-testid="has-viewer-role">
        {auth.hasRole('viewer') ? 'true' : 'false'}
      </span>
      <span data-testid="has-admin-role">
        {auth.hasRole('admin') ? 'true' : 'false'}
      </span>
      <span data-testid="has-tenantA-access">
        {auth.hasTenantAccess('tenantA') ? 'true' : 'false'}
      </span>
      <span data-testid="has-tenantC-access">
        {auth.hasTenantAccess('tenantC') ? 'true' : 'false'}
      </span>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Mock window.location.href for logout redirect
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should provide initial loading state and then authenticate', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        'test@example.com',
      );
      expect(screen.getByTestId('access-token')).toHaveTextContent(
        'mock-access-token',
      );
    });
  });

  it('should handle logout correctly', async () => {
    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('true')).toBeInTheDocument(); // isAuthenticated
    });

    act(() => {
      userEvent.click(getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('');
      expect(window.location.href).toBe('/');
    });
  });

  it('should correctly check user roles with hasRole', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('has-viewer-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('false');
  });

  it('should correctly check tenant access with hasTenantAccess', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('has-tenantA-access')).toHaveTextContent('true');
    expect(screen.getByTestId('has-tenantC-access')).toHaveTextContent('false');
  });

  it('should schedule and perform token refresh before expiry', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    const initialAccessToken = getByTestId('access-token').textContent;
    const initialExpiresAt = parseInt(
      getByTestId('expires-at').textContent || '0',
    );

    // Advance timers to just before refresh (expiresAt - 60s - jitter)
    const timeToAdvance = initialExpiresAt - Date.now() - 60 * 1000 - 1000; // Subtracting 1s for jitter buffer
    act(() => {
      jest.advanceTimersByTime(timeToAdvance);
    });

    await waitFor(
      () => {
        expect(getByTestId('access-token')).not.toHaveTextContent(
          initialAccessToken,
        );
        expect(getByTestId('id-token')).not.toHaveTextContent('mock-id-token');
      },
      { timeout: 5000 },
    ); // Increased timeout for async operations

    expect(refreshTokenApi).toHaveBeenCalledTimes(1);
  });

  it('should logout if refresh token fails (e.g., 401)', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    // Mock refreshTokenApi to throw an error
    (refreshTokenApi as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Invalid refresh token')),
    );

    act(() => {
      userEvent.click(getByTestId('Refresh Token')); // Manually trigger refresh for testing failure path
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(window.location.href).toBe('/');
    });
    expect(logoutApi).toHaveBeenCalledTimes(1);
  });

  it('should logout after idle timeout', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    // Advance timers past 15 minutes idle timeout
    act(() => {
      jest.advanceTimersByTime(15 * 60 * 1000 + 1000); // 15 minutes + 1 second
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(window.location.href).toBe('/');
    });
    expect(logoutApi).toHaveBeenCalledTimes(1);
  });

  it('should reset idle timer on user activity', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    // Advance time almost to timeout
    act(() => {
      jest.advanceTimersByTime(14 * 60 * 1000); // 14 minutes
    });

    // Simulate user activity
    act(() => {
      userEvent.click(document.body); // Simulate a click anywhere on the document
    });

    // Advance time past original timeout, but within new timeout
    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000); // Another 2 minutes (total 16 minutes)
    });

    // Should still be authenticated because timer was reset
    expect(getByTestId('isAuthenticated')).toHaveTextContent('true');

    // Advance past the new timeout
    act(() => {
      jest.advanceTimersByTime(15 * 60 * 1000); // Another 15 minutes
    });

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
    expect(logoutApi).toHaveBeenCalledTimes(1);
  });

  it('should handle tenant switching', async () => {
    const { getByTestId, getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(getByTestId('user-tenant')).toHaveTextContent('tenantA');
    });

    act(() => {
      userEvent.click(getByText('Switch Tenant'));
    });

    await waitFor(() => {
      expect(getByTestId('user-tenant')).toHaveTextContent('tenantB');
    });
  });
});
