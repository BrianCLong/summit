
export class PromptRegistry {
    constructor() { }
    async initialize() { return Promise.resolve(); }
    getPrompt() { return {}; }
    render() { return ''; }
}
export const promptRegistry = new PromptRegistry();
