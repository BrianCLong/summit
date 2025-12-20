// @ts-nocheck
import { collaborationService } from '../services/collaborationService';

class WarRoomSocket {
  constructor() {
    this.init();
  }

  init() {
    console.log('[WAR ROOM] Real-time War Room service initialized');
    // Here you would typically attach listeners to your WebSocket server instance.
    // For this example, we will just log that the service is ready.
  }

  joinRoom(userId: string, warRoomId: string) {
    const message = `User ${userId} joined War Room ${warRoomId}`;
    console.log(`[WAR ROOM] ${message}`);
    collaborationService.pubsub.publish(`WAR_ROOM_${warRoomId}`, {
      notification: {
        type: 'USER_JOINED',
        message,
      },
    });
  }

  leaveRoom(userId: string, warRoomId: string) {
    const message = `User ${userId} left War Room ${warRoomId}`;
    console.log(`[WAR ROOM] ${message}`);
    collaborationService.pubsub.publish(`WAR_ROOM_${warRoomId}`, {
      notification: {
        type: 'USER_LEFT',
        message,
      },
    });
  }
}

export const warRoomSocket = new WarRoomSocket();
