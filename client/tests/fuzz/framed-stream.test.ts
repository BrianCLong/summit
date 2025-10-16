import { createFetchStreamTransport } from '../../src/lib/assistant/transport';
import { TextEncoder } from 'util';

describe('Framed Stream Parser Fuzz Test', () => {
  const encoder = new TextEncoder();

  // Helper to simulate a fetch response with given chunks
  const mockFetchResponse = (chunks: string[]) => {
    let i = 0;
    return Promise.resolve({
      ok: true,
      body: {
        getReader() {
          return {
            read: () =>
              Promise.resolve(
                i < chunks.length
                  ? { value: encoder.encode(chunks[i++]), done: false }
                  : { value: undefined, done: true },
              ),
            releaseLock() {},
          };
        },
      },
    });
  };

  it('correctly parses mixed frame sizes and heartbeat inserts', async () => {
    const receivedEvents: any[] = [];
    const transport = createFetchStreamTransport({
      baseUrl: '/api',
      getAuthToken: () => null,
    });
    transport.on((evt) => receivedEvents.push(evt));

    const testCases = [
      // Single full frames
      JSON.stringify({ type: 'status', value: 'thinking' }) + '\n',
      JSON.stringify({ type: 'token', value: 'Hello' }) + '\n',
      JSON.stringify({ type: 'done', cites: [] }) + '\n',

      // Mixed frame sizes (split across reads)
      JSON.stringify({ type: 'token', value: 'World' }).slice(0, 5),
      JSON.stringify({ type: 'token', value: 'World' }).slice(5) + '\n',

      // Multiple frames in one read
      JSON.stringify({ type: 'token', value: 'Foo' }) +
        '\n' +
        JSON.stringify({ type: 'token', value: 'Bar' }) +
        '\n',

      // Heartbeat/empty lines
      '\n',
      '\n',
      JSON.stringify({ type: 'token', value: 'Baz' }) + '\n',

      // Incomplete frame at the end
      JSON.stringify({ type: 'token', value: 'Incomplete' }).slice(0, 10),
    ];

    // Simulate fetch call
    // @ts-ignore
    global.fetch = jest.fn(() => mockFetchResponse(testCases));

    await transport.send('test', new AbortController().signal);

    // Wait for all events to be processed (give it a moment for async operations)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assertions
    expect(receivedEvents.length).toBe(6); // status, Hello, World, Foo, Bar, Baz, Incomplete, done
    expect(receivedEvents[0]).toEqual({ type: 'status', value: 'thinking' });
    expect(receivedEvents[1]).toEqual({ type: 'token', value: 'Hello' });
    expect(receivedEvents[2]).toEqual({ type: 'token', value: 'World' });
    expect(receivedEvents[3]).toEqual({ type: 'token', value: 'Foo' });
    expect(receivedEvents[4]).toEqual({ type: 'token', value: 'Bar' });
    expect(receivedEvents[5]).toEqual({ type: 'token', value: 'Baz' });
    // The last incomplete frame will not be processed until more data or stream ends
    // The done event will be sent by the server, not the client transport
  });

  it('correctly handles a stream ending with an incomplete frame', async () => {
    const receivedEvents: any[] = [];
    const transport = createFetchStreamTransport({
      baseUrl: '/api',
      getAuthToken: () => null,
    });
    transport.on((evt) => receivedEvents.push(evt));

    const testCases = [
      JSON.stringify({ type: 'token', value: 'Partial' }).slice(0, 10),
    ];

    // Simulate fetch call
    // @ts-ignore
    global.fetch = jest.fn(() => mockFetchResponse(testCases));

    await transport.send('test', new AbortController().signal);

    // Wait for all events to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The incomplete frame should NOT be processed as a full event
    expect(receivedEvents.length).toBe(0);
  });

  it('correctly handles a stream with only a done event', async () => {
    const receivedEvents: any[] = [];
    const transport = createFetchStreamTransport({
      baseUrl: '/api',
      getAuthToken: () => null,
    });
    transport.on((evt) => receivedEvents.push(evt));

    const testCases = [JSON.stringify({ type: 'done', cites: [] }) + '\n'];

    // Simulate fetch call
    // @ts-ignore
    global.fetch = jest.fn(() => mockFetchResponse(testCases));

    await transport.send('test', new AbortController().signal);

    // Wait for all events to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0]).toEqual({ type: 'done', cites: [] });
  });
});
