
export class PolicyEngine {
    private static instance: PolicyEngine;
    static getInstance() {
        if (!PolicyEngine.instance) PolicyEngine.instance = new PolicyEngine();
        return PolicyEngine.instance;
    }
    async initialize() { return Promise.resolve(); }
    async evaluate() { return Promise.resolve({ allow: true }); }
    middleware() { return (req: any, res: any, next: any) => next(); }
}
