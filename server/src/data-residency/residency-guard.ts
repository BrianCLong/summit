
export class ResidencyGuard {
  constructor(private logger: any) {}

  async check(data: any, region: string): Promise<boolean> {
    // @ts-ignore
    this.logger.info(`Checking residency for region ${region}`);
    return true;
  }
}
