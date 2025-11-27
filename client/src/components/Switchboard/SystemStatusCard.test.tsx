import React from 'react';
import { render, screen } from '@testing-library/react';
import SystemStatusCard from './SystemStatusCard';
import { SystemStatus } from './types';

describe('SystemStatusCard', () => {
  const mockStatus: SystemStatus = {
    id: 'test',
    title: 'Test System',
    metric: '100%',
    desc: 'Test description',
    docsLink: '/docs/test',
    logsLink: '/logs/test',
    actions: [{ id: 'test-action', label: 'Test Action' }],
  };

  it('renders the system status card with all elements', () => {
    render(<SystemStatusCard status={mockStatus} />);

    expect(screen.getByText('Test System')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });
});
