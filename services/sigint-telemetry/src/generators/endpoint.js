"use strict";
/**
 * Endpoint event generators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProcessEvent = generateProcessEvent;
exports.generateFileEvent = generateFileEvent;
exports.generateEdrAlert = generateEdrAlert;
exports.generateEndpointBatch = generateEndpointBatch;
const utils_js_1 = require("./utils.js");
/** Normal process patterns */
const normalProcesses = [
    { name: 'chrome.exe', path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe' },
    { name: 'outlook.exe', path: 'C:\\Program Files\\Microsoft Office\\Outlook.exe' },
    { name: 'code.exe', path: 'C:\\Users\\user\\AppData\\Local\\Programs\\VSCode\\code.exe' },
    { name: 'Teams.exe', path: 'C:\\Program Files\\Microsoft Teams\\Teams.exe' },
    { name: 'node.exe', path: 'C:\\Program Files\\nodejs\\node.exe' },
];
/** Suspicious process patterns (for simulation) */
const suspiciousProcesses = [
    { name: 'powershell.exe', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' },
    { name: 'cmd.exe', path: 'C:\\Windows\\System32\\cmd.exe' },
    { name: 'rundll32.exe', path: 'C:\\Windows\\System32\\rundll32.exe' },
];
/** Generate synthetic process event */
function generateProcessEvent(config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const baseTime = config.baseTime ?? new Date();
    const isSuspicious = rng.bool(0.05);
    const process = isSuspicious ? rng.pick(suspiciousProcesses) : rng.pick(normalProcesses);
    return {
        id: (0, utils_js_1.syntheticId)(),
        timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
        eventType: 'endpoint.process',
        source: 'edr-agent',
        tenantId: config.tenantId,
        classification: 'internal',
        retentionPolicy: 'standard',
        isSynthetic: true,
        hostId: `host-${rng.int(100, 999)}`,
        hostname: (0, utils_js_1.syntheticHostname)(rng),
        action: 'created',
        processId: rng.int(1000, 65535),
        parentProcessId: rng.int(100, 999),
        processName: process.name,
        processPath: process.path,
        commandLine: isSuspicious
            ? `${process.path} -enc ${Buffer.from('synthetic-command').toString('base64')}`
            : process.path,
        userName: (0, utils_js_1.syntheticUsername)(rng),
        sha256: (0, utils_js_1.syntheticSha256)(rng),
        isSigned: !isSuspicious,
        signer: isSuspicious ? undefined : 'Microsoft Corporation',
        parentName: 'explorer.exe',
        parentPath: 'C:\\Windows\\explorer.exe',
        integrityLevel: isSuspicious ? rng.pick(['high', 'system']) : 'medium',
        isElevated: isSuspicious && rng.bool(0.5),
    };
}
/** Generate synthetic file event */
function generateFileEvent(config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const baseTime = config.baseTime ?? new Date();
    const normalPaths = [
        'C:\\Users\\user\\Documents\\report.docx',
        'C:\\Users\\user\\Downloads\\file.pdf',
        'C:\\Projects\\src\\index.ts',
    ];
    const sensitivePaths = [
        'C:\\Windows\\System32\\config\\SAM',
        'C:\\Users\\user\\AppData\\Roaming\\Microsoft\\Credentials\\creds.dat',
    ];
    const isSensitive = rng.bool(0.05);
    const filePath = isSensitive ? rng.pick(sensitivePaths) : rng.pick(normalPaths);
    return {
        id: (0, utils_js_1.syntheticId)(),
        timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
        eventType: 'endpoint.file',
        source: 'edr-agent',
        tenantId: config.tenantId,
        classification: 'internal',
        retentionPolicy: 'standard',
        isSynthetic: true,
        hostId: `host-${rng.int(100, 999)}`,
        hostname: (0, utils_js_1.syntheticHostname)(rng),
        operation: rng.pick(['created', 'modified', 'read']),
        filePath,
        fileName: filePath.split('\\').pop() ?? 'unknown',
        fileExtension: filePath.split('.').pop(),
        fileSize: rng.int(100, 10000000),
        sha256: (0, utils_js_1.syntheticSha256)(rng),
        processId: rng.int(1000, 65535),
        processName: rng.pick(normalProcesses).name,
        userName: (0, utils_js_1.syntheticUsername)(rng),
        isSensitiveLocation: isSensitive,
    };
}
/** Generate synthetic EDR alert */
function generateEdrAlert(config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const baseTime = config.baseTime ?? new Date();
    const alertTypes = [
        {
            name: 'Suspicious PowerShell Execution',
            category: 'execution',
            tactics: ['execution'],
            techniques: ['T1059.001'],
            severity: 'high',
        },
        {
            name: 'Credential Access Attempt',
            category: 'credential_access',
            tactics: ['credential_access'],
            techniques: ['T1003'],
            severity: 'critical',
        },
        {
            name: 'Lateral Movement Detected',
            category: 'lateral_movement',
            tactics: ['lateral_movement'],
            techniques: ['T1021.001'],
            severity: 'high',
        },
        {
            name: 'Potential Data Exfiltration',
            category: 'exfiltration',
            tactics: ['exfiltration'],
            techniques: ['T1048'],
            severity: 'critical',
        },
    ];
    const alert = rng.pick(alertTypes);
    return {
        id: (0, utils_js_1.syntheticId)(),
        timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
        eventType: 'endpoint.edr_alert',
        source: 'edr-engine',
        tenantId: config.tenantId,
        classification: 'confidential',
        retentionPolicy: 'extended',
        isSynthetic: true,
        hostId: `host-${rng.int(100, 999)}`,
        hostname: (0, utils_js_1.syntheticHostname)(rng),
        alertId: `alert-${rng.int(10000, 99999)}`,
        alertName: alert.name,
        severity: alert.severity,
        category: alert.category,
        description: `Synthetic alert: ${alert.name} detected on endpoint`,
        mitreTactics: alert.tactics,
        mitreTechniques: alert.techniques,
        processId: rng.int(1000, 65535),
        processName: rng.pick(suspiciousProcesses).name,
        actionTaken: rng.pick(['blocked', 'logged']),
        confidence: rng.float(0.7, 0.99),
    };
}
/** Generate batch of endpoint events */
function generateEndpointBatch(count, config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const events = [];
    for (let i = 0; i < count; i++) {
        const eventType = rng.pick(['process', 'process', 'file', 'file', 'alert']);
        const baseTime = new Date(Date.now() - rng.int(0, 3600000));
        switch (eventType) {
            case 'process':
                events.push(generateProcessEvent({ ...config, rng, baseTime }));
                break;
            case 'file':
                events.push(generateFileEvent({ ...config, rng, baseTime }));
                break;
            case 'alert':
                events.push(generateEdrAlert({ ...config, rng, baseTime }));
                break;
        }
    }
    return events;
}
