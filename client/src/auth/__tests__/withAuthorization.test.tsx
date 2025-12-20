// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { withAuthorization } from '../withAuthorization';

jest.mock('../../context/AuthContext.jsx', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = jest.requireMock('../../context/AuthContext.jsx');

describe('withAuthorization', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('renders wrapped component when authorization passes', () => {
    useAuth.mockReturnValue({
      user: { role: 'ANALYST', tenantId: 'tenant-a' },
      loading: false,
      claims: [{ action: 'graph:read', tenant: 'tenant-a' }],
      canAccess: (action: string, tenant: string) =>
        action === 'graph:read' && tenant === 'tenant-a',
      tenantId: 'tenant-a',
    });

    const Guarded = withAuthorization({ actions: ['graph:read'] })(() => (
      <div data-testid="allowed">content</div>
    ));

    render(<Guarded />);
    expect(screen.getByTestId('allowed')).toBeInTheDocument();
  });

  it('blocks rendering when user lacks required claim', () => {
    useAuth.mockReturnValue({
      user: { role: 'VIEWER', tenantId: 'tenant-b' },
      loading: false,
      claims: [{ action: 'graph:read', tenant: 'tenant-b' }],
      canAccess: () => false,
      tenantId: 'tenant-b',
    });

    const Guarded = withAuthorization({ actions: ['run:read'] })(() => (
      <div data-testid="forbidden">content</div>
    ));

    render(<Guarded />);
    expect(screen.getByTestId('auth-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('forbidden')).not.toBeInTheDocument();
  });
});
