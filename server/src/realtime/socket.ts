import { Server, Socket } from "socket.io";
import { verifyToken } from "../lib/auth.js";
import pino from "pino";

const logger = pino();

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

  ns.on("connection", (socket: UserSocket) => {
    logger.info(`Realtime connected ${socket.id} for user ${socket.user?.id}`);
    connections += 1;

    if (connections > maxConnections && !presenceDisabled) {
      presenceDisabled = true;
      ns.emit("presence_disabled", { reason: "load_shed", maxConnections });
    }

    if (!presenceDisabled) {
      ns.emit("presence:join", {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        sid: socket.id,
        ts: Date.now(),
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
      connections = Math.max(0, connections - 1);
      if (presenceDisabled && connections < Math.floor(maxConnections * 0.9)) {
        presenceDisabled = false;
        ns.emit("presence_enabled", { reason: "load_normalized" });
      }
      if (!presenceDisabled) {
        ns.emit("presence:leave", {
          userId: socket.user?.id,
          sid: socket.id,
          ts: Date.now(),
        });
      }
      logger.info(
        `Realtime disconnect ${socket.id} for user ${socket.user?.id}`,
      );
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): Server | null {
  return ioInstance;
}
