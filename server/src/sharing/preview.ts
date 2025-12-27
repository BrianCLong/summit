import { computePlan } from './store.js';
import { Permission, SharingScope } from './types.js';

export const planShare = (input: {
  scope: SharingScope;
  resources: string[];
  permissions: Permission[];
  labelId?: string;
}) => computePlan(input);
