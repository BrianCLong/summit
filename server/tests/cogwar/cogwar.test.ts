
import { jest } from '@jest/globals';
import { CogSwarmAgent } from '../../src/cogwar/agents/CogSwarmAgent.js';
import { MindShieldService } from '../../src/cogwar/defenses/MindShieldService.js';
import { CognitionLegionSimulator } from '../../src/cogwar/simulations/CognitionLegionSimulator.js';
import SummitCogWarService from '../../src/cogwar/SummitCogWarService.js';

// Mocks
jest.mock('../../src/services/LLMService.js', () => {
  return {
    LLMService: jest.fn().mockImplementation(() => ({
      complete: jest.fn().mockResolvedValue(JSON.stringify({
        narrative: 'Mock Narrative',
        emotionalAnchors: ['fear'],
        content: 'Mock Content',
        viralityScore: 0.9
      }))
    }))
  };
});

jest.mock('../../src/services/ContentAnalyzer.js', () => {
  return {
    ContentAnalyzer: jest.fn().mockImplementation(() => ({
      analyze: jest.fn().mockReturnValue({
        sentiment: -0.8,
        manipulationScore: 0.9,
        keywords: ['fake'],
        flags: ['HIGH_RISK']
      })
    }))
  };
});

jest.mock('../../src/services/GNNService.js', () => {
  return {
    classifyNodes: jest.fn().mockResolvedValue({
      jobId: 'mock-job-123',
      success: true
    })
  };
});

describe('SummitCogWar Service Suite', () => {

  describe('Red CogSwarm', () => {
    it('should craft a memeplex correctly', async () => {
      const agent = new CogSwarmAgent();
      const memeplex = await agent.craftMemeplex('Voter', 'Election');

      expect(memeplex).toBeDefined();
      expect(memeplex.narrative).toBe('Mock Narrative');
      expect(memeplex.viralityScore).toBe(0.9);
      expect(memeplex.targetProfile).toBe('Voter');
    });
  });

  describe('Blue MindShield', () => {
    it('should analyze polarization entropy', () => {
      const shield = new MindShieldService();
      const result = shield.analyzePolarization('Some dangerous content');

      // Entropy = abs(-0.8) * 0.9 = 0.72
      expect(result.entropy).toBeCloseTo(0.72);
      expect(result.flags).toContain('HIGH_RISK');
    });

    it('should deploy a memetic vaccine', () => {
      const shield = new MindShieldService();
      const vaccine = shield.deployMemeticVaccine('nar-123', 'False claim');

      expect(vaccine.narrativeId).toBe('nar-123');
      expect(vaccine.counterNarrative).toContain('Fact Check');
    });
  });

  describe('Cognition Legion Simulator', () => {
    it('should queue a simulation via GNN Service', async () => {
      const sim = new CognitionLegionSimulator();
      const result = await sim.simulateNarrativeSpread('nar-123', []);

      expect(result.status).toBe('QUEUED');
      expect(result.simulationId).toBe('mock-job-123');
    });
  });

  describe('SummitCogWar Orchestrator', () => {
    it('should launch RED operation successfully', async () => {
      const result = await SummitCogWarService.launchOperation('RED', {
        target: 'Audience',
        topic: 'Test'
      });

      expect(result).toBeDefined();
      expect(result.narrative).toBe('Mock Narrative');
    });

    it('should block unethical RED operation', async () => {
        const promise = SummitCogWarService.launchOperation('RED', {
            target: 'Audience',
            topic: 'incite_violence' // Banned keyword
        });

        await expect(promise).rejects.toThrow('Operation blocked by Neuro-Ethics Guard.');
    });
  });

});
