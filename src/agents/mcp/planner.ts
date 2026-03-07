export class McpPlanner {
  planTask(task: string) {
    return { steps: [`Decompose ${task}`, `Execute parts of ${task}`] };
  }
}
