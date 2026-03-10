// TODO: Full implementation.

export interface GraphSnapshot {
  snapshotId: string;
  entities: any[];
  relationships: any[];
}

export interface PolicyEnvelope {
  version: string;
  allowlist: string[];
}

export interface DataBindingSpec {
  source: string;
  query: string;
}

export interface InteractionSpec {
  event: string;
  action: string;
}

export interface WidgetSpec {
  id: string;
  type: string;
  dataBinding: DataBindingSpec;
  interactions?: InteractionSpec[];
}

export interface PanelSpec {
  id: string;
  title: string;
  widgets: WidgetSpec[];
}

export interface SurfacePlan {
  evidenceId: string;
  surfaceSlug: string;
  templateId: string;
  graphSnapshotId: string;
  panels: PanelSpec[];
  policy: PolicyEnvelope;
}

export function defaultPolicyEnvelope(): PolicyEnvelope {
  return {
    version: "1.0",
    allowlist: ["timeline", "entity-card", "graph-view"],
  };
}

export function planSurfaceFromGraph(input: GraphSnapshot): SurfacePlan {
  return {
    evidenceId: "APS-surface-plan-001",
    surfaceSlug: "investigation-overview",
    templateId: "investigation-dashboard-v1",
    graphSnapshotId: input.snapshotId,
    panels: [
      {
        id: "panel-timeline-01",
        title: "Investigation Timeline",
        widgets: [
          {
            id: "widget-timeline-01",
            type: "timeline",
            dataBinding: { source: "snapshot", query: "MATCH (e:Event) RETURN e ORDER BY e.timestamp ASC" }
          }
        ]
      }
    ],
    policy: defaultPolicyEnvelope(),
  };
}
