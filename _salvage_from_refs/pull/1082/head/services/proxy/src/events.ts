import { Server } from 'socket.io';
import http from 'http';

export function attach(ioServer: http.Server) {
  const io = new Server(ioServer, { path: '/events', cors: { origin: '*' } });
  setInterval(() => {
    // emit synthetic stats until wired to real counters
    io.emit('model_stats', [
      { id: 'local/ollama', class: 'local', window: 'open', rpm: 3, rpmCap: 120, tpm: 10000, tpmCap: 1000000, budgetFrac: 0.12, p95ms: 450, ttfbms: 120 },
      { id: 'gemini/1.5-pro', class: 'hosted', window: 'open', rpm: 1, rpmCap: 30, tpm: 5000, tpmCap: 300000, budgetFrac: 0.62, p95ms: 2100, ttfbms: 600 }
    ]);
  }, 2000);
}
