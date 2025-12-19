import { GraphQLError } from 'graphql';

// In a real-world scenario, this would involve a database lookup
// to check the user's role for a specific War Room.
// For this MVP, we will simulate this check.

export const checkAuth = (context: any) => {
  if (!context.user || !context.user.id) {
    throw new GraphQLError('User is not authenticated', {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
};

export const checkWarRoomAdmin = async (context: any, warRoomId: number) => {
  checkAuth(context);
  const userId = context.user.id;

  //
  // In a real application, you would query the database to verify the user's role.
  // For example:
  // const { rows } = await db.query(
  //   'SELECT role FROM war_room_participants WHERE war_room_id = $1 AND user_id = $2',
  //   [warRoomId, userId]
  // );
  // const role = rows[0]?.role;
  // if (role !== 'ADMIN') { ... }
  //

  // For now, we'll assume the check passes if the user is authenticated.
  // This is a placeholder for a real permission check.
  console.log(`[AUTH] User ${userId} is assumed to be an admin for War Room ${warRoomId}.`);
};
