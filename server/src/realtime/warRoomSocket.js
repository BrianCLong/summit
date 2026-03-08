"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warRoomSocket = void 0;
// @ts-nocheck
const collaborationService_js_1 = require("../services/collaborationService.js");
class WarRoomSocket {
    constructor() {
        this.init();
    }
    init() {
        console.log('[WAR ROOM] Real-time War Room service initialized');
        // Here you would typically attach listeners to your WebSocket server instance.
        // For this example, we will just log that the service is ready.
    }
    joinRoom(userId, warRoomId) {
        const message = `User ${userId} joined War Room ${warRoomId}`;
        console.log(`[WAR ROOM] ${message}`);
        collaborationService_js_1.collaborationService.pubsub.publish(`WAR_ROOM_${warRoomId}`, {
            notification: {
                type: 'USER_JOINED',
                message,
            },
        });
    }
    leaveRoom(userId, warRoomId) {
        const message = `User ${userId} left War Room ${warRoomId}`;
        console.log(`[WAR ROOM] ${message}`);
        collaborationService_js_1.collaborationService.pubsub.publish(`WAR_ROOM_${warRoomId}`, {
            notification: {
                type: 'USER_LEFT',
                message,
            },
        });
    }
}
exports.warRoomSocket = new WarRoomSocket();
