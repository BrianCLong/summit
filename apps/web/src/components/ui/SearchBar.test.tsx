import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import React, { useState } from 'react';

// Use fake timers
vi.useFakeTimers();

describe('SearchBar', () => {
  it('renders correctly', () => {
    render(<SearchBar placeholder="Test Search" />);
    expect(screen.getByPlaceholderText('Test Search')).toBeInTheDocument();
  });

  it('debounces onChange calls', () => {
    const handleChange = vi.fn();
    render(<SearchBar onChange={handleChange} debounceTime={300} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not be called immediately
    expect(handleChange).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(handleChange).toHaveBeenCalledWith('test');
  });

  it('updates display value immediately', () => {
    render(<SearchBar />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    expect(input.value).toBe('test');
  });

  it('works correctly as a controlled component', () => {
    const TestComponent = () => {
      const [val, setVal] = useState('initial');
      return <SearchBar value={val} onChange={setVal} debounceTime={300} />;
    };

    render(<TestComponent />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    expect(input.value).toBe('initial');

    // User types ' updated'
    fireEvent.change(input, { target: { value: 'initial updated' } });

    // Input should reflect change immediately (optimistic UI)
    expect(input.value).toBe('initial updated');

    // Parent state should NOT have updated yet
    // (We can't easily check parent state directly, but we can check if a re-render reset it if we were mocking,
    // but here we rely on the component behavior)

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now parent update should have happened.
    // Since parent passes 'initial updated' back, and it matches internalValue, no glitch should occur.
    expect(input.value).toBe('initial updated');
  });

  it('clears value immediately when clear button is clicked', () => {
    const handleChange = vi.fn();
    render(<SearchBar onChange={handleChange} value="initial" />);

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('resets timer on consecutive keystrokes', () => {
    const handleChange = vi.fn();
    render(<SearchBar onChange={handleChange} debounceTime={300} />);

    const input = screen.getByRole('textbox');

    // Type 'a'
    fireEvent.change(input, { target: { value: 'a' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(handleChange).not.toHaveBeenCalled();

    // Type 'b' (total 'ab') before timeout
    fireEvent.change(input, { target: { value: 'ab' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Total 400ms since 'a', but only 200ms since 'b'. Should not have called yet.
    expect(handleChange).not.toHaveBeenCalled();

    // Wait remaining 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(handleChange).toHaveBeenCalledWith('ab');
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
