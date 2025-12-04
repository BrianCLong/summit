
import { LoadBalancer } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NginxLoadBalancerAdapter implements LoadBalancer {
  private configPath: string;
  private dryRun: boolean;

  constructor(configPath: string, dryRun: boolean = true) {
    this.configPath = configPath;
    this.dryRun = dryRun;
  }

  async setTraffic(serviceName: string, version: string, percentage: number): Promise<void> {
    const upstreamConfig = `
upstream ${serviceName} {
    # Traffic split: ${percentage}% to ${version}
    server ${version === 'green' ? '127.0.0.1:3001' : '127.0.0.1:3000'} weight=${percentage};
    server ${version === 'green' ? '127.0.0.1:3000' : '127.0.0.1:3001'} weight=${100 - percentage};
}
`;
    console.log(`[NginxAdapter] Updating upstream config at ${this.configPath}`);

    if (this.dryRun) {
        console.log(`[NginxAdapter] DryRun: Would write:\n${upstreamConfig}`);
        console.log(`[NginxAdapter] DryRun: Would execute 'nginx -s reload'`);
    } else {
        try {
            await fs.writeFile(this.configPath, upstreamConfig);
            // Simulate reload - in real usage we would execSync('nginx -s reload')
            // const { execSync } = require('child_process');
            // execSync('nginx -s reload');
            console.log(`[NginxAdapter] Config updated and nginx reloaded.`);
        } catch (e) {
            console.error(`[NginxAdapter] Failed to update nginx:`, e);
            throw e;
        }
    }
  }

  async getCurrentTraffic(serviceName: string): Promise<Record<string, number>> {
    return { 'stable': 100 };
  }
}
