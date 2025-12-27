import { createLabel, getLabel } from './store.js';
import { LabelMetadata } from './types.js';

export const createImmutableLabel = (payload: Omit<LabelMetadata, 'id' | 'generatedAt'>) => {
  return createLabel(payload);
};

export const assertLabelImmutable = (existing?: LabelMetadata, incomingId?: string) => {
  if (existing && incomingId && existing.id !== incomingId) {
    throw new Error('label_is_immutable');
  }
};

export const getLabelMetadata = (id?: string) => getLabel(id);
