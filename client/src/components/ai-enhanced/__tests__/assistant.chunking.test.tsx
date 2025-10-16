import { render, screen } from '@testing-library/react';
import EnhancedAIAssistant from '../EnhancedAIAssistant';
import userEvent from '@testing-library/user-event';
import { makeFakeTransport } from '../test-utils/fakes';
import { expectLastAssistantMessageToContain } from '../test-utils/text';
import { flushMicrotasks } from '../test-utils/flush';

function chunksFrom(text: string, cuts: number[]) {
  const idxs = [0, ...cuts, text.length].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < idxs.length - 1; i++)
    out.push(text.slice(idxs[i], idxs[i + 1]));
  return out;
}

const target = 'I understand your query';

describe('chunk-boundary invariance', () => {
  beforeAll(() => jest.useRealTimers());

  const cases = [
    [], // whole string
    [1], // minimal head split
    [2, 12], // a couple of interior splits
    [1, 2, 3, 4], // many tiny chunks
    [5, 7, 14, 18],
  ];

  for (const cuts of cases) {
    it(`renders correctly for cuts=${JSON.stringify(cuts)}`, async () => {
      const transport = makeFakeTransport([
        ...chunksFrom(target, cuts).map(
          (v) => ({ type: 'token', value: v }) as const,
        ),
        { type: 'done' },
      ]);

      render(
        <EnhancedAIAssistant
          transport={transport}
          typingDelayMs={0}
          debounceMs={0}
        />,
      );
      await userEvent.type(
        screen.getByRole('textbox', { name: /assistant-input/i }),
        'go{enter}',
      );
      await flushMicrotasks();

      await expectLastAssistantMessageToContain(/I understand your query/i);
    });
  }
});
