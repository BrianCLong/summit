import { InvariantService } from '../../src/invariants/enforcer';
import { SYSTEM_INVARIANTS } from '../../src/invariants/definitions';

describe('InvariantService', () => {
  const service = InvariantService.getInstance();

  it('should have all defined invariants loaded', () => {
    SYSTEM_INVARIANTS.forEach(inv => {
      expect(service.getInvariant(inv.id)).toBeDefined();
    });
  });

  it('should detect Provenance Integrity violation', async () => {
    const context = {
      operationType: 'write',
      provenanceId: null // Missing provenance ID
    };
    const isValid = await service.checkInvariant('INV-001', context);
    expect(isValid).toBe(false);
  });

  it('should pass Provenance Integrity when valid', async () => {
    const context = {
      operationType: 'write',
      provenanceId: 'prov_123'
    };
    const isValid = await service.checkInvariant('INV-001', context);
    expect(isValid).toBe(true);
  });

  it('should detect Agent Permission violation', async () => {
    const context = {
      agentId: 'agent_007',
      scope: 'nuclear_launch',
      allowedScopes: ['read_email']
    };
    const isValid = await service.checkInvariant('INV-002', context);
    expect(isValid).toBe(false);
  });

  it('should emit violation event', async () => {
    const spy = jest.fn();
    service.on('violation', spy);

    const context = {
      operationType: 'write',
      provenanceId: null
    };
    await service.checkInvariant('INV-001', context);

    expect(spy).toHaveBeenCalled();
    const violation = spy.mock.calls[0][0];
    expect(violation.invariantId).toBe('INV-001');
  });
});
