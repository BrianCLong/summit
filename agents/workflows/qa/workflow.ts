export function executeQAWorkflow(query: string, context: string[]) {
  return `Answering ${query} with context size ${context.length}`;
}
