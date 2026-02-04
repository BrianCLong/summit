export class ReplayClient {
  private readonly responses: string[];
  private index = 0;

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async complete(): Promise<string> {
    if (this.index >= this.responses.length) {
      throw new Error('ReplayClient exhausted responses');
    }
    const response = this.responses[this.index];
    this.index += 1;
    return response;
  }
}
