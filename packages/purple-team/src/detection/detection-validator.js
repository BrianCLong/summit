"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlAssessor = exports.IOCGenerator = exports.SIEMRuleValidator = void 0;
/**
 * SIEM Rule Validator
 */
class SIEMRuleValidator {
    rules = new Map();
    /**
     * Add SIEM rule
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
    }
    /**
     * Validate rule against attack
     */
    async validateRule(ruleId, attackTechniqueId, testLogs) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            throw new Error('Rule not found');
        }
        // Simulate rule evaluation against logs
        const matchedLogs = [];
        for (const log of testLogs) {
            if (this.evaluateRuleQuery(rule.query, log)) {
                matchedLogs.push(log);
            }
        }
        const triggered = matchedLogs.length > 0;
        const effectiveness = matchedLogs.length / Math.max(testLogs.length, 1);
        // Update rule testing metadata
        rule.lastTested = new Date();
        rule.effectiveness = effectiveness;
        return {
            triggered,
            matchedLogs,
            effectiveness
        };
    }
    /**
     * Generate detection rule for technique
     */
    generateRuleForTechnique(techniqueId, techniqueName, platform) {
        const rules = {
            'T1059.001': {
                query: 'event.type:process AND process.name:powershell.exe AND (command_line:*-enc* OR command_line:*bypass*)',
                description: 'Detects suspicious PowerShell execution'
            },
            'T1003': {
                query: 'event.type:process AND (process.name:mimikatz* OR command_line:*sekurlsa*)',
                description: 'Detects credential dumping attempts'
            },
            'T1547': {
                query: 'event.type:registry AND registry.path:*\\\\Run\\\\*',
                description: 'Detects persistence via Run keys'
            },
            'T1566': {
                query: 'event.type:file AND file.extension:(exe OR dll OR js OR vbs) AND file.path:*\\\\Downloads\\\\*',
                description: 'Detects suspicious file downloads'
            }
        };
        const template = rules[techniqueId] || {
            query: `event.type:* AND technique.id:"${techniqueId}"`,
            description: `Detection rule for ${techniqueName}`
        };
        return {
            id: this.generateId(),
            name: `Detect ${techniqueName}`,
            description: template.description,
            platform,
            query: template.query,
            techniquesCovered: [techniqueId],
            severity: 'high',
            enabled: true
        };
    }
    /**
     * Test rule coverage
     */
    testCoverage(techniqueIds) {
        const allRules = Array.from(this.rules.values());
        const coveredTechniques = new Set();
        for (const rule of allRules) {
            for (const technique of rule.techniquesCovered) {
                coveredTechniques.add(technique);
            }
        }
        const covered = techniqueIds.filter(t => coveredTechniques.has(t));
        const uncovered = techniqueIds.filter(t => !coveredTechniques.has(t));
        return {
            covered,
            uncovered,
            coveragePercentage: (covered.length / techniqueIds.length) * 100
        };
    }
    evaluateRuleQuery(query, log) {
        // Simplified query evaluation
        const terms = query.split(' AND ');
        const logLower = log.toLowerCase();
        for (const term of terms) {
            const [field, pattern] = term.split(':');
            if (pattern && !logLower.includes(pattern.replace(/\*/g, '').toLowerCase())) {
                return false;
            }
        }
        return true;
    }
    generateId() {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.SIEMRuleValidator = SIEMRuleValidator;
/**
 * IOC Generator
 */
class IOCGenerator {
    /**
     * Generate IOCs from exercise detections
     */
    generateFromDetections(detections) {
        const iocs = [];
        const now = new Date();
        for (const detection of detections) {
            if (!detection.truePositive) {
                continue;
            }
            // Extract IOCs from detection description
            const extractedIOCs = this.extractIOCsFromText(detection.description);
            for (const extracted of extractedIOCs) {
                iocs.push({
                    id: this.generateId(),
                    type: extracted.type,
                    value: extracted.value,
                    confidence: 'high',
                    source: `Exercise Detection: ${detection.id}`,
                    context: detection.description,
                    firstSeen: detection.timestamp,
                    lastSeen: now,
                    tags: ['exercise', 'validated'],
                    relatedTechniques: detection.techniqueId ? [detection.techniqueId] : []
                });
            }
        }
        return iocs;
    }
    /**
     * Generate IOC bundle for threat intel sharing
     */
    generateIOCBundle(iocs, format) {
        switch (format) {
            case 'stix':
                return this.toSTIX(iocs);
            case 'openioc':
                return this.toOpenIOC(iocs);
            case 'csv':
                return this.toCSV(iocs);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    extractIOCsFromText(text) {
        const iocs = [];
        // IP addresses
        const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
        const ips = text.match(ipRegex) || [];
        for (const ip of ips) {
            iocs.push({ type: 'ip', value: ip });
        }
        // Domains
        const domainRegex = /\b[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}\b/g;
        const domains = text.match(domainRegex) || [];
        for (const domain of domains) {
            if (!domain.match(/^\d/)) {
                iocs.push({ type: 'domain', value: domain });
            }
        }
        // MD5 hashes
        const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
        const md5s = text.match(md5Regex) || [];
        for (const hash of md5s) {
            iocs.push({ type: 'hash', value: hash });
        }
        // SHA256 hashes
        const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;
        const sha256s = text.match(sha256Regex) || [];
        for (const hash of sha256s) {
            iocs.push({ type: 'hash', value: hash });
        }
        return iocs;
    }
    toSTIX(iocs) {
        const objects = iocs.map(ioc => ({
            type: 'indicator',
            id: `indicator--${ioc.id}`,
            created: ioc.firstSeen.toISOString(),
            modified: ioc.lastSeen.toISOString(),
            pattern: this.getSTIXPattern(ioc),
            pattern_type: 'stix',
            valid_from: ioc.firstSeen.toISOString(),
            labels: ioc.tags,
            confidence: ioc.confidence === 'high' ? 85 : ioc.confidence === 'medium' ? 50 : 25
        }));
        return JSON.stringify({
            type: 'bundle',
            id: `bundle--${this.generateId()}`,
            objects
        }, null, 2);
    }
    getSTIXPattern(ioc) {
        const patterns = {
            ip: `[ipv4-addr:value = '${ioc.value}']`,
            domain: `[domain-name:value = '${ioc.value}']`,
            hash: `[file:hashes.MD5 = '${ioc.value}']`,
            url: `[url:value = '${ioc.value}']`,
            email: `[email-addr:value = '${ioc.value}']`
        };
        return patterns[ioc.type] || `[x-unknown:value = '${ioc.value}']`;
    }
    toOpenIOC(iocs) {
        const indicators = iocs.map(ioc => `
    <Indicator>
      <IndicatorItem>
        <Context document="FileItem" search="FileItem/${ioc.type}" type="mir"/>
        <Content type="string">${ioc.value}</Content>
      </IndicatorItem>
    </Indicator>
    `).join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>
<ioc xmlns="http://schemas.mandiant.com/2010/ioc">
  ${indicators}
</ioc>`;
    }
    toCSV(iocs) {
        const header = 'type,value,confidence,source,first_seen,tags';
        const rows = iocs.map(ioc => `${ioc.type},${ioc.value},${ioc.confidence},${ioc.source},${ioc.firstSeen.toISOString()},${ioc.tags.join(';')}`);
        return [header, ...rows].join('\n');
    }
    generateId() {
        return `ioc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.IOCGenerator = IOCGenerator;
/**
 * Control Assessor
 */
class ControlAssessor {
    /**
     * Assess control effectiveness
     */
    assessControl(controlId, controlName, category, testResults) {
        const tested = testResults.length > 0;
        const blockedCount = testResults.filter(r => r.blocked).length;
        const detectedCount = testResults.filter(r => r.detected).length;
        const effective = (blockedCount + detectedCount) / testResults.length > 0.7;
        const coverage = (testResults.length / 10) * 100; // Assume 10 techniques per control
        const gaps = [];
        const recommendations = [];
        for (const result of testResults) {
            if (!result.blocked && !result.detected) {
                gaps.push(`Technique ${result.techniqueId} not blocked or detected`);
                recommendations.push(`Enhance detection for ${result.techniqueId}`);
            }
        }
        return {
            controlId,
            name: controlName,
            category,
            tested,
            effective,
            coverage,
            gaps,
            recommendations
        };
    }
    /**
     * Generate control matrix
     */
    generateControlMatrix(controls, techniques) {
        const matrix = {};
        const coveredTechniques = new Set();
        for (const control of controls) {
            matrix[control.controlId] = {};
            for (const technique of techniques) {
                const covered = control.coverage > 50; // Simplified check
                matrix[control.controlId][technique] = covered;
                if (covered) {
                    coveredTechniques.add(technique);
                }
            }
        }
        const gaps = techniques.filter(t => !coveredTechniques.has(t));
        const overallCoverage = (coveredTechniques.size / techniques.length) * 100;
        return {
            matrix,
            overallCoverage,
            gaps
        };
    }
}
exports.ControlAssessor = ControlAssessor;
