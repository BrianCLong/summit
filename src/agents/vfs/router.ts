import type { VfsBackend, VfsOp } from './backend';

export type MountMode = 'ro' | 'rw' | 'disabled';

export interface Mount {
  prefix: string;
  backend: VfsBackend;
  mode: MountMode;
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
}

export type VfsPolicyHook = (
  op: VfsOp,
  path: string,
  mount: Mount,
) => PolicyDecision;

interface ResolvedMount {
  mount: Mount;
  normalizedPath: string;
  backendPath: string;
}

export class VfsRouter {
  private readonly mounts: Mount[];
  private readonly policyHook: VfsPolicyHook;

  constructor(
    mounts: Mount[],
    policyHook: VfsPolicyHook = () => ({ allow: true }),
  ) {
    this.mounts = mounts.map((mount) => ({
      ...mount,
      prefix: normalizeVfsPath(mount.prefix),
    }));
    this.policyHook = policyHook;
  }

  resolve(path: string): Mount {
    return this.resolveMount(path).mount;
  }

  async run<T>(
    op: VfsOp,
    path: string,
    execute: (backend: VfsBackend, backendPath: string) => Promise<T>,
  ): Promise<T> {
    const resolved = this.resolveMount(path);
    this.check(op, resolved.normalizedPath, resolved.mount);
    return execute(resolved.mount.backend, resolved.backendPath);
  }

  private resolveMount(path: string): ResolvedMount {
    const normalizedPath = normalizeVfsPath(path);
    const mount = this.mounts
      .filter((candidate) =>
        candidate.prefix === '/'
          ? true
          : normalizedPath === candidate.prefix ||
            normalizedPath.startsWith(`${candidate.prefix}/`),
      )
      .sort((a, b) => b.prefix.length - a.prefix.length)[0];

    if (!mount) {
      throw new Error(`VFS_NO_MOUNT for path=${normalizedPath}`);
    }

    const backendPath =
      mount.prefix === '/'
        ? normalizedPath
        : normalizedPath === mount.prefix
          ? '/'
          : normalizedPath.slice(mount.prefix.length);

    return {
      mount,
      normalizedPath,
      backendPath,
    };
  }

  private check(op: VfsOp, path: string, mount: Mount): void {
    if (mount.mode === 'disabled') {
      throw new Error(`VFS_MOUNT_DISABLED prefix=${mount.prefix}`);
    }

    if ((op === 'write' || op === 'edit') && mount.mode === 'ro') {
      throw new Error(`VFS_READ_ONLY prefix=${mount.prefix}`);
    }

    const decision = this.policyHook(op, path, mount);
    if (!decision.allow) {
      throw new Error(`VFS_POLICY_DENY ${decision.reason ?? ''}`.trim());
    }
  }
}

export function normalizeVfsPath(input: string): string {
  const raw = input.trim().replaceAll('\\', '/');
  if (!raw.startsWith('/')) {
    throw new Error('VFS_PATH_MUST_BE_ABSOLUTE');
  }

  const parts: string[] = [];
  for (const segment of raw.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      throw new Error('VFS_TRAVERSAL_DENY');
    }
    parts.push(segment);
  }

  return `/${parts.join('/')}`;
}
