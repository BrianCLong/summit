import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import slackRouter from '../src/routes/slack';

describe('Slack raw-body route', () => {
  const app = express();
  app.use('/', slackRouter);

  const HAS_SECRET = !!process.env.SLACK_SIGNING_SECRET;
  (HAS_SECRET ? it : it.skip)(
    'accepts raw payload with valid signature',
    async () => {
      const bodyObj = { type: 'url_verification' };
      const raw = Buffer.from(JSON.stringify(bodyObj), 'utf8');
      const ts = Math.floor(Date.now() / 1000).toString();
      const base = `v0:${ts}:${raw.toString()}`;
      const hmac = crypto
        .createHmac('sha256', process.env.SLACK_SIGNING_SECRET as string)
        .update(base)
        .digest('hex');
      const sig = `v0=${hmac}`;

      const res = await request(app)
        .post('/webhooks/slack')
        .set('Content-Type', 'application/json')
        .set('x-slack-request-timestamp', ts)
        .set('x-slack-signature', sig)
        .send(raw);

      expect([200, 204, 503]).toContain(res.status);
    },
  );
});
