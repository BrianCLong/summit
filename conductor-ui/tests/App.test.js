import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('renders Maestro Conductor header', () => {
  render(<App />);
  const linkElement = screen.getByText(/Maestro Conductor/i);
  expect(linkElement).toBeInTheDocument();
});
