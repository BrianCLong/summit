import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { vi } from 'vitest';

vi.mock('cytoscape', () => ({
  default: () => ({
    on: () => {},
    container: () => document.createElement('div'),
    remove: () => {},
  }),
}));

vi.mock('vis-timeline/standalone', () => ({
  DataSet: class {
    add() {}
  },
  Timeline: class {
    on() {}
    getWindow() {
      return { start: new Date(), end: new Date() };
    }
    setSelection() {}
    destroy() {}
    dom = { center: document.createElement('div') };
  },
}));

vi.mock('mapbox-gl', () => ({
  default: {
    Map: class {
      flyTo() {}
      remove() {}
    },
    Marker: class {
      setLngLat() {
        return this;
      }
      addTo() {
        return this;
      }
    },
    accessToken: '',
  },
}));

test('theme toggle has tooltip', async () => {
  render(<App />);
  const toggleBtn = screen.getByLabelText('toggle theme');

  // Hover to show tooltip
  fireEvent.mouseOver(toggleBtn);

  // Default is light mode, so tooltip should say "Switch to dark mode"
  await waitFor(() => {
    expect(screen.getByText('Switch to dark mode')).toBeInTheDocument();
  });

  // Click to toggle
  fireEvent.click(toggleBtn);

  // Hover again
  fireEvent.mouseOut(toggleBtn);
  fireEvent.mouseOver(toggleBtn);

  // Now in dark mode, tooltip should say "Switch to light mode"
  await waitFor(() => {
    expect(screen.getByText('Switch to light mode')).toBeInTheDocument();
  });
});
