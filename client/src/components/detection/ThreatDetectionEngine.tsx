import React, { useState, useEffect } from 'react';

interface ThreatSignature {
  id: string;
  name: string;
  type: 'behavioral' | 'signature' | 'anomaly' | 'ml_model' | 'heuristic';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  indicators: string[];
  mitreTactics: string[];
  mitreID?: string;
  isActive: boolean;
  lastUpdated: Date;
  falsePositiveRate: number;
}

interface ThreatAlert {
  id: string;
  signatureId: string;
  signatureName: string;
  timestamp: Date;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  affectedEntities: string[];
  indicators: Array<{
    type:
      | 'ip'
      | 'domain'
      | 'hash'
      | 'url'
      | 'email'
      | 'filename'
      | 'registry'
      | 'process';
    value: string;
    confidence: number;
  }>;
  context: {
    sourceIP?: string;
    destinationIP?: string;
    protocol?: string;
    port?: number;
    processName?: string;
    username?: string;
    location?: string;
  };
  mitreTechniques: string[];
  rawData?: any;
  assignedAnalyst?: string;
  notes: string[];
}

interface IncidentCase {
  id: string;
  title: string;
  status:
    | 'open'
    | 'investigating'
    | 'containment'
    | 'eradication'
    | 'recovery'
    | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'malware'
    | 'phishing'
    | 'data_breach'
    | 'insider_threat'
    | 'apt'
    | 'ddos'
    | 'fraud'
    | 'other';
  createdDate: Date;
  lastUpdated: Date;
  assignedTeam: string[];
  affectedSystems: string[];
  alerts: string[]; // Alert IDs
  timeline: Array<{
    timestamp: Date;
    action: string;
    user: string;
    details: string;
  }>;
  containmentActions: Array<{
    id: string;
    action: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo: string;
    deadline?: Date;
    notes?: string;
  }>;
  impactAssessment: {
    confidentiality: 'none' | 'low' | 'medium' | 'high';
    integrity: 'none' | 'low' | 'medium' | 'high';
    availability: 'none' | 'low' | 'medium' | 'high';
    businessImpact: string;
    affectedUsers: number;
    estimatedCost: number;
  };
}

interface DetectionMetrics {
  alertsLast24h: number;
  alertsLast7d: number;
  averageResponseTime: number; // minutes
  falsePositiveRate: number;
  openIncidents: number;
  criticalAlerts: number;
  topThreatTypes: Array<{ type: string; count: number }>;
  detectionAccuracy: number;
  meanTimeToDetection: number; // minutes
  meanTimeToResponse: number; // minutes
}

interface ThreatDetectionEngineProps {
  investigationId?: string;
  onAlertCreate?: (alert: ThreatAlert) => void;
  onAlertUpdate?: (alertId: string, alert: ThreatAlert) => void;
  onIncidentCreate?: (incident: IncidentCase) => void;
  onIncidentUpdate?: (incidentId: string, incident: IncidentCase) => void;
  onContainmentAction?: (action: any) => void;
  autoEscalate?: boolean;
  className?: string;
}

