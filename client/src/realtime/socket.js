import { io } from 'socket.io-client';
import $ from 'jquery';

let socket;
let clock = 0;

export function getSocket() {
  if (!socket) {
    const url = import.meta?.env?.VITE_WS_URL || undefined;
    const token =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem('auth_token') ||
          localStorage.getItem('token'))) ||
      undefined;
    socket = io(url, {
      autoConnect: true,
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });

    socket.on('connect', function () {
      clock = 0;
      $(document).trigger('socket:connect');
    });
    socket.on('disconnect', function () {
      $(document).trigger('socket:disconnect');
    });
    socket.on('ai:insight', function (payload) {
      $(document).trigger('ai:insight', payload);
    });
    socket.on('graph:op', function (payload) {
      clock = Math.max(clock, payload?.op?.ts || 0);
      $(document).trigger('graph:op', payload);
    });
  }
  return socket;
}

export function sendGraphOp(graphId, op) {
  const s = getSocket();
  clock += 1;
  s.emit('graph:op', { graphId, op: { ...op, ts: clock } });
}
