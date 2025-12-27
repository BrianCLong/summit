import { Permission, ShareLink } from './types.js';

export const hasPermission = (link: ShareLink, permission: Permission): boolean => {
  return link.permissions.includes(permission);
};

export const allowedActions = (link: ShareLink): Permission[] => {
  return [...link.permissions];
};
