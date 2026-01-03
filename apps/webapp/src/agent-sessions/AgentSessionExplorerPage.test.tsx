import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AgentSessionExplorerPage } from './AgentSessionExplorerPage';

const detail = {
  summary: {
    id: 'abc',
    provider: 'claude',
    projectName: 'demo',
    title: 'Build dashboard',
    startedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    messageCount: 1,
    resumeCommand: 'claude --resume abc',
  },
  messages: [
    {
      id: 'm1',
      role: 'user',
      ts: '2024-01-01T00:00:00Z',
      contentText: 'hello world',
    },
  ],
};

describe('AgentSessionExplorerPage', () => {
  beforeEach(() => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [detail.summary] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [{ projectName: 'demo', count: 1 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => detail });
    (global as any).fetch = fetchMock;

    class MockEventSource {
      url: string;
      listeners: Record<string, (ev: MessageEvent) => void> = {};
      onerror?: () => void;
      constructor(url: string) {
        this.url = url;
        setTimeout(() => {
          this.listeners['session.reloaded']?.({ data: JSON.stringify(detail) } as MessageEvent);
        }, 5);
      }
      addEventListener(event: string, callback: (ev: MessageEvent) => void) {
        this.listeners[event] = callback;
      }
      close() {}
    }

    (global as any).EventSource = MockEventSource as any;
  });

  it('renders sessions and loads detail', async () => {
    render(<AgentSessionExplorerPage />);

    await waitFor(() => expect(screen.getByText('Build dashboard')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Build dashboard'));
    await waitFor(() => expect(screen.getByText('hello world')).toBeInTheDocument());
  });
});
