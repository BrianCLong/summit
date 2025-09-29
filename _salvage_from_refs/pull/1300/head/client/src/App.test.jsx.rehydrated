import React from 'react';
import { render, screen } from '@testing-library/react';
import TestApp from './App.test-simple.jsx';

test('renders IntelGraph test app content', () => {
  render(<TestApp />);
  expect(screen.getByText(/IntelGraph Platform/i)).toBeInTheDocument();
});
