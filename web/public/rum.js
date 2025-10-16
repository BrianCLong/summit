import { onCLS, onFID, onLCP, onINP } from 'web-vitals';
const endpoint = '/rum';
function send(name, value) {
  navigator.sendBeacon(
    endpoint,
    JSON.stringify({ name, value, ts: Date.now(), ua: navigator.userAgent }),
  );
}
onCLS((v) => send('CLS', v.value));
onFID((v) => send('FID', v.value));
onLCP((v) => send('LCP', v.value));
onINP((v) => send('INP', v.value));
