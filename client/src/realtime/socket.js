import { io } from 'socket.io-client';
import $ from 'jquery';

let socket;

export function getSocket() {
  if (!socket) {
    const url = (import.meta?.env?.VITE_WS_URL) || undefined;
    socket = io(url, { autoConnect: true, transports: ['websocket'] });

    socket.on('connect', function () { $(document).trigger('socket:connect'); });
    socket.on('disconnect', function () { $(document).trigger('socket:disconnect'); });
    socket.on('ai:insight', function (payload) { $(document).trigger('ai:insight', payload); });
  }
  return socket;
}

