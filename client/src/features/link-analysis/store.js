"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAnalysisStore = void 0;
const zustand_1 = require("zustand");
let streamSource = null;
function inflateNodes(batch, existingCount) {
    return batch.map((entity, idx) => {
        const id = entity.id || entity.uuid || `${existingCount + idx}`;
        return {
            id,
            position: {
                x: (existingCount + idx) % 5 * 180,
                y: Math.floor((existingCount + idx) / 5) * 140,
            },
            data: {
                label: entity.label || entity.name || id,
                type: entity.type,
            },
            style: {
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: 8,
                background: '#0B1324',
                color: '#E2E8F0',
            },
        };
    });
}
function stitchEdges(nodes, existingEdges) {
    if (nodes.length < 2)
        return existingEdges;
    const startIdx = existingEdges.length;
    const nextEdges = nodes.slice(1).map((node, idx) => ({
        id: `edge-${startIdx + idx}`,
        source: nodes[idx].id,
        target: node.id,
        animated: true,
        style: { stroke: '#67E8F9' },
    }));
    return [...existingEdges, ...nextEdges];
}
exports.useAnalysisStore = zustand_1.create((set, get) => ({
    timeRange: { start: 0, end: 100 },
    activeQuery: null,
    pinned: new Set(),
    nodes: [],
    edges: [],
    streaming: false,
    lastCursor: null,
    error: null,
    setTimeRange: (range) => set({
        timeRange: {
            start: Math.min(range.start, range.end),
            end: Math.max(range.start, range.end),
        },
    }),
    runQuery: (activeQuery) => set({ activeQuery }),
    togglePinned: (id) => set((s) => {
        const next = new Set(s.pinned);
        next.has(id) ? next.delete(id) : next.add(id);
        return { pinned: next };
    }),
    clearPinned: () => set({ pinned: new Set() }),
    startStream: () => {
        if (streamSource) {
            streamSource.close();
        }
        set({ nodes: [], edges: [], streaming: true, error: null });
        const params = new URLSearchParams({ stream: 'true', limit: '200' });
        const { lastCursor } = get();
        if (lastCursor)
            params.set('cursor', lastCursor);
        const source = new EventSource(`/api/entities?${params.toString()}`);
        streamSource = source;
        source.onmessage = (event) => {
            const payload = JSON.parse(event.data);
            if (payload.type === 'batch') {
                const batchNodes = inflateNodes(payload.items || [], get().nodes.length);
                set((state) => ({
                    nodes: [...state.nodes, ...batchNodes],
                    edges: stitchEdges(batchNodes, state.edges),
                    lastCursor: payload.pageInfo?.nextCursor ?? state.lastCursor,
                }));
            }
            else if (payload.type === 'complete') {
                set({ streaming: false });
                source.close();
                streamSource = null;
            }
            else if (payload.type === 'error') {
                set({ streaming: false, error: payload.message || 'Stream failed' });
                source.close();
                streamSource = null;
            }
        };
        source.onerror = () => {
            set({ streaming: false, error: 'Connection lost' });
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
