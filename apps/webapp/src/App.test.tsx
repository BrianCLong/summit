import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { App } from './App';
import { store, selectNode } from './store';
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

test('renders panes', () => {
  render(<App />);
  expect(screen.getByLabelText('toggle theme')).toBeInTheDocument();
});

test('selection updates store', () => {
  store.dispatch(selectNode('a'));
  expect(store.getState().selection.selectedNodeId).toBe('a');
});
