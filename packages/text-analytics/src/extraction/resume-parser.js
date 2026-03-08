"use strict";
/**
 * Resume/CV parsing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeParser = void 0;
class ResumeParser {
    parse(text) {
        return {
            name: this.extractName(text),
            email: this.extractEmail(text),
            phone: this.extractPhone(text),
            education: this.extractEducation(text),
            experience: this.extractExperience(text),
            skills: this.extractSkills(text),
        };
    }
    extractName(text) {
        const lines = text.split('\n');
        return lines[0]?.trim();
    }
    extractEmail(text) {
        const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        return match ? match[0] : undefined;
    }
    extractPhone(text) {
        const match = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        return match ? match[0] : undefined;
    }
    extractEducation(text) {
        return [];
    }
    extractExperience(text) {
        return [];
    }
    extractSkills(text) {
        return [];
    }
}
exports.ResumeParser = ResumeParser;
