import { SecretsManager, EnvSecretsManager, secretsManager } from '../src/config/SecretsManager';

describe('SecretsManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test('should retrieve secret from environment variables', async () => {
    process.env.TEST_SECRET = 'secret_value';
    const secret = await secretsManager.getSecret('TEST_SECRET');
    expect(secret).toBe('secret_value');
  });

  test('should return undefined for missing secret', async () => {
    const secret = await secretsManager.getSecret('NON_EXISTENT_SECRET');
    expect(secret).toBeUndefined();
  });
});
