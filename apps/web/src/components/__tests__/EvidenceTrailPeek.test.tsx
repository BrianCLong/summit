import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EvidenceTrailPeek } from '../EvidenceTrailPeek';

describe('EvidenceTrailPeek', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/evidence-index')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                evidence_id: 'ev-1',
                title: 'Provenance receipt',
                url: 'https://example.test/ev-1',
                ts: '2026-02-01T00:00:00.000Z',
                weight: 0.8,
                badges: [
                  {
                    kind: 'Provenance',
                    href: '/api/evidence/ev-1/badges.json',
                  },
                ],
              },
            ],
          }),
        });
      }

      if (url.includes('/api/evidence-top')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                evidence_id: 'ev-1',
                title: 'Top artifact',
                url: 'https://example.test/ev-1',
                ts: '2026-02-01T00:00:00.000Z',
                weight: 0.9,
                badges: [],
              },
            ],
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          claims: [
            {
              claim_id: 'claim-1',
              text: 'First claim',
              verifiability: 0.99,
              supporting: ['ev-1'],
              delta: 0.3,
            },
            {
              claim_id: 'claim-2',
              text: 'Second claim',
              verifiability: 0.8,
              supporting: ['ev-1'],
              delta: 0.2,
            },
            {
              claim_id: 'claim-3',
              text: 'Third claim',
              verifiability: 0.7,
              supporting: ['ev-1'],
              delta: 0.1,
            },
            {
              claim_id: 'claim-4',
              text: 'Fourth claim',
              verifiability: 0.6,
              supporting: ['ev-1'],
              delta: 0.05,
            },
          ],
        }),
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads evidence sources and only shows top 3 claims', async () => {
    render(<EvidenceTrailPeek answerId="answer-1" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    expect(await screen.findByText('First claim')).toBeInTheDocument();
    expect(screen.getByText('Second claim')).toBeInTheDocument();
    expect(screen.getByText('Third claim')).toBeInTheDocument();
    expect(screen.queryByText('Fourth claim')).not.toBeInTheDocument();
  });

  it('toggles minimized mode from header action', async () => {
    render(<EvidenceTrailPeek answerId="answer-2" />);

    await screen.findByText('First claim');

    const toggle = screen.getByRole('button', {
      name: 'Answer-Surface Minimizer',
    });

    await userEvent.click(toggle);

    expect(screen.queryByText('Provenance timeline')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Expand',
      }),
    ).toBeInTheDocument();
  });
});
