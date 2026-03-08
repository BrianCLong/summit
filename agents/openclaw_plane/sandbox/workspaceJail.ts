import * as path from 'path';

export function assertWithinWorkspace(root: string, candidate: string): string {
  const resolved = path.resolve(root, candidate);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error('WORKSPACE_ESCAPE_BLOCKED');
  }
  return resolved;
}
