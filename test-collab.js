const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4000');

ws.on('open', function open() {
  const msg = {
    type: 'comment.add',
    eventId: 'test-event-1',
    entityId: 'test-entity',
    commentId: 'test-comment-1',
    userId: 'test-user',
    tenantId: 'test-tenant',
    text: 'This is a test comment.',
  };
  ws.send(JSON.stringify(msg));
  console.log('Sent message:', msg);
  ws.close();
});

ws.on('message', function message(data) {
  console.log('received: %s', data);
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
