import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import '@testing-library/jest-dom';

// Mock component that throws
const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Explosion');
  }
  return <div>Safe Component</div>;
};

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Reload Page/i)).toBeInTheDocument();
    expect(screen.getByText(/Go Home/i)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });
});
