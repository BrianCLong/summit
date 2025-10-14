import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import reducer from '../../../store/slices/graphInteractionSlice';
import AIInsightsPanel from '../AIInsightsPanel';

function makeStore(preloadedState) {
  return configureStore({ reducer: { graphInteraction: reducer }, preloadedState });
}

test('renders placeholder when nothing selected', () => {
  const store = makeStore();
  render(
    <Provider store={store}>
      <AIInsightsPanel open={true} onClose={() => {}} />
    </Provider>
  );
  expect(screen.getByText(/Select a node or edge/i)).toBeInTheDocument();
});

