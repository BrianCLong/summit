import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';
import '@testing-library/jest-dom';

describe('LoadingSpinner', () => {
  it('renders with correct accessibility attributes', () => {
    render(<LoadingSpinner />);
    const spinnerContainer = screen.getByRole('status');
    expect(spinnerContainer).toBeInTheDocument();
    expect(spinnerContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the message', () => {
    render(<LoadingSpinner message="Custom Loading..." />);
    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
  });
});
