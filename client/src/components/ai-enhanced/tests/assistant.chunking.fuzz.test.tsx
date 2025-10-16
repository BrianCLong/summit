import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import EnhancedAIAssistant from '../EnhancedAIAssistant';
import { makeFakeTransport } from '../test-utils/fakes';
import { expectLastAssistantMessageToContain } from '../test-utils/text';
import { flushMicrotasks } from '../test-utils/flush';

const target = 'I understand your query';

function chunkByIndices(s: string, cuts: number[]) {
  const indices = [
    0,
    ...cuts.filter((n) => n > 0 && n < s.length),
    s.length,
  ].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < indices.length - 1; i++)
    out.push(s.slice(indices[i], indices[i + 1]));
  return out;
}

test('chunking invariance (fuzz)', async () => {
  jest.useRealTimers();
  await fc.assert(
    fc.asyncProperty(
      fc.uniqueArray(fc.integer({ min: 0, max: target.length }), {
        minLength: 0,
        maxLength: Math.min(8, target.length),
      }),
      async (cuts: number[]) => {
        const chunks = chunkByIndices(target, cuts);
        const script = [
          ...chunks.map((v) => ({ type: 'token', value: v }) as const),
          { type: 'done' } as const,
        ];
        const transport = makeFakeTransport(script);

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
      },
    ),
    { numRuns: 25 },
  );
});
