import * as fs from 'fs/promises';
import { assertWithinWorkspace } from '../sandbox/workspaceJail';

export async function workspaceWrite(root: string, targetPath: string, content: string): Promise<void> {
  const safePath = assertWithinWorkspace(root, targetPath);
  await fs.writeFile(safePath, content, 'utf8');
}
