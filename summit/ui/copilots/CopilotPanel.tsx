import type { InvestigationMemoryRecord } from '../memory/InvestigationMemory';
import type { IntelGraphNode } from '../integration/intelgraphTypes';

export interface CopilotContext {
  currentGraphView: { visibleNodes: IntelGraphNode[]; visibleEdges: number };
  selectedEntities: IntelGraphNode[];
  timelineEvents: InvestigationMemoryRecord['timeline'];
  memory: InvestigationMemoryRecord;
}

interface CopilotPanelProps {
  context: CopilotContext;
}

export function CopilotPanel({ context }: CopilotPanelProps) {
  return (
    <aside aria-label="copilot-panel">
      <h2>Agent Copilot</h2>
      <p>Selected entities: {context.selectedEntities.length}</p>
      <p>Timeline events: {context.timelineEvents.length}</p>
    </aside>
  );
}
