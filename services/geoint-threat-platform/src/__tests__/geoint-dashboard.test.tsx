import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GEOINTDashboard } from '../ui/GEOINTDashboard.js';

const buildResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
});

describe('GEOINTDashboard clustering and pagination', () => {
  const threatDataResponse = {
    threatActors: [],
    iocs: [
      {
        id: 'ioc-1',
        type: 'IP',
        value: '10.0.0.1',
        severity: 'HIGH',
        confidence: 70,
        geolocation: { latitude: 1, longitude: 1 },
      },
    ],
    heatmap: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (typeof vi.unstubAllGlobals === 'function') {
      vi.unstubAllGlobals();
    }
    vi.clearAllMocks();
  });

  it('shows clustering toggle and expands clusters on zoom', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(buildResponse(threatDataResponse))
      .mockResolvedValueOnce(
        buildResponse({
          points: [
            { id: 'a', latitude: 1, longitude: 1, type: 'THREAT_ACTOR', name: 'Alpha' },
            { id: 'b', latitude: 1.05, longitude: 1.05, type: 'THREAT_ACTOR', name: 'Bravo' },
          ],
        })
      );

    vi.stubGlobal('fetch', fetchMock as any);

    render(<GEOINTDashboard initialBounds={{ minLon: -1, minLat: -1, maxLon: 2, maxLat: 2 }} />);

    expect(await screen.findByLabelText('clustering-controls')).toBeInTheDocument();
    expect(await screen.findByText(/Cluster of 2 points/)).toBeInTheDocument();

    const zoomSlider = screen.getByRole('slider', { name: /zoom level/i });
    fireEvent.change(zoomSlider, { target: { value: '10' } });

    await waitFor(() => {
      expect(screen.queryByText(/Cluster of 2 points/)).not.toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Bravo')).toBeInTheDocument();
    });
  });

  it('paginates rendered points without affecting non-map tabs', async () => {
    const manyPoints = Array.from({ length: 12 }, (_, idx) => ({
      id: `point-${idx + 1}`,
      latitude: 10 + idx,
      longitude: -70 - idx,
      type: 'THREAT_ACTOR',
      name: `Point ${idx + 1}`,
    }));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(buildResponse(threatDataResponse))
      .mockResolvedValueOnce(buildResponse({ points: manyPoints }));

    vi.stubGlobal('fetch', fetchMock as any);

    render(<GEOINTDashboard initialBounds={{ minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 }} />);

    expect(await screen.findByLabelText('rendered-points')).toBeInTheDocument();

    const zoomSlider = screen.getByRole('slider', { name: /zoom level/i });
    fireEvent.change(zoomSlider, { target: { value: '10' } });

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });

    const firstPageEntries = manyPoints.slice(0, 10);
    firstPageEntries.forEach((point) => {
      expect(screen.getByText(point.name)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Point 11')).toBeInTheDocument();
      expect(screen.getByText('Point 12')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iocs/i }));
    await waitFor(() => {
      expect(screen.getByText(/10.0.0.1/)).toBeInTheDocument();
    });
  });
});