const ThreatDetectionEngine: React.FC<ThreatDetectionEngineProps> = ({
  investigationId,
  onAlertCreate = () => {},
  onAlertUpdate = () => {},
  onIncidentCreate = () => {},
  onIncidentUpdate = () => {},
  onContainmentAction = () => {},
  autoEscalate = true,
  className = '',
}) => {
  const [signatures, setSignatures] = useState<ThreatSignature[]>([]);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [incidents, setIncidents] = useState<IncidentCase[]>([]);
  const [metrics, setMetrics] = useState<DetectionMetrics | null>(null);
  const [activeView, setActiveView] = useState<
    'dashboard' | 'alerts' | 'incidents' | 'signatures' | 'response'
  >('dashboard');
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentCase | null>(
    null,
  );
  const [isDetectionRunning, setIsDetectionRunning] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Real-time detection simulation
  useEffect(() => {
    generateMockSignatures();
    generateMockAlerts();
    generateMockIncidents();
    calculateMetrics();

    const detectionInterval = setInterval(() => {
      if (isDetectionRunning) {
        simulateRealTimeDetection();
      }
    }, 10000); // Check every 10 seconds

    const metricsInterval = setInterval(() => {
      calculateMetrics();
    }, 30000); // Update metrics every 30 seconds

    return () => {
      clearInterval(detectionInterval);
      clearInterval(metricsInterval);
    };
  }, [investigationId, isDetectionRunning]);

  const generateMockSignatures = () => {
    const mockSignatures: ThreatSignature[] = [
      {
        id: 'sig-001',
        name: 'Suspicious PowerShell Execution',
        type: 'behavioral',
        severity: 'high',
        confidence: 85,
        description:
          'Detection of suspicious PowerShell commands often used in attacks',
        indicators: [
          'powershell.exe',
          'encoded command',
          'download',
          'invoke-expression',
        ],
        mitreTactics: ['T1059.001', 'T1105'],
        mitreID: 'T1059.001',
        isActive: true,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
        falsePositiveRate: 0.05,
      },
      {
        id: 'sig-002',
        name: 'Lateral Movement Detection',
        type: 'behavioral',
        severity: 'critical',
        confidence: 92,
        description:
          'Detects patterns indicative of lateral movement across network',
        indicators: ['psexec', 'wmic', 'net use', 'admin$'],
        mitreTactics: ['T1021', 'T1077'],
        mitreID: 'T1021.001',
        isActive: true,
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000),
        falsePositiveRate: 0.02,
      },
      {
        id: 'sig-003',
        name: 'Data Exfiltration Pattern',
        type: 'anomaly',
        severity: 'high',
        confidence: 78,
        description:
          'Unusual data transfer patterns suggesting potential exfiltration',
        indicators: [
          'large file transfers',
          'compressed archives',
          'unusual destinations',
        ],
        mitreTactics: ['T1041', 'T1002'],
        mitreID: 'T1041',
        isActive: true,
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),
        falsePositiveRate: 0.08,
      },
      {
        id: 'sig-004',
        name: 'Credential Dumping Activity',
        type: 'signature',
        severity: 'critical',
        confidence: 95,
        description:
          'Detection of tools and techniques used for credential extraction',
        indicators: ['mimikatz', 'lsass.exe', 'procdump', 'sekurlsa'],
        mitreTactics: ['T1003'],
        mitreID: 'T1003.001',
        isActive: true,
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
        falsePositiveRate: 0.01,
      },
      {
        id: 'sig-005',
        name: 'C2 Communication Detection',
        type: 'ml_model',
        severity: 'high',
        confidence: 88,
        description:
          'ML model detecting command and control communication patterns',
        indicators: [
          'periodic beacons',
          'encrypted traffic',
          'suspicious domains',
        ],
        mitreTactics: ['T1071', 'T1102'],
        mitreID: 'T1071.001',
        isActive: true,
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
        falsePositiveRate: 0.03,
      },
    ];

    setSignatures(mockSignatures);
  };

  const generateMockAlerts = () => {
    const severities: ThreatAlert['severity'][] = [
      'info',
      'low',
      'medium',
      'high',
      'critical',
    ];
    const statuses: ThreatAlert['status'][] = [
      'new',
      'investigating',
      'confirmed',
      'false_positive',
      'resolved',
    ];

    const mockAlerts: ThreatAlert[] = Array.from({ length: 25 }, (_, i) => {
      const severity =
        severities[Math.floor(Math.random() * severities.length)];
      const status =
        i < 5 ? 'new' : statuses[Math.floor(Math.random() * statuses.length)];

      return {
        id: `alert-${String(i + 1).padStart(3, '0')}`,
        signatureId: `sig-${String.fromCharCode(48 + (i % 5) + 1).padStart(3, '0')}`,
        signatureName: `Threat Signature ${i + 1}`,
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        ),
        severity,
        confidence: Math.random() * 40 + 60,
        status,
        affectedEntities: [`host-${Math.floor(Math.random() * 100)}`],
        indicators: [
          {
            type: 'ip',
            value: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            confidence: Math.random() * 30 + 70,
          },
          {
            type: 'process',
            value: ['powershell.exe', 'cmd.exe', 'wmic.exe', 'psexec.exe'][
              Math.floor(Math.random() * 4)
            ],
            confidence: Math.random() * 20 + 80,
          },
        ],
        context: {
          sourceIP: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          processName: ['powershell.exe', 'cmd.exe', 'explorer.exe'][
            Math.floor(Math.random() * 3)
          ],
          username: ['user1', 'admin', 'service_account'][
            Math.floor(Math.random() * 3)
          ],
        },
        mitreTechniques: [
          ['T1059.001', 'T1021.001', 'T1003.001'][
            Math.floor(Math.random() * 3)
          ],
        ],
        notes: [],
      };
    });

    setAlerts(
      mockAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    );
  };

  const generateMockIncidents = () => {
    const categories: IncidentCase['category'][] = [
      'malware',
      'phishing',
      'data_breach',
      'insider_threat',
      'apt',
    ];
    const priorities: IncidentCase['priority'][] = [
      'low',
      'medium',
      'high',
      'critical',
    ];
    const statuses: IncidentCase['status'][] = [
      'open',
      'investigating',
      'containment',
      'recovery',
    ];

    const mockIncidents: IncidentCase[] = Array.from({ length: 8 }, (_, i) => {
      const createdDate = new Date(
        Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000,
      );

      return {
        id: `inc-${String(i + 1).padStart(3, '0')}`,
        title: `Security Incident ${i + 1}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        createdDate,
        lastUpdated: new Date(
          createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000,
        ),
        assignedTeam: [
          ['SOC Team', 'Incident Response', 'Forensics'][
            Math.floor(Math.random() * 3)
          ],
        ],
        affectedSystems: [`system-${Math.floor(Math.random() * 50)}`],
        alerts: [
          `alert-${String(Math.floor(Math.random() * 25) + 1).padStart(3, '0')}`,
        ],
        timeline: [
          {
            timestamp: createdDate,
            action: 'Incident Created',
            user: 'System',
            details: 'Automated incident creation from high-severity alert',
          },
        ],
        containmentActions: [
          {
            id: `action-${i + 1}`,
            action: 'Isolate affected system',
            status: 'pending',
            assignedTo: 'SOC Analyst',
          },
        ],
        impactAssessment: {
          confidentiality: ['none', 'low', 'medium', 'high'][
            Math.floor(Math.random() * 4)
          ] as any,
          integrity: ['none', 'low', 'medium', 'high'][
            Math.floor(Math.random() * 4)
          ] as any,
          availability: ['none', 'low', 'medium', 'high'][
            Math.floor(Math.random() * 4)
          ] as any,
          businessImpact: 'Under investigation',
          affectedUsers: Math.floor(Math.random() * 1000),
          estimatedCost: Math.floor(Math.random() * 100000),
        },
      };
    });

    setIncidents(
      mockIncidents.sort(
        (a, b) => b.createdDate.getTime() - a.createdDate.getTime(),
      ),
    );
  };

  const simulateRealTimeDetection = () => {
    // Randomly generate new alerts
    if (Math.random() < 0.3) {
      // 30% chance of new alert
      const newAlert = generateRandomAlert();
      setAlerts((prev) => [newAlert, ...prev]);
      onAlertCreate(newAlert);

      // Auto-escalate critical alerts to incidents if enabled
      if (autoEscalate && newAlert.severity === 'critical') {
        const newIncident = createIncidentFromAlert(newAlert);
        setIncidents((prev) => [newIncident, ...prev]);
        onIncidentCreate(newIncident);
      }
    }
  };

  const generateRandomAlert = (): ThreatAlert => {
    const severities: ThreatAlert['severity'][] = [
      'info',
      'low',
      'medium',
      'high',
      'critical',
    ];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    return {
      id: `alert-${Date.now()}`,
      signatureId:
        signatures[Math.floor(Math.random() * signatures.length)]?.id ||
        'sig-001',
      signatureName: 'Real-time Detection',
      timestamp: new Date(),
      severity,
      confidence: Math.random() * 30 + 70,
      status: 'new',
      affectedEntities: [`host-${Math.floor(Math.random() * 100)}`],
      indicators: [
        {
          type: 'ip',
          value: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          confidence: Math.random() * 30 + 70,
        },
      ],
      context: {
        sourceIP: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      },
      mitreTechniques: ['T1059.001'],
      notes: [],
    };
  };

  const createIncidentFromAlert = (alert: ThreatAlert): IncidentCase => {
    return {
      id: `inc-${Date.now()}`,
      title: `Auto-escalated: ${alert.signatureName}`,
      status: 'open',
      priority: alert.severity === 'critical' ? 'critical' : 'high',
      category: 'malware',
      createdDate: new Date(),
      lastUpdated: new Date(),
      assignedTeam: ['SOC Team'],
      affectedSystems: alert.affectedEntities,
      alerts: [alert.id],
      timeline: [
        {
          timestamp: new Date(),
          action: 'Auto-escalated from critical alert',
          user: 'System',
          details: `Alert ${alert.id} automatically escalated due to critical severity`,
        },
      ],
      containmentActions: [],
      impactAssessment: {
        confidentiality: 'medium',
        integrity: 'medium',
        availability: 'medium',
        businessImpact: 'Under assessment',
        affectedUsers: 0,
        estimatedCost: 0,
      },
    };
  };

  const calculateMetrics = () => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    const alertsLast24h = alerts.filter(
      (a) => a.timestamp.getTime() > last24h,
    ).length;
    const alertsLast7d = alerts.filter(
      (a) => a.timestamp.getTime() > last7d,
    ).length;

    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'critical' && a.status !== 'resolved',
    ).length;
    const openIncidents = incidents.filter((i) => i.status !== 'closed').length;

    const falsePositives = alerts.filter(
      (a) => a.status === 'false_positive',
    ).length;
    const totalAlerts = alerts.length;
    const falsePositiveRate =
      totalAlerts > 0 ? falsePositives / totalAlerts : 0;

    const threatTypeCounts = alerts.reduce(
      (acc, alert) => {
        const type = alert.signatureName.split(' ')[0];
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topThreatTypes = Object.entries(threatTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const newMetrics: DetectionMetrics = {
      alertsLast24h,
      alertsLast7d,
      averageResponseTime: 45 + Math.random() * 30, // 45-75 minutes
      falsePositiveRate,
      openIncidents,
      criticalAlerts,
      topThreatTypes,
      detectionAccuracy: (1 - falsePositiveRate) * 100,
      meanTimeToDetection: 15 + Math.random() * 20, // 15-35 minutes
      meanTimeToResponse: 60 + Math.random() * 60, // 60-120 minutes
    };

    setMetrics(newMetrics);
  };

  const updateAlertStatus = (
    alertId: string,
    newStatus: ThreatAlert['status'],
  ) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, status: newStatus } : alert,
      ),
    );
  };

  const assignAlert = (alertId: string, analyst: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, assignedAnalyst: analyst } : alert,
      ),
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'info':
        return 'text-gray-700 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'investigating':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'confirmed':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'false_positive':
        return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'resolved':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'open':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'containment':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'recovery':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'closed':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const severityMatch =
      filterSeverity === 'all' || alert.severity === filterSeverity;
    const statusMatch = filterStatus === 'all' || alert.status === filterStatus;
    return severityMatch && statusMatch;
  });

  return (
    <div className={`threat-detection-engine ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Threat Detection & Response</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isDetectionRunning ? 'bg-green-500' : 'bg-red-500'}`}
              ></div>
              <span className="text-sm text-gray-600">
                Detection {isDetectionRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <button
              onClick={() => setIsDetectionRunning(!isDetectionRunning)}
              className={`px-4 py-2 rounded-md text-sm ${
                isDetectionRunning
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isDetectionRunning ? '⏸️ Pause' : '▶️ Start'} Detection
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-md ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('alerts')}
            className={`px-4 py-2 rounded-md ${activeView === 'alerts' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🚨 Alerts ({alerts.filter((a) => a.status === 'new').length})
          </button>
          <button
            onClick={() => setActiveView('incidents')}
            className={`px-4 py-2 rounded-md ${activeView === 'incidents' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔥 Incidents (
            {incidents.filter((i) => i.status !== 'closed').length})
          </button>
          <button
            onClick={() => setActiveView('signatures')}
            className={`px-4 py-2 rounded-md ${activeView === 'signatures' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🎯 Signatures ({signatures.filter((s) => s.isActive).length})
          </button>
          <button
            onClick={() => setActiveView('response')}
            className={`px-4 py-2 rounded-md ${activeView === 'response' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            ⚡ Response
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-red-600">
                {metrics.criticalAlerts}
              </div>
              <div className="text-sm text-gray-600">Critical Alerts</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.openIncidents}
              </div>
              <div className="text-sm text-gray-600">Open Incidents</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.alertsLast24h}
              </div>
              <div className="text-sm text-gray-600">Alerts (24h)</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-600">
                {metrics.detectionAccuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Detection Accuracy</div>
            </div>
          </div>

          {/* Charts and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Top Threat Types</h3>
              <div className="space-y-3">
                {metrics.topThreatTypes.map((threat, index) => (
                  <div
                    key={threat.type}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{threat.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${(threat.count / metrics.topThreatTypes[0].count) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {threat.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Response Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Mean Time to Detection:
                  </span>
                  <span className="text-sm font-medium">
                    {metrics.meanTimeToDetection.toFixed(1)} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Mean Time to Response:
                  </span>
                  <span className="text-sm font-medium">
                    {metrics.meanTimeToResponse.toFixed(1)} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Average Response Time:
                  </span>
                  <span className="text-sm font-medium">
                    {metrics.averageResponseTime.toFixed(1)} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    False Positive Rate:
                  </span>
                  <span className="text-sm font-medium">
                    {(metrics.falsePositiveRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts View */}
      {activeView === 'alerts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed">Confirmed</option>
              <option value="false_positive">False Positive</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Alerts List */}
          <div className="space-y-2">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(alert.status)}`}
                    >
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {alert.timestamp.toLocaleString()}
                  </div>
                </div>

                <h4 className="font-medium mb-1">{alert.signatureName}</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Confidence: {alert.confidence.toFixed(1)}% • Affected:{' '}
                  {alert.affectedEntities.join(', ')}
                </p>

                <div className="flex flex-wrap gap-1">
                  {alert.indicators.map((indicator, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-xs rounded"
                    >
                      {indicator.type}: {indicator.value}
                    </span>
                  ))}
                </div>

                {alert.assignedAnalyst && (
                  <div className="mt-2 text-xs text-blue-600">
                    Assigned to: {alert.assignedAnalyst}
                  </div>
                )}
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">🚨</div>
                <h3 className="text-lg font-medium mb-2">
                  No alerts match your filters
                </h3>
                <p>Try adjusting your filter criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incidents View */}
      {activeView === 'incidents' && (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(incident.priority)}`}
                  >
                    {incident.priority.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(incident.status)}`}
                  >
                    {incident.status.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                    {incident.category.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {incident.createdDate.toLocaleString()}
                </div>
              </div>

              <h4 className="font-medium mb-2">{incident.title}</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Assigned Team:</span>
                  <span className="ml-2">{incident.assignedTeam}</span>
                </div>
                <div>
                  <span className="text-gray-600">Affected Systems:</span>
                  <span className="ml-2">
                    {incident.affectedSystems.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Related Alerts:</span>
                  <span className="ml-2">{incident.alerts.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Containment Actions:</span>
                  <span className="ml-2">
                    {incident.containmentActions.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <span className="text-gray-600">Impact: </span>
                <span className="text-red-600">
                  C:{incident.impactAssessment.confidentiality}
                </span>
                <span className="text-orange-600 ml-2">
                  I:{incident.impactAssessment.integrity}
                </span>
                <span className="text-blue-600 ml-2">
                  A:{incident.impactAssessment.availability}
                </span>
              </div>
            </div>
          ))}

          {incidents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-lg font-medium mb-2">No incidents</h3>
              <p>All clear! No active security incidents.</p>
            </div>
          )}
        </div>
      )}

      {/* Signatures View */}
      {activeView === 'signatures' && (
        <div className="space-y-4">
          {signatures.map((signature) => (
            <div key={signature.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(signature.severity)}`}
                  >
                    {signature.severity.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${signature.isActive ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}
                  >
                    {signature.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {signature.type.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {signature.lastUpdated.toLocaleString()}
                </div>
              </div>

              <h4 className="font-medium mb-2">{signature.name}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {signature.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Confidence:</span>
                  <span className="ml-2 font-medium">
                    {signature.confidence}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">False Positive Rate:</span>
                  <span className="ml-2 font-medium">
                    {(signature.falsePositiveRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-sm text-gray-600">MITRE Tactics:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {signature.mitreTactics.map((tactic) => (
                    <span
                      key={tactic}
                      className="px-2 py-1 bg-gray-100 text-xs rounded"
                    >
                      {tactic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-600">Indicators:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {signature.indicators.map((indicator, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response View */}
      {activeView === 'response' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              🚨 Automated Response Actions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🔒 Containment</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Isolate compromised systems</li>
                  <li>• Block malicious IPs/domains</li>
                  <li>• Disable compromised accounts</li>
                  <li>• Quarantine suspicious files</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🔍 Investigation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Collect forensic evidence</li>
                  <li>• Analyze attack patterns</li>
                  <li>• Identify patient zero</li>
                  <li>• Map attack timeline</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">🛡️ Protection</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Update security signatures</li>
                  <li>• Patch vulnerable systems</li>
                  <li>• Strengthen access controls</li>
                  <li>• Deploy additional monitoring</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">📢 Communication</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Notify stakeholders</li>
                  <li>• Update incident status</li>
                  <li>• Coordinate response teams</li>
                  <li>• Document lessons learned</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              ⚡ Response Playbooks
            </h3>

            <div className="space-y-3">
              {[
                'Malware Infection Response',
                'Data Breach Investigation',
                'Phishing Campaign Mitigation',
                'Insider Threat Handling',
                'DDoS Attack Response',
                'Ransomware Recovery',
              ].map((playbook) => (
                <div
                  key={playbook}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{playbook}</span>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    Execute
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatDetectionEngine;
