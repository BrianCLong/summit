export declare const RT_NS: {
    readonly COLLAB: "/collab";
};
export declare const EVT: {
    readonly PRESENCE: "presence";
    readonly NOTE_EDIT: "note.edit";
    readonly GRAPH_MUT: "graph.mutate";
    readonly GRAPH_LOCK: "graph.lock";
    readonly TOAST: "ui.toast";
};
export interface PresencePayload {
    userId: string;
    investigationId: string;
    cursor?: {
        x: number;
        y: number;
    };
    ts: string;
}
export interface GraphMutatePayload {
    investigationId: string;
    ops: Array<{
        kind: 'addNode';
        node: {
            id: string;
            type: string;
            value: string;
        };
    } | {
        kind: 'addEdge';
        edge: {
            id: string;
            source: string;
            target: string;
            type: string;
        };
    } | {
        kind: 'updateNode';
        id: string;
        patch: Record<string, unknown>;
    } | {
        kind: 'deleteNode';
        id: string;
    } | {
        kind: 'deleteEdge';
        id: string;
    }>;
    clientId: string;
    ts: string;
}
