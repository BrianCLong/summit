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
import { installStreamingFetchMock } from '../test-utils/fetch';
import { waitForIdle } from '../test-utils/wait';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

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

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    const items = await screen.findAllByRole('article');
    expect(items.some(i => i.textContent?.includes('Hello'))).toBe(true);
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
    fireEvent.change(input, { target: { value: 'Hello stream' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await expectLastAssistantMessageToContain(/I think therefore I am/i);
    await waitForIdle();
  });

  it('voice input pipes transcript into the log deterministically', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const micButton = screen.getByLabelText(/start voice/i);

    fireEvent.mouseDown(micButton);
    // Wait for instance creation
    await waitFor(() => {
      const insts = (window as any).__srInstances;
      if (!insts || insts.length === 0) throw new Error('No instances');
    }, { timeout: 10000 });

    await emitSpeechResult('I understand your query');

    await expectLastAssistantMessageToContain(/I understand your query/i, 20000);
  }, 30000);

  it('toggles voice commands', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} enableVoice={true} />);
    const startBtn = screen.getByLabelText(/start voice/i);

    fireEvent.mouseDown(startBtn);
    expect(await screen.findByLabelText(/stop voice/i)).toBeInTheDocument();

    fireEvent.mouseUp(window);
    expect(await screen.findByLabelText(/start voice/i)).toBeInTheDocument();
  }, 20000);

  it('handles multiline input correctly', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /assistant-input/i });

    fireEvent.change(input, { target: { value: "Line 1\nLine 2" } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    const items = await screen.findAllByRole('article');
    expect(items.some(i => i.textContent?.includes('Line 1'))).toBe(true);
    await waitForIdle();
  });

  it('allows copying message content', async () => {
    renderWithTheme(<EnhancedAIAssistant {...defaultProps} />);
    const copyButton = await screen.findByLabelText(/copy message/i);

    fireEvent.click(copyButton);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("Hello! I'm IntelBot"));
  });

  it('legacy fallback streams and completes to idle', async () => {
    installStreamingFetchMock(['I ', 'understand ', 'your ', 'query']);
    renderWithTheme(
      <EnhancedAIAssistant
        {...defaultProps}
        typingDelayMs={0}
        debounceMs={0}
      />,
    );

    const input = screen.getByRole('textbox', { name: /assistant-input/i });
    fireEvent.change(input, { target: { value: 'fallback test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await expectLastAssistantMessageToContain(/I understand your query/i, 20000);
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
    fireEvent.change(input, { target: { value: 'strict rag test' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await expectLastAssistantMessageToContain(/I cannot confirm/i);
    process.env.ASSISTANT_RAG_STRICT = undefined;
  }, 30000);
});
