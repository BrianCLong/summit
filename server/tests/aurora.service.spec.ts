// server/tests/aurora.service.spec.ts
import { AuroraService } from '../src/aurora/AuroraService';
import { CortexOverlay } from '../src/aurora/aurora.types';

describe('AuroraService', () => {
  let auroraService: AuroraService;

  beforeEach(() => {
    auroraService = new AuroraService();
  });

  it('should initialize with a mock implant', async () => {
    const implants = await auroraService.getImplantStatus();
    expect(implants).toHaveLength(1);
    expect(implants[0].implantType).toBe('Neuralink N1');
  });

  it('should perform a neural handshake with a known implant', async () => {
    const implants = await auroraService.getImplantStatus();
    const implantId = implants[0].implantId;
    const implant = await auroraService.neuralHandshake(implantId);
    expect(implant.status).toBe('online');
  });

  it('should throw an error for a neural handshake with an unknown implant', async () => {
    await expect(auroraService.neuralHandshake('unknown-id')).rejects.toThrow(
      'Implant with ID unknown-id not found or not registered.',
    );
  });

  it('should begin a thought stream for an online implant', async () => {
    const implants = await auroraService.getImplantStatus();
    const implantId = implants[0].implantId;
    await auroraService.neuralHandshake(implantId);
    const stream = await auroraService.beginThoughtStream(implantId);
    expect(stream).toBeDefined();
    expect(stream.implantId).toBe(implantId);
    expect(stream.isActive).toBe(true);
  });

    it('should throw an error when beginning a thought stream for an offline implant', async () => {
        const implants = await auroraService.getImplantStatus();
        const implantId = implants[0].implantId;
        // NOTE: Do not call handshake, so implant is considered offline
        await expect(auroraService.beginThoughtStream(implantId)).rejects.toThrow(
            `Implant ${implantId} is not online. Handshake required.`
        );
    });

  it('should push a cortex overlay to an online implant', async () => {
    const implants = await auroraService.getImplantStatus();
    const implantId = implants[0].implantId;
    await auroraService.neuralHandshake(implantId);

    const overlay: Omit<CortexOverlay, 'overlayId' | 'timestamp'> = {
      targetImplantId: implantId,
      type: 'text',
      content: 'Test overlay',
      durationSeconds: 10,
      priority: 'medium',
    };

    const confirmation = await auroraService.pushToCortex(overlay);
    expect(confirmation).toBeDefined();
    expect(confirmation.status).toBe('delivered');
  });

    it('should throw an error when pushing to cortex of an offline implant', async () => {
        const implants = await auroraService.getImplantStatus();
        const implantId = implants[0].implantId;
        const overlay: Omit<CortexOverlay, 'overlayId' | 'timestamp'> = {
            targetImplantId: implantId,
            type: 'text',
            content: 'Test overlay',
            durationSeconds: 10,
            priority: 'medium',
        };

        await expect(auroraService.pushToCortex(overlay)).rejects.toThrow(
            `Target implant ${implantId} is not available for cortex overlay.`
        );
    });
});
