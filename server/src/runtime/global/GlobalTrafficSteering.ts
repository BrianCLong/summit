
export class GlobalTrafficSteering {
  constructor(private logger: any) {}

  async route(request: any): Promise<string> {
    // @ts-ignore
    this.logger.info('Routing request');
    return 'us-east-1';
  }
}
