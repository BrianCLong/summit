/**
 * Summit War Room — Public API
 *
 * Central export barrel for the War Room operational interface.
 */

// Core
export { WarRoomApp, default } from './WarRoomApp';
export { WarRoomWorkspace } from './WarRoomWorkspace';
export { WarRoomCanvas } from './WarRoomCanvas';
export { WarRoomToolbar } from './WarRoomToolbar';
export { WarRoomSidebar } from './WarRoomSidebar';
export { WarRoomContextPanel } from './WarRoomContextPanel';
export { WarRoomThemeProvider } from './WarRoomThemeProvider';
export { WarRoomCommandPalette } from './WarRoomCommandPalette';
export { WarRoomPresence } from './WarRoomPresence';
export { WarRoomComments } from './WarRoomComments';
export { ActivityStream } from './ActivityStream';

// Store
export { useWarRoomStore } from './store';
export type { WarRoomState } from './store';

// Types
export type {
  PanelId,
  PanelState,
  PanelDescriptor,
  WorkspaceLayout,
  Investigation,
  InvestigationStatus,
  Priority,
  ConfidenceLevel,
  Hypothesis,
  GraphEntity,
  GraphRelationship,
  GraphQuery,
  TimelineEvent,
  EvidenceItem,
  ProvenanceRecord,
  Source,
  SourceReliability,
  AgentTask,
  AgentStatus,
  ReasoningStep,
  Simulation,
  SimulationStatus,
  ScenarioNode,
  SimulationOutcome,
  Collaborator,
  Annotation,
  Comment,
  CommandItem,
} from './types';

// Graph Intelligence
export { GraphCanvas } from './graph/GraphCanvas';
export { GraphExplorer } from './graph/GraphExplorer';
export { GraphQueryBar } from './graph/GraphQueryBar';
export { EntityInspector } from './graph/EntityInspector';
export { RelationshipPanel } from './graph/RelationshipPanel';

// Timeline Fusion
export { TimelineCanvas } from './timeline/TimelineCanvas';
export { EventFusionView } from './timeline/EventFusionView';
export { NarrativeBuilder } from './timeline/NarrativeBuilder';
export { EventInspector } from './timeline/EventInspector';

// Agent Operations
export { AgentConsole } from './agents/AgentConsole';
export { AgentTaskPanel } from './agents/AgentTaskPanel';
export { AgentTelemetry } from './agents/AgentTelemetry';
export { AgentTrajectoryViewer } from './agents/AgentTrajectoryViewer';

// Simulation
export { SimulationBuilder } from './simulation/SimulationBuilder';
export { SimulationRunner } from './simulation/SimulationRunner';
export { ScenarioTree } from './simulation/ScenarioTree';
export { OutcomeExplorer } from './simulation/OutcomeExplorer';

// Evidence & Provenance
export { EvidencePanel } from './evidence/EvidencePanel';
export { SourceInspector } from './evidence/SourceInspector';
export { ProvenanceGraph } from './evidence/ProvenanceGraph';
export { CitationViewer } from './evidence/CitationViewer';

// Visualization
export { NetworkGraph } from './visualization/NetworkGraph';
export { RiskHeatmap } from './visualization/RiskHeatmap';
export { TemporalMap } from './visualization/TemporalMap';
export { AgentTrajectoryMap } from './visualization/AgentTrajectoryMap';
