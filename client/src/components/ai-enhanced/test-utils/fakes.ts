import {
  AssistantEvent,
  AssistantTransport,
  Clock,
} from '../EnhancedAIAssistant';

export function makeFakeClock(): Clock {
  const real = {
    setTimeout: (fn: () => void, ms: number) =>
      (setTimeout(fn, ms) as unknown as number),
    clearTimeout: (id: number) => clearTimeout(id as unknown as number),
    now: () => Date.now(),
  };
  return real as unknown as Clock;
}

type ScriptOptions = {
  mode?: 'microtask' | 'timer'; // default microtask (works with fake timers)
  spacingMs?: number; // only used in timer mode
  ensureLeadingStatus?: boolean; // inject {status: "thinking"} if first isn't status
};

export function makeFakeTransport(
  script: AssistantEvent[],
  opts: ScriptOptions = {},
): AssistantTransport {
  const {
    mode = 'microtask',
    spacingMs = 1,
    ensureLeadingStatus = true,
  } = opts;

  const seq =
    ensureLeadingStatus && script[0]?.type !== 'status'
      ? [{ type: 'status', value: 'thinking' } as AssistantEvent, ...script]
      : script;

  let handler: ((e: AssistantEvent) => void) | null = null;

  const scheduleMicro = (fn: () => void) => Promise.resolve().then(fn);
  const scheduleTimer = (fn: () => void, delay: number) =>
    setTimeout(fn, delay);

  return {
    on: (fn) => {
      console.warn('FAKE TRANSPORT: on called');
      handler = fn;
      return () => {
        console.warn('FAKE TRANSPORT: unsubscribe called');
        handler = null;
      };
    },
    send: (_input, signal) => {
      let cancelled = false;
      const onAbort = () => {
        cancelled = true;
      };
      signal?.addEventListener('abort', onAbort);

      seq.forEach((evt, idx) => {
        const run = () => {
          console.warn(
            'FAKE TRANSPORT: running event',
            evt.type,
            evt.type === 'token' ? evt.value : '',
          );
          if (!cancelled && handler) {
            handler(evt);
          } else {
            console.warn(
              'FAKE TRANSPORT: skipped (cancelled:',
              cancelled,
              'handler:',
              !!handler,
              ')',
            );
          }
        };
        if (mode === 'timer') {
          const id = scheduleTimer(run, idx * spacingMs);
          signal?.addEventListener('abort', () => clearTimeout(id));
        } else {
          scheduleMicro(run);
        }
      });
    },
  };
}

export function makeStreamingTransport(
  tokens: string[],
  opts: ScriptOptions = {},
): AssistantTransport {
  const events: AssistantEvent[] = [
    ...tokens.map(
      (token) => ({ type: 'token', value: token }) as AssistantEvent,
    ),
    { type: 'done' },
  ];

  return makeFakeTransport(events, opts);
}
