import { expect, jest, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { store, selectNode } from './store';

jest.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useSubscription: () => ({ data: undefined, error: undefined }),
  ApolloProvider: ({ children }: { children: ReactNode }) => children,
  HttpLink: class {},
  InMemoryCache: class {},
  split: () => ({}),
  ApolloClient: class {
    constructor() {
      return {};
    }
  },
}));

jest.mock('@apollo/client/testing', () => ({
  MockedProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('graphql-ws', () => ({
  createClient: () => ({}),
}));

jest.mock('@apollo/client/link/subscriptions', () => ({
  GraphQLWsLink: class {},
}));

jest.mock('@apollo/client/utilities', () => ({
  getMainDefinition: () => ({
    kind: 'OperationDefinition',
    operation: 'subscription',
  }),
}));

jest.mock('cytoscape', () => () => ({
  on: () => {},
  container: () => document.createElement('div'),
}));

jest.mock('vis-timeline/standalone', () => ({
  DataSet: class {
    add() {}
  },
  Timeline: class {
    on() {}
    getWindow() {
      return { start: new Date(), end: new Date() };
    }
    setSelection() {}
    dom = { center: document.createElement('div') };
  },
}));

jest.mock('mapbox-gl', () => ({
  Map: class {
    flyTo() {}
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
}));

test('renders panes', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  expect(screen.getByLabelText('toggle theme')).toBeTruthy();
});

test('selection updates store', () => {
  store.dispatch(selectNode('a'));
  expect(store.getState().selection.selectedNodeId).toBe('a');
});
