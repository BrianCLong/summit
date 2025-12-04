import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CrossDomainGuard } from '../../cds/CrossDomainGuard.js';
import { ABACEngine } from '../../cds/ABACEngine.js';
import { ContentInspector } from '../../cds/ContentInspector.js';
import { EntityRepo } from '../../repos/EntityRepo.js';
import { UserSecurityContext } from '../../cds/types.js';

// Mock Dependencies
const mockEntityRepo = {
  findById: jest.fn(),
  create: jest.fn(),
} as any;

describe('CrossDomainGuard', () => {
  let guard: CrossDomainGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new CrossDomainGuard(mockEntityRepo);
  });

  const highSideUser: UserSecurityContext = {
    userId: 'user-high',
    clearance: 'TOP_SECRET',
    nationality: 'USA',
    accessCompartments: [],
    authorizedDomains: ['high-side'],
  };

  const lowSideUser: UserSecurityContext = {
    userId: 'user-low',
    clearance: 'UNCLASSIFIED',
    nationality: 'USA',
    accessCompartments: [],
    authorizedDomains: ['low-side'],
  };

  it('should block transfer if entity not found', async () => {
    (mockEntityRepo.findById as any).mockResolvedValue(null);

    const result = await guard.processTransfer({
      entityId: 'missing',
      sourceDomainId: 'high-side',
      targetDomainId: 'low-side',
      justification: 'test',
      userContext: highSideUser,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Entity not found');
  });

  it('should allow HIGH to LOW transfer if content is clean and user authorized', async () => {
    const entity = {
      id: 'e1',
      tenantId: 'high-side',
      kind: 'Report',
      labels: [],
      props: {
        classification: 'UNCLASSIFIED', // Labeled unclassified but on high side
        content: 'Public info',
      },
    };

    (mockEntityRepo.findById as any).mockResolvedValue(entity);
    (mockEntityRepo.create as any).mockResolvedValue({ ...entity, id: 'new-e1', tenantId: 'low-side' });

    const result = await guard.processTransfer({
      entityId: 'e1',
      sourceDomainId: 'high-side',
      targetDomainId: 'low-side',
      justification: 'Mission requirement',
      userContext: highSideUser,
    });

    expect(result.success).toBe(true);
    expect(mockEntityRepo.create).toHaveBeenCalled();
  });

  it('should BLOCK HIGH to LOW transfer if content contains dirty words', async () => {
    const entity = {
      id: 'e2',
      tenantId: 'high-side',
      kind: 'Report',
      labels: [],
      props: {
        classification: 'UNCLASSIFIED',
        content: 'This contains TOP SECRET info inadvertently',
      },
    };

    (mockEntityRepo.findById as any).mockResolvedValue(entity);

    const result = await guard.processTransfer({
      entityId: 'e2',
      sourceDomainId: 'high-side',
      targetDomainId: 'low-side',
      justification: 'Oops',
      userContext: highSideUser,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Content Inspection Failed');
  });

  it('should allow LOW to HIGH transfer (ingest)', async () => {
    const entity = {
      id: 'e3',
      tenantId: 'low-side',
      kind: 'OSINT',
      labels: [],
      props: {
        classification: 'UNCLASSIFIED',
        content: 'News article',
      },
    };

    (mockEntityRepo.findById as any).mockResolvedValue(entity);
    (mockEntityRepo.create as any).mockResolvedValue({ ...entity, id: 'new-e3', tenantId: 'high-side' });

    const result = await guard.processTransfer({
      entityId: 'e3',
      sourceDomainId: 'low-side',
      targetDomainId: 'high-side',
      justification: 'Ingest',
      userContext: highSideUser, // High side user pulling low side data
    });

    expect(result.success).toBe(true);
  });
});

describe('ABACEngine', () => {
    const abac = new ABACEngine();

    it('should deny access if clearance is insufficient', () => {
        const user: UserSecurityContext = {
            userId: 'u1',
            clearance: 'SECRET',
            nationality: 'USA',
            accessCompartments: [],
            authorizedDomains: []
        };
        const label = { classification: 'TOP_SECRET' as const };
        expect(abac.canAccess(user, label)).toBe(false);
    });

    it('should grant access if clearance is sufficient', () => {
        const user: UserSecurityContext = {
            userId: 'u1',
            clearance: 'TOP_SECRET',
            nationality: 'USA',
            accessCompartments: [],
            authorizedDomains: []
        };
        const label = { classification: 'SECRET' as const };
        expect(abac.canAccess(user, label)).toBe(true);
    });
});

describe('ContentInspector', () => {
    const inspector = new ContentInspector();

    it('should detect dirty words', () => {
        const data = { title: 'Test', body: 'This is NOFORN material' };
        const result = inspector.inspect(data, 'UNCLASSIFIED');
        expect(result.passed).toBe(false);
        expect(result.issues[0]).toContain('NOFORN');
    });

    it('should pass clean content', () => {
        const data = { title: 'Test', body: 'This is public material' };
        const result = inspector.inspect(data, 'UNCLASSIFIED');
        expect(result.passed).toBe(true);
    });
});
