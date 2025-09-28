import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders release checklist items', () => {
    render(<App />);
    expect(screen.getByText('Release Checklist')).toBeInTheDocument();
  });
});
