import { Recording } from './model';

const mem = new Map<string, Recording>();

export const Storage = {
  save(rec: Recording) {
    mem.set(rec.id, rec);
    return rec.id;
  },
  get(id: string) {
    return mem.get(id);
  }
};
