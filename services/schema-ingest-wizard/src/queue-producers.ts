// @ts-nocheck
import { enqueue } from '../../libs/ops/src/queue.js';

export async function queueOcr(filePath: string): Promise<string | null> {
  return enqueue({ type: 'OCR', payload: { filePath } });
}
