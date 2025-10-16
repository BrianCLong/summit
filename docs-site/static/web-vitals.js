import {
  onLCP,
  onINP,
  onCLS,
} from 'https://unpkg.com/web-vitals@4/dist/web-vitals.attribution.iife.js';
const send = (t, v, a) =>
  navigator.sendBeacon?.(
    '/telemetry',
    JSON.stringify({
      ev: 'webvital',
      type: t,
      value: v,
      attrib: a,
      ts: Date.now(),
    }),
  );
onLCP((m) => send('LCP', m.value, m.attribution));
onINP((m) => send('INP', m.value, m.attribution));
onCLS((m) => send('CLS', m.value, m.attribution));
