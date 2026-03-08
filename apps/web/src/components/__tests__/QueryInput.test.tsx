import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { QueryInput } from '../QueryInput';
import { vi, describe, beforeEach, test, expect } from 'vitest';

describe('QueryInput', () => {
  const onPreview = vi.fn();

  beforeEach(() => {
    onPreview.mockClear();
  });

  test('renders input and button', () => {
    render(<QueryInput onPreview={onPreview} />);
    expect(screen.getByLabelText(/Natural Language Query/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Cypher/i })).toBeInTheDocument();
  });

  test('input change updates value', () => {
    render(<QueryInput onPreview={onPreview} />);
    const input = screen.getByLabelText(/Natural Language Query/i);
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(input).toHaveValue('test query');
  });

  test('button is disabled when input is empty', () => {
    render(<QueryInput onPreview={onPreview} />);
    const button = screen.getByRole('button', { name: /Generate Cypher/i });
    expect(button).toBeDisabled();
  });

  test('calls onPreview when button is clicked', () => {
    render(<QueryInput onPreview={onPreview} />);
    const input = screen.getByLabelText(/Natural Language Query/i);
    const button = screen.getByRole('button', { name: /Generate Cypher/i });

    fireEvent.change(input, { target: { value: 'test query' } });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onPreview).toHaveBeenCalledWith('test query');
  });

  test('calls onPreview on Ctrl+Enter', () => {
    render(<QueryInput onPreview={onPreview} />);
    const input = screen.getByLabelText(/Natural Language Query/i);

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });

    expect(onPreview).toHaveBeenCalledWith('test query');
  });

  test('calls onPreview on Cmd+Enter', () => {
    render(<QueryInput onPreview={onPreview} />);
    const input = screen.getByLabelText(/Natural Language Query/i);

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });

    expect(onPreview).toHaveBeenCalledWith('test query');
  });

  test('shows loading state', () => {
    render(<QueryInput onPreview={onPreview} loading={true} />);
    const button = screen.getByRole('button', { name: /Generate Cypher/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
