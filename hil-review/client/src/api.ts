import axios from 'axios';

type Role = 'admin' | 'reviewer' | 'auditor';

export type Actor = {
  id: string;
  name: string;
  role: Role;
};

export const createClient = (actor: Actor | null) => {
  const instance = axios.create({
    baseURL: '/api',
    headers: actor
      ? {
          'x-user-id': actor.id,
          'x-user-role': actor.role,
          'x-user-name': actor.name || actor.id
        }
      : undefined
  });

  return instance;
};
