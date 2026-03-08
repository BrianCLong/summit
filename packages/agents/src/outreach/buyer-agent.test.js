"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buyer_agent_1 = require("./buyer-agent");
(0, vitest_1.describe)('Buyer Outreach Agent', () => {
    const tenantId = 'demo-tenant-123';
    (0, vitest_1.it)('generates a personalized email for an IC Analyst', async () => {
        const profile = {
            name: 'John Doe',
            role: 'Intelligence Analyst',
            organization: 'Global Intel Corp',
            driftRisk: 'adversarial narrative injection',
            email: 'john.doe@globalintel.com'
        };
        const email = await (0, buyer_agent_1.generateOutreach)(tenantId, profile);
        (0, vitest_1.expect)(email.subject).toContain('Global Intel Corp');
        (0, vitest_1.expect)(email.body).toContain('John Doe');
        (0, vitest_1.expect)(email.body).toContain('adversarial narrative injection');
        (0, vitest_1.expect)(email.recipientEmail).toBe('john.doe@globalintel.com');
    });
    (0, vitest_1.it)('generates a personalized email for SecOps', async () => {
        const profile = {
            name: 'Jane Smith',
            role: 'CISO',
            organization: 'SecureNet',
            driftRisk: 'unauthorized shadow API usage',
            email: 'jane.smith@securenet.io'
        };
        const email = await (0, buyer_agent_1.generateOutreach)(tenantId, profile);
        (0, vitest_1.expect)(email.subject).toContain('SecureNet');
        (0, vitest_1.expect)(email.body).toContain('Jane Smith');
        (0, vitest_1.expect)(email.body).toContain('unauthorized shadow API usage');
    });
    (0, vitest_1.it)('generates 10 sample emails for review', async () => {
        const profiles = [
            { name: 'Alice', role: 'Security Analyst', organization: 'Cyberdyne', email: 'alice@cyberdyne.com', driftRisk: 'LLM prompt injection' },
            { name: 'Bob', role: 'Threat Hunter', organization: 'Stark Ind', email: 'bob@stark.com', driftRisk: 'Supply chain poisoning' },
            { name: 'Charlie', role: 'OSINT Specialist', organization: 'Weyland', email: 'charlie@weyland.corp', driftRisk: 'Deepfake misinformation' },
            { name: 'Diana', role: 'Security Ops Manager', organization: 'Umbrella', email: 'diana@umbrella.com', driftRisk: 'Credential harvesting' },
            { name: 'Edward', role: 'Director of Intel', organization: 'Oscorp', email: 'edward@oscorp.com', driftRisk: 'State-sponsored narrative drift' },
            { name: 'Frank', role: 'CISO', organization: 'Aperture Science', email: 'frank@aperture.com', driftRisk: 'AI hallucination in reports' },
            { name: 'Grace', role: 'Lead Researcher', organization: 'Black Mesa', email: 'grace@blackmesa.com', driftRisk: 'Anomalous signal drift' },
            { name: 'Hank', role: 'Security Architect', organization: 'Initech', email: 'hank@initech.com', driftRisk: 'Legacy protocol exploitation' },
            { name: 'Ivy', role: 'Incident Responder', organization: 'Hooli', email: 'ivy@hooli.com', driftRisk: 'Middle-out encryption bypass' },
            { name: 'Jack', role: 'VP of Security', organization: 'Globex', email: 'jack@globex.com', driftRisk: 'Strategic misinformation campaign' },
        ];
        const emails = await Promise.all(profiles.map(p => (0, buyer_agent_1.generateOutreach)(tenantId, p)));
        (0, vitest_1.expect)(emails.length).toBe(10);
        emails.forEach((email, i) => {
            console.log(`--- Sample Email ${i + 1} ---`);
            console.log(`To: ${email.recipientEmail}`);
            console.log(`Subject: ${email.subject}`);
            console.log(`Body:\n${email.body}\n`);
        });
    });
});
