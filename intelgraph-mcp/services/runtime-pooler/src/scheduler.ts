import pLimit from 'p-limit';
import { randomUUID } from 'crypto';
import { ensurePrewarmedSnapshot, checkoutVm, releaseVm, invokeSandbox, VmHandle } from './vm-pool';
import { createRecording } from './replay-client';

export type Session = {
  id: string;
  vm: VmHandle;
  transport: 'http+sse' | 'stdio';
  createdAt: string;
  recordingId?: string;
};

export class Scheduler {
  private active = new Map<string, Session>();
  private limit = pLimit(Number(process.env.MAX_CONCURRENCY || 128));

  async allocate(toolClass: string): Promise<Session> {
    await ensurePrewarmedSnapshot(toolClass);
    const vm = await checkoutVm(toolClass);
    const id = `sess_${randomUUID()}`;
    const recordingId = await createRecording(id, toolClass);
    const session: Session = {
      id,
      vm,
      transport: 'http+sse',
      createdAt: new Date().toISOString(),
      recordingId
    };
    this.active.set(session.id, session);
    return session;
  }

  async invoke(sessionId: string, fn: string, args: unknown) {
    const session = this.active.get(sessionId);
    if (!session) throw new Error(`session ${sessionId} not found`);
    return this.limit(() => invokeSandbox(session.vm, sessionId, fn, args));
  }

  async release(sessionId: string) {
    const session = this.active.get(sessionId);
    if (!session) return;
    await releaseVm(session.vm);
    this.active.delete(sessionId);
  }

  get(sessionId: string) {
    return this.active.get(sessionId);
  }
}
