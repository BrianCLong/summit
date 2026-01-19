import { ChangeEvent } from '../domain/ChangeEvent.js';

export async function* logicalStream(): AsyncGenerator<ChangeEvent> {
  // Placeholder: wired in later to pgoutput / wal2json
  return;
}
