import { threatHuntingService } from '../threatHuntingService';

describe('CTI Platform Functionality', () => {

  test('should retrieve threat actors', () => {
    const actors = threatHuntingService.getThreatActors();
    expect(actors).toBeDefined();
    expect(actors.length).toBeGreaterThan(0);
    expect(actors[0].name).toBe('APT29');
  });

  test('should retrieve malware', () => {
    const malware = threatHuntingService.getMalwareList();
    expect(malware).toBeDefined();
    expect(malware.length).toBeGreaterThan(0);
    expect(malware[0].name).toBe('MiniDuke');
  });

  test('should analyze diamond model dynamically', () => {
    const actors = threatHuntingService.getThreatActors();
    const diamond = threatHuntingService.analyzeDiamondModel(actors[0].id);
    expect(diamond).toBeDefined();
    expect(diamond.adversary.id).toBe(actors[0].id);
    // Check dynamic linking
    expect(diamond.capability).toContain('MiniDuke'); // Should come from linked malware
  });

  test('should analyze attack chain', () => {
    const chain = threatHuntingService.analyzeAttackChain('incident-1');
    expect(chain).toBeDefined();
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[0].name).toBe('Phishing');
  });

  test('should calculate threat score dynamically', () => {
    // APT29 is 'expert' + 'nation-state', so 50 + 30 + 15 = 95
    const actors = threatHuntingService.getThreatActors();
    const score = threatHuntingService.getThreatScore(actors[0].id);
    expect(score).toBe(95);
  });

  test('should create and retrieve threat hunts', async () => {
      const now = new Date().toISOString();
      const hunt = await threatHuntingService.createThreatHunt({
          name: 'Test Hunt',
          description: 'Testing CTI',
          hypothesis: 'Test Hypothesis',
          priority: 'HIGH',
          huntType: 'PROACTIVE',
          status: 'PLANNING',
          dataSource: ['splunk'],
          tags: ['test'],
          ttps: ['T1001'],
          iocs: [],
          queries: [],
          findings: [],
          assignedTo: [],
          createdBy: 'tester',
          startDate: now,
          timeline: []
      }, 'tester');

      expect(hunt).toBeDefined();
      expect(hunt.id).toBeDefined();

      const hunts = threatHuntingService.getThreatHunts();
      expect(hunts).toContainEqual(hunt);
  });
});
