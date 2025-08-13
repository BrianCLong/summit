const { Server } = require('socket.io');
const logger = require('../utils/logger');
const AuthService = require('./AuthService');

class WebSocketService {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.authService = new AuthService();
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.userSessions = new Map(); // socketId -> userSession
    this.investigationRooms = new Map(); // investigationId -> Set of socketIds
    this.presenceTracker = new Map(); // userId -> presence info
    
    this.setupEventHandlers();
    this.logger = logger;
    
    this.logger.info('WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('No token provided');
        }

        const user = await this.authService.verifyToken(token);
        if (!user) {
          throw new Error('Invalid token');
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        this.logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const user = socket.user;

    this.logger.info(`User ${user.email} connected with socket ${socket.id}`);

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);

    // Store user session
    this.userSessions.set(socket.id, {
      userId,
      user,
      connectedAt: new Date(),
      lastActivity: new Date(),
      currentInvestigation: null,
      cursor: null
    });

    // Update presence
    this.updateUserPresence(userId, {
      status: 'online',
      lastSeen: new Date(),
      activeConnections: this.connectedUsers.get(userId).size
    });

    // Send initial presence data to user
    socket.emit('presence:initial', {
      onlineUsers: this.getOnlineUsers(),
      yourPresence: this.presenceTracker.get(userId)
    });

    // Broadcast user came online
    socket.broadcast.emit('presence:user_online', {
      userId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      timestamp: new Date()
    });

