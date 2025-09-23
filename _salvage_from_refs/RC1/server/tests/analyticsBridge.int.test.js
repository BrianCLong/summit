let GenericContainer;
try { ({ GenericContainer } = require('testcontainers')); } catch (_) { /* Intentionally empty */ }
const http = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const Redis = require('ioredis');
const { AnalyticsBridge } = require('../src/realtime/analyticsBridge');

jest.setTimeout(20000);

const maybe = GenericContainer ? describe : describe.skip;

maybe('AnalyticsBridge Redis → Socket.IO', () => {
  let container, port, redisUrl, redis, httpServer, io, bridge, client;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();
    port = container.getMappedPort(6379);
    redisUrl = `redis://localhost:${port}/1`;
    redis = new Redis(redisUrl);

    httpServer = http.createServer();
    io = new Server(httpServer, { cors: { origin: '*'} });
    await new Promise((res) => httpServer.listen(0, res));
    const address = httpServer.address();
    const url = `http://localhost:${address.port}/graph-analytics`;

    // init bridge
    process.env.ANALYTICS_RESULTS_STREAM = 'analytics:results';
    bridge = new AnalyticsBridge(io, redisUrl);
    await bridge.start();

    // socket client
    client = ioClient(url, { transports: ['websocket'] });
    await new Promise((res) => client.on('connect', res));
  });

  afterAll(async () => {
    if (client) client.close();
    if (bridge) await bridge.stop();
    if (io) io.close();
    if (httpServer) httpServer.close();
    if (redis) await redis.quit();
    if (container) await container.stop();
  });

  it('delivers progress/result/complete to job room', async () => {
    const jobId = 'job-123';
    client.emit('join_job', { jobId });

    const received = [];
    client.on('progress', (ev) => received.push(['progress', ev]));
    client.on('result', (ev) => received.push(['result', ev]));
    client.on('complete', (ev) => received.push(['complete', ev]));

    const stream = process.env.ANALYTICS_RESULTS_STREAM;
    const add = async (event) => {
      await redis.xadd(stream, '*', 'event', JSON.stringify(event));
    };

    await add({ job_id: jobId, level: 'PROGRESS', message: 'pagerank:start', payload: {} });
    await add({ job_id: jobId, level: 'INFO', message: 'pagerank:done', payload: { top: [] } });
    await add({ job_id: jobId, level: 'INFO', message: 'job:done', payload: {} });

    await new Promise((res) => setTimeout(res, 800));

    const kinds = received.map((x) => x[0]);
    expect(kinds).toContain('progress');
    expect(kinds).toContain('result');
    expect(kinds).toContain('complete');
  });
});