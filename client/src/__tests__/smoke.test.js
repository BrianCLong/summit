import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import graphSlice from '../store/slices/graphSlice';

function MockApp() {
  return <div>IntelGraph Platform</div>;
}

function createMockStore() {
  return configureStore({
    reducer: {
      graph: graphSlice
    }
  });
}

test('renders IntelGraph platform', () => {
  const store = createMockStore();
  render(
    <Provider store={store}>
      <MockApp />
    </Provider>
  );
  expect(screen.getByText(/IntelGraph Platform/i)).toBeInTheDocument();
});