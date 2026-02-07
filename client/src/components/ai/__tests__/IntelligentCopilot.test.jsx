import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IntelligentCopilot from '../IntelligentCopilot';

// Mock child components
jest.mock('../AdvancedPatternDetection', () => () => <div data-testid="advanced-pattern-detection" />);

describe('IntelligentCopilot Security', () => {
  test('sanitizes user input to prevent XSS', async () => {
    render(<IntelligentCopilot />);

    const input = screen.getByPlaceholderText(/Ask me about patterns/i);
    const maliciousPayload = 'Reflected XSS <img src=x onerror=alert(1)>';

    fireEvent.change(input, { target: { value: maliciousPayload } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13, code: 'Enter' });

    // Wait for the message to appear
    await waitFor(() => {
      expect(screen.getByText(/Reflected XSS/i)).toBeInTheDocument();
    });

    const messageBubble = screen.getByText(/Reflected XSS/i);

    // Check if the output is sanitized
    // Before fix: input is raw, so it contains onerror
    // After fix: dompurify removes onerror
    expect(messageBubble.innerHTML).not.toContain('onerror');
    expect(messageBubble.innerHTML).not.toContain('alert(1)');
  });
});
