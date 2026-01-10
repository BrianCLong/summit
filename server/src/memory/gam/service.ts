import { HybridIndex } from './indexers.js';
import { GamMemorizer, defaultFeatureFlag } from './memorizer.js';
import { Researcher } from './researcher.js';
import { BriefingContext, BuildContextRequest, IngestResponse, IngestSessionRequest } from './types.js';

const sharedIndex = new HybridIndex();
const featureEnabled = () => defaultFeatureFlag();
const memorizer = new GamMemorizer(sharedIndex, featureEnabled);
const researcher = new Researcher(sharedIndex, featureEnabled);

export class GamMemoryService {
  async ingestSession(payload: IngestSessionRequest): Promise<IngestResponse> {
    return memorizer.ingest(payload);
  }

  async buildContext(payload: BuildContextRequest): Promise<BriefingContext> {
    return researcher.buildContext(payload);
  }
}

export const gamMemoryService = new GamMemoryService();
