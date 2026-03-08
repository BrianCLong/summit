"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const skillpack_discovery_js_1 = require("../src/skillpack-discovery.js");
describe('skillpack discovery', () => {
    it('parses SKILL.md frontmatter', () => {
        const content = `---\nname: ui-preview\ndescription: UI focused toolpack\ntriggers:\n  tasks: [review]\n---\nBody text`;
        const manifest = (0, skillpack_discovery_js_1.parseSkillMarkdown)(content);
        expect(manifest.name).toBe('ui-preview');
        expect(manifest.triggers?.tasks).toEqual(['review']);
    });
    it('matches triggers based on task and paths', () => {
        const content = `---\nname: repo-triage\ntriggers:\n  tasks: [plan]\n  paths:\n    - apps/web/**\n---\nBody`;
        const manifest = (0, skillpack_discovery_js_1.parseSkillMarkdown)(content);
        const taskMatch = (0, skillpack_discovery_js_1.matchSkillpackTriggers)(manifest, {
            taskType: 'plan',
            repoPaths: ['apps/web/src/App.tsx'],
        });
        expect(taskMatch).toBe(true);
    });
});
