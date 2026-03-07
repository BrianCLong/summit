import * as fs from 'fs/promises';
import { assertWithinWorkspace } from '../sandbox/workspaceJail';

export async function workspaceRead(root: string, targetPath: string): Promise<string> {
  const safePath = assertWithinWorkspace(root, targetPath);
  return await fs.readFile(safePath, 'utf8');
}
