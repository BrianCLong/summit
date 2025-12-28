import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemExecutor } from '../executor/fs-executor';
import { WriteAction } from '../types';

describe('FileSystemExecutor', () => {
  const TEST_ROOT = path.resolve('server/temp/test-executor');
  let executor: FileSystemExecutor;

  beforeEach(async () => {
    // Clean up
    await fs.rm(TEST_ROOT, { recursive: true, force: true });
    await fs.mkdir(TEST_ROOT, { recursive: true });

    executor = new FileSystemExecutor(TEST_ROOT);
  });

  afterEach(async () => {
     await fs.rm(TEST_ROOT, { recursive: true, force: true });
  });

  const validAction: WriteAction = {
    id: 'test-exec-1',
    type: 'DRAFT',
    payload: { target: 'hello.txt', content: 'Hello World' },
    status: 'APPROVED',
    requester: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('should write file within jail', async () => {
    await executor.execute(validAction);
    const content = await fs.readFile(path.join(TEST_ROOT, 'hello.txt'), 'utf8');
    expect(content).toBe('Hello World');
  });

  it('should reject path traversal', async () => {
    const badAction: WriteAction = {
        ...validAction,
        payload: { target: '../evil.txt', content: 'evil' }
    };
    await expect(executor.plan(badAction)).rejects.toThrow('Path traversal detected');
    await expect(executor.execute(badAction)).rejects.toThrow('Path traversal detected');
  });

  it('should reject null bytes', async () => {
    const badAction: WriteAction = {
        ...validAction,
        payload: { target: 'evil.txt\0.js', content: 'evil' }
    };
    await expect(executor.execute(badAction)).rejects.toThrow('null bytes');
  });

  it('should create snapshot and rollback', async () => {
    // 1. Write initial content (simulate existing file)
    await fs.writeFile(path.join(TEST_ROOT, 'hello.txt'), 'Original Content');

    // 2. Execute overwrite
    await executor.execute(validAction);
    const newContent = await fs.readFile(path.join(TEST_ROOT, 'hello.txt'), 'utf8');
    expect(newContent).toBe('Hello World');

    // 3. Rollback
    await executor.rollback(validAction);
    const restoredContent = await fs.readFile(path.join(TEST_ROOT, 'hello.txt'), 'utf8');
    expect(restoredContent).toBe('Original Content');
  });

  it('should rollback creation (delete file)', async () => {
      // 1. Execute write (new file)
      await executor.execute(validAction);

      // 2. Rollback
      await executor.rollback(validAction);

      // 3. Verify deleted
      await expect(fs.access(path.join(TEST_ROOT, 'hello.txt'))).rejects.toThrow();
  });
});
