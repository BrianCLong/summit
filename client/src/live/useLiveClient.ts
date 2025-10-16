import io from 'socket.io-client';
import $ from 'jquery';

/**
 * useLiveClient sets up a Socket.IO client for the "/live" namespace and
 * bridges jQuery DOM events with socket messages. React components can invoke
 * jQuery triggers such as `$(document).trigger('ig:graph:ops', batch)` to send
 * events without directly depending on the socket instance.
 */
export function useLiveClient(workspaceId: string, token: string) {
  const socket = io('/live', { auth: { workspaceId, token } });

  // outbound events
  $(document).on('ig:presence:update', (_e, data) =>
    socket.emit('presence:update', data),
  );
  $(document).on('ig:graph:ops', (_e, batch) =>
    socket.emit('graph:ops', batch),
  );
  $(document).on('ig:comment:add', (_e, payload) =>
    socket.emit('comment:add', payload),
  );

  // inbound events
  socket.on('presence:update', (p) =>
    $(document).trigger('ig:presence:inbound', [p]),
  );
  socket.on('graph:commit', (ops) =>
    $(document).trigger('ig:graph:commit', [ops]),
  );
  socket.on('comment:new', (c) =>
    $(document).trigger('ig:comment:inbound', [c]),
  );

  return socket;
}
