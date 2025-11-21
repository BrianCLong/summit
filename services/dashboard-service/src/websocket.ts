import { Server as SocketServer } from 'socket.io';
import { DashboardService } from './services/DashboardService';

interface ConnectedUser {
  id: string;
  socketId: string;
  dashboardId?: string;
  userName?: string;
}

export function setupWebSocket(io: SocketServer, dashboardService: DashboardService) {
  const connectedUsers = new Map<string, ConnectedUser>();
  const dashboardSubscriptions = new Map<string, Set<string>>(); // dashboardId -> Set<socketId>

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    const user: ConnectedUser = {
      id: socket.handshake.auth.userId || socket.id,
      socketId: socket.id,
      userName: socket.handshake.auth.userName,
    };

    connectedUsers.set(socket.id, user);

    // Subscribe to dashboard updates
    socket.on('subscribe', async ({ dashboardId }) => {
      user.dashboardId = dashboardId;
      socket.join(`dashboard:${dashboardId}`);

      if (!dashboardSubscriptions.has(dashboardId)) {
        dashboardSubscriptions.set(dashboardId, new Set());
      }
      dashboardSubscriptions.get(dashboardId)!.add(socket.id);

      // Send initial dashboard data
      const dashboard = await dashboardService.getDashboard(dashboardId);
      if (dashboard) {
        socket.emit('dashboard-data', {
          widgetId: 'initial',
          data: dashboard,
        });
      }

      // Notify others
      socket.to(`dashboard:${dashboardId}`).emit('collaboration-event', {
        type: 'user-joined',
        userId: user.id,
        userName: user.userName,
        data: {},
        timestamp: new Date(),
      });

      console.log(`User ${user.id} subscribed to dashboard ${dashboardId}`);
    });

    // Unsubscribe from dashboard
    socket.on('unsubscribe', ({ dashboardId }) => {
      socket.leave(`dashboard:${dashboardId}`);
      dashboardSubscriptions.get(dashboardId)?.delete(socket.id);

      socket.to(`dashboard:${dashboardId}`).emit('collaboration-event', {
        type: 'user-left',
        userId: user.id,
        userName: user.userName,
        data: {},
        timestamp: new Date(),
      });
    });

    // Refresh widget data
    socket.on('refresh', async ({ widgetId }) => {
      // Fetch fresh data for widget
      // In real implementation, would query the data source
      socket.emit('dashboard-data', {
        widgetId,
        data: { refreshed: true, timestamp: new Date() },
      });
    });

    // Cursor movement for collaboration
    socket.on('cursor-move', ({ dashboardId, position }) => {
      socket.to(`dashboard:${dashboardId}`).emit('collaboration-event', {
        type: 'cursor-move',
        userId: user.id,
        userName: user.userName,
        data: { position },
        timestamp: new Date(),
      });
    });

    // Widget selection
    socket.on('widget-select', ({ dashboardId, widgetId }) => {
      socket.to(`dashboard:${dashboardId}`).emit('collaboration-event', {
        type: 'selection',
        userId: user.id,
        userName: user.userName,
        data: { widgetId },
        timestamp: new Date(),
      });
    });

    // Widget edit
    socket.on('widget-edit', async ({ dashboardId, widgetId, updates }) => {
      // Apply updates
      await dashboardService.updateWidget(widgetId, dashboardId, updates);

      // Broadcast to all subscribers
      io.to(`dashboard:${dashboardId}`).emit('widget-updated', {
        widgetId,
        updates,
        userId: user.id,
      });

      socket.to(`dashboard:${dashboardId}`).emit('collaboration-event', {
        type: 'edit',
        userId: user.id,
        userName: user.userName,
        data: { widgetId, updates },
        timestamp: new Date(),
      });
    });

    // Dashboard update
    socket.on('dashboard-update', async ({ dashboardId, updates }) => {
      const dashboard = await dashboardService.updateDashboard(dashboardId, updates);

      io.to(`dashboard:${dashboardId}`).emit('dashboard-updated', {
        dashboardId,
        dashboard,
        userId: user.id,
      });
    });

    // Comment on widget
    socket.on('comment', ({ dashboardId, widgetId, comment }) => {
      io.to(`dashboard:${dashboardId}`).emit('collaboration-event', {
        type: 'comment',
        userId: user.id,
        userName: user.userName,
        data: { widgetId, comment },
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);

      if (user?.dashboardId) {
        socket.to(`dashboard:${user.dashboardId}`).emit('collaboration-event', {
          type: 'user-left',
          userId: user.id,
          userName: user.userName,
          data: {},
          timestamp: new Date(),
        });

        dashboardSubscriptions.get(user.dashboardId)?.delete(socket.id);
      }

      connectedUsers.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Periodic health check / keep-alive
  setInterval(() => {
    io.emit('ping', { timestamp: Date.now() });
  }, 30000);

  console.log('WebSocket server ready');
}
