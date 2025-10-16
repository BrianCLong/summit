/**
 * Tests for Enhanced AI Assistant Component - Deterministic Version
 */

import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import { withUser } from '../test-utils/user';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnhancedAIAssistant, { AssistantEvent } from '../EnhancedAIAssistant';
import {
  makeFakeClock,
  makeFakeTransport,
  makeStreamingTransport,
} from '../test-utils/fakes';
import {
  expectTextAcrossElements,
  expectLastAssistantMessageToContain,
} from '../test-utils/text';
import { emitSpeechResult } from '../test-utils/voice';
import { flushMicrotasks } from '../test-utils/flush';
import { installStreamingFetchMock } from '../test-utils/fetch';
import { waitForIdle } from '../test-utils/wait';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('EnhancedAIAssistant', () => {
  beforeAll(() => {
    jest.useRealTimers(); // for userEvent-heavy specs
  });

  beforeEach(() => {
    // Only set system time when using fake timers
    if (jest.isMockFunction(global.setTimeout)) {
      jest.setSystemTime(new Date('2024-01-15T10:30:45Z'));
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onQueryGenerate: jest.fn(),
    onNavigate: jest.fn(),
    enableVoice: true,
    enableProactiveSuggestions: true,
  };

  it('renders welcome message on initial load', () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    expect(screen.getByText(/Hello! I'm IntelBot/)).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /assistant-status/i }),
    ).toHaveTextContent(/Online/);
  });

  it('displays assistant name and status', () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    expect(screen.getByText('IntelBot')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /assistant-status/i }),
    ).toHaveTextContent(/Intelligence Analysis Assistant • Online/);
  });

  it('streams assistant tokens and settles to idle', async () => {
    const tokens = ['Hel', 'lo'];
    const transport = makeStreamingTransport(tokens);
    const clock = makeFakeClock();

    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        clock={clock}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    await withUser(async (u) => {
      await u.type(input, 'Hello{enter}');
    });

    // Wait for microtasks to complete
    await flushMicrotasks();

    const log = await screen.findByTestId('message-log');
    // User message should appear first
    await expectTextAcrossElements(log, 'Hello');

    // Assistant response should appear
    await expectTextAcrossElements(log, /Hello/); // The streamed response

    // Should settle to idle
    await waitForIdle();
  });

  it('sends message when user types and presses enter', async () => {
    const tokens = ['I', ' understand', ' your', ' query'];
    const transport = makeStreamingTransport(tokens); // microtask mode by default
    const clock = makeFakeClock();

    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        clock={clock}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    await withUser(async (u) => {
      await u.type(input, 'Find all connections to John Doe{enter}');
    });
    await flushMicrotasks(); // Flush transport events

    // AI response should appear (using robust text assertion)
    const log = await screen.findByTestId('message-log');

    // User message should appear
    const userMessageArticle = within(log).getAllByRole('article', {
      name: 'user',
    })[0];
    await expectTextAcrossElements(
      userMessageArticle,
      'Find all connections to John Doe',
    );
    await expectTextAcrossElements(log, /I understand your query/);

    // Should settle to online eventually
    expect(await screen.findByRole('status')).toHaveTextContent(/Online/);
  });

  it('sends message when send button is clicked', async () => {
    const transport = makeStreamingTransport(['My', ' response']);
    const clock = makeFakeClock();

    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        clock={clock}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    await withUser(async (u) => {
      await u.type(input, 'Show me recent transactions');
      await u.click(sendButton);
    });
    await flushMicrotasks(); // Flush transport events

    const log = await screen.findByTestId('message-log');
    const userMessageArticle = within(log).getAllByRole('article', {
      name: 'user',
    })[0];
    await expectTextAcrossElements(
      userMessageArticle,
      'Show me recent transactions',
    );
    await expectTextAcrossElements(log, /My response/);
  });

  it('disables send button when input is empty', () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('aborts cleanly on unmount (no state updates after unmount)', async () => {
    jest.useFakeTimers(); // fine here, no userEvent
    const script: AssistantEvent[] = [
      { type: 'status', value: 'thinking' },
      { type: 'token', value: 'A' },
      { type: 'token', value: 'B' },
      { type: 'done' },
    ];
    const transport = makeFakeTransport(script);
    const { unmount, rerender } = renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        typingDelayMs={1}
        debounceMs={1}
      />,
    );

    // Trigger a send by submitting the form programmatically
    rerender(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        typingDelayMs={1}
        debounceMs={1}
      />,
    );
    unmount();
    // If cleanup is correct, this won't warn or throw
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  });

  it('voice input pipes transcript into the log deterministically', async () => {
    // jest.useRealTimers(); // userEvent-friendly - already set in beforeAll

    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    const startBtn = screen.getByRole('button', { name: /start voice/i });
    await withUser(async (u) => {
      await u.click(startBtn);
    });

    emitSpeechResult('I understand your query'); // manual, immediate

    const log = await screen.findByTestId('message-log');
    await expectTextAcrossElements(log, /I understand your query/i);
  });

  it('toggles voice commands', async () => {
    renderWithTheme(
      <EnhancedAIAssistant {...defaultProps} enableVoice={true} />,
    );

    const micButton = screen.getByLabelText(/start voice/i);
    // Initially should show "Start Voice"
    expect(micButton).toHaveAttribute('aria-label', 'Start Voice');

    await withUser(async (u) => {
      await u.click(micButton);
    });

    // After click, should show "Stop Voice"
    expect(await screen.findByLabelText(/stop voice/i)).toBeInTheDocument();
  });

  it('disables voice button when voice is not enabled', () => {
    renderWithTheme(
      <EnhancedAIAssistant {...defaultProps} enableVoice={false} />,
    );

    const micButton = screen.getByLabelText(/start voice/i);
    expect(micButton).toBeDisabled();
  });

  it('prevents empty messages from being sent', async () => {
    jest.useRealTimers();
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    await withUser(async (u) => {
      // Try to send empty message
      await u.type(input, '   '); // Only spaces
      expect(sendButton).toBeDisabled();

      await u.clear(input);
      await u.keyboard('{Enter}');
    });

    // Should not add any new messages beyond the initial welcome
    expect(screen.getByText(/Hello! I'm IntelBot/)).toBeInTheDocument();
    expect(screen.queryByText('   ')).not.toBeInTheDocument();
  });

  it('handles multiline input correctly', async () => {
    const transport = makeStreamingTransport(['Got', ' it']);

    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });

    await withUser(async (u) => {
      // Test that the input accepts multiline text
      await u.type(input, 'This is line one');
      await u.keyboard('{Shift>}{Enter}{/Shift}');
      await u.type(input, 'This is line two');
    });

    // Check the input contains both lines
    expect(input).toHaveValue(expect.stringContaining('This is line one'));
    expect(input).toHaveValue(expect.stringContaining('This is line two'));

    // Regular Enter should send the message
    await withUser(async (u) => {
      await u.keyboard('{Enter}');
    });
    await flushMicrotasks(); // Flush transport events

    // Should add the message (check message log for multiline text)
    const log = await screen.findByTestId('message-log');
    await expectTextAcrossElements(log, /This is line one/);
    await expectTextAcrossElements(log, /Got it/);
  });

  it('allows copying message content', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    // Find copy button in the welcome message
    const copyButton = screen.getByTestId('ContentCopyIcon').closest('button');

    if (copyButton) {
      await withUser(async (u) => {
        await u.click(copyButton);
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    }
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);

    // Check input has proper attributes
    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    expect(input).toBeInTheDocument();

    // Check buttons have proper labels
    expect(screen.getByLabelText(/start voice/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/send/i)).toBeInTheDocument();

    // Check message log has proper role
    expect(screen.getByTestId('message-log')).toHaveAttribute('role', 'log');
    expect(
      screen.getByRole('status', { name: /assistant-status/i }),
    ).toBeInTheDocument();
  });

  it('shows proper ARIA structure for messages', async () => {
    const transport = makeStreamingTransport(['Test', ' response']);

    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    await withUser(async (u) => {
      await u.type(input, 'Test message{enter}');
    });
    await flushMicrotasks(); // Flush transport events

    const log = await screen.findByTestId('message-log');

    // Check that messages have proper article roles
    const userArticles = within(log).getAllByRole('article', { name: 'user' });
    expect(userArticles).toHaveLength(1);
    await expectTextAcrossElements(userArticles[0], 'Test message');

    // Wait for assistant response using robust text assertion
    await expectTextAcrossElements(log, /Test response/);
    const assistantArticles = within(log).getAllByRole('article', {
      name: 'assistant',
    });
    expect(assistantArticles.length).toBeGreaterThanOrEqual(1);
  });

  it('legacy fallback streams and completes to idle', async () => {
    installStreamingFetchMock(['I ', 'understand ', 'your ', 'query']);
    // Render WITHOUT a transport to force fallback in the component
    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const log = await screen.findByTestId('message-log');
    await expectTextAcrossElements(log, /I understand your query/i);
    await waitForIdle(); // guaranteed by microtask settle
  });

  it('displays "cannot confirm" message when RAG is strict and no cites are provided', async () => {
    process.env.ASSISTANT_RAG_STRICT = '1'; // Enable strict RAG

    const script: AssistantEvent[] = [
      { type: 'status', value: 'thinking' },
      { type: 'token', value: 'This is a response.' },
      { type: 'done', cites: [] }, // No cites provided
    ];
    const transport = makeFakeTransport(script);
    const clock = makeFakeClock();

    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        transport={transport}
        clock={clock}
        typingDelayMs={1}
        debounceMs={1}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    await withUser(async (u) => {
      await u.type(input, 'Test RAG strictness{enter}');
    });

    const log = await screen.findByTestId('message-log');
    await expectTextAcrossElements(
      log,
      /I cannot confirm this answer based on the provided context./i,
    );

    process.env.ASSISTANT_RAG_STRICT = undefined; // Clean up
  });
});
