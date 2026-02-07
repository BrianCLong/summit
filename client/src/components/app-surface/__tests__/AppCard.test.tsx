import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppCard from '../AppCard';

describe('AppCard', () => {
  it('renders title and summary', () => {
    render(
      <AppCard title="Test Card" summary="A test summary" status="idle" />
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('A test summary')).toBeInTheDocument();
  });

  it('shows status pill with correct label', () => {
    render(
      <AppCard title="Card" summary="Summary" status="success" />
    );

    const chip = screen.getByTestId('app-card-status');
    expect(chip).toHaveTextContent('Allowed');
  });

  it('shows denied status', () => {
    render(
      <AppCard title="Card" summary="Summary" status="denied" />
    );

    const chip = screen.getByTestId('app-card-status');
    expect(chip).toHaveTextContent('Denied');
  });

  it('renders children content', () => {
    render(
      <AppCard title="Card" summary="Summary" status="idle">
        <div data-testid="child">Child content</div>
      </AppCard>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('expands details on toggle click', () => {
    render(
      <AppCard
        title="Card"
        summary="Summary"
        status="success"
        detailsContent={<div data-testid="details">Detail info</div>}
      />
    );

    // Details should not be visible initially (collapsed)
    const toggle = screen.getByTestId('app-card-toggle');
    fireEvent.click(toggle);

    // After click, details should be visible
    expect(screen.getByTestId('details')).toBeInTheDocument();
  });

  it('shows download button when evidence is present', () => {
    const evidence = { id: 'test-id', verdict: 'ALLOW' };

    render(
      <AppCard
        title="Card"
        summary="Summary"
        status="success"
        evidenceJson={evidence}
        evidenceId="test-id"
      />
    );

    expect(screen.getByTestId('app-card-download')).toBeInTheDocument();
  });

  it('does not show download button when no evidence', () => {
    render(
      <AppCard title="Card" summary="Summary" status="idle" />
    );

    expect(screen.queryByTestId('app-card-download')).not.toBeInTheDocument();
  });

  it('shows error status pill', () => {
    render(
      <AppCard title="Card" summary="Summary" status="error" />
    );

    const chip = screen.getByTestId('app-card-status');
    expect(chip).toHaveTextContent('Error');
  });

  it('shows pending status pill', () => {
    render(
      <AppCard title="Card" summary="Summary" status="pending" />
    );

    const chip = screen.getByTestId('app-card-status');
    expect(chip).toHaveTextContent('Running...');
  });
});
