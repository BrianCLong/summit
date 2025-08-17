import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import aiInsightsReducer from '../../../store/slices/aiInsightsSlice';
import graphReducer from '../../../store/slices/graphSlice';
import AIInsightsPanel from '../AIInsightsPanel';

function setup() {
  const store = configureStore({
    reducer: {
      aiInsights: aiInsightsReducer,
      graph: graphReducer
    }
  });
  render(
    <Provider store={store}>
      <AIInsightsPanel open={true} onClose={() => {}} />
    </Provider>
  );
  return store;
}

test('renders toggles and export buttons', () => {
  setup();
  expect(screen.getByLabelText(/Highlight Communities/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Metadata Popovers/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument();
});
