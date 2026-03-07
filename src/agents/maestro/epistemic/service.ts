import { evaluateIntent } from './api';

export class EpistemicService {
  public async handleEvaluate(req: any) {
    return evaluateIntent(req);
  }
}
