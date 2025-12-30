import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';

type CursorPosition = {
  x: number;
  y: number;
};

type PresenceState = {
  userId: string;
  userName: string;
  workspaceId: string;
  status: 'online' | 'away';
  lastActive: number;
  cursor?: CursorPosition;
  selection?: string;
};

type PresenceChannelState = PresenceState & {
  channel: string;
};

type CollaborationEdit = {
  workspaceId: string;
  entityId: string;
  userId: string;
  version: number;
  changes: Record<string, unknown>;
  timestamp: number;
};

type ConflictResolution = {
  strategy: 'last-writer-wins+merge';
  previousVersion: number;
  incomingVersion: number;
  resolvedVersion: number;
  resolvedChanges: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  workspaceId: string;
  userId: string;
  message: string;
  createdAt: number;
};

type Annotation = {
  id: string;
  workspaceId: string;
  targetId: string;
  userId: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

type ActivityEvent = {
  id: string;
  workspaceId: string;
  type:
    | 'workspace_join'
    | 'workspace_leave'
    | 'presence_update'
    | 'chat'
    | 'annotation'
    | 'edit_applied'
    | 'edit_conflict';
  description: string;
  actorId: string;
  createdAt: number;
};

type EntityState = {
  version: number;
  lastEdit?: CollaborationEdit;
};

type WorkspaceState = {
  members: Map<string, PresenceState>;
  annotations: Map<string, Annotation>;
  activity: ActivityEvent[];
  entities: Map<string, EntityState>;
};

export type CollaborationHubOptions = {
  activityLimit?: number;
  presenceThrottleMs?: number;
};

export class CollaborationHub {
  private readonly namespace;
  private readonly socketWorkspace = new Map<string, string>();
  private readonly workspaceState = new Map<string, WorkspaceState>();
  private readonly activityLimit: number;
  private readonly presenceThrottleMs: number;
  private readonly presenceChannels = new Map<
    string,
    Map<string, Map<string, PresenceChannelState>>
  >();
  private readonly socketPresenceChannel = new Map<
    string,
    { workspaceId: string; channel: string; userId: string }
  >();
  private readonly lastPresenceUpdate = new Map<string, number>();

  constructor(io: Server, options: CollaborationHubOptions = {}) {
    this.namespace = io.of('/collaboration');
    this.activityLimit = options.activityLimit ?? 200;
    this.presenceThrottleMs = options.presenceThrottleMs ?? 75;
    this.namespace.on('connection', (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: Socket): void {
    socket.on('workspace:join', (payload) => this.handleJoin(socket, payload));
    socket.on('workspace:leave', () => this.handleLeave(socket));
    socket.on('presence:update', (payload) =>
      this.handlePresenceUpdate(socket, payload),
    );
    socket.on('presence:channel:join', (payload) =>
      this.handlePresenceChannelJoin(socket, payload),
    );
    socket.on('presence:channel:leave', () =>
      this.handlePresenceChannelLeave(socket),
    );
    socket.on('presence:channel:update', (payload) =>
      this.handlePresenceChannelUpdate(socket, payload),
    );
    socket.on('chat:message', (payload) => this.handleChat(socket, payload));
    socket.on('annotation:add', (payload) =>
      this.handleAnnotation(socket, 'add', payload),
    );
    socket.on('annotation:update', (payload) =>
      this.handleAnnotation(socket, 'update', payload),
    );
    socket.on('annotation:delete', (payload) =>
      this.handleAnnotation(socket, 'delete', payload),
    );
    socket.on('edit:submit', (payload) => this.handleEdit(socket, payload));
    socket.on('disconnect', () => {
      this.handlePresenceChannelLeave(socket);
      this.handleLeave(socket);
    });
  }

  private handleJoin(
    socket: Socket,
    payload: {
      workspaceId: string;
      userId: string;
      userName: string;
    },
  ): void {
    const { workspaceId, userId, userName } = payload;
    if (!workspaceId || !userId) {return;}

    const workspace = this.getOrCreateWorkspace(workspaceId);
    const presence: PresenceState = {
      userId,
      userName,
      workspaceId,
      status: 'online',
      lastActive: Date.now(),
    };

    workspace.members.set(userId, presence);
    this.socketWorkspace.set(socket.id, workspaceId);
    socket.join(this.roomName(workspaceId));

    this.recordActivity(workspaceId, {
      id: randomUUID(),
      workspaceId,
      type: 'workspace_join',
      description: `${userName} joined workspace`,
      actorId: userId,
      createdAt: Date.now(),
    });

    socket.emit('workspace:joined', this.serializeWorkspace(workspaceId));
    socket
      .to(this.roomName(workspaceId))
      .emit('presence:joined', { ...presence });
    this.namespace
      .to(this.roomName(workspaceId))
      .emit('workspace:activity', this.latestActivity(workspaceId));
  }

  private handleLeave(socket: Socket): void {
    const workspaceId = this.socketWorkspace.get(socket.id);
    if (!workspaceId) {return;}

    const workspace = this.workspaceState.get(workspaceId);
    if (!workspace) {return;}

    const departingUser = [...workspace.members.values()].find(
      (member) => member.workspaceId === workspaceId,
    );

    if (departingUser) {
      workspace.members.delete(departingUser.userId);
      this.recordActivity(workspaceId, {
        id: randomUUID(),
        workspaceId,
        type: 'workspace_leave',
        description: `${departingUser.userName} left workspace`,
        actorId: departingUser.userId,
        createdAt: Date.now(),
      });
      socket
        .to(this.roomName(workspaceId))
        .emit('presence:left', { userId: departingUser.userId });
      this.namespace
        .to(this.roomName(workspaceId))
        .emit('workspace:activity', this.latestActivity(workspaceId));
    }

    this.socketWorkspace.delete(socket.id);
  }

  private handlePresenceChannelJoin(
    socket: Socket,
    payload: { workspaceId: string; channel: string; userId: string; userName: string },
  ): void {
    const { workspaceId, channel, userId, userName } = payload;
    if (!workspaceId || !channel || !userId) {return;}

    this.handlePresenceChannelLeave(socket);

    const channelMembers = this.getOrCreatePresenceChannel(
      workspaceId,
      channel,
    );
    const presence: PresenceChannelState = {
      userId,
      userName,
      workspaceId,
      channel,
      status: 'online',
      lastActive: Date.now(),
    };

    channelMembers.set(userId, presence);
    this.socketPresenceChannel.set(socket.id, { workspaceId, channel, userId });
    socket.join(this.presenceRoomName(workspaceId, channel));

    socket.emit('presence:channel:snapshot', {
      workspaceId,
      channel,
      members: [...channelMembers.values()],
    });
    socket
      .to(this.presenceRoomName(workspaceId, channel))
      .emit('presence:channel:joined', { ...presence });
  }

  private handlePresenceChannelLeave(socket: Socket): void {
    const presenceInfo = this.socketPresenceChannel.get(socket.id);
    if (!presenceInfo) {return;}

    const { workspaceId, channel, userId } = presenceInfo;
    const channelMembers = this.getPresenceChannel(workspaceId, channel);
    if (!channelMembers) {return;}

    channelMembers.delete(userId);
    if (channelMembers.size === 0) {
      const workspaceChannels = this.presenceChannels.get(workspaceId);
      workspaceChannels?.delete(channel);
      if (workspaceChannels?.size === 0) {
        this.presenceChannels.delete(workspaceId);
      }
    }

    socket
      .to(this.presenceRoomName(workspaceId, channel))
      .emit('presence:channel:left', { userId, workspaceId, channel });

    this.socketPresenceChannel.delete(socket.id);
    this.lastPresenceUpdate.delete(socket.id);
  }

  private handlePresenceChannelUpdate(
    socket: Socket,
    payload: {
      workspaceId: string;
      channel: string;
      cursor?: CursorPosition;
      selection?: string;
      status?: 'online' | 'away';
    },
  ): void {
    const presenceInfo = this.socketPresenceChannel.get(socket.id);
    if (!presenceInfo) {return;}

    const { workspaceId, channel, userId } = presenceInfo;
    if (workspaceId !== payload.workspaceId || channel !== payload.channel) {return;}

    const lastUpdate = this.lastPresenceUpdate.get(socket.id) ?? 0;
    if (Date.now() - lastUpdate < this.presenceThrottleMs) {return;}
    this.lastPresenceUpdate.set(socket.id, Date.now());

    const channelMembers = this.getPresenceChannel(workspaceId, channel);
    if (!channelMembers) {return;}

    const presence = channelMembers.get(userId);
    if (!presence) {return;}

    const updated: PresenceChannelState = {
      ...presence,
      cursor: payload.cursor ?? presence.cursor,
      selection: payload.selection ?? presence.selection,
      status: payload.status ?? presence.status,
      lastActive: Date.now(),
    };

    channelMembers.set(userId, updated);
    this.namespace
      .to(this.presenceRoomName(workspaceId, channel))
      .emit('presence:channel:update', { ...updated });
  }

  private handlePresenceUpdate(
    socket: Socket,
    payload: {
      workspaceId: string;
      userId: string;
      cursor?: CursorPosition;
      selection?: string;
      status?: 'online' | 'away';
    },
  ): void {
    const { workspaceId, userId } = payload;
    const workspace = this.workspaceState.get(workspaceId);
    if (!workspace) {return;}

    const presence = workspace.members.get(userId);
    if (!presence) {return;}

    const updated: PresenceState = {
      ...presence,
      ...payload,
      lastActive: Date.now(),
    };
    workspace.members.set(userId, updated);

    this.recordActivity(workspaceId, {
      id: randomUUID(),
      workspaceId,
      type: 'presence_update',
      description: `${presence.userName} moved cursor`,
      actorId: userId,
      createdAt: Date.now(),
    });

    socket
      .to(this.roomName(workspaceId))
      .emit('presence:update', { ...updated });
    this.namespace
      .to(this.roomName(workspaceId))
      .emit('workspace:activity', this.latestActivity(workspaceId));
  }

  private handleChat(
    socket: Socket,
    payload: { workspaceId: string; userId: string; message: string },
  ): void {
    const { workspaceId, userId, message } = payload;
    const workspace = this.workspaceState.get(workspaceId);
    if (!workspace || !message) {return;}

    const chat: ChatMessage = {
      id: randomUUID(),
      workspaceId,
      userId,
      message,
      createdAt: Date.now(),
    };

    this.recordActivity(workspaceId, {
      id: randomUUID(),
      workspaceId,
      type: 'chat',
      description: message,
      actorId: userId,
      createdAt: chat.createdAt,
    });

    this.namespace.to(this.roomName(workspaceId)).emit('chat:message', chat);
    this.namespace
      .to(this.roomName(workspaceId))
      .emit('workspace:activity', this.latestActivity(workspaceId));
  }

  private handleAnnotation(
    socket: Socket,
    action: 'add' | 'update' | 'delete',
    payload: {
      workspaceId: string;
      userId: string;
      targetId: string;
      annotationId?: string;
      body?: string;
    },
  ): void {
    const { workspaceId, userId, targetId } = payload;
    const workspace = this.workspaceState.get(workspaceId);
    if (!workspace || !targetId) {return;}

    const annotationId = payload.annotationId ?? randomUUID();
    const existing = workspace.annotations.get(annotationId);

    if (action === 'delete') {
      workspace.annotations.delete(annotationId);
    } else {
      const now = Date.now();
      const annotation: Annotation = {
        id: annotationId,
        workspaceId,
        targetId,
        userId,
        body: payload.body ?? existing?.body ?? '',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      workspace.annotations.set(annotationId, annotation);
    }

    this.recordActivity(workspaceId, {
      id: randomUUID(),
      workspaceId,
      type: 'annotation',
      description: `${action} annotation on ${targetId}`,
      actorId: userId,
      createdAt: Date.now(),
    });

    this.namespace.to(this.roomName(workspaceId)).emit('annotation:updated', {
      action,
      annotationId,
      targetId,
      workspaceId,
      body: payload.body,
      userId,
    });
    this.namespace
      .to(this.roomName(workspaceId))
      .emit('workspace:activity', this.latestActivity(workspaceId));
  }

  private handleEdit(
    socket: Socket,
    payload: {
      workspaceId: string;
      entityId: string;
      userId: string;
      version: number;
      changes: Record<string, unknown>;
    },
  ): void {
    const { workspaceId, entityId, userId, version, changes } = payload;
    const workspace = this.workspaceState.get(workspaceId);
    if (!workspace || !entityId) {return;}

    const entityState = workspace.entities.get(entityId) ?? {
      version: 0,
    };

    if (version !== entityState.version) {
      const resolution = this.resolveConflict(entityState.lastEdit, {
        workspaceId,
        entityId,
        userId,
        version,
        changes,
        timestamp: Date.now(),
      });
      const resolvedEdit: CollaborationEdit = {
        workspaceId,
        entityId,
        userId,
        version: resolution.resolvedVersion,
        changes: resolution.resolvedChanges,
        timestamp: Date.now(),
      };
      workspace.entities.set(entityId, {
        version: resolution.resolvedVersion,
        lastEdit: resolvedEdit,
      });
      socket.emit('edit:conflict', resolution);
      this.namespace
        .to(this.roomName(workspaceId))
        .emit('edit:applied', resolvedEdit);
      this.recordActivity(workspaceId, {
        id: randomUUID(),
        workspaceId,
        type: 'edit_conflict',
        description: `Conflict on ${entityId} resolved`,
        actorId: userId,
        createdAt: Date.now(),
      });
      this.namespace
        .to(this.roomName(workspaceId))
        .emit('workspace:activity', this.latestActivity(workspaceId));
      return;
    }

    const appliedEdit: CollaborationEdit = {
      workspaceId,
      entityId,
      userId,
      version: entityState.version + 1,
      changes,
      timestamp: Date.now(),
    };

    workspace.entities.set(entityId, {
      version: appliedEdit.version,
      lastEdit: appliedEdit,
    });

    this.namespace
      .to(this.roomName(workspaceId))
      .emit('edit:applied', appliedEdit);
    this.recordActivity(workspaceId, {
      id: randomUUID(),
      workspaceId,
      type: 'edit_applied',
      description: `Edit applied to ${entityId}`,
      actorId: userId,
      createdAt: appliedEdit.timestamp,
    });
    this.namespace
      .to(this.roomName(workspaceId))
      .emit('workspace:activity', this.latestActivity(workspaceId));
  }

  private resolveConflict(
    previousEdit: CollaborationEdit | undefined,
    incoming: CollaborationEdit,
  ): ConflictResolution {
    const mergedChanges = {
      ...(previousEdit?.changes ?? {}),
      ...incoming.changes,
    };

    const resolvedVersion = Math.max(
      previousEdit?.version ?? 0,
      incoming.version,
    ) + 1;

    return {
      strategy: 'last-writer-wins+merge',
      previousVersion: previousEdit?.version ?? 0,
      incomingVersion: incoming.version,
      resolvedVersion,
      resolvedChanges: mergedChanges,
    };
  }

  private getOrCreateWorkspace(workspaceId: string): WorkspaceState {
    if (!this.workspaceState.has(workspaceId)) {
      this.workspaceState.set(workspaceId, {
        members: new Map(),
        annotations: new Map(),
        activity: [],
        entities: new Map(),
      });
    }

    return this.workspaceState.get(workspaceId)!;
  }

  private roomName(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  private presenceRoomName(workspaceId: string, channel: string): string {
    return `presence:${workspaceId}:${channel}`;
  }

  private getOrCreatePresenceChannel(
    workspaceId: string,
    channel: string,
  ): Map<string, PresenceChannelState> {
    const workspaceChannels =
      this.presenceChannels.get(workspaceId) ?? new Map();
    if (!this.presenceChannels.has(workspaceId)) {
      this.presenceChannels.set(workspaceId, workspaceChannels);
    }

    const channelMembers = workspaceChannels.get(channel) ?? new Map();
    if (!workspaceChannels.has(channel)) {
      workspaceChannels.set(channel, channelMembers);
    }

    return channelMembers;
  }

  private getPresenceChannel(
    workspaceId: string,
    channel: string,
  ): Map<string, PresenceChannelState> | undefined {
    return this.presenceChannels.get(workspaceId)?.get(channel);
  }

  private recordActivity(workspaceId: string, event: ActivityEvent): void {
    const workspace = this.getOrCreateWorkspace(workspaceId);
    workspace.activity.unshift(event);

    if (workspace.activity.length > this.activityLimit) {
      workspace.activity = workspace.activity.slice(0, this.activityLimit);
    }
  }

  private latestActivity(workspaceId: string): ActivityEvent[] {
    const workspace = this.workspaceState.get(workspaceId);
    return workspace ? [...workspace.activity] : [];
  }

  private serializeWorkspace(workspaceId: string): {
    workspaceId: string;
    members: PresenceState[];
    annotations: Annotation[];
    activity: ActivityEvent[];
    entities: { entityId: string; version: number }[];
  } {
    const workspace = this.getOrCreateWorkspace(workspaceId);
    return {
      workspaceId,
      members: [...workspace.members.values()],
      annotations: [...workspace.annotations.values()],
      activity: [...workspace.activity],
      entities: [...workspace.entities.entries()].map(([entityId, state]) => ({
        entityId,
        version: state.version,
      })),
    };
  }
}

export const createCollaborationHub = (
  io: Server,
  options?: CollaborationHubOptions,
): CollaborationHub => new CollaborationHub(io, options);
