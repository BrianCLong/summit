export type Mode = 'ask' | 'edit' | 'agent';

export interface WorkflowRequest {
    mode?: Mode;
    intent: string;
}

export class ModeRouter {
    route(request: WorkflowRequest): Mode {
        if (!request.mode) {
            throw new Error("Workflow request must declare a mode");
        }

        if (!['ask', 'edit', 'agent'].includes(request.mode)) {
             throw new Error(`Invalid mode: ${request.mode}`);
        }

        return request.mode;
    }
}
