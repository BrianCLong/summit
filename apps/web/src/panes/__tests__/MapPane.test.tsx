import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { useWorkspaceStore, type Entity } from '../../store/workspaceStore';

const zoomHandlers: Array<{ zoomend?: () => void }> = [];
let currentZoom = 2;
const fitBounds = vi.fn();
const setView = vi.fn();

vi.mock('react-leaflet', () => {
  const React = require('react');
  return {
    MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
    CircleMarker: ({ children, ...props }: any) => (
      <div
        data-testid="circle-marker"
        data-cluster={props['data-cluster']}
        data-lat={props.center?.[0]}
        data-lng={props.center?.[1]}
      >
        {children}
      </div>
    ),
    useMap: () => ({
      fitBounds,
      setView,
      getZoom: () => currentZoom,
    }),
    useMapEvents: (handlers: any) => {
      zoomHandlers.push(handlers);
      return { getZoom: () => currentZoom, setView, on: vi.fn() };
    },
    __setZoom: (zoom: number) => {
      currentZoom = zoom;
      zoomHandlers.forEach((handler) => handler.zoomend && handler.zoomend());
    },
  };
});

const seedWorkspace = () => {
  const seededEntities: Entity[] = [
    {
      id: '1',
      type: 'Person',
      label: 'Alpha',
      lat: 40.7128,
      lng: -74.006,
      description: 'Entity near NYC',
    },
    {
      id: '2',
      type: 'Location',
      label: 'Beta',
      lat: 40.713,
      lng: -74.005,
      description: 'Close to Alpha',
    },
    {
      id: '3',
      type: 'Event',
      label: 'Gamma',
      lat: 40.71,
      lng: -74.02,
      description: 'Cluster mate',
    },
    {
      id: '4',
      type: 'Person',
      label: 'Delta',
      lat: 34.0522,
      lng: -118.2437,
      description: 'Los Angeles',
    },
  ];

  const { setGraphData, clearSelection } = useWorkspaceStore.getState();
  setGraphData(seededEntities, []);
  clearSelection();
};

const renderPane = async () => {
  const { MapPane } = await import('../MapPane');
  return render(<MapPane />);
};

describe('MapPane clustering controls', () => {
  beforeEach(() => {
    vi.resetModules();
    zoomHandlers.length = 0;
    currentZoom = 2;
    fitBounds.mockClear();
    setView.mockClear();
    seedWorkspace();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows clustering to be toggled on and off', async () => {
    vi.stubEnv('VITE_ENABLE_MAP_CLUSTERING', 'true');
    await renderPane();

    const markersWhenClustered = screen.getAllByTestId('circle-marker');
    expect(markersWhenClustered.length).toBe(2);

    const toggle = screen.getByTestId('clustering-toggle');
    await userEvent.click(toggle);

    const markersUnclustered = screen.getAllByTestId('circle-marker');
    expect(markersUnclustered.length).toBe(4);
  });

  it('expands clusters when zoom level increases', async () => {
    vi.stubEnv('VITE_ENABLE_MAP_CLUSTERING', 'true');
    await renderPane();

    const clusteredMarkers = screen.getAllByTestId('circle-marker');
    expect(clusteredMarkers.length).toBe(2);

    const leaflet = await import('react-leaflet');
    await act(async () => {
      leaflet.__setZoom(12);
    });

    const expandedMarkers = screen.getAllByTestId('circle-marker');
    expect(expandedMarkers.length).toBe(4);
  });

  it('hides clustering controls when the feature flag is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_MAP_CLUSTERING', 'false');
    await renderPane();

    expect(screen.queryByTestId('clustering-toggle')).toBeNull();
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers.length).toBe(4);
  });
});
