"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const apt_library_1 = require("./apt-library");
(0, globals_1.describe)('APTLibrary', () => {
    let library;
    (0, globals_1.beforeEach)(() => {
        library = new apt_library_1.APTLibrary();
    });
    (0, globals_1.describe)('Core Functionality', () => {
        (0, globals_1.it)('should initialize with default actors', () => {
            const actors = library.getAllActors();
            (0, globals_1.expect)(actors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should retrieve actor by ID', () => {
            const actor = library.getActor('apt29');
            (0, globals_1.expect)(actor).toBeDefined();
            (0, globals_1.expect)(actor?.names).toContain('APT29');
        });
        (0, globals_1.it)('should retrieve actor by name (case insensitive)', () => {
            const actor = library.getActorByName('cozy bear');
            (0, globals_1.expect)(actor).toBeDefined();
            (0, globals_1.expect)(actor?.id).toBe('apt29');
        });
    });
    (0, globals_1.describe)('New Threat Actors (Feb 2026 Intelligence)', () => {
        (0, globals_1.it)('should include UNC3886 profile', () => {
            const actor = library.getActor('unc3886');
            (0, globals_1.expect)(actor).toBeDefined();
            (0, globals_1.expect)(actor?.names).toContain('UNC3886');
            (0, globals_1.expect)(actor?.targetedSectors).toContain('Telecommunications');
            (0, globals_1.expect)(actor?.targetedRegions).toContain('Singapore');
            (0, globals_1.expect)(actor?.attribution.sponsorship).toBe('state-sponsored');
            // Verify specific TTPs from briefing
            const techniques = actor?.ttps.techniques.map(t => t.techniqueId);
            (0, globals_1.expect)(techniques).toContain('T1190'); // Zero-day exploitation
            (0, globals_1.expect)(techniques).toContain('T1014'); // Rootkit
        });
        (0, globals_1.it)('should include TGR-STA-1030 profile', () => {
            const actor = library.getActor('tgr_sta_1030');
            (0, globals_1.expect)(actor).toBeDefined();
            (0, globals_1.expect)(actor?.names).toContain('TGR-STA-1030');
            (0, globals_1.expect)(actor?.targetedSectors).toContain('Government');
            (0, globals_1.expect)(actor?.targetedSectors).toContain('Critical Infrastructure');
            (0, globals_1.expect)(actor?.attribution.sponsorship).toBe('state-affiliated');
            // Verify specific TTPs from briefing
            const techniques = actor?.ttps.techniques.map(t => t.techniqueId);
            (0, globals_1.expect)(techniques).toContain('T1566'); // Phishing
            (0, globals_1.expect)(techniques).toContain('T1190'); // Exploitation
            (0, globals_1.expect)(techniques).toContain('T1071'); // Web Protocols/Tunneling
        });
    });
});
