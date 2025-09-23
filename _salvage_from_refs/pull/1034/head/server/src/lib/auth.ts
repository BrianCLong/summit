import { GraphQLError } from 'graphql';

export const getContext = async () => {
  return {};
};

export const verifyToken = async (token: string) => {
  // Placeholder for actual token verification logic
  // In a real app, this would decode and validate JWTs
  if (token === 'valid-token') {
    return { id: 'test-user', email: 'test@example.com' };
  }
  throw new GraphQLError('Unauthorized', {
    extensions: {
      code: 'UNAUTHENTICATED',
      http: { status: 401 },
    },
  });
};