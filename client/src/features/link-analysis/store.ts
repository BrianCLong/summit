import { create } from "zustand";
// import type { Edge, Node } from 'reactflow';
type Edge = any;
type Node = any;

interface TimeRange {
  start: number;
  end: number;
}

interface PageInfo {
  nextCursor?: string | null;
  hasMore?: boolean;
}

interface AnalysisState {
  timeRange: TimeRange;
  activeQuery: string | null;
  pinned: Set<string>;
  nodes: Node[];
  edges: Edge[];
  streaming: boolean;
  lastCursor: string | null;
  error: string | null;
  setTimeRange: (range: TimeRange) => void;
  runQuery: (query: string) => void;
  togglePinned: (id: string) => void;
  clearPinned: () => void;
  startStream: () => void;
  stopStream: () => void;
}

let streamSource: EventSource | null = null;

function inflateNodes(batch: any[], existingCount: number): Node[] {
  return batch.map((entity, idx) => {
    const id = entity.id || entity.uuid || `${existingCount + idx}`;
    return {
      id,
      position: {
        x: ((existingCount + idx) % 5) * 180,
        y: Math.floor((existingCount + idx) / 5) * 140,
      },
      data: {
        label: entity.label || entity.name || id,
        type: entity.type,
      },
      style: {
        border: "1px solid #CBD5E1",
        borderRadius: 8,
        padding: 8,
        background: "#0B1324",
        color: "#E2E8F0",
      },
    } satisfies Node;
  });
}

function stitchEdges(nodes: Node[], existingEdges: Edge[]): Edge[] {
  if (nodes.length < 2) return existingEdges;
  const startIdx = existingEdges.length;
  const nextEdges: Edge[] = nodes.slice(1).map((node, idx) => ({
    id: `edge-${startIdx + idx}`,
    source: nodes[idx].id,
    target: node.id,
    animated: true,
    style: { stroke: "#67E8F9" },
  }));
  return [...existingEdges, ...nextEdges];
}

export const useAnalysisStore = (create as any)((set: any, get: any) => ({
  timeRange: { start: 0, end: 100 },
  activeQuery: null,
  pinned: new Set<string>(),
  nodes: [],
  edges: [],
  streaming: false,
  lastCursor: null,
  error: null,
  setTimeRange: (range: TimeRange) =>
    set({
      timeRange: {
        start: Math.min(range.start, range.end),
        end: Math.max(range.start, range.end),
      },
    }),
  runQuery: (activeQuery: string) => set({ activeQuery }),
  togglePinned: (id: string) =>
    set((s: any) => {
      const next = new Set(s.pinned);
      next.has(id) ? next.delete(id) : next.add(id);
      return { pinned: next } as any;
    }),
  clearPinned: () => set({ pinned: new Set<string>() }),
  startStream: () => {
    if (streamSource) {
      streamSource.close();
    }

    set({ nodes: [], edges: [], streaming: true, error: null });

    const params = new URLSearchParams({ stream: "true", limit: "200" });
    const { lastCursor } = get();
    if (lastCursor) params.set("cursor", lastCursor);

    const source = new EventSource(`/api/entities?${params.toString()}`);
    streamSource = source;

    source.onmessage = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "batch") {
        const batchNodes = inflateNodes(payload.items || [], get().nodes.length);
        set((state: any) => ({
          nodes: [...state.nodes, ...batchNodes],
          edges: stitchEdges(batchNodes, state.edges),
          lastCursor: (payload.pageInfo as PageInfo)?.nextCursor ?? (state as any).lastCursor,
        }));
      } else if (payload.type === "complete") {
        set({ streaming: false });
        source.close();
        streamSource = null;
      } else if (payload.type === "error") {
        set({ streaming: false, error: payload.message || "Stream failed" });
        source.close();
        streamSource = null;
      }
    };

    source.onerror = () => {
      set({ streaming: false, error: "Connection lost" });
      source.close();
      streamSource = null;
    };
  },
  stopStream: () => {
    if (streamSource) {
      streamSource.close();
      streamSource = null;
    }
    set({ streaming: false });
  },
}));
