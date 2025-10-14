import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MockedProvider } from '@apollo/client/testing';
import reducer from '../../../store/slices/graphInteractionSlice';
import GraphContextMenu from '../GraphContextMenu';

test('shows menu items when open', () => {
  const store = configureStore({ reducer: { graphInteraction: reducer }, preloadedState: {
    graphInteraction: {
      selectedNodeId: null, selectedEdgeId: null,
      contextMenu: { open: true, x: 100, y: 100, targetType: 'node', targetId: 'n1' },
      aiInsights: {}
    }
  }});

  render(
    <MockedProvider>
      <Provider store={store}>
        <GraphContextMenu />
      </Provider>
    </MockedProvider>
  );
  expect(screen.getByText(/Expand Neighbors/i)).toBeInTheDocument();
  expect(screen.getByText(/Tag Entity/i)).toBeInTheDocument();
  expect(screen.getByText(/Explore Subgraph/i)).toBeInTheDocument();
});

