import { AgUiEvent, JsonPatchOp } from './types.js';
import { EventEmitter } from 'events';

/**
 * AG-UI Compatible Event Bus
 * Streams tool lifecycle events and state deltas using SSE
 */
export class AgUiBus extends EventEmitter {
  private currentState: any = {};

  constructor() {
    super();
  }

  /**
   * Emit a TOOL_CALL_START event
   */
  public emitToolStart(toolName: string, args: any, runId?: string) {
    this.emitEvent({
      id: crypto.randomUUID(),
      type: 'TOOL_CALL_START',
      timestamp: new Date().toISOString(),
      payload: { toolName, args },
      runId
    });
  }

  /**
   * Update state and emit STATE_DELTA
   */
  public updateState(newState: any, runId?: string) {
    const patches = this.generatePatch(this.currentState, newState);

    if (patches.length > 0) {
      this.emitEvent({
        id: crypto.randomUUID(),
        type: 'STATE_DELTA',
        timestamp: new Date().toISOString(),
        payload: patches,
        runId
      });
    }

    this.currentState = structuredClone(newState);
  }

  /**
   * Emit a full STATE_SNAPSHOT
   */
  public emitSnapshot(runId?: string) {
    this.emitEvent({
      id: crypto.randomUUID(),
      type: 'STATE_SNAPSHOT',
      timestamp: new Date().toISOString(),
      payload: this.currentState,
      runId
    });
  }

  private emitEvent(event: AgUiEvent) {
    this.emit('event', event);
  }

  /**
   * Minimal JSON Patch generator (RFC 6902-ish)
   * MVP status: Only handles simple object property changes.
   * Does not handle array indices or escaping special characters in pointers.
   */
  private generatePatch(oldObj: any, newObj: any, path = ''): JsonPatchOp[] {
    const patches: JsonPatchOp[] = [];

    // This is a very basic implementation. In production, use a library like fast-json-patch.
    const oldKeys = Object.keys(oldObj || {});
    const newKeys = Object.keys(newObj || {});

    // Removed keys
    for (const key of oldKeys) {
      if (!(key in newObj)) {
        patches.push({ op: 'remove', path: `${path}/${key}` });
      }
    }

    // Added or changed keys
    for (const key of newKeys) {
      const oldVal = oldObj?.[key];
      const newVal = newObj[key];

      if (!(key in (oldObj || {}))) {
        patches.push({ op: 'add', path: `${path}/${key}`, value: newVal });
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null && !Array.isArray(newVal)) {
           patches.push(...this.generatePatch(oldVal, newVal, `${path}/${key}`));
        } else {
           patches.push({ op: 'replace', path: `${path}/${key}`, value: newVal });
        }
      }
    }

    return patches;
  }
}
