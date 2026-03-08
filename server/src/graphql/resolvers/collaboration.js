"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collaborationResolvers = void 0;
// @ts-nocheck
const warRoomService_js_1 = require("../../collaboration/warRoomService.js");
const collaborationService_js_1 = require("../../services/collaborationService.js"); // for pubsub
const warRoomAuth_js_1 = require("../../middleware/warRoomAuth.js");
exports.collaborationResolvers = {
    Query: {
        warRoom: async (_, { id }) => {
            return warRoomService_js_1.warRoomService.getWarRoom(id);
        },
        warRooms: async () => {
            return warRoomService_js_1.warRoomService.getWarRooms();
        },
    },
    Mutation: {
        createWarRoom: async (_, { name }, context) => {
            (0, warRoomAuth_js_1.checkAuth)(context);
            const createdBy = context.user.id;
            return warRoomService_js_1.warRoomService.createWarRoom(name, createdBy);
        },
        addParticipant: async (_, { warRoomId, userId, role }, context) => {
            await (0, warRoomAuth_js_1.checkWarRoomAdmin)(context, warRoomId);
            await warRoomService_js_1.warRoomService.addParticipant(warRoomId, userId, role);
            const warRoom = await warRoomService_js_1.warRoomService.getWarRoom(warRoomId);
            // Publish subscription event
            collaborationService_js_1.collaborationService.pubsub.publish('PARTICIPANT_ADDED', { participantAdded: { warRoom } });
            return warRoom;
        },
        removeParticipant: async (_, { warRoomId, userId }, context) => {
            await (0, warRoomAuth_js_1.checkWarRoomAdmin)(context, warRoomId);
            await warRoomService_js_1.warRoomService.removeParticipant(warRoomId, userId);
            const warRoom = await warRoomService_js_1.warRoomService.getWarRoom(warRoomId);
            // Publish subscription event
            collaborationService_js_1.collaborationService.pubsub.publish('PARTICIPANT_REMOVED', { participantRemoved: { warRoom } });
            return warRoom;
        },
    },
    WarRoom: {
        participants: async (warRoom) => {
            return warRoomService_js_1.warRoomService.getParticipants(warRoom.id);
        },
        createdBy: async (warRoom) => {
            // Assuming a userService exists to fetch user details
            // import { userService } from '../../services/userService.js';
            // return userService.getUser(warRoom.created_by);
            return { id: warRoom.created_by, name: 'Dummy User' }; // Placeholder
        },
        createdAt: (warRoom) => new Date(warRoom.created_at).toISOString(),
    },
    WarRoomParticipant: {
        user: async (participant) => {
            // Assuming a userService exists to fetch user details
            // return userService.getUser(participant.user_id);
            return { id: participant.user_id, name: 'Dummy User' }; // Placeholder
        },
        joinedAt: (participant) => new Date(participant.joined_at).toISOString(),
    },
    Subscription: {
        participantAdded: {
            subscribe: () => collaborationService_js_1.collaborationService.pubsub.asyncIterator(['PARTICIPANT_ADDED'])
        },
        participantRemoved: {
            subscribe: () => collaborationService_js_1.collaborationService.pubsub.asyncIterator(['PARTICIPANT_REMOVED'])
        }
    }
};
