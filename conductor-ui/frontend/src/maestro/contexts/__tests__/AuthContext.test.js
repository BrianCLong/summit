import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
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
const TestComponent = () => {
  const auth = useAuth();
  return _jsxs('div', {
    children: [
      _jsx('span', {
        'data-testid': 'isAuthenticated',
        children: auth.isAuthenticated ? 'true' : 'false',
      }),
      _jsx('span', {
        'data-testid': 'loading',
        children: auth.loading ? 'true' : 'false',
      }),
      _jsx('span', { 'data-testid': 'user-email', children: auth.user?.email }),
      _jsx('span', {
        'data-testid': 'user-tenant',
        children: auth.user?.tenant,
      }),
      _jsx('span', {
        'data-testid': 'access-token',
        children: auth.accessToken,
      }),
      _jsx('span', { 'data-testid': 'id-token', children: auth.idToken }),
      _jsx('span', { 'data-testid': 'expires-at', children: auth.expiresAt }),
      _jsx('button', { onClick: () => auth.login('auth0'), children: 'Login' }),
      _jsx('button', { onClick: auth.logout, children: 'Logout' }),
      _jsx('button', { onClick: auth.refreshToken, children: 'Refresh Token' }),
      _jsx('button', {
        onClick: () => auth.switchTenant('tenantB'),
        children: 'Switch Tenant',
      }),
      _jsx('span', {
        'data-testid': 'has-viewer-role',
        children: auth.hasRole('viewer') ? 'true' : 'false',
      }),
      _jsx('span', {
        'data-testid': 'has-admin-role',
        children: auth.hasRole('admin') ? 'true' : 'false',
      }),
      _jsx('span', {
        'data-testid': 'has-tenantA-access',
        children: auth.hasTenantAccess('tenantA') ? 'true' : 'false',
      }),
      _jsx('span', {
        'data-testid': 'has-tenantC-access',
        children: auth.hasTenantAccess('tenantC') ? 'true' : 'false',
      }),
    ],
  });
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
    render(_jsx(AuthProvider, { children: _jsx(TestComponent, {}) }));
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
      _jsx(AuthProvider, { children: _jsx(TestComponent, {}) }),
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
    render(_jsx(AuthProvider, { children: _jsx(TestComponent, {}) }));
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('has-viewer-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('false');
  });
  it('should correctly check tenant access with hasTenantAccess', async () => {
    render(_jsx(AuthProvider, { children: _jsx(TestComponent, {}) }));
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('has-tenantA-access')).toHaveTextContent('true');
    expect(screen.getByTestId('has-tenantC-access')).toHaveTextContent('false');
  });
  it('should schedule and perform token refresh before expiry', async () => {
    const { getByTestId } = render(
      _jsx(AuthProvider, { children: _jsx(TestComponent, {}) }),
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
      _jsx(AuthProvider, { children: _jsx(TestComponent, {}) }),
    );
    await waitFor(() => {
      expect(getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
    // Mock refreshTokenApi to throw an error
    refreshTokenApi.mockImplementationOnce(() =>
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
      _jsx(AuthProvider, { children: _jsx(TestComponent, {}) }),
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
      _jsx(AuthProvider, { children: _jsx(TestComponent, {}) }),
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
      _jsx(AuthProvider, { children: _jsx(TestComponent, {}) }),
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
