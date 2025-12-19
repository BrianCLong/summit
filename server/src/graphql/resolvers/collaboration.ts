import { warRoomService } from '../../collaboration/warRoomService';
import { collaborationService } from '../../services/collaborationService'; // for pubsub
import { checkAuth, checkWarRoomAdmin } from '../../middleware/warRoomAuth';

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
    // createdBy resolver can be added here if needed, to fetch user details
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
