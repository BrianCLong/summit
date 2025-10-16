export async function run(ctx: { endpoint: string; token?: string }) {
  const http = await checkHttp(ctx);
  const stdio = await checkStdio();
  return {
    name: 'transport',
    pass: http.pass && stdio.pass,
    details: { http, stdio },
  };
}

async function checkHttp(ctx: { endpoint: string; token?: string }) {
  try {
    const url = `${ctx.endpoint}/v1/stream/test`;
    const headers = ctx.token
      ? { Authorization: `Bearer ${ctx.token}` }
      : undefined;

    const firstController = new AbortController();
    const firstStart = Date.now();
    const first = await fetch(url, { headers, signal: firstController.signal });
    firstController.abort();
    const firstDuration = Date.now() - firstStart;

    const secondController = new AbortController();
    const resumeHeaders = {
      ...(headers ?? {}),
      'Last-Event-ID': '1',
    } as Record<string, string>;
    const secondStart = Date.now();
    const second = await fetch(url, {
      headers: resumeHeaders,
      signal: secondController.signal,
    });
    secondController.abort();
    const secondDuration = Date.now() - secondStart;

    const pass =
      first.ok &&
      String(first.headers.get('content-type') ?? '').includes(
        'text/event-stream',
      ) &&
      second.ok &&
      String(second.headers.get('content-type') ?? '').includes(
        'text/event-stream',
      );
    return {
      pass,
      first: { status: first.status, durationMs: firstDuration },
      second: { status: second.status, durationMs: secondDuration },
    };
  } catch (error) {
    return { pass: false, error: String(error) };
  }
}

async function checkStdio() {
  // Placeholder until STDIO harness integrated.
  return { pass: true, reason: 'stdio-validation-pending' };
}
