import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = { vus: 200, duration: '3h' };

export default function () {
  const url = `${__ENV.WS_URL}?tenant=${__ENV.TENANT_ID}`;
  const params = { headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({ type: 'connection_init', payload: { token: __ENV.JWT } }));
      socket.send(JSON.stringify({ id: '1', type: 'subscribe', payload: { query: 'subscription { event { id type } }' } }));
    });
    socket.on('message', function () {});
    socket.setTimeout(function () { socket.close(); }, 60000);
  });

  check(res, { connected: (r) => r && r.status === 101 });
  sleep(1);
}

