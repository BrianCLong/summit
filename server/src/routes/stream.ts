
import express from 'express';
import { graphStreamer } from '../lib/streaming/GraphStreamer';
import { getRedisClient } from '../db/redis';

const router = express.Router();

router.post('/start', async (req, res) => {
  try {
    const { query, params, config } = req.body;
    // Validate inputs here (omitted for brevity)

    const streamId = await graphStreamer.startStream(query, params, config);
    res.json({ streamId, streamUrl: `/api/stream/${streamId}` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:streamId', async (req, res) => {
  const { streamId } = req.params;
  const redis = getRedisClient();
  const channel = `stream:${streamId}`;

  // Server-Sent Events setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sub = redis.duplicate();
  await sub.subscribe(channel);

  sub.on('message', (chan, message) => {
    if (chan === channel) {
      res.write(`data: ${message}\n\n`);

      const parsed = JSON.parse(message);
      if (parsed.type === 'complete' || parsed.type === 'error') {
          sub.unsubscribe();
          sub.quit();
          res.end();
      }
    }
  });

  req.on('close', () => {
    sub.unsubscribe();
    sub.quit();
    graphStreamer.stopStream(streamId);
  });

  // Start execution now that client is connected
  graphStreamer.executeStream(streamId);
});

export default router;
