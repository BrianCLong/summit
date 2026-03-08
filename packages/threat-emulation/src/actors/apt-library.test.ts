import { describe, it, expect, beforeEach } from '@jest/globals';
import { APTLibrary } from './apt-library';
import { ThreatActorCategory, ThreatActorMotivation } from '../types';

describe('APTLibrary', () => {
  let library: APTLibrary;

  beforeEach(() => {
    library = new APTLibrary();
  });

  describe('Core Functionality', () => {
    it('should initialize with default actors', () => {
      const actors = library.getAllActors();
      expect(actors.length).toBeGreaterThan(0);
    });

    it('should retrieve actor by ID', () => {
      const actor = library.getActor('apt29');
      expect(actor).toBeDefined();
      expect(actor?.names).toContain('APT29');
    });

    it('should retrieve actor by name (case insensitive)', () => {
      const actor = library.getActorByName('cozy bear');
      expect(actor).toBeDefined();
      expect(actor?.id).toBe('apt29');
    });
  });

  describe('New Threat Actors (Feb 2026 Intelligence)', () => {
    it('should include UNC3886 profile', () => {
      const actor = library.getActor('unc3886');
      expect(actor).toBeDefined();
      expect(actor?.names).toContain('UNC3886');
      expect(actor?.targetedSectors).toContain('Telecommunications');
      expect(actor?.targetedRegions).toContain('Singapore');
      expect(actor?.attribution.sponsorship).toBe('state-sponsored');

      // Verify specific TTPs from briefing
      const techniques = actor?.ttps.techniques.map(t => t.techniqueId);
      expect(techniques).toContain('T1190'); // Zero-day exploitation
      expect(techniques).toContain('T1014'); // Rootkit
    });

    it('should include TGR-STA-1030 profile', () => {
      const actor = library.getActor('tgr_sta_1030');
      expect(actor).toBeDefined();
      expect(actor?.names).toContain('TGR-STA-1030');
      expect(actor?.targetedSectors).toContain('Government');
      expect(actor?.targetedSectors).toContain('Critical Infrastructure');
      expect(actor?.attribution.sponsorship).toBe('state-affiliated');

      // Verify specific TTPs from briefing
      const techniques = actor?.ttps.techniques.map(t => t.techniqueId);
      expect(techniques).toContain('T1566'); // Phishing
      expect(techniques).toContain('T1190'); // Exploitation
      expect(techniques).toContain('T1071'); // Web Protocols/Tunneling
    });
  });
});
