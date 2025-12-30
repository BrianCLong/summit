// @ts-nocheck
import { warRoomService } from '../../collaboration/warRoomService.js';
import { collaborationService } from '../../services/collaborationService.js'; // for pubsub
import { checkAuth, checkWarRoomAdmin } from '../../middleware/warRoomAuth.js';

export const collaborationResolvers = {
  Query: {
    warRoom: async (_: any, { id }: { id: number }) => {
      return warRoomService.getWarRoom(id);
    },
    warRooms: async () => {
      return warRoomService.getWarRooms();
    },
  },
  Mutation: {
    createWarRoom: async (_: any, { name }: { name: string }, context: any) => {
      checkAuth(context);
      const createdBy = context.user.id;
      return warRoomService.createWarRoom(name, createdBy);
    },
    addParticipant: async (
      _: any,
      { warRoomId, userId, role }: { warRoomId: number; userId: number; role: string },
      context: any
    ) => {
      await checkWarRoomAdmin(context, warRoomId);
      await warRoomService.addParticipant(warRoomId, userId, role);
      const warRoom = await warRoomService.getWarRoom(warRoomId);
      // Publish subscription event
      collaborationService.pubsub.publish('PARTICIPANT_ADDED', { participantAdded: { warRoom } });
      return warRoom;
    },
    removeParticipant: async (
      _: any,
      { warRoomId, userId }: { warRoomId: number; userId: number },
      context: any
    ) => {
      await checkWarRoomAdmin(context, warRoomId);
      await warRoomService.removeParticipant(warRoomId, userId);
      const warRoom = await warRoomService.getWarRoom(warRoomId);
       // Publish subscription event
      collaborationService.pubsub.publish('PARTICIPANT_REMOVED', { participantRemoved: { warRoom } });
      return warRoom;
    },
  },
  WarRoom: {
    participants: async (warRoom: { id: number }) => {
      return warRoomService.getParticipants(warRoom.id);
    },
    createdBy: async (warRoom: { created_by: number }) => {
      // Assuming a userService exists to fetch user details
      // import { userService } from '../../services/userService.js';
      // return userService.getUser(warRoom.created_by);
      return { id: warRoom.created_by, name: 'Dummy User' }; // Placeholder
    },
    createdAt: (warRoom: { created_at: string }) => new Date(warRoom.created_at).toISOString(),
  },
  WarRoomParticipant: {
    user: async (participant: { user_id: number }) => {
      // Assuming a userService exists to fetch user details
      // return userService.getUser(participant.user_id);
      return { id: participant.user_id, name: 'Dummy User' }; // Placeholder
    },
    joinedAt: (participant: { joined_at: string }) => new Date(participant.joined_at).toISOString(),
  },
  Subscription: {
    participantAdded: {
      subscribe: () => collaborationService.pubsub.asyncIterator(['PARTICIPANT_ADDED'])
    },
    participantRemoved: {
      subscribe: () => collaborationService.pubsub.asyncIterator(['PARTICIPANT_REMOVED'])
    }
  }
};
