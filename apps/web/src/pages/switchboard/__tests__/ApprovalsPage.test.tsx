import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApprovalsPage } from '../ApprovalsPage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock fetch
global.fetch = vi.fn();

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolve
    render(
      <BrowserRouter>
        <ApprovalsPage />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading approvals...')).toBeInTheDocument();
  });

  it('renders approvals list', async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ([
        {
          id: '1',
          requester_id: 'user1',
          status: 'pending',
          action: 'test_action',
          created_at: new Date().toISOString(),
          reason: 'test reason'
        }
      ])
    });

    render(
      <BrowserRouter>
        <ApprovalsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Approvals Queue')).toBeInTheDocument();
      expect(screen.getByText('test_action')).toBeInTheDocument();
    });
  });
});
