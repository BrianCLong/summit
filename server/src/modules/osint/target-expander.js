"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TargetExpander = void 0;
const zod_1 = require("zod");
// Validation schemas
const DomainSchema = zod_1.z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, "Invalid domain format");
const EmailSchema = zod_1.z.string().email("Invalid email format");
const IPRangeSchema = zod_1.z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/, "Invalid IP/CIDR format");
class TargetExpander {
    /**
     * Expands a single target into related targets based on type.
     */
    async expand(target) {
        switch (target.type) {
            case 'email':
                return this.expandEmail(target);
            case 'ip_range':
                return this.expandIPRange(target);
            case 'api_endpoint':
                return this.expandApiEndpoint(target);
            case 'domain':
                return this.expandDomain(target);
            default:
                return [];
        }
    }
    async expandEmail(target) {
        const email = target.value;
        const parts = email.split('@');
        if (parts.length < 2)
            return [];
        const domain = parts[1];
        const results = [];
        // 1. Extract domain
        if (domain && DomainSchema.safeParse(domain).success) {
            results.push({
                type: 'domain',
                value: domain,
                source: `derived_from_email:${email}`,
                metadata: { original_email: email }
            });
        }
        // 2. Mock: Predict username handle
        const handle = parts[0];
        results.push({
            type: 'handle',
            value: handle,
            source: `derived_from_email:${email}`,
        });
        return results;
    }
    async expandIPRange(target) {
        // Mock expansion of CIDR to sample IPs
        const results = [];
        if (target.value.includes('/')) {
            // Just return the base IP as a target for now
            const baseIp = target.value.split('/')[0];
            results.push({
                type: 'ip_range', // Using ip_range type for individual IP for now as per TargetType, or add 'ip'
                value: baseIp,
                source: `expansion:${target.value}`,
            });
        }
        return results;
    }
    async expandApiEndpoint(target) {
        const results = [];
        try {
            const url = new URL(target.value);
            // Add domain
            results.push({
                type: 'domain',
                value: url.hostname,
                source: `derived_from_url:${target.value}`
            });
            // Heuristic: Add 'docs' subdomain
            results.push({
                type: 'domain',
                value: `docs.${url.hostname}`,
                source: `heuristic:api_docs`
            });
        }
        catch (e) {
            // Invalid URL
        }
        return results;
    }
    async expandDomain(target) {
        const results = [];
        // Heuristic: common subdomains
        ['www', 'mail', 'remote', 'vpn'].forEach(sub => {
            results.push({
                type: 'domain',
                value: `${sub}.${target.value}`,
                source: `heuristic:common_subdomain`
            });
        });
        return results;
    }
    validate(target) {
        switch (target.type) {
            case 'domain': return DomainSchema.safeParse(target.value).success;
            case 'email': return EmailSchema.safeParse(target.value).success;
            case 'ip_range': return IPRangeSchema.safeParse(target.value).success;
            default: return true; // Loose validation for others
        }
    }
}
exports.TargetExpander = TargetExpander;
