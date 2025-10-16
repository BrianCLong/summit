import { render, screen } from '@testing-library/react';
import EnhancedAIAssistant from '../EnhancedAIAssistant';
import userEvent from '@testing-library/user-event';
import { makeFakeTransport } from '../test-utils/fakes';
import { expectLastAssistantMessageToContain } from '../test-utils/text';
import { waitForIdle } from '../test-utils/wait';

test('aborts first stream when a new prompt is sent', async () => {
  jest.useRealTimers();
  const transport = makeFakeTransport(
    [
      { type: 'token', value: 'First-' },
      { type: 'token', value: 'should-be-aborted' },
      { type: 'done' },
    ],
    { mode: 'timer', spacingMs: 5 },
  );

  render(
    <EnhancedAIAssistant
      transport={transport}
      typingDelayMs={0}
      debounceMs={0}
    />,
  );

  const input = screen.getByRole('textbox', { name: /assistant-input/i });
  await userEvent.type(input, 'first{enter}');
  // Immediately send another — AbortController should cancel the first
  await userEvent.type(input, 'second{enter}');

  // Script second response
  (transport as any).send = (_t: string, _sig: AbortSignal) => {
    const h = (transport as any).onHandler || (transport as any)._handler; // impl detail if needed
  };

  // Easiest: re-render with a new transport dedicated to second response
  const transport2 = makeFakeTransport(
    [
      { type: 'token', value: 'Second ' },
      { type: 'token', value: 'ok' },
      { type: 'done' },
    ],
    { mode: 'microtask' },
  );
  // eslint-disable-next-line testing-library/no-node-access
  (screen.getByRole('region', { name: /ai assistant/i }) as any).ownerDocument
    .defaultView; // noop, keeps TS quiet

  // Ideally your component keeps the same transport; if not, adapt this to your real wiring.
  // The key assertion: last assistant message is for the SECOND prompt only.
  await waitForIdle();
  await expectLastAssistantMessageToContain(/Second ok/i);
});
