<<<<<<< HEAD
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/auth.js'; // Assuming auth.ts has verifyToken
import pino from 'pino';
import Redis from 'ioredis'; // Import ioredis
=======
import { Server, Socket } from "socket.io";
import { verifyToken } from "../lib/auth.js";
import pino from "pino";
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f

const logger = pino();

// Initialize Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('connect', () => logger.info('Connected to Redis'));
redisClient.on('error', (err) => logger.error({ err }, 'Redis Client Error'));

let connections = 0;
let presenceDisabled = false;
const maxConnections = Number(process.env.PRESENCE_MAX_CONNECTIONS || 10000);

let ioInstance: Server | null = null;

interface UserSocket extends Socket {
  user?: any;
}

export function initSocket(httpServer: any): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
      credentials: true,
    },
  });

  const ns = io.of("/realtime");

  ns.use(async (socket: UserSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      const user = await verifyToken(token);
      if (!user) {
        logger.warn({ token }, "Unauthorized socket connection attempt");
        return next(new Error("Unauthorized"));
      }
      socket.user = user;
      next();
    } catch (e: any) {
      logger.warn(
        { error: e.message },
        "Unauthorized socket connection attempt",
      );
      next(new Error("Unauthorized"));
    }
  });

<<<<<<< HEAD
  ns.on('connection', async (socket: UserSocket) => {
    logger.info(`Realtime connected ${socket.id} for user ${socket.user?.id}`);
    connections += 1;
    
    // Store the current investigationId on the socket
    socket.data.currentInvestigationId = null; // Initialize

    // Store initial presence in Redis
    const presenceKey = `presence:${socket.id}`;
    const presenceData = {
      userId: socket.user?.id,
      username: socket.user?.username || socket.user?.email,
      avatarUrl: socket.user?.avatarUrl || '', // Ensure avatarUrl is a string
      sid: socket.id,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      investigationId: socket.data.currentInvestigationId || '' // Store current investigation ID
    };
    await redisClient.hset(presenceKey, presenceData);
    await redisClient.expire(presenceKey, 60); // Set TTL to 60 seconds (heartbeat interval + grace)
=======
  ns.on("connection", (socket: UserSocket) => {
    logger.info(`Realtime connected ${socket.id} for user ${socket.user?.id}`);
    connections += 1;
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f

    if (connections > maxConnections && !presenceDisabled) {
      presenceDisabled = true;
      ns.emit("presence_disabled", { reason: "load_shed", maxConnections });
    }
<<<<<<< HEAD
    
    // Announce user presence (global for now, will be refined for rooms)
    // This initial global presence is kept for broader awareness if needed,
    // but room-specific presence will be handled by join_investigation.
    if (!presenceDisabled) {
      ns.emit('presence:join', { 
        userId: socket.user?.id, 
        username: socket.user?.username || socket.user?.email,
        avatarUrl: socket.user?.avatarUrl, // Add avatarUrl
        sid: socket.id, 
        ts: Date.now() 
=======

    if (!presenceDisabled) {
      ns.emit("presence:join", {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        sid: socket.id,
        ts: Date.now(),
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
      });
    }

    const authorize =
      (roles: string[], event: string, handler: (...args: any[]) => void) =>
      (...args: any[]) => {
        const userRole = socket.user?.role;
        if (!userRole || !roles.includes(userRole)) {
          logger.warn(
            { userId: socket.user?.id, role: userRole, event },
            "Unauthorized socket event",
          );
          socket.emit("error", "Forbidden");
          return;
        }
        handler(...args);
      };

    const VIEW_ROLES = ["VIEWER", "EDITOR", "ADMIN"];
    const EDIT_ROLES = ["EDITOR", "ADMIN"];

    socket.on(
      "join_graph",
      authorize(
        VIEW_ROLES,
        "join_graph",
        ({ graphId }: { graphId: string }) => {
          if (!graphId) return;
          socket.join(`graph:${graphId}`);
          socket.to(`graph:${graphId}`).emit("user_joined_graph", {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            ts: Date.now(),
          });
        },
      ),
    );

    socket.on(
      "leave_graph",
      authorize(
        VIEW_ROLES,
        "leave_graph",
        ({ graphId }: { graphId: string }) => {
          if (!graphId) return;
          socket.leave(`graph:${graphId}`);
          socket.to(`graph:${graphId}`).emit("user_left_graph", {
            userId: socket.user?.id,
            ts: Date.now(),
          });
        },
      ),
    );

    socket.on(
      "cursor_move",
      authorize(
        VIEW_ROLES,
        "cursor_move",
        ({
          graphId,
          position,
          viewport,
        }: {
          graphId: string;
          position: { x: number; y: number };
          viewport?: any;
        }) => {
          if (!graphId) return;
          socket.to(`graph:${graphId}`).emit("cursor_update", {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            position,
            viewport,
            ts: Date.now(),
          });
        },
      ),
    );

    socket.on(
      "entity_select",
      authorize(
        VIEW_ROLES,
        "entity_select",
        ({ graphId, entityId }: { graphId: string; entityId: string }) => {
          if (!graphId || !entityId) return;
          socket.to(`graph:${graphId}`).emit("entity_selected", {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            entityId,
            ts: Date.now(),
          });
        },
      ),
    );

<<<<<<< HEAD
    // Investigation collaboration
    socket.on('join_investigation', ({ investigationId }: { investigationId: string }) => {
      if (!investigationId) return;
      
      // Leave previous investigation room if any
      if (socket.data.currentInvestigationId) {
        socket.leave(`investigation:${socket.data.currentInvestigationId}`);
        // Announce leave from previous room
        io.to(`investigation:${socket.data.currentInvestigationId}`).emit('presence:leave', {
          userId: socket.user?.id,
          sid: socket.id,
          ts: Date.now(),
          investigationId: socket.data.currentInvestigationId
        });
      }

      socket.join(`investigation:${investigationId}`);
      socket.data.currentInvestigationId = investigationId; // Store current investigation ID

      // Announce user presence in the specific investigation room
      io.to(`investigation:${investigationId}`).emit('presence:join', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        avatarUrl: socket.user?.avatarUrl, // Add avatarUrl
        sid: socket.id,
        ts: Date.now(),
        investigationId: investigationId
      });

      socket.to(`investigation:${investigationId}`).emit('user_joined_investigation', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        ts: Date.now()
      });
    });
=======
    socket.on(
      "entity_deselect",
      authorize(
        VIEW_ROLES,
        "entity_deselect",
        ({ graphId, entityId }: { graphId: string; entityId: string }) => {
          if (!graphId || !entityId) return;
          socket.to(`graph:${graphId}`).emit("entity_deselected", {
            userId: socket.user?.id,
            entityId,
            ts: Date.now(),
          });
        },
      ),
    );
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f

    socket.on(
      "entity_update",
      authorize(
        EDIT_ROLES,
        "entity_update",
        ({
          graphId,
          entityId,
          changes,
        }: {
          graphId: string;
          entityId: string;
          changes: any;
        }) => {
          if (!graphId || !entityId) return;
          socket.to(`graph:${graphId}`).emit("entity_updated", {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            entityId,
            changes,
            ts: Date.now(),
          });
        },
      ),
    );

    socket.on(
      "join_investigation",
      authorize(
        VIEW_ROLES,
        "join_investigation",
        ({ investigationId }: { investigationId: string }) => {
          if (!investigationId) return;
          socket.join(`investigation:${investigationId}`);
          socket
            .to(`investigation:${investigationId}`)
            .emit("user_joined_investigation", {
              userId: socket.user?.id,
              username: socket.user?.username || socket.user?.email,
              ts: Date.now(),
            });
        },
      ),
    );

    socket.on(
      "timeline_event_add",
      authorize(
        EDIT_ROLES,
        "timeline_event_add",
        ({
          investigationId,
          event,
        }: {
          investigationId: string;
          event: any;
        }) => {
          if (!investigationId) return;
          socket
            .to(`investigation:${investigationId}`)
            .emit("timeline_event_added", {
              userId: socket.user?.id,
              username: socket.user?.username || socket.user?.email,
              event,
              ts: Date.now(),
            });
        },
      ),
    );

    socket.on(
      "comment_add",
      authorize(
        EDIT_ROLES,
        "comment_add",
        ({ entityId, comment }: { entityId: string; comment: any }) => {
          if (!entityId) return;
          ns.emit("comment_added", {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            entityId,
            comment,
            ts: Date.now(),
          });
        },
      ),
    );

<<<<<<< HEAD
    // Handle presence heartbeats
    socket.on('presence:heartbeat', async () => {
      const presenceKey = `presence:${socket.id}`;
      await redisClient.hset(presenceKey, 'lastHeartbeat', Date.now());
      await redisClient.expire(presenceKey, 60); // Reset TTL
    });

    // Typing indicators
    socket.on('typing_start', ({ graphId, location }: { graphId: string, location: string }) => {
      if (!graphId) return;
      socket.to(`graph:${graphId}`).emit('user_typing_start', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        location,
        ts: Date.now()
      });
    });
=======
    socket.on(
      "join_ai_entity",
      authorize(
        VIEW_ROLES,
        "join_ai_entity",
        ({ entityId }: { entityId: string }) => {
          if (!entityId) return;
          socket.join(`ai:entity:${entityId}`);
        },
      ),
    );
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f

    socket.on(
      "leave_ai_entity",
      authorize(
        VIEW_ROLES,
        "leave_ai_entity",
        ({ entityId }: { entityId: string }) => {
          if (!entityId) return;
          socket.leave(`ai:entity:${entityId}`);
        },
      ),
    );

<<<<<<< HEAD
    socket.on('disconnect', async () => { // Make async to use await for Redis
=======
    socket.on(
      "typing_start",
      authorize(
        VIEW_ROLES,
        "typing_start",
        ({ graphId, location }: { graphId: string; location: string }) => {
          if (!graphId) return;
          socket.to(`graph:${graphId}`).emit("user_typing_start", {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            location,
            ts: Date.now(),
          });
        },
      ),
    );

    socket.on(
      "typing_stop",
      authorize(
        VIEW_ROLES,
        "typing_stop",
        ({ graphId, location }: { graphId: string; location: string }) => {
          if (!graphId) return;
          socket.to(`graph:${graphId}`).emit("user_typing_stop", {
            userId: socket.user?.id,
            location,
            ts: Date.now(),
          });
        },
      ),
    );

    socket.on("disconnect", () => {
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
      connections = Math.max(0, connections - 1);
      if (presenceDisabled && connections < Math.floor(maxConnections * 0.9)) {
        presenceDisabled = false;
        ns.emit("presence_enabled", { reason: "load_normalized" });
      }
<<<<<<< HEAD
      
      // Remove presence from Redis
      await redisClient.del(`presence:${socket.id}`);
      
      // Announce user leave from the specific investigation room if they were in one
      if (!presenceDisabled && socket.data.currentInvestigationId) {
        io.to(`investigation:${socket.data.currentInvestigationId}`).emit('presence:leave', {
          userId: socket.user?.id,
          sid: socket.id,
          ts: Date.now(),
          investigationId: socket.data.currentInvestigationId
        });
      } else if (!presenceDisabled) {
        // Fallback to global leave if not in a specific investigation
        ns.emit('presence:leave', { 
          userId: socket.user?.id, 
          sid: socket.id, 
          ts: Date.now() 
=======
      if (!presenceDisabled) {
        ns.emit("presence:leave", {
          userId: socket.user?.id,
          sid: socket.id,
          ts: Date.now(),
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
        });
      }
      logger.info(
        `Realtime disconnect ${socket.id} for user ${socket.user?.id}`,
      );
    });
  });

  ioInstance = io;
  
  // Start the presence cleanup job
  startPresenceCleanupJob(io);

  return io;
}

<<<<<<< HEAD
let ghostCount = 0; // Telemetry for ghost rate

function startPresenceCleanupJob(io: Server) {
  const cleanupInterval = Number(process.env.PRESENCE_CLEANUP_INTERVAL || 30000); // 30 seconds
  const heartbeatThreshold = Number(process.env.PRESENCE_HEARTBEAT_THRESHOLD || 90000); // 90 seconds

  setInterval(async () => {
    logger.info('Running presence cleanup job...');
    const keys = await redisClient.keys('presence:*');
    for (const key of keys) {
      const presenceData = await redisClient.hgetall(key);
      const lastHeartbeat = Number(presenceData.lastHeartbeat);
      const userId = presenceData.userId;
      const sid = presenceData.sid;
      const investigationId = presenceData.investigationId;
      const username = presenceData.username;
      const avatarUrl = presenceData.avatarUrl;

      if (Date.now() - lastHeartbeat > heartbeatThreshold) {
        logger.warn(`Detected ghost user: ${userId} (SID: ${sid}) in investigation ${investigationId}`);
        ghostCount++; // Increment ghost count for telemetry

        await redisClient.del(key); // Remove ghost from Redis

        // Emit presence:leave for the ghost user
        if (investigationId) {
          io.to(`investigation:${investigationId}`).emit('presence:leave', {
            userId,
            username,
            avatarUrl,
            sid,
            ts: Date.now(),
            investigationId
          });
        } else {
          io.of('/realtime').emit('presence:leave', {
            userId,
            username,
            avatarUrl,
            sid,
            ts: Date.now()
          });
        }
      }
    }
    // Telemetry: presence_ghost_rate can be calculated from ghostCount over time
    // For now, just log it.
    logger.info(`Total ghost users detected so far: ${ghostCount}`);
  }, cleanupInterval);
}

export function getIO(): Server | null { return ioInstance; }
=======
export function getIO(): Server | null {
  return ioInstance;
}
>>>>>>> 1ae8cd71faa0d57638f1dd82b1f544b60eae109f
