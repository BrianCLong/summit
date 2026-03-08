"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillResolver = void 0;
const minimatch_1 = require("minimatch");
class SkillResolver {
    resolve(query, context, skills) {
        const matches = new Set();
        const normalizedQuery = query.toLowerCase();
        for (const skill of skills) {
            if (!skill.triggers)
                continue;
            let matched = false;
            // 1. Intent Match
            if (skill.triggers.intents) {
                for (const intent of skill.triggers.intents) {
                    if (normalizedQuery.includes(intent.toLowerCase())) {
                        matches.add(skill);
                        matched = true;
                        break;
                    }
                }
            }
            if (matched)
                continue;
            // 2. Keyword Match
            if (skill.triggers.keywords) {
                for (const keyword of skill.triggers.keywords) {
                    if (normalizedQuery.includes(keyword.toLowerCase())) {
                        matches.add(skill);
                        matched = true;
                        break;
                    }
                }
            }
            if (matched)
                continue;
            // 3. File Pattern Match
            if (context.files && skill.triggers.file_patterns) {
                for (const pattern of skill.triggers.file_patterns) {
                    for (const file of context.files) {
                        if ((0, minimatch_1.minimatch)(file, pattern)) {
                            matches.add(skill);
                            matched = true;
                            break;
                        }
                    }
                    if (matched)
                        break;
                }
            }
        }
        return Array.from(matches);
    }
}
exports.SkillResolver = SkillResolver;
