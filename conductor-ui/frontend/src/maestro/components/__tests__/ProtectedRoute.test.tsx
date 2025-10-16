import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock AuthLogin component as it's a dependency
jest.mock('../../pages/AuthLogin', () => () => <div>AuthLogin Component</div>);

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const TestPage = () => <div>Protected Content</div>;
const Fallback403 = () => <div>403 Forbidden</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Reset mock before each test
    mockUseAuth.mockReset();
  });

  it('renders loading state when authentication is in progress', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
      accessToken: undefined,
      idToken: undefined,
      expiresAt: undefined,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn(),
      hasTenantAccess: jest.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders AuthLogin when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      accessToken: undefined,
      idToken: undefined,
      expiresAt: undefined,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn(),
      hasTenantAccess: jest.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('AuthLogin Component')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when authenticated and no roles/tenant required', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: [],
        tenant: 'default',
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn(() => true),
      hasTenantAccess: jest.fn(() => true),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('AuthLogin Component')).not.toBeInTheDocument();
  });

  it('renders 403 for role-denied access', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['viewer'],
        tenant: 'default',
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn((role: string) => role === 'viewer'), // User only has 'viewer' role
      hasTenantAccess: jest.fn(() => true),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute roles={['admin']}>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText(
        /You don't have the required role\(s\) to access this resource./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders fallback component for role-denied access if provided', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['viewer'],
        tenant: 'default',
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn((role: string) => role === 'viewer'),
      hasTenantAccess: jest.fn(() => true),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute roles={['admin']} fallback={Fallback403}>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  it('renders 403 for tenant-denied access', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['viewer'],
        tenant: 'tenantA',
        tenants: ['tenantA'],
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn(() => true),
      hasTenantAccess: jest.fn((t: string) => t === 'tenantA'), // User only has access to tenantA
    });

    render(
      <BrowserRouter>
        <ProtectedRoute tenant="tenantB">
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('Tenant Access Required')).toBeInTheDocument();
    expect(
      screen.getByText(/You don't have access to tenant/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders fallback component for tenant-denied access if provided', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['viewer'],
        tenant: 'tenantA',
        tenants: ['tenantA'],
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn(() => true),
      hasTenantAccess: jest.fn((t: string) => t === 'tenantA'),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute tenant="tenantB" fallback={Fallback403}>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(
      screen.queryByText('Tenant Access Required'),
    ).not.toBeInTheDocument();
  });

  it('renders protected content when authenticated and authorized by role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['admin'],
        tenant: 'default',
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn((role: string) => role === 'admin'),
      hasTenantAccess: jest.fn(() => true),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute roles={['admin']}>
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders protected content when authenticated and authorized by tenant', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        roles: ['viewer'],
        tenant: 'tenantB',
        tenants: ['tenantA', 'tenantB'],
      },
      isAuthenticated: true,
      loading: false,
      accessToken: 'abc',
      idToken: 'def',
      expiresAt: Date.now() + 100000,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      switchTenant: jest.fn(),
      hasRole: jest.fn(() => true),
      hasTenantAccess: jest.fn((t: string) => t === 'tenantB'),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute tenant="tenantB">
          <TestPage />
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
