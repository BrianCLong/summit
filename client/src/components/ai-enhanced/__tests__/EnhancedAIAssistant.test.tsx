/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * Tests for Enhanced AI Assistant Component - Deterministic Version
 */

import React, { act } from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
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
import { waitForIdle } from '../test-utils/wait';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const getUserMessages = () =>
  screen.queryAllByRole('article', { name: /user/i });

// Global timeout for this file
jest.setTimeout(60000);

describe('EnhancedAIAssistant', () => {
  let writeTextMock: jest.Mock;

  beforeAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    (window as any).__srInstances = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
    (window as any).__srInstances?.forEach((i: any) => {
      try { i.stop(); } catch (e) { }
    });
    (window as any).__srInstances = [];
    jest.useRealTimers();
  });

  const defaultProps = {
    onQueryGenerate: jest.fn(),
    onNavigate: jest.fn(),
    enableVoice: true,
    enableProactiveSuggestions: true,
  };

  it('renders initial welcome message', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const log = await screen.findByTestId('message-log');
    await expectTextAcrossElements(log, /Hello! I'm IntelBot/i);
  });

  it('sends message when user types and presses enter', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /assistant-input/i });

    await withUser(async (u) => {
      await u.type(input, 'Hello{enter}');
    });

    await waitFor(() => {
      const items = getUserMessages();
      if (items.length === 0) throw new Error('No user messages found');
      expect(items[items.length - 1]).toHaveTextContent('Hello');
    });
    await waitForIdle();
  });

  it('streams assistant tokens and settles to idle', async () => {
    const script: AssistantEvent[] = [
      { type: 'status', value: 'thinking' },
      { type: 'token', value: 'I ' },
      { type: 'token', value: 'think ' },
      { type: 'token', value: 'therefore ' },
      { type: 'token', value: 'I ' },
      { type: 'token', value: 'am.' },
      { type: 'done' },
    ];
    const transport = makeFakeTransport(script);
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} transport={transport} />);

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    await withUser(async (u) => {
      await u.type(input, 'Hello stream{enter}');
    });

    await expectLastAssistantMessageToContain(/I think therefore I am/i);
    await waitForIdle();
  });

  it('voice input pipes transcript into the log deterministically', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const micButton = screen.getByLabelText(/start voice/i);

    fireEvent.click(micButton);
    // Wait for instance creation
    await waitFor(() => {
      const insts = (window as any).__srInstances;
      if (!insts || insts.length === 0) throw new Error('No instances');
    }, { timeout: 10000 });

    await act(async () => {
      await emitSpeechResult('I understand your query');
    });

    await waitFor(() => {
      const items = getUserMessages();
      if (items.length === 0) throw new Error('No user messages found');
      expect(items[items.length - 1]).toHaveTextContent(
        /I understand your query/i,
      );
    });
  }, 30000);

  it('toggles voice commands', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} enableVoice={true} />);
    const startBtn = screen.getByLabelText(/start voice/i);

    fireEvent.click(startBtn);
    expect(await screen.findByLabelText(/stop voice/i)).toBeInTheDocument();

    const stopBtn = screen.getByLabelText(/stop voice/i);
    fireEvent.click(stopBtn);
    expect(await screen.findByLabelText(/start voice/i)).toBeInTheDocument();
  }, 20000);

  it('handles multiline input correctly', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /assistant-input/i });

    await withUser(async (u) => {
      await u.type(input, 'Line 1{shift>}{enter}{/shift}Line 2');
      await u.keyboard('{enter}');
    });

    await waitFor(() => {
      const items = getUserMessages();
      if (items.length === 0) throw new Error('No user messages found');
      expect(items[items.length - 1]).toHaveTextContent('Line 1');
    });
    await waitForIdle();
  });

  it('allows copying message content', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const copyButton = await screen.findByLabelText(/copy message/i);

    await withUser(async (u) => {
      await u.click(copyButton);
    });
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("Hello! I'm IntelBot"));
  });

  it('legacy fallback streams and completes to idle', async () => {
    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    await withUser(async (u) => {
      await u.type(input, 'fallback test{enter}');
    });

    await expectLastAssistantMessageToContain(
      /I understand your question/i,
      20000,
    );
    await waitForIdle();
  }, 30000);

  it('displays "cannot confirm" message when RAG is strict and no cites are provided', async () => {
    process.env.ASSISTANT_RAG_STRICT = '1';

    const script: AssistantEvent[] = [
      { type: 'status', value: 'thinking' },
      { type: 'token', value: 'No cites here.' },
      { type: 'done', cites: [] },
    ];
    const transport = makeFakeTransport(script);
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
      await u.type(input, 'strict rag test{enter}');
    });

    await expectLastAssistantMessageToContain(/I cannot confirm/i);
    process.env.ASSISTANT_RAG_STRICT = undefined;
  }, 30000);
});
