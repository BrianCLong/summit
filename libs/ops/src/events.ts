let emitter: { emit: (topic: string, msg: unknown) => Promise<void> } | null = null;

export function setEmitter(handler: {
  emit: (topic: string, msg: unknown) => Promise<void>;
}): void {
  emitter = handler;
}

export async function emit(topic: string, msg: unknown): Promise<void> {
  if (!emitter) {
    return;
  }

  await emitter.emit(topic, msg);
}
