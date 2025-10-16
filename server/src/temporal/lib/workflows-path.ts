// Export a dummy workflows path to satisfy worker.create without bundling
// In a real deployment, point to compiled JS workflows
export default new URL('./workflows.js', import.meta.url).pathname;
