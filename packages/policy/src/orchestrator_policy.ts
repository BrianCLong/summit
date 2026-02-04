export class OrchestratorPolicy {
    checkPermission(action: string, context: any): boolean {
        // MWS implementation mimicking Rego
        if (action === 'start_task') return true;
        if (action === 'complete_task') return true;

        if (action === 'approve_join') {
            return context.user?.id === context.team?.leadAgentId;
        }

        return false;
    }
}
