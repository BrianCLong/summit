import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { Provider } from 'react-redux';
import store from '../../../store/index';
import Dashboard from '../index';

test('renders dashboard skeletons then content', async () => {
  render(
    <MockedProvider>
      <Provider store={store}>
        <Dashboard />
      </Provider>
    </MockedProvider>,
  );
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
});
