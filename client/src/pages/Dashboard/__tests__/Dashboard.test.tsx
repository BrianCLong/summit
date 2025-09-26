import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MockedProvider } from '@apollo/client/testing';
import store from '../../../store/index';
import Dashboard from '../index';
import { ToastProvider } from '../../../components/ToastContainer';

function renderDashboard() {
  return render(
    <MockedProvider mocks={[]} addTypename={false}>
      <ToastProvider>
        <Provider store={store}>
          <Dashboard />
        </Provider>
      </ToastProvider>
    </MockedProvider>,
  );
}

test('renders dashboard skeletons then content', async () => {
  renderDashboard();
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('opens feedback dialog from dashboard button', async () => {
  renderDashboard();

  const trigger = screen.getByRole('button', { name: /share feedback/i });
  fireEvent.click(trigger);

  expect(screen.getByRole('dialog', { name: /share product feedback/i })).toBeInTheDocument();
  expect(screen.getByTestId('feedback-title')).toBeInTheDocument();
});
