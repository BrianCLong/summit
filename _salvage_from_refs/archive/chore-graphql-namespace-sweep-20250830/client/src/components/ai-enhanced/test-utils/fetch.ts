export function installStreamingFetchMock(chunks: string[]) {
  const encoder = new TextEncoder();

  const mock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "Content-Type": "text/plain" }),
    // For code paths that call response.text()
    text: async () => chunks.join(""),
    // For code paths that stream with getReader()
    body: {
      getReader() {
        let i = 0;
        return {
          read: () =>
            Promise.resolve(
              i < chunks.length
                ? { value: encoder.encode(chunks[i++]), done: false }
                : { value: undefined, done: true }
            ),
          releaseLock() {},
        };
      },
    },
  });

  // @ts-ignore
  global.fetch = mock;
  return mock;
}
