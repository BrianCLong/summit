export class ComfyClient {
  constructor(private baseUrl: string) {}
  async runGraph(graphJson: any, params: Record<string, any> = {}) {
    // Scaffold: POST to ComfyUI /prompt endpoint, poll for results
    return { id: `comfy-${Date.now()}`, status: 'QUEUED', outputs: [] };
  }
}
