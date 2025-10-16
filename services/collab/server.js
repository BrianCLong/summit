/* eslint-disable @typescript-eslint/no-require-imports */
import http from 'http';
import url from 'url';
import { WebSocketServer } from 'ws';
import pg from 'pg';
const { Pool } = pg;

const HEARTBEAT_INTERVAL = 30000;
const IDLE_TIMEOUT = 60000;

const sessions = new Map();
const processed = new Set();

// Database pool
const pool = new Pool({
  connectionString:
    process.env.PG_URL ||
    'postgresql://maestro:maestro_dev_password@localhost:5432/maestro_dev',
});

async function audit(
  tenant_id,
  actor_id,
  action,
  target_resource,
  target_id,
  details,
) {
  try {
    await pool.query(
      'INSERT INTO maestro.audit_events(tenant_id, actor_id, action, target_resource, target_id, details) VALUES($1, $2, $3, $4, $5, $6)',
      [tenant_id, actor_id, action, target_resource, target_id, details],
    );
  } catch (err) {
    console.error('Error writing to audit log:', err);
  }
}

function sanitize(str = '') {
  return str.replace(/[<>]/g, '');
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (
    req.method === 'GET' &&
    parsed.pathname &&
    parsed.pathname.startsWith('/collab/history/')
  ) {
    const entityId = parsed.pathname.split('/').pop();
    try {
      const result = await pool.query(
        'SELECT * FROM maestro.case_space_comments WHERE case_space_id = $1 ORDER BY created_at ASC',
        [entityId],
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows));
    } catch (err) {
      console.error('Error fetching comment history:', err);
      res.writeHead(500);
      res.end();
    }
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      if (!msg.eventId || processed.has(msg.eventId)) return;
      processed.add(msg.eventId);

      // Audit every message type
      audit(
        msg.tenantId,
        msg.userId,
        msg.type,
        msg.entityId,
        msg.commentId || null,
        msg,
      );

      switch (msg.type) {
        case 'presence.join': {
          sessions.set(msg.sessionId, { ...msg, ws, last: Date.now() });
          broadcast({
            type: 'presence.join',
            userId: msg.userId,
            tenantId: msg.tenantId,
            sessionId: msg.sessionId,
          });
          break;
        }
        case 'presence.leave': {
          sessions.delete(msg.sessionId);
          broadcast(msg);
          break;
        }
        case 'selection.update':
        case 'comment.edit':
        case 'typing': {
          broadcast(msg);
          break;
        }
        case 'comment.add': {
          try {
            await pool.query(
              'INSERT INTO maestro.case_space_comments(id, case_space_id, author_id, comment) VALUES($1, $2, $3, $4)',
              [msg.commentId, msg.entityId, msg.userId, sanitize(msg.text)],
            );
            broadcast(msg);
          } catch (err) {
            console.error('Error saving comment:', err);
          }
          break;
        }
        case 'heartbeat': {
          const session = sessions.get(msg.sessionId);
          if (session) session.last = Date.now();
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    for (const [id, sess] of sessions.entries()) {
      if (sess.ws === ws) {
        sessions.delete(id);
        const leaveMsg = {
          type: 'presence.leave',
          sessionId: id,
          userId: sess.userId,
          tenantId: sess.tenantId,
        };
        broadcast(leaveMsg);
        audit(
          sess.tenantId,
          sess.userId,
          'presence.leave',
          sess.entityId,
          null,
          leaveMsg,
        );
      }
    }
  });
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const sess of sessions.values()) {
    try {
      sess.ws.send(data);
    } catch {
      // ignore
    }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of sessions.entries()) {
    if (now - sess.last > IDLE_TIMEOUT) {
      sessions.delete(id);
      try {
        sess.ws.close();
      } catch {
        // ignore
      }
    }
  }
}, HEARTBEAT_INTERVAL);

server.listen(4000, () => {
  console.log('Collaboration server started on port 4000');
});
