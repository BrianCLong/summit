import ws from 'k6/ws';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 }, // ramp-up to 10 concurrent WebSocket connections
    { duration: '3m', target: 10 }, // stay at 10 connections
    { duration: '30s', target: 0 }, // ramp-down
  ],
  thresholds: {
    ws_connecting_duration: ['p(95)<1000'], // 95% of connections should establish within 1s
  },
};

export default function () {
  const url = 'ws://localhost:4000/graphql'; // WebSocket endpoint for GraphQL subscriptions

  const res = ws.connect(url, null, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');
      // Send a GraphQL subscription query
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          id: '1',
          payload: {
            query: `
            subscription {
              entityCreated {
                id
                type
              }
            }
          `,
          },
        }),
      );
    });

    socket.on('message', (data) => {
      console.log('WebSocket message received:', data);
      // You would typically parse the message and perform checks here
    });

    socket.on('close', () => console.log('WebSocket disconnected'));
    socket.on('error', (e) => console.log('WebSocket error:', e.error()));

    socket.setTimeout(function () {
      console.log('Closing the socket after 5 seconds...');
      socket.close();
    }, 5000);
  });

  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });

  sleep(1);
}