    this.setupSocketEventHandlers(socket);
  }

  setupSocketEventHandlers(socket) {
    const userId = socket.userId;

    // Investigation room management
    socket.on('investigation:join', (data) => {
      this.handleJoinInvestigation(socket, data);
    });

    socket.on('investigation:leave', (data) => {
      this.handleLeaveInvestigation(socket, data);
    });

    // Graph collaboration events
    socket.on('graph:node_added', (data) => {
      this.handleGraphNodeAdded(socket, data);
    });

    socket.on('graph:node_updated', (data) => {
      this.handleGraphNodeUpdated(socket, data);
    });

    socket.on('graph:node_deleted', (data) => {
      this.handleGraphNodeDeleted(socket, data);
    });

    socket.on('graph:edge_added', (data) => {
      this.handleGraphEdgeAdded(socket, data);
    });

    socket.on('graph:edge_updated', (data) => {
      this.handleGraphEdgeUpdated(socket, data);
    });

    socket.on('graph:edge_deleted', (data) => {
      this.handleGraphEdgeDeleted(socket, data);
    });

    socket.on('graph:layout_changed', (data) => {
      this.handleGraphLayoutChanged(socket, data);
    });

    // Cursor tracking for collaboration
    socket.on('cursor:move', (data) => {
      this.handleCursorMove(socket, data);
    });

    socket.on('cursor:click', (data) => {
      this.handleCursorClick(socket, data);
    });

    // Comments and annotations
    socket.on('comment:add', (data) => {
      this.handleCommentAdd(socket, data);
    });

    socket.on('comment:update', (data) => {
      this.handleCommentUpdate(socket, data);
    });

    socket.on('comment:delete', (data) => {
      this.handleCommentDelete(socket, data);
    });

    socket.on('annotation:add', (data) => {
      this.handleAnnotationAdd(socket, data);
    });

    socket.on('annotation:update', (data) => {
      this.handleAnnotationUpdate(socket, data);
    });

    socket.on('annotation:delete', (data) => {
      this.handleAnnotationDelete(socket, data);
    });

    // Analysis results sharing
    socket.on('analysis:result', (data) => {
      this.handleAnalysisResult(socket, data);
    });

    socket.on('analysis:request', (data) => {
      this.handleAnalysisRequest(socket, data);
    });

    // Activity tracking
    socket.on('activity:heartbeat', () => {
      this.updateUserActivity(socket);
    });

    socket.on('activity:typing', (data) => {
      this.handleTypingIndicator(socket, data);
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Error handling
    socket.on('error', (error) => {
      this.logger.error(`Socket error for user ${userId}:`, error);
    });
  }

  // Investigation room handlers
  handleJoinInvestigation(socket, data) {
    const { investigationId } = data;
    const session = this.userSessions.get(socket.id);

    if (!investigationId) {
      socket.emit('error', { message: 'Investigation ID required' });
      return;
    }

    // Leave previous investigation if any
    if (session.currentInvestigation) {
      this.handleLeaveInvestigation(socket, { investigationId: session.currentInvestigation });
    }

    // Join new investigation room
    socket.join(`investigation:${investigationId}`);
    session.currentInvestigation = investigationId;

    // Track investigation room
    if (!this.investigationRooms.has(investigationId)) {
      this.investigationRooms.set(investigationId, new Set());
    }
    this.investigationRooms.get(investigationId).add(socket.id);

    // Notify others in the investigation
    socket.to(`investigation:${investigationId}`).emit('investigation:user_joined', {
      userId: session.userId,
      user: session.user,
      timestamp: new Date()
    });

    // Send current investigation state to joining user
    socket.emit('investigation:joined', {
      investigationId,
      participants: this.getInvestigationParticipants(investigationId),
      timestamp: new Date()
    });

    this.logger.info(`User ${session.user.email} joined investigation ${investigationId}`);
  }

  handleLeaveInvestigation(socket, data) {
    const { investigationId } = data;
    const session = this.userSessions.get(socket.id);

    if (!investigationId) return;

    socket.leave(`investigation:${investigationId}`);
    session.currentInvestigation = null;

    // Remove from investigation room tracking
    if (this.investigationRooms.has(investigationId)) {
      this.investigationRooms.get(investigationId).delete(socket.id);
      if (this.investigationRooms.get(investigationId).size === 0) {
        this.investigationRooms.delete(investigationId);
      }
    }

    // Notify others
    socket.to(`investigation:${investigationId}`).emit('investigation:user_left', {
      userId: session.userId,
      user: session.user,
      timestamp: new Date()
    });

    this.logger.info(`User ${session.user.email} left investigation ${investigationId}`);
  }

  // Graph collaboration handlers
  handleGraphNodeAdded(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, node } = data;

    const eventData = {
      type: 'node_added',
      node,
      user: session.user,
      timestamp: new Date()
    };

    // Broadcast to investigation room
    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
    
    this.logger.info(`Node added by ${session.user.email} in investigation ${investigationId}`);
  }

  handleGraphNodeUpdated(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, node, changes } = data;

    const eventData = {
      type: 'node_updated',
      node,
      changes,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
  }

  handleGraphNodeDeleted(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, nodeId } = data;

    const eventData = {
      type: 'node_deleted',
      nodeId,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
  }

  handleGraphEdgeAdded(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, edge } = data;

    const eventData = {
      type: 'edge_added',
      edge,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
  }

  handleGraphEdgeUpdated(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, edge, changes } = data;

    const eventData = {
      type: 'edge_updated',
      edge,
      changes,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
  }

  handleGraphEdgeDeleted(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, edgeId } = data;

    const eventData = {
      type: 'edge_deleted',
      edgeId,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
  }

  handleGraphLayoutChanged(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, layout } = data;

    const eventData = {
      type: 'layout_changed',
      layout,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('graph:update', eventData);
  }

  // Cursor tracking handlers
  handleCursorMove(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, position } = data;

    session.cursor = position;

    socket.to(`investigation:${investigationId}`).emit('cursor:update', {
      userId: session.userId,
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName
      },
      position,
      timestamp: new Date()
    });
  }

  handleCursorClick(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, position, target } = data;

    socket.to(`investigation:${investigationId}`).emit('cursor:click', {
      userId: session.userId,
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName
      },
      position,
      target,
      timestamp: new Date()
    });
  }

  // Comment and annotation handlers
  handleCommentAdd(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, comment } = data;

    const eventData = {
      type: 'comment_added',
      comment: {
        ...comment,
        author: session.user,
        timestamp: new Date()
      }
    };

    this.io.to(`investigation:${investigationId}`).emit('comment:update', eventData);
  }

  handleCommentUpdate(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, comment } = data;

    const eventData = {
      type: 'comment_updated',
      comment: {
        ...comment,
        updatedBy: session.user,
        updatedAt: new Date()
      }
    };

    this.io.to(`investigation:${investigationId}`).emit('comment:update', eventData);
  }

  handleCommentDelete(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, commentId } = data;

    const eventData = {
      type: 'comment_deleted',
      commentId,
      deletedBy: session.user,
      timestamp: new Date()
    };

    this.io.to(`investigation:${investigationId}`).emit('comment:update', eventData);
  }

  handleAnnotationAdd(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, annotation } = data;

    const eventData = {
      type: 'annotation_added',
      annotation: {
        ...annotation,
        author: session.user,
        timestamp: new Date()
      }
    };

    this.io.to(`investigation:${investigationId}`).emit('annotation:update', eventData);
  }

  handleAnnotationUpdate(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, annotation } = data;

    const eventData = {
      type: 'annotation_updated',
      annotation: {
        ...annotation,
        updatedBy: session.user,
        updatedAt: new Date()
      }
    };

    this.io.to(`investigation:${investigationId}`).emit('annotation:update', eventData);
  }

  handleAnnotationDelete(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, annotationId } = data;

    const eventData = {
      type: 'annotation_deleted',
      annotationId,
      deletedBy: session.user,
      timestamp: new Date()
    };

    this.io.to(`investigation:${investigationId}`).emit('annotation:update', eventData);
  }

  // Analysis handlers
  handleAnalysisResult(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, analysisType, results } = data;

    const eventData = {
      type: 'analysis_result',
      analysisType,
      results,
      user: session.user,
      timestamp: new Date()
    };

    this.io.to(`investigation:${investigationId}`).emit('analysis:update', eventData);
  }

  handleAnalysisRequest(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, analysisType, parameters } = data;

    const eventData = {
      type: 'analysis_requested',
      analysisType,
      parameters,
      user: session.user,
      timestamp: new Date()
    };

    socket.to(`investigation:${investigationId}`).emit('analysis:update', eventData);
  }

  // Activity and presence handlers
  updateUserActivity(socket) {
    const session = this.userSessions.get(socket.id);
    if (session) {
      session.lastActivity = new Date();
      this.updateUserPresence(session.userId, {
        lastSeen: new Date()
      });
    }
  }

  updateUserPresence(userId, presenceData) {
    const currentPresence = this.presenceTracker.get(userId) || {};
    const updatedPresence = {
      ...currentPresence,
      ...presenceData,
      userId
    };

    this.presenceTracker.set(userId, updatedPresence);

    // Broadcast presence update
    this.io.emit('presence:update', {
      userId,
      presence: updatedPresence
    });
  }

  handleTypingIndicator(socket, data) {
    const session = this.userSessions.get(socket.id);
    const { investigationId, isTyping, context } = data;

    socket.to(`investigation:${investigationId}`).emit('activity:typing', {
      userId: session.userId,
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName
      },
      isTyping,
      context,
      timestamp: new Date()
    });
  }

  handleDisconnection(socket, reason) {
    const session = this.userSessions.get(socket.id);
    if (!session) return;

    const userId = session.userId;

    this.logger.info(`User ${session.user.email} disconnected: ${reason}`);

    // Remove from connected users
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id);
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
        
        // Update presence to offline
        this.updateUserPresence(userId, {
          status: 'offline',
          lastSeen: new Date(),
          activeConnections: 0
        });

        // Broadcast user went offline
        socket.broadcast.emit('presence:user_offline', {
          userId,
          timestamp: new Date()
        });
      } else {
        // Update connection count
        this.updateUserPresence(userId, {
          activeConnections: this.connectedUsers.get(userId).size
        });
      }
    }

    // Remove from investigation rooms
    if (session.currentInvestigation) {
      this.handleLeaveInvestigation(socket, { investigationId: session.currentInvestigation });
    }

    // Clean up session
    this.userSessions.delete(socket.id);
  }

  // Utility methods
  getOnlineUsers() {
    const onlineUsers = [];
    this.connectedUsers.forEach((socketIds, userId) => {
      const session = this.userSessions.get([...socketIds][0]);
      if (session) {
        onlineUsers.push({
          userId,
          user: {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.firstName,
            lastName: session.user.lastName
          },
          presence: this.presenceTracker.get(userId),
          activeConnections: socketIds.size
        });
      }
    });
    return onlineUsers;
  }

  getInvestigationParticipants(investigationId) {
    const participants = [];
    const socketIds = this.investigationRooms.get(investigationId) || new Set();
    
    socketIds.forEach(socketId => {
      const session = this.userSessions.get(socketId);
      if (session) {
        participants.push({
          userId: session.userId,
          user: {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.firstName,
            lastName: session.user.lastName
          },
          connectedAt: session.connectedAt,
          lastActivity: session.lastActivity,
          cursor: session.cursor
        });
      }
    });

    return participants;
  }

  // Broadcast methods for external services
  broadcastToInvestigation(investigationId, event, data) {
    this.io.to(`investigation:${investigationId}`).emit(event, data);
  }

  broadcastToUser(userId, event, data) {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Statistics and monitoring
  getConnectionStats() {
    return {
      totalConnections: this.userSessions.size,
      uniqueUsers: this.connectedUsers.size,
      activeInvestigations: this.investigationRooms.size,
      onlineUsers: this.getOnlineUsers().length
    };
  }
}

module.exports = WebSocketService;