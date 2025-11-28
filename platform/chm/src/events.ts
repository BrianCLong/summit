import EventEmitter from 'eventemitter3';
import { DocumentTag, ExportContext } from './config.js';

export type ChmEvents = {
  'chm.tag.applied': (tag: DocumentTag) => void;
  'chm.tag.downgraded': (payload: { previous: DocumentTag; downgraded: DocumentTag; approvers: string[] }) => void;
  'chm.tag.violated': (payload: { tag: DocumentTag; context: ExportContext; message: string }) => void;
};

export class ChmEventBus extends EventEmitter<ChmEvents> {
  emitTagApplied(tag: DocumentTag) {
    this.emit('chm.tag.applied', tag);
  }

  emitTagDowngraded(previous: DocumentTag, downgraded: DocumentTag, approvers: string[]) {
    this.emit('chm.tag.downgraded', { previous, downgraded, approvers });
  }

  emitViolation(tag: DocumentTag, context: ExportContext, message: string) {
    this.emit('chm.tag.violated', { tag, context, message });
  }
}
