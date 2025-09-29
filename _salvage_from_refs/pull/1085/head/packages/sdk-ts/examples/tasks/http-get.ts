import { defineTask, createRunContext, type TaskInput } from ' @summit/maestro-sdk';

export default defineTask<{ url: string }, { status: number; body: string }> ({
  async validate(input: TaskInput<{ url: string }>) {
    if (!input.payload?.url) throw new Error('url is required');
  },
  async execute(ctx, input) {
    const res = await fetch(input.payload.url);
    const body = await res.text();
    ctx.logger.info('http-get', { status: res.status, bytes: body.length });
    await ctx.emit('http_get.done', { status: res.status });
    return { payload: { status: res.status, body } };
  }
});

// Local demo
if (process.env.NODE_ENV === 'development') {
  const ctx = createRunContext({});
  const task = (await import('./http-get.ts')).default;
  task.execute(ctx, { payload: { url: 'https://example.com' } }).then(r => console.log(r));
}
