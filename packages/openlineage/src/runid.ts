import { v7 as uuidv7 } from 'uuid';

export function generateRunId(): string {
  return uuidv7();
}
