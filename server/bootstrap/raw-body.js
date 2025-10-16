import express from 'express';
const RAW_JSON = new Set([
  '/webhooks/slack/events',
  '/webhooks/stripe/events',
  '/webhooks/github/events',
  '/webhooks/github-app/events',
  '/webhooks/stripe-connect/events',
  '/webhooks/n8n/events',
  '/webhooks/shopify/events',
  '/webhooks/plaid/events',
  '/webhooks/segment/events',
  '/webhooks/coinbase/events',
  '/webhooks/paypal/events',
  '/webhooks/auth/events',
]);
const RAW_URLENC = new Set([
  '/webhooks/twilio/sms',
  '/webhooks/whatsapp/messages',
]);
export function mountRawBody(app) {
  // Route-specific raw-body capture before generic parsers
  app.use((req, res, next) => {
    if (RAW_JSON.has(req.path)) {
      return express.raw({ type: '*/*', limit: '2mb' })(req, res, next);
    }
    if (RAW_URLENC.has(req.path)) {
      return express.raw({
        type: 'application/x-www-form-urlencoded',
        limit: '1mb',
      })(req, res, next);
    }
    return next();
  });
  // Capture raw buffer for subsequent generic parsers
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    express.urlencoded({
      extended: false,
      limit: '1mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
}
