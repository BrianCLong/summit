import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../components/Navigation';

// Mock NotificationSystem to avoid Apollo/ApolloProvider dependency
jest.mock('../components/NotificationSystem', () => ({ __esModule: true, default: () => null }));

jest.mock('../services/socket.js', () => {
  const listeners = {};
  return {
    getSocket: () => ({
      on: (evt, cb) => {
        listeners[evt] = cb;
      },
      off: (evt) => {
        delete listeners[evt];
      },
      __emit: (evt, payload) => {
        if (listeners[evt]) listeners[evt](payload);
      },
    }),
  };
});

test('increments alert badge on ALERT_EVT', async () => {
  const { getSocket } = require('../services/socket.js');
  render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>,
  );
  // emit event
  getSocket().__emit('ALERT_EVT', { count: 1 });
  // find badge
  const badge = await screen.findByText('1');
  expect(badge).toBeInTheDocument();
});
