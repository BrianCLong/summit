import { GenerativeInterface } from '../schema/interface.schema';

export class UIDiffEngine {
  applyDiff(current: GenerativeInterface, next: GenerativeInterface): GenerativeInterface {
    // In the future: diff and apply UI mutations
    return next;
  }
}
