"use strict";
/**
 * Domain Intelligence Collector - Collects domain and IP intelligence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainIntelCollector = void 0;
const CollectorBase_js_1 = require("../core/CollectorBase.js");
const whois_1 = require("whois");
const dns_1 = require("dns");
class DomainIntelCollector extends CollectorBase_js_1.CollectorBase {
    async onInitialize() {
        console.log(`Initializing ${this.config.name}`);
    }
    async performCollection(task) {
        const domain = task.target;
        return await this.collectDomainIntel(domain);
    }
    async onShutdown() {
        // Cleanup
    }
    countRecords(data) {
        return 1;
    }
    /**
     * Collect comprehensive domain intelligence
     */
    async collectDomainIntel(domain) {
        const [whoisData, dnsRecords, ipAddresses] = await Promise.allSettled([
            this.getWhoisData(domain),
            this.getDNSRecords(domain),
            this.resolveIPs(domain)
        ]);
        const intel = {
            domain,
            ipAddresses: ipAddresses.status === 'fulfilled' ? ipAddresses.value : []
        };
        if (whoisData.status === 'fulfilled') {
            Object.assign(intel, this.parseWhoisData(whoisData.value));
        }
        if (dnsRecords.status === 'fulfilled') {
            intel.dnsRecords = dnsRecords.value;
        }
        return intel;
    }
    /**
     * Get WHOIS information
     */
    async getWhoisData(domain) {
        return new Promise((resolve, reject) => {
            (0, whois_1.lookup)(domain, (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(data);
            });
        });
    }
    /**
     * Parse WHOIS data
     */
    parseWhoisData(whoisText) {
        const result = {};
        // Parse registrar
        const registrarMatch = whoisText.match(/Registrar:\s*(.+)/i);
        if (registrarMatch) {
            result.registrar = registrarMatch[1].trim();
        }
        // Parse dates
        const createdMatch = whoisText.match(/Creation Date:\s*(.+)/i);
        if (createdMatch) {
            result.registrationDate = new Date(createdMatch[1].trim());
        }
        const expiresMatch = whoisText.match(/Expir(?:y|ation) Date:\s*(.+)/i);
        if (expiresMatch) {
            result.expirationDate = new Date(expiresMatch[1].trim());
        }
        // Parse nameservers
        const nameservers = whoisText.match(/Name Server:\s*(.+)/gi);
        if (nameservers) {
            result.nameservers = nameservers.map(ns => ns.replace(/Name Server:\s*/i, '').trim().toLowerCase());
        }
        return result;
    }
    /**
     * Get DNS records
     */
    async getDNSRecords(domain) {
        const records = {};
        try {
            // A records
            const aRecords = await dns_1.promises.resolve4(domain);
            records['A'] = aRecords;
        }
        catch (e) {
            // Ignore
        }
        try {
            // AAAA records
            const aaaaRecords = await dns_1.promises.resolve6(domain);
            records['AAAA'] = aaaaRecords;
        }
        catch (e) {
            // Ignore
        }
        try {
            // MX records
            const mxRecords = await dns_1.promises.resolveMx(domain);
            records['MX'] = mxRecords.map(mx => `${mx.priority} ${mx.exchange}`);
        }
        catch (e) {
            // Ignore
        }
        try {
            // TXT records
            const txtRecords = await dns_1.promises.resolveTxt(domain);
            records['TXT'] = txtRecords.map(txt => txt.join(''));
        }
        catch (e) {
            // Ignore
        }
        try {
            // NS records
            const nsRecords = await dns_1.promises.resolveNs(domain);
            records['NS'] = nsRecords;
        }
        catch (e) {
            // Ignore
        }
        try {
            // CNAME records
            const cnameRecords = await dns_1.promises.resolveCname(domain);
            records['CNAME'] = cnameRecords;
        }
        catch (e) {
            // Ignore
        }
        return records;
    }
    /**
     * Resolve domain to IP addresses
     */
    async resolveIPs(domain) {
        try {
            const ips = await dns_1.promises.resolve4(domain);
            return ips;
        }
        catch (e) {
            return [];
        }
    }
    /**
     * Get IP geolocation
     */
    async getIPGeolocation(ip) {
        // Would integrate with IP geolocation APIs like MaxMind, IPinfo, etc.
        return { ip };
    }
    /**
     * Get SSL certificate information
     */
    async getSSLCertificate(domain) {
        // Would use TLS socket to retrieve certificate
        return null;
    }
    /**
     * Check subdomain enumeration
     */
    async enumerateSubdomains(domain) {
        // Would use certificate transparency logs, DNS brute force, etc.
        return [];
    }
}
exports.DomainIntelCollector = DomainIntelCollector;
