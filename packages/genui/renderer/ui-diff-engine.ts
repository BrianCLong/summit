import { GenerativeInterface } from '../schema/interface.schema';

export class UIDiffEngine {
  applyDiff(current: GenerativeInterface, next: GenerativeInterface): GenerativeInterface {
    // Basic implementation: just replace for now
    return next;
  }
}
