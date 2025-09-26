import '@testing-library/jest-dom';
import './i18n';

class StubWorker {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onmessage: ((event: MessageEvent<any>) => void) | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_: string | URL) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage(_: any) {}

  terminate() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEventListener(_: string, __: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeEventListener(_: string, __: any) {}
}

// @ts-expect-error Provide a minimal Worker implementation for jsdom
globalThis.Worker = StubWorker as unknown as typeof Worker;
