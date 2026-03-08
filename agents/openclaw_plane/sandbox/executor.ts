import { assertWithinWorkspace } from './workspaceJail';
import { isCapabilityAllowed } from '../security/denyByDefault';

export class Executor {
  private workspaceRoot: string;
  private allowlist: Record<string, boolean>;

  constructor(workspaceRoot: string, allowlist: Record<string, boolean>) {
    this.workspaceRoot = workspaceRoot;
    this.allowlist = allowlist;
  }

  async executeTool(capability: string, payload: any): Promise<any> {
    if (!isCapabilityAllowed(capability, this.allowlist)) {
      throw new Error(`CAPABILITY_DENIED: ${capability}`);
    }

    if (payload && payload.path) {
      assertWithinWorkspace(this.workspaceRoot, payload.path);
    }

    // TODO: implement tool orchestration
    return { status: 'executed', capability };
  }
}
