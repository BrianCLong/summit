"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
// ============================================================================
// Main Component
// ============================================================================
const IncidentForensicsDashboard = ({ investigationId, onIncidentSelect, onEvidenceSelect, onWarRoomJoin, className = '', }) => {
    // State management
    const [activeView, setActiveView] = (0, react_1.useState)('overview');
    const [incidents, setIncidents] = (0, react_1.useState)([]);
    const [evidence, setEvidence] = (0, react_1.useState)([]);
    const [timeline, setTimeline] = (0, react_1.useState)([]);
    const [playbooks, setPlaybooks] = (0, react_1.useState)([]);
    const [warRooms, setWarRooms] = (0, react_1.useState)([]);
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    const [selectedIncident, setSelectedIncident] = (0, react_1.useState)(null);
    const [selectedEvidence, setSelectedEvidence] = (0, react_1.useState)(null);
    const [downloadingBundles, setDownloadingBundles] = (0, react_1.useState)({});
    // Filters
    const [severityFilter, setSeverityFilter] = (0, react_1.useState)('all');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [typeFilter, setTypeFilter] = (0, react_1.useState)('all');
    const [timeRange, setTimeRange] = (0, react_1.useState)('24h');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    // Loading states
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    // ============================================================================
    // Data Generation (Mock Data)
    // ============================================================================
    (0, react_1.useEffect)(() => {
        generateMockData();
        const interval = setInterval(() => {
            setIsRefreshing(true);
            setTimeout(() => setIsRefreshing(false), 500);
        }, 30000);
        return () => clearInterval(interval);
    }, [investigationId]);
    const generateMockData = (0, react_1.useCallback)(() => {
        setIsLoading(true);
        // Generate incidents
        const mockIncidents = [
            {
                id: 'INC-2024-001',
                title: 'Suspected Data Exfiltration - Finance Server',
                description: 'Unusual outbound data transfer detected from finance database server to unknown external IP',
                type: 'security',
                severity: 'P0',
                status: 'active',
                source: 'threat_detection_system',
                assignedTo: 'security-team',
                commander: 'John Smith',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 15 * 60 * 1000),
                ttd: 12,
                ttr: 8,
                impactScore: 95,
                affectedSystems: ['finance-db-01', 'finance-app-02', 'vpn-gateway'],
                affectedUsers: 150,
                tags: ['data-breach', 'insider-threat', 'high-priority'],
                warRoomId: 'WAR-001',
                playbookId: 'PB-SEC-001',
            },
            {
                id: 'INC-2024-002',
                title: 'Ransomware Infection - Marketing Workstation',
                description: 'Ransomware variant detected and contained on marketing department workstation',
                type: 'security',
                severity: 'P1',
                status: 'contained',
                source: 'endpoint_protection',
                assignedTo: 'malware-response',
                commander: 'Jane Doe',
                createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 30 * 60 * 1000),
                ttd: 5,
                ttr: 15,
                ttm: 45,
                impactScore: 72,
                affectedSystems: ['mkt-ws-042'],
                affectedUsers: 1,
                tags: ['ransomware', 'malware', 'contained'],
                warRoomId: 'WAR-002',
                playbookId: 'PB-MAL-001',
            },
            {
                id: 'INC-2024-003',
                title: 'API Gateway Performance Degradation',
                description: 'API gateway experiencing 5x latency increase affecting customer-facing services',
                type: 'performance',
                severity: 'P2',
                status: 'investigating',
                source: 'monitoring_system',
                assignedTo: 'platform-team',
                createdAt: new Date(Date.now() - 45 * 60 * 1000),
                updatedAt: new Date(Date.now() - 10 * 60 * 1000),
                ttd: 3,
                impactScore: 55,
                affectedSystems: ['api-gateway-01', 'api-gateway-02'],
                affectedUsers: 5000,
                tags: ['performance', 'latency', 'customer-impact'],
                playbookId: 'PB-PERF-001',
            },
            {
                id: 'INC-2024-004',
                title: 'Unauthorized Access Attempt - Admin Portal',
                description: 'Multiple failed login attempts detected for admin accounts from suspicious IPs',
                type: 'security',
                severity: 'P2',
                status: 'investigating',
                source: 'siem',
                assignedTo: 'security-ops',
                createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 60 * 60 * 1000),
                ttd: 8,
                impactScore: 45,
                affectedSystems: ['admin-portal'],
                affectedUsers: 0,
                tags: ['brute-force', 'authentication', 'blocked'],
            },
            {
                id: 'INC-2024-005',
                title: 'Database Cluster Failover',
                description: 'Primary database node failed, automatic failover to secondary completed',
                type: 'availability',
                severity: 'P1',
                status: 'resolved',
                source: 'database_monitoring',
                assignedTo: 'dba-team',
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
                resolvedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
                ttd: 1,
                ttr: 2,
                ttm: 15,
                impactScore: 30,
                affectedSystems: ['db-cluster-prod'],
                affectedUsers: 0,
                tags: ['database', 'failover', 'auto-recovery'],
            },
        ];
        setIncidents(mockIncidents);
        // Generate forensic evidence
        const mockEvidence = [
            {
                id: 'EVD-001',
                incidentId: 'INC-2024-001',
                name: 'Finance Server Memory Dump',
                type: 'memory_dump',
                source: 'finance-db-01',
                collectedAt: new Date(Date.now() - 90 * 60 * 1000),
                collectedBy: 'incident-response-bot',
                size: 16 * 1024 * 1024 * 1024, // 16GB
                hash: {
                    md5: 'a1b2c3d4e5f6789012345678',
                    sha256: 'abc123def456789012345678901234567890abcdef123456789012345678901234',
                },
                chainOfCustody: [
                    {
                        id: 'COC-001',
                        timestamp: new Date(Date.now() - 90 * 60 * 1000),
                        action: 'collected',
                        performer: 'incident-response-bot',
                        location: 'finance-db-01',
                        notes: 'Automated collection triggered by incident INC-2024-001',
                        integrityVerified: true,
                    },
                    {
                        id: 'COC-002',
                        timestamp: new Date(Date.now() - 85 * 60 * 1000),
                        action: 'transferred',
                        performer: 'evidence-transfer-system',
                        location: 'forensics-storage-01',
                        notes: 'Secure transfer to forensics storage',
                        integrityVerified: true,
                    },
                    {
                        id: 'COC-003',
                        timestamp: new Date(Date.now() - 60 * 60 * 1000),
                        action: 'analyzed',
                        performer: 'Sarah Johnson',
                        location: 'forensics-workstation-03',
                        notes: 'Initial memory analysis started',
                        witnessSignature: 'Mike Chen',
                        integrityVerified: true,
                    },
                ],
                analysisStatus: 'in_progress',
                findings: [
                    {
                        id: 'FND-001',
                        type: 'malware',
                        severity: 'critical',
                        title: 'Unknown Process Injecting into System Services',
                        description: 'Detected process injection technique used to hide malicious code within legitimate system services',
                        timestamp: new Date(Date.now() - 45 * 60 * 1000),
                        confidence: 92,
                        indicators: ['svchost.exe injection', 'unusual memory allocation patterns'],
                        mitreTactics: ['Defense Evasion', 'Privilege Escalation'],
                        mitreAttackId: 'T1055',
                        recommendations: [
                            'Isolate affected system immediately',
                            'Capture additional memory samples',
                            'Check for lateral movement indicators',
                        ],
                    },
                ],
                preservationStatus: 'active',
                classification: 'confidential',
                tags: ['memory-analysis', 'malware', 'critical'],
            },
            {
                id: 'EVD-002',
                incidentId: 'INC-2024-001',
                name: 'Network Traffic Capture - Exfiltration Window',
                type: 'network_capture',
                source: 'network-tap-01',
                collectedAt: new Date(Date.now() - 100 * 60 * 1000),
                collectedBy: 'network-forensics-system',
                size: 2.5 * 1024 * 1024 * 1024, // 2.5GB
                hash: {
                    md5: 'f1e2d3c4b5a6789012345678',
                    sha256: '123abc456def789012345678901234567890abcdef123456789012345678fedcba',
                },
                chainOfCustody: [
                    {
                        id: 'COC-004',
                        timestamp: new Date(Date.now() - 100 * 60 * 1000),
                        action: 'collected',
                        performer: 'network-forensics-system',
                        location: 'network-tap-01',
                        notes: 'Full packet capture during suspected exfiltration window',
                        integrityVerified: true,
                    },
                ],
                analysisStatus: 'completed',
                findings: [
                    {
                        id: 'FND-002',
                        type: 'data_exfiltration',
                        severity: 'critical',
                        title: 'Encrypted Data Transfer to External C2 Server',
                        description: 'Identified encrypted data transfers totaling 847MB to known malicious IP address',
                        timestamp: new Date(Date.now() - 30 * 60 * 1000),
                        confidence: 98,
                        indicators: ['185.192.x.x', 'custom encryption protocol', 'data chunking pattern'],
                        mitreTactics: ['Exfiltration'],
                        mitreAttackId: 'T1041',
                        recommendations: [
                            'Block identified C2 IP addresses',
                            'Analyze exfiltrated data scope',
                            'Notify affected data owners',
                        ],
                    },
                ],
                preservationStatus: 'active',
                classification: 'secret',
                tags: ['network', 'exfiltration', 'c2'],
            },
            {
                id: 'EVD-003',
                incidentId: 'INC-2024-002',
                name: 'Ransomware Sample - marketing-ws-042',
                type: 'malware_sample',
                source: 'mkt-ws-042',
                collectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
                collectedBy: 'endpoint-agent',
                size: 1.2 * 1024 * 1024, // 1.2MB
                hash: {
                    md5: '9a8b7c6d5e4f3210fedcba98',
                    sha256: 'deadbeef123456789abcdef0123456789abcdef0123456789abcdef012345678',
                },
                chainOfCustody: [
                    {
                        id: 'COC-005',
                        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                        action: 'collected',
                        performer: 'endpoint-agent',
                        location: 'mkt-ws-042',
                        notes: 'Quarantined malware sample',
                        integrityVerified: true,
                    },
                    {
                        id: 'COC-006',
                        timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
                        action: 'analyzed',
                        performer: 'malware-sandbox',
                        location: 'sandbox-env-02',
                        notes: 'Automated dynamic analysis completed',
                        integrityVerified: true,
                    },
                ],
                analysisStatus: 'completed',
                findings: [
                    {
                        id: 'FND-003',
                        type: 'malware',
                        severity: 'high',
                        title: 'LockBit 3.0 Ransomware Variant',
                        description: 'Identified as LockBit 3.0 ransomware with anti-analysis capabilities',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
                        confidence: 99,
                        indicators: ['lockbit signature', 'encryption routine', 'ransom note pattern'],
                        mitreTactics: ['Impact'],
                        mitreAttackId: 'T1486',
                        recommendations: [
                            'Verify backup integrity',
                            'Scan all connected systems',
                            'Update endpoint protection signatures',
                        ],
                    },
                ],
                preservationStatus: 'archived',
                classification: 'confidential',
                tags: ['ransomware', 'lockbit', 'analyzed'],
            },
        ];
        setEvidence(mockEvidence);
        // Generate timeline events
        const mockTimeline = [
            {
                id: 'TL-001',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                type: 'detection',
                actor: 'system',
                actorName: 'Threat Detection System',
                title: 'Anomalous Data Transfer Detected',
                description: 'AI-based threat detection identified unusual outbound data transfer patterns from finance server',
                metadata: { detectionId: 'DET-9847', confidence: 94 },
                critical: true,
            },
            {
                id: 'TL-002',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 118 * 60 * 1000),
                type: 'alert',
                actor: 'system',
                actorName: 'SIEM',
                title: 'Critical Security Alert Generated',
                description: 'P0 incident created and security team notified via PagerDuty',
                metadata: { alertId: 'ALT-2847', pagerdutyIncident: 'PD-9283' },
                critical: true,
            },
            {
                id: 'TL-003',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 115 * 60 * 1000),
                type: 'action',
                actor: 'human',
                actorName: 'John Smith',
                title: 'Incident Commander Assigned',
                description: 'John Smith assumed incident commander role and initiated war room',
                critical: false,
            },
            {
                id: 'TL-004',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 110 * 60 * 1000),
                type: 'containment',
                actor: 'system',
                actorName: 'Automated Response',
                title: 'Network Isolation Initiated',
                description: 'Finance server automatically isolated from external network',
                metadata: { isolationScope: 'external', duration: '2h' },
                critical: true,
            },
            {
                id: 'TL-005',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 100 * 60 * 1000),
                type: 'evidence_collected',
                actor: 'system',
                actorName: 'Forensics Collector',
                title: 'Network Traffic Capture Started',
                description: 'Full packet capture initiated for forensic analysis',
                linkedEvidenceIds: ['EVD-002'],
                critical: false,
            },
            {
                id: 'TL-006',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 90 * 60 * 1000),
                type: 'evidence_collected',
                actor: 'system',
                actorName: 'Memory Forensics',
                title: 'Memory Dump Collected',
                description: 'Complete memory dump captured from affected server',
                linkedEvidenceIds: ['EVD-001'],
                critical: false,
            },
            {
                id: 'TL-007',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 60 * 60 * 1000),
                type: 'analysis',
                actor: 'human',
                actorName: 'Sarah Johnson',
                title: 'Memory Analysis Started',
                description: 'Senior forensic analyst began memory dump analysis',
                linkedEvidenceIds: ['EVD-001'],
                critical: false,
            },
            {
                id: 'TL-008',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 45 * 60 * 1000),
                type: 'analysis',
                actor: 'human',
                actorName: 'Sarah Johnson',
                title: 'Process Injection Identified',
                description: 'Malicious process injection technique discovered in memory analysis',
                linkedFindingIds: ['FND-001'],
                critical: true,
            },
            {
                id: 'TL-009',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                type: 'analysis',
                actor: 'human',
                actorName: 'Mike Chen',
                title: 'C2 Communication Confirmed',
                description: 'Network analysis confirmed data exfiltration to external C2 server',
                linkedFindingIds: ['FND-002'],
                linkedEvidenceIds: ['EVD-002'],
                critical: true,
            },
            {
                id: 'TL-010',
                incidentId: 'INC-2024-001',
                timestamp: new Date(Date.now() - 15 * 60 * 1000),
                type: 'decision',
                actor: 'human',
                actorName: 'John Smith',
                title: 'Escalation to Executive Team',
                description: 'Decision made to escalate to executive team due to confirmed data breach',
                metadata: { escalationLevel: 'executive', approvedBy: 'CISO' },
                critical: true,
            },
        ];
        setTimeline(mockTimeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        // Generate playbooks
        const mockPlaybooks = [
            {
                id: 'PB-EXEC-001',
                name: 'Data Breach Response Playbook',
                status: 'running',
                progress: 65,
                startedAt: new Date(Date.now() - 110 * 60 * 1000),
                executedBy: 'John Smith',
                steps: [
                    {
                        id: 'STEP-001',
                        name: 'Isolate Affected Systems',
                        type: 'automated',
                        status: 'completed',
                        startedAt: new Date(Date.now() - 110 * 60 * 1000),
                        completedAt: new Date(Date.now() - 108 * 60 * 1000),
                        output: 'Successfully isolated finance-db-01 from external network',
                    },
                    {
                        id: 'STEP-002',
                        name: 'Collect Forensic Evidence',
                        type: 'automated',
                        status: 'completed',
                        startedAt: new Date(Date.now() - 108 * 60 * 1000),
                        completedAt: new Date(Date.now() - 90 * 60 * 1000),
                        output: 'Memory dump and network capture collected',
                    },
                    {
                        id: 'STEP-003',
                        name: 'Notify Security Team',
                        type: 'automated',
                        status: 'completed',
                        startedAt: new Date(Date.now() - 118 * 60 * 1000),
                        completedAt: new Date(Date.now() - 117 * 60 * 1000),
                        output: 'PagerDuty alert sent, 5 responders acknowledged',
                    },
                    {
                        id: 'STEP-004',
                        name: 'Analyze Evidence',
                        type: 'manual',
                        status: 'completed',
                        startedAt: new Date(Date.now() - 90 * 60 * 1000),
                        completedAt: new Date(Date.now() - 30 * 60 * 1000),
                        output: 'Analysis complete - malware and exfiltration confirmed',
                    },
                    {
                        id: 'STEP-005',
                        name: 'Executive Notification Approval',
                        type: 'approval',
                        status: 'completed',
                        startedAt: new Date(Date.now() - 20 * 60 * 1000),
                        completedAt: new Date(Date.now() - 15 * 60 * 1000),
                        output: 'Approved by CISO',
                    },
                    {
                        id: 'STEP-006',
                        name: 'Notify Legal Team',
                        type: 'manual',
                        status: 'running',
                        startedAt: new Date(Date.now() - 10 * 60 * 1000),
                    },
                    {
                        id: 'STEP-007',
                        name: 'Prepare Breach Notification',
                        type: 'manual',
                        status: 'pending',
                    },
                    {
                        id: 'STEP-008',
                        name: 'Remediation Actions',
                        type: 'manual',
                        status: 'pending',
                    },
                ],
            },
        ];
        setPlaybooks(mockPlaybooks);
        // Generate war rooms
        const mockWarRooms = [
            {
                id: 'WAR-001',
                incidentId: 'INC-2024-001',
                status: 'active',
                commander: 'John Smith',
                participants: [
                    { userId: 'U001', name: 'John Smith', role: 'commander', status: 'online' },
                    { userId: 'U002', name: 'Sarah Johnson', role: 'responder', status: 'online' },
                    { userId: 'U003', name: 'Mike Chen', role: 'responder', status: 'online' },
                    { userId: 'U004', name: 'Lisa Park', role: 'sme', status: 'away' },
                    { userId: 'U005', name: 'CISO', role: 'observer', status: 'online' },
                ],
                messageCount: 47,
                decisionsCount: 3,
                actionItemsCount: 8,
                artifactsCount: 5,
                createdAt: new Date(Date.now() - 115 * 60 * 1000),
            },
            {
                id: 'WAR-002',
                incidentId: 'INC-2024-002',
                status: 'active',
                commander: 'Jane Doe',
                participants: [
                    { userId: 'U006', name: 'Jane Doe', role: 'commander', status: 'online' },
                    { userId: 'U007', name: 'Bob Wilson', role: 'responder', status: 'online' },
                ],
                messageCount: 23,
                decisionsCount: 2,
                actionItemsCount: 4,
                artifactsCount: 3,
                createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            },
        ];
        setWarRooms(mockWarRooms);
        // Generate metrics
        const mockMetrics = {
            totalIncidents: 127,
            activeIncidents: 3,
            resolvedToday: 5,
            mttr: 4.2,
            mttd: 8.5,
            severityDistribution: { P0: 1, P1: 2, P2: 8, P3: 15, P4: 101 },
            typeDistribution: { security: 45, performance: 32, availability: 28, capacity: 12, compliance: 10 },
            evidenceCollected: 23,
            findingsIdentified: 15,
            playbooksExecuted: 8,
        };
        setMetrics(mockMetrics);
        setIsLoading(false);
    }, [investigationId]);
    // ============================================================================
    // Filtering Logic
    // ============================================================================
    const filteredIncidents = (0, react_1.useMemo)(() => {
        return incidents.filter((incident) => {
            if (severityFilter !== 'all' && incident.severity !== severityFilter)
                return false;
            if (statusFilter !== 'all' && incident.status !== statusFilter)
                return false;
            if (typeFilter !== 'all' && incident.type !== typeFilter)
                return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (incident.title.toLowerCase().includes(query) ||
                    incident.description.toLowerCase().includes(query) ||
                    incident.id.toLowerCase().includes(query));
            }
            return true;
        });
    }, [incidents, severityFilter, statusFilter, typeFilter, searchQuery]);
    const filteredEvidence = (0, react_1.useMemo)(() => {
        if (!selectedIncident)
            return evidence;
        return evidence.filter((e) => e.incidentId === selectedIncident.id);
    }, [evidence, selectedIncident]);
    const filteredTimeline = (0, react_1.useMemo)(() => {
        if (!selectedIncident)
            return timeline;
        return timeline.filter((t) => t.incidentId === selectedIncident.id);
    }, [timeline, selectedIncident]);
    // ============================================================================
    // Utility Functions
    // ============================================================================
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const formatDuration = (minutes) => {
        if (minutes < 60)
            return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };
    const formatTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'P0':
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'P1':
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'P2':
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'P3':
            case 'P4':
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
            case 'running':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'contained':
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'investigating':
            case 'pending':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'resolved':
            case 'completed':
            case 'verified':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'escalated':
            case 'failed':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'security':
                return '🛡️';
            case 'performance':
                return '⚡';
            case 'availability':
                return '🔄';
            case 'capacity':
                return '📊';
            case 'compliance':
                return '📋';
            default:
                return '📌';
        }
    };
    const getEvidenceTypeIcon = (type) => {
        switch (type) {
            case 'memory_dump':
                return '🧠';
            case 'disk_image':
                return '💾';
            case 'network_capture':
                return '🌐';
            case 'log_file':
                return '📄';
            case 'screenshot':
                return '📸';
            case 'config_snapshot':
                return '⚙️';
            case 'malware_sample':
                return '🦠';
            case 'artifact':
                return '🔍';
            default:
                return '📁';
        }
    };
    const getTimelineEventIcon = (type) => {
        switch (type) {
            case 'detection':
                return '🔔';
            case 'alert':
                return '🚨';
            case 'action':
                return '⚡';
            case 'evidence_collected':
                return '📥';
            case 'analysis':
                return '🔬';
            case 'decision':
                return '📋';
            case 'escalation':
                return '⬆️';
            case 'containment':
                return '🛡️';
            case 'remediation':
                return '🔧';
            case 'communication':
                return '💬';
            case 'system':
                return '🤖';
            default:
                return '📌';
        }
    };
    // ============================================================================
    // Event Handlers
    // ============================================================================
    const handleIncidentSelect = (0, react_1.useCallback)((incident) => {
        setSelectedIncident(incident);
        onIncidentSelect?.(incident);
    }, [onIncidentSelect]);
    const handleEvidenceSelect = (0, react_1.useCallback)((evidenceItem) => {
        setSelectedEvidence(evidenceItem);
        onEvidenceSelect?.(evidenceItem);
    }, [onEvidenceSelect]);
    const handleJoinWarRoom = (0, react_1.useCallback)((warRoomId) => {
        onWarRoomJoin?.(warRoomId);
    }, [onWarRoomJoin]);
    const handleDownloadBundle = (0, react_1.useCallback)(async (runId) => {
        setDownloadingBundles((prev) => ({ ...prev, [runId]: true }));
        try {
            const response = await fetch(`/api/soar/runs/${runId}/bundle`);
            if (!response.ok) {
                throw new Error('Failed to download bundle');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `playbook-run-${runId}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        }
        finally {
            setDownloadingBundles((prev) => ({ ...prev, [runId]: false }));
        }
    }, []);
    // ============================================================================
    // Render Functions
    // ============================================================================
    const renderOverview = () => (<div className="space-y-6">
      {/* Metrics Cards */}
      {metrics && (<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-3xl font-bold text-red-600">{metrics.activeIncidents}</div>
            <div className="text-sm text-gray-600">Active Incidents</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-3xl font-bold text-green-600">{metrics.resolvedToday}</div>
            <div className="text-sm text-gray-600">Resolved Today</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-3xl font-bold text-blue-600">{metrics.mttr.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">MTTR</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-3xl font-bold text-purple-600">{metrics.mttd.toFixed(1)}m</div>
            <div className="text-sm text-gray-600">MTTD</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-3xl font-bold text-orange-600">{metrics.evidenceCollected}</div>
            <div className="text-sm text-gray-600">Evidence Items</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-3xl font-bold text-indigo-600">{metrics.findingsIdentified}</div>
            <div className="text-sm text-gray-600">Findings</div>
          </div>
        </div>)}

      {/* Active Incidents Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Critical Incidents</h3>
          <div className="space-y-3">
            {incidents
            .filter((i) => i.status === 'active' || i.status === 'investigating')
            .slice(0, 5)
            .map((incident) => (<div key={incident.id} onClick={() => handleIncidentSelect(incident)} className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(incident.type)}</span>
                      <span className="font-medium">{incident.id}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(incident.status)}`}>
                        {incident.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-medium mb-1">{incident.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(incident.createdAt)} • Impact: {incident.impactScore}% •{' '}
                    {incident.affectedUsers} users affected
                  </div>
                </div>))}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Active War Rooms</h3>
          <div className="space-y-3">
            {warRooms
            .filter((w) => w.status === 'active')
            .map((warRoom) => (<div key={warRoom.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{warRoom.incidentId}</div>
                      <div className="text-sm text-gray-600">Commander: {warRoom.commander}</div>
                    </div>
                    <button onClick={() => handleJoinWarRoom(warRoom.id)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Join
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-green-500">●</span>
                      <span>
                        {warRoom.participants.filter((p) => p.status === 'online').length} online
                      </span>
                    </div>
                    <span className="text-gray-400">|</span>
                    <span>{warRoom.messageCount} messages</span>
                    <span className="text-gray-400">|</span>
                    <span>{warRoom.actionItemsCount} actions</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {warRoom.participants.slice(0, 5).map((p) => (<div key={p.userId} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${p.status === 'online'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'}`} title={`${p.name} (${p.role})`}>
                        {p.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                      </div>))}
                    {warRoom.participants.length > 5 && (<div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        +{warRoom.participants.length - 5}
                      </div>)}
                  </div>
                </div>))}
          </div>
        </div>
      </div>

      {/* Recent Forensic Findings */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Forensic Findings</h3>
        <div className="space-y-3">
          {evidence
            .flatMap((e) => e.findings.map((f) => ({ ...f, evidenceId: e.id, evidenceName: e.name })))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 5)
            .map((finding) => (<div key={finding.id} className={`p-4 border-l-4 rounded-lg ${finding.severity === 'critical'
                ? 'border-l-red-500 bg-red-50'
                : finding.severity === 'high'
                    ? 'border-l-orange-500 bg-orange-50'
                    : 'border-l-yellow-500 bg-yellow-50'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium">{finding.title}</div>
                  <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(finding.severity)}`}>
                    {finding.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{finding.description}</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 rounded">{finding.type}</span>
                  {finding.mitreAttackId && (<span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      MITRE: {finding.mitreAttackId}
                    </span>)}
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {finding.confidence}% confidence
                  </span>
                </div>
              </div>))}
        </div>
      </div>
    </div>);
    const renderIncidents = () => (<div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border">
        <input type="text" placeholder="Search incidents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 border rounded-md flex-1 min-w-[200px]"/>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-3 py-2 border rounded-md">
          <option value="all">All Severities</option>
          <option value="P0">P0 - Critical</option>
          <option value="P1">P1 - High</option>
          <option value="P2">P2 - Medium</option>
          <option value="P3">P3 - Low</option>
          <option value="P4">P4 - Info</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-md">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="contained">Contained</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-md">
          <option value="all">All Types</option>
          <option value="security">Security</option>
          <option value="performance">Performance</option>
          <option value="availability">Availability</option>
          <option value="capacity">Capacity</option>
          <option value="compliance">Compliance</option>
        </select>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.map((incident) => (<div key={incident.id} onClick={() => handleIncidentSelect(incident)} className={`bg-white rounded-lg border p-6 cursor-pointer hover:shadow-md transition-shadow ${selectedIncident?.id === incident.id ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getTypeIcon(incident.type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{incident.id}</span>
                    <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(incident.status)}`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-medium mt-1">{incident.title}</div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>{formatTimeAgo(incident.createdAt)}</div>
                {incident.commander && <div>Commander: {incident.commander}</div>}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{incident.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">Impact Score:</span>
                <span className="ml-2 font-medium">{incident.impactScore}%</span>
              </div>
              <div>
                <span className="text-gray-500">Affected Users:</span>
                <span className="ml-2 font-medium">{incident.affectedUsers.toLocaleString()}</span>
              </div>
              {incident.ttd && (<div>
                  <span className="text-gray-500">TTD:</span>
                  <span className="ml-2 font-medium">{formatDuration(incident.ttd)}</span>
                </div>)}
              {incident.ttr && (<div>
                  <span className="text-gray-500">TTR:</span>
                  <span className="ml-2 font-medium">{formatDuration(incident.ttr)}</span>
                </div>)}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {incident.affectedSystems.map((system) => (<span key={system} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {system}
                </span>))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                {incident.tags.map((tag) => (<span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    #{tag}
                  </span>))}
              </div>
              <div className="flex gap-2">
                {incident.warRoomId && (<button onClick={(e) => {
                    e.stopPropagation();
                    handleJoinWarRoom(incident.warRoomId);
                }} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    Join War Room
                  </button>)}
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  View Details
                </button>
              </div>
            </div>
          </div>))}
      </div>
    </div>);
    const renderEvidence = () => (<div className="space-y-4">
      {/* Evidence Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{evidence.length}</div>
          <div className="text-sm text-gray-600">Total Evidence Items</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {evidence.filter((e) => e.analysisStatus === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">Under Analysis</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">
            {evidence.filter((e) => e.analysisStatus === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Analysis Complete</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {evidence.flatMap((e) => e.findings).length}
          </div>
          <div className="text-sm text-gray-600">Total Findings</div>
        </div>
      </div>

      {/* Evidence List */}
      <div className="space-y-4">
        {filteredEvidence.map((item) => (<div key={item.id} onClick={() => handleEvidenceSelect(item)} className={`bg-white rounded-lg border p-6 cursor-pointer hover:shadow-md transition-shadow ${selectedEvidence?.id === item.id ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getEvidenceTypeIcon(item.type)}</span>
                <div>
                  <div className="font-bold text-lg">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.id} • {item.type.replace('_', ' ')} • {formatFileSize(item.size)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.analysisStatus)}`}>
                  {item.analysisStatus.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${item.classification === 'top_secret'
                ? 'bg-red-100 text-red-700'
                : item.classification === 'secret'
                    ? 'bg-orange-100 text-orange-700'
                    : item.classification === 'confidential'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'}`}>
                  {item.classification.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Hash Information */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 font-mono text-xs">
              <div>
                <span className="text-gray-500">SHA256:</span> {item.hash.sha256.substring(0, 32)}...
              </div>
              <div>
                <span className="text-gray-500">MD5:</span> {item.hash.md5}
              </div>
            </div>

            {/* Chain of Custody Summary */}
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Chain of Custody ({item.chainOfCustody.length} entries)</h4>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {item.chainOfCustody.map((entry, index) => (<react_1.default.Fragment key={entry.id}>
                    <div className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs ${entry.integrityVerified
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'}`}>
                      <div className="font-medium capitalize">{entry.action}</div>
                      <div className="text-gray-500">{entry.performer}</div>
                      <div className="text-gray-400">{formatTimeAgo(entry.timestamp)}</div>
                    </div>
                    {index < item.chainOfCustody.length - 1 && (<span className="text-gray-300 flex-shrink-0">→</span>)}
                  </react_1.default.Fragment>))}
              </div>
            </div>

            {/* Findings */}
            {item.findings.length > 0 && (<div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-2">Findings ({item.findings.length})</h4>
                <div className="space-y-2">
                  {item.findings.map((finding) => (<div key={finding.id} className={`p-3 rounded-lg border-l-4 ${finding.severity === 'critical'
                        ? 'border-l-red-500 bg-red-50'
                        : finding.severity === 'high'
                            ? 'border-l-orange-500 bg-orange-50'
                            : 'border-l-yellow-500 bg-yellow-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{finding.title}</span>
                        <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(finding.severity)}`}>
                          {finding.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{finding.description}</div>
                      {finding.mitreAttackId && (<div className="mt-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                            MITRE ATT&CK: {finding.mitreAttackId}
                          </span>
                        </div>)}
                    </div>))}
                </div>
              </div>)}

            {/* Tags */}
            <div className="flex gap-2 mt-4">
              {item.tags.map((tag) => (<span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                  #{tag}
                </span>))}
            </div>
          </div>))}
      </div>
    </div>);
    const renderTimeline = () => (<div className="space-y-4">
      {/* Timeline Header */}
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Incident Timeline</h3>
          <p className="text-sm text-gray-500">
            {selectedIncident
            ? `Showing events for ${selectedIncident.id}`
            : 'Showing all incident events'}
          </p>
        </div>
        <div className="flex gap-2">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="bg-white rounded-lg border p-6">
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-6">
            {filteredTimeline.map((event, index) => (<div key={event.id} className="relative flex gap-4">
                <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-2xl ${event.critical ? 'bg-red-100 ring-4 ring-red-200' : 'bg-gray-100'}`}>
                  {getTimelineEventIcon(event.type)}
                </div>
                <div className={`flex-1 p-4 rounded-lg ${event.critical
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{event.title}</span>
                        {event.critical && (<span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                            CRITICAL
                          </span>)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {event.actor === 'human' ? event.actorName : 'System'} •{' '}
                        {event.type.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {event.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{event.description}</p>

                  {/* Linked Items */}
                  {(event.linkedEvidenceIds?.length || event.linkedFindingIds?.length) && (<div className="flex gap-2 mt-3">
                      {event.linkedEvidenceIds?.map((id) => (<span key={id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded cursor-pointer hover:bg-blue-200">
                          📁 {id}
                        </span>))}
                      {event.linkedFindingIds?.map((id) => (<span key={id} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded cursor-pointer hover:bg-purple-200">
                          🔍 {id}
                        </span>))}
                    </div>)}

                  {/* Metadata */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (<div className="mt-3 p-2 bg-white rounded text-xs font-mono">
                      {Object.entries(event.metadata).map(([key, value]) => (<div key={key}>
                          <span className="text-gray-500">{key}:</span>{' '}
                          <span className="text-gray-700">{String(value)}</span>
                        </div>))}
                    </div>)}
                </div>
              </div>))}
          </div>
        </div>
      </div>
    </div>);
    const renderPlaybooks = () => (<div className="space-y-4">
      {playbooks.map((playbook) => (<div key={playbook.id} className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{playbook.name}</h3>
              <div className="text-sm text-gray-500">
                Executed by: {playbook.executedBy} • Started:{' '}
                {playbook.startedAt?.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleDownloadBundle(playbook.id)} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border border-gray-300 rounded hover:bg-gray-100" disabled={downloadingBundles[playbook.id]}>
                {downloadingBundles[playbook.id] ? 'Preparing...' : 'Download Bundle'}
              </button>
              <span className={`px-3 py-1 rounded ${getStatusColor(playbook.status)}`}>
                {playbook.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{playbook.progress}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div className={`h-full rounded-full transition-all ${playbook.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${playbook.progress}%` }}></div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {playbook.steps.map((step, index) => (<div key={step.id} className={`p-4 rounded-lg border ${step.status === 'running'
                    ? 'border-blue-300 bg-blue-50'
                    : step.status === 'completed'
                        ? 'border-green-300 bg-green-50'
                        : step.status === 'failed'
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : step.status === 'running'
                        ? 'bg-blue-500 text-white animate-pulse'
                        : step.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-300 text-gray-600'}`}>
                      {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{step.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {step.type} step
                        {step.startedAt && ` • Started ${formatTimeAgo(step.startedAt)}`}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(step.status)}`}>
                    {step.status.toUpperCase()}
                  </span>
                </div>

                {step.output && (<div className="mt-2 p-2 bg-white rounded text-sm text-gray-600">{step.output}</div>)}

                {step.error && (<div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">{step.error}</div>)}
              </div>))}
          </div>
        </div>))}
    </div>);
    const renderWarRoom = () => (<div className="space-y-4">
      {warRooms.map((warRoom) => (<div key={warRoom.id} className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">War Room: {warRoom.incidentId}</h3>
              <div className="text-sm text-gray-500">
                Commander: {warRoom.commander} • Created {formatTimeAgo(warRoom.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded ${getStatusColor(warRoom.status)}`}>
                {warRoom.status.toUpperCase()}
              </span>
              <button onClick={() => handleJoinWarRoom(warRoom.id)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Join War Room
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{warRoom.participants.length}</div>
              <div className="text-xs text-gray-500">Participants</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{warRoom.messageCount}</div>
              <div className="text-xs text-gray-500">Messages</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{warRoom.decisionsCount}</div>
              <div className="text-xs text-gray-500">Decisions</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{warRoom.actionItemsCount}</div>
              <div className="text-xs text-gray-500">Action Items</div>
            </div>
          </div>

          {/* Participants */}
          <div>
            <h4 className="font-medium text-sm mb-2">Participants</h4>
            <div className="flex flex-wrap gap-2">
              {warRoom.participants.map((participant) => (<div key={participant.userId} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${participant.status === 'online'
                    ? 'bg-green-50 border border-green-200'
                    : participant.status === 'away'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`w-2 h-2 rounded-full ${participant.status === 'online'
                    ? 'bg-green-500'
                    : participant.status === 'away'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'}`}></div>
                  <span className="font-medium text-sm">{participant.name}</span>
                  <span className="text-xs text-gray-500 capitalize">({participant.role})</span>
                </div>))}
            </div>
          </div>
        </div>))}
    </div>);
    // ============================================================================
    // Main Render
    // ============================================================================
    // Memoize navigation tabs to prevent unnecessary recalculations of active counts on every render
    const navigationTabs = (0, react_1.useMemo)(() => {
        // Combine filter and length operations into reduce for better O(n) performance
        const activeIncidents = incidents.reduce((count, i) => count + (i.status === 'active' ? 1 : 0), 0);
        const activePlaybooks = playbooks.reduce((count, p) => count + (p.status === 'running' ? 1 : 0), 0);
        const activeWarRooms = warRooms.reduce((count, w) => count + (w.status === 'active' ? 1 : 0), 0);
        return [
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'incidents', label: 'Incidents', icon: '🚨', count: activeIncidents },
            { id: 'evidence', label: 'Evidence', icon: '📁', count: evidence.length },
            { id: 'timeline', label: 'Timeline', icon: '⏱️' },
            { id: 'playbooks', label: 'Playbooks', icon: '📋', count: activePlaybooks },
            { id: 'warroom', label: 'War Rooms', icon: '🎖️', count: activeWarRooms },
        ];
    }, [incidents, evidence.length, playbooks, warRooms]);
    return (<div className={`incident-forensics-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Incident Forensics Dashboard</h1>
            <p className="text-gray-500 text-sm">
              Real-time incident response and forensic analysis platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isRefreshing && (<span className="text-sm text-gray-500 animate-pulse">Refreshing...</span>)}
            <button onClick={() => generateMockData()} className="px-4 py-2 border rounded-md hover:bg-gray-50">
              Refresh Data
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              + New Incident
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 flex-wrap">
          {navigationTabs.map((tab) => (<button key={tab.id} onClick={() => setActiveView(tab.id)} className={`px-4 py-2 rounded-md flex items-center gap-2 ${activeView === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'}`}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (<span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.count}
                </span>)}
            </button>))}</div>
      </div>

      {/* Loading State */}
      {isLoading ? (<div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading incident data...</p>
          </div>
        </div>) : (<>
          {activeView === 'overview' && renderOverview()}
          {activeView === 'incidents' && renderIncidents()}
          {activeView === 'evidence' && renderEvidence()}
          {activeView === 'timeline' && renderTimeline()}
          {activeView === 'playbooks' && renderPlaybooks()}
          {activeView === 'warroom' && renderWarRoom()}
        </>)}
    </div>);
};
exports.default = IncidentForensicsDashboard;
