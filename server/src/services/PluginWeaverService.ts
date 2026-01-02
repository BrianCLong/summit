
type PluginPipe = (data: any) => Promise<any>;

export class PluginWeaverService {
  private static instance: PluginWeaverService;
  private pipes: Map<string, PluginPipe[]> = new Map();

  private constructor() {}

  public static getInstance(): PluginWeaverService {
    if (!PluginWeaverService.instance) {
      PluginWeaverService.instance = new PluginWeaverService();
    }
    return PluginWeaverService.instance;
  }

  public registerPipe(sourceEvent: string, pipe: PluginPipe) {
    if (!this.pipes.has(sourceEvent)) {
      this.pipes.set(sourceEvent, []);
    }
    this.pipes.get(sourceEvent)?.push(pipe);
  }

  public async emit(sourceEvent: string, data: any) {
    const handlers = this.pipes.get(sourceEvent) || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (e: any) {
        console.error(`[PluginWeaver] Pipe error on ${sourceEvent}:`, e);
      }
    }
  }
}
