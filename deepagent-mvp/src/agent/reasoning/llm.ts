// A mock LLM that returns a sequence of actions to simulate a multi-step task.
export class LLM {
  private step = 0;
  private actions = [
    { type: 'search_tools', query: 'customer support ticket' },
    { type: 'call_tool', toolId: 'createTicket', name: 'createTicket', params: { title: 'My computer is on fire', description: 'The issue is critical and requires immediate attention.' } },
    { type: 'fold_memory', reason: 'Summarizing progress after ticket creation.' },
    { type: 'finish', answer: 'I have created a ticket for you. The ID is 789.', evidence: ['ticketId: 789'] }
  ];

  public async generate(options: { system: string; prompt: string; }): Promise<string> {
    // This mock ignores the prompt and system message and just returns the next action in the sequence.
    if (this.step < this.actions.length) {
      const action = this.actions[this.step];
      this.step++;
      return JSON.stringify(action);
    }
    // If the sequence is exhausted, keep returning the finish action.
    return JSON.stringify({ type: 'finish', answer: 'All steps are done.', evidence: [] });
  }
}
