// server/tests/abyss.service.spec.ts
import { AbyssService } from '../src/abyss/AbyssService';

describe('AbyssService', () => {
  let abyssService: AbyssService;

  beforeEach(() => {
    abyssService = new AbyssService();
  });

  it('should initialize in a dormant state', async () => {
    const state = await abyssService.getProtocolState();
    expect(state.status).toBe('dormant');
    expect(state.armedTimestamp).toBeUndefined();
  });

  it('should transition to an armed state', async () => {
    const armedState = await abyssService.armFinalProtocol();
    expect(armedState.status).toBe('armed');
    expect(armedState.armedTimestamp).toBeDefined();
  });

  it('should throw an error if armed when not in a dormant state', async () => {
    await abyssService.armFinalProtocol(); // First arming is successful
    await expect(abyssService.armFinalProtocol()).rejects.toThrow(
      'The Abyss Protocol can only be armed from a dormant state. Current state: armed',
    );
  });

  it('should retrieve the current state correctly', async () => {
      let state = await abyssService.getProtocolState();
      expect(state.status).toBe('dormant');
      await abyssService.armFinalProtocol();
      state = await abyssService.getProtocolState();
      expect(state.status).toBe('armed');
  });
});
