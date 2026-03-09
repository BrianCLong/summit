/**
 * Intelligence OS — Barrel export
 *
 * Single entry point for all Intelligence OS UI modules.
 *
 *   import { InvestigationMemoryPanel, CopilotPanel, ... } from '@/components/intelligence-os';
 */

// Phase 1 — Investigation Memory
export {
  InvestigationMemoryPanel,
  MemoryTimeline,
  MemoryGraph,
  MemorySearch,
  MemoryNotes,
} from './memory';

// Phase 2 — Agent Copilots
export {
  CopilotPanel,
  CopilotChat,
  CopilotSuggestions,
  CopilotTaskRunner,
} from './copilots';

// Phase 3 — Narrative Intelligence
export {
  NarrativeBuilder,
  NarrativeTimeline,
  NarrativeExplorer,
  NarrativeComparison,
} from './narratives';

// Phase 4 — Automated Insight Discovery
export {
  InsightFeed,
  InsightExplorer,
  InsightGraph,
  InsightExplanation,
} from './insights';

// Phase 5 — Mission Dashboards
export {
  MissionDashboard,
  MissionTimeline,
  MissionEntities,
  MissionStatus,
} from './missions';

// Phase 6 — Intelligence Search
export {
  GlobalSearch,
  SearchResults,
  EntitySearch,
  EventSearch,
} from './search';

// Phase 7 — Intelligence Command System
export { IOSCommandPalette } from './ios-command';
