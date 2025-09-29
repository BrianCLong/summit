import React, { useState, useEffect } from 'react';

interface EvidenceItem {
  id: string;
  name: string;
  type: 'disk_image' | 'memory_dump' | 'network_capture' | 'file_system' | 'mobile_device' | 'cloud_data' | 'log_file' | 'registry' | 'artifact';
  size: number; // bytes
  hash: {
    md5: string;
    sha1: string;
    sha256: string;
  };
  metadata: {
    acquisitionDate: Date;
    acquisitionTool: string;
    toolVersion: string;
    examiner: string;
    caseNumber: string;
    source: string;
    jurisdiction: string;
    legalHold: boolean;
  };
  chainOfCustody: Array<{
    timestamp: Date;
    action: 'acquired' | 'transferred' | 'analyzed' | 'copied' | 'verified' | 'archived';
    person: string;
    details: string;
    location: string;
    witnessSignature?: string;
  }>;
  analysis: {
    status: 'pending' | 'in_progress' | 'completed' | 'reviewed' | 'verified';
    findings: Array<{
      id: string;
      type: 'file_recovery' | 'timeline_event' | 'artifact' | 'suspicious_activity' | 'deleted_item' | 'communication' | 'location_data';
      description: string;
      confidence: number;
      timestamp?: Date;
      path?: string;
      relevance: 'high' | 'medium' | 'low';
      tags: string[];
    }>;
    tools: string[];
    timeSpent: number; // minutes
  };
  preservation: {
    encrypted: boolean;
    compressionRatio: number;
    storageLocation: string;
    backupLocations: string[];
    retentionPolicy: string;
    accessLog: Array<{
      timestamp: Date;
      user: string;
      action: string;
      ipAddress: string;
    }>;
  };
}

interface ForensicCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'criminal' | 'civil' | 'corporate' | 'compliance' | 'incident_response';
  investigator: string;
  legalTeam: string[];
  createdDate: Date;
  deadline?: Date;
  evidenceItems: string[]; // Evidence IDs
  timeline: Array<{
    timestamp: Date;
    event: string;
    source: string;
    confidence: number;
    category: 'user_activity' | 'system_event' | 'network_activity' | 'file_operation' | 'communication';
    details: any;
  }>;
  legalRequirements: {
    warrantRequired: boolean;
    jurisdictions: string[];
    privacyLaws: string[];
    dataRetentionDays: number;
    admissibilityStandards: string[];
  };
  reports: Array<{
    id: string;
    type: 'preliminary' | 'technical' | 'executive' | 'legal' | 'expert_testimony';
    status: 'draft' | 'review' | 'approved' | 'submitted';
    createdDate: Date;
    author: string;
  }>;
}

interface AnalysisTool {
  id: string;
  name: string;
  category: 'disk_analysis' | 'memory_analysis' | 'network_analysis' | 'mobile_forensics' | 'cloud_forensics' | 'timeline_analysis' | 'artifact_recovery';
  description: string;
  supportedFormats: string[];
  features: string[];
  licenseType: 'commercial' | 'open_source' | 'enterprise';
  version: string;
  lastUpdated: Date;
  isInstalled: boolean;
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'file_created' | 'file_modified' | 'file_accessed' | 'file_deleted' | 'process_started' | 'network_connection' | 'user_login' | 'registry_change' | 'email_sent' | 'web_browsing';
  source: string;
  description: string;
  confidence: number;
  artifact: string;
  metadata: any;
  relevance: 'high' | 'medium' | 'low';
  flagged: boolean;
  notes: string[];
}

interface DigitalForensicsWorkbenchProps {
  investigationId?: string;
  caseId?: string;
  onEvidenceAdd?: (evidence: EvidenceItem) => void;
  onFindingCreate?: (finding: any) => void;
  onTimelineUpdate?: (events: TimelineEvent[]) => void;
  onChainOfCustodyUpdate?: (evidenceId: string, entry: any) => void;
  className?: string;
}

const DigitalForensicsWorkbench: React.FC<DigitalForensicsWorkbenchProps> = ({
  investigationId,
  caseId,
  onEvidenceAdd = () => {},
  onFindingCreate = () => {},
  onTimelineUpdate = () => {},
  onChainOfCustodyUpdate = () => {},
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'evidence' | 'timeline' | 'analysis' | 'reports' | 'tools'>('dashboard');
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [analysisTasks, setAnalysisTasks] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<ForensicCase | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [availableTools, setAvailableTools] = useState<AnalysisTool[]>([]);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('all');

  useEffect(() => {
    generateMockForensicCases();
    generateMockEvidenceItems();
    generateMockTimelineEvents();
    generateAvailableTools();
    generateAnalysisTasks();
  }, [investigationId, caseId]);

  const generateMockForensicCases = () => {
    const mockCases: ForensicCase[] = [
      {
        id: 'case-001',
        caseNumber: 'FC-2024-001',
        title: 'Corporate Data Breach Investigation',
        description: 'Investigation of suspected data exfiltration by insider threat',
        status: 'active',
        priority: 'critical',
        category: 'corporate',
        investigator: 'Senior Forensic Examiner',
        legalTeam: ['Legal Counsel', 'Compliance Officer'],
        createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        evidenceItems: ['evidence-001', 'evidence-002', 'evidence-003'],
        timeline: [],
        legalRequirements: {
          warrantRequired: false,
          jurisdictions: ['United States', 'European Union'],
          privacyLaws: ['GDPR', 'CCPA'],
          dataRetentionDays: 2555, // 7 years
          admissibilityStandards: ['Federal Rules of Evidence', 'Daubert Standard']
        },
        reports: []
      },
      {
        id: 'case-002',
        caseNumber: 'FC-2024-002',
        title: 'Malware Analysis - APT Campaign',
        description: 'Analysis of sophisticated malware used in targeted attack',
        status: 'active',
        priority: 'high',
        category: 'incident_response',
        investigator: 'Malware Analyst',
        legalTeam: ['Security Counsel'],
        createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        evidenceItems: ['evidence-004', 'evidence-005'],
        timeline: [],
        legalRequirements: {
          warrantRequired: false,
          jurisdictions: ['United States'],
          privacyLaws: [],
          dataRetentionDays: 1825, // 5 years
          admissibilityStandards: ['Technical Standards']
        },
        reports: []
      },
      {
        id: 'case-003',
        caseNumber: 'FC-2024-003',
        title: 'Mobile Device Forensics - Fraud Case',
        description: 'Forensic examination of mobile devices in financial fraud investigation',
        status: 'completed',
        priority: 'medium',
        category: 'criminal',
        investigator: 'Mobile Forensic Specialist',
        legalTeam: ['District Attorney', 'Defense Counsel'],
        createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        evidenceItems: ['evidence-006', 'evidence-007'],
        timeline: [],
        legalRequirements: {
          warrantRequired: true,
          jurisdictions: ['United States'],
          privacyLaws: ['Fourth Amendment'],
          dataRetentionDays: 3650, // 10 years
          admissibilityStandards: ['Federal Rules of Evidence', 'Scientific Evidence Standards']
        },
        reports: [
          {
            id: 'report-001',
            type: 'technical',
            status: 'approved',
            createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            author: 'Mobile Forensic Specialist'
          }
        ]
      }
    ];
    
    setCases(mockCases);
    if (caseId) {
      const foundCase = mockCases.find(c => c.id === caseId);
      setSelectedCase(foundCase || null);
    } else {
      setSelectedCase(mockCases[0]);
    }
  };

  const generateMockEvidenceItems = () => {
    const evidenceTypes: EvidenceItem['type'][] = [
      'disk_image', 'memory_dump', 'network_capture', 'file_system', 
      'mobile_device', 'cloud_data', 'log_file', 'registry', 'artifact'
    ];
    
    const mockEvidence: EvidenceItem[] = Array.from({ length: 7 }, (_, i) => ({
      id: `evidence-${String(i + 1).padStart(3, '0')}`,
      name: `Evidence Item ${i + 1}`,
      type: evidenceTypes[Math.floor(Math.random() * evidenceTypes.length)],
      size: Math.floor(Math.random() * 1000000000) + 100000000, // 100MB - 1GB
      hash: {
        md5: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        sha1: Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        sha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      },
      metadata: {
        acquisitionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        acquisitionTool: ['EnCase', 'FTK Imager', 'dd', 'X-Ways', 'Cellebrite'][Math.floor(Math.random() * 5)],
        toolVersion: '8.07.02',
        examiner: 'Digital Forensic Examiner',
        caseNumber: `FC-2024-${String(Math.floor(Math.random() * 3) + 1).padStart(3, '0')}`,
        source: `Computer-${i + 1}`,
        jurisdiction: 'United States',
        legalHold: Math.random() > 0.3
      },
      chainOfCustody: [
        {
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          action: 'acquired',
          person: 'Digital Forensic Examiner',
          details: 'Evidence acquired using write-blocking hardware',
          location: 'Digital Forensics Lab',
          witnessSignature: 'Investigating Officer'
        }
      ],
      analysis: {
        status: ['pending', 'in_progress', 'completed', 'reviewed'][Math.floor(Math.random() * 4)] as any,
        findings: [],
        tools: ['EnCase', 'Autopsy', 'Volatility'],
        timeSpent: Math.floor(Math.random() * 480) + 120 // 2-10 hours
      },
      preservation: {
        encrypted: true,
        compressionRatio: Math.random() * 0.5 + 0.3,
        storageLocation: 'Secure Evidence Vault',
        backupLocations: ['Backup Site A', 'Backup Site B'],
        retentionPolicy: '7 years',
        accessLog: []
      }
    }));
    
    setEvidenceItems(mockEvidence);
  };

  const generateMockTimelineEvents = () => {
    const eventTypes: TimelineEvent['type'][] = [
      'file_created', 'file_modified', 'file_accessed', 'file_deleted',
      'process_started', 'network_connection', 'user_login', 'registry_change',
      'email_sent', 'web_browsing'
    ];
    
    const mockEvents: TimelineEvent[] = Array.from({ length: 100 }, (_, i) => ({
      id: `event-${String(i + 1).padStart(3, '0')}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      source: `Evidence-${Math.floor(Math.random() * 7) + 1}`,
      description: `Timeline event ${i + 1} - ${eventTypes[Math.floor(Math.random() * eventTypes.length)].replace('_', ' ')}`,
      confidence: Math.random() * 40 + 60,
      artifact: `Artifact-${Math.floor(Math.random() * 20) + 1}`,
      metadata: {
        user: `user${Math.floor(Math.random() * 5) + 1}`,
        process: `process${Math.floor(Math.random() * 10) + 1}.exe`,
        path: `/Users/user${Math.floor(Math.random() * 5) + 1}/Documents/file${Math.floor(Math.random() * 100) + 1}.txt`
      },
      relevance: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
      flagged: Math.random() > 0.7,
      notes: []
    }));
    
    setTimelineEvents(mockEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const generateAvailableTools = () => {
    const mockTools: AnalysisTool[] = [
      {
        id: 'tool-001',
        name: 'Autopsy',
        category: 'disk_analysis',
        description: 'Open source digital forensics platform',
        supportedFormats: ['E01', 'DD', 'VMDK', 'VHD'],
        features: ['Timeline Analysis', 'Keyword Search', 'Hash Analysis', 'Registry Analysis'],
        licenseType: 'open_source',
        version: '4.19.3',
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        isInstalled: true
      },
      {
        id: 'tool-002',
        name: 'Volatility',
        category: 'memory_analysis',
        description: 'Advanced memory forensics framework',
        supportedFormats: ['RAW', 'DMP', 'VMEM', 'LIME'],
        features: ['Process Analysis', 'Network Analysis', 'Malware Detection', 'Registry Extraction'],
        licenseType: 'open_source',
        version: '3.2.1',
        lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        isInstalled: true
      },
      {
        id: 'tool-003',
        name: 'Wireshark',
        category: 'network_analysis',
        description: 'Network protocol analyzer',
        supportedFormats: ['PCAP', 'PCAPNG', 'CAP'],
        features: ['Protocol Analysis', 'Traffic Reconstruction', 'Statistical Analysis', 'Export Tools'],
        licenseType: 'open_source',
        version: '4.0.6',
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isInstalled: true
      },
      {
        id: 'tool-004',
        name: 'Cellebrite UFED',
        category: 'mobile_forensics',
        description: 'Mobile device forensic extraction and analysis',
        supportedFormats: ['iOS Backup', 'Android ADB', 'Physical Dumps'],
        features: ['Physical Extraction', 'Logical Extraction', 'Bypass Techniques', 'Application Analysis'],
        licenseType: 'commercial',
        version: '7.58.0.191',
        lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        isInstalled: false
      },
      {
        id: 'tool-005',
        name: 'MSAB XRY',
        category: 'mobile_forensics',
        description: 'Mobile forensic tool for smartphones and tablets',
        supportedFormats: ['iOS', 'Android', 'Feature Phones'],
        features: ['Chip-Off Analysis', 'JTAG', 'ISP', 'Cloud Extraction'],
        licenseType: 'commercial',
        version: '9.6.2',
        lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        isInstalled: false
      }
    ];
    
    setAvailableTools(mockTools);
  };

  const generateAnalysisTasks = () => {
    const mockTasks = [
      {
        id: 'task-001',
        name: 'Deleted File Recovery',
        status: 'in_progress',
        progress: 65,
        tool: 'Autopsy',
        evidence: 'evidence-001',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 1 * 60 * 60 * 1000)
      },
      {
        id: 'task-002',
        name: 'Memory Dump Analysis',
        status: 'pending',
        progress: 0,
        tool: 'Volatility',
        evidence: 'evidence-002',
        estimatedDuration: 180 // minutes
      },
      {
        id: 'task-003',
        name: 'Network Traffic Analysis',
        status: 'completed',
        progress: 100,
        tool: 'Wireshark',
        evidence: 'evidence-004',
        startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        completionTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        findings: 5
      }
    ];
    
    setAnalysisTasks(mockTasks);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
      case 'pending': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'completed':
      case 'approved': return 'text-green-700 bg-green-100 border-green-200';
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-gray-700 bg-gray-100 border-gray-200';
      case 'on_hold': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'archived':
      case 'closed': return 'text-gray-700 bg-gray-100 border-gray-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const filteredTimelineEvents = timelineEvents.filter(event => {
    if (timelineFilter === 'all') return true;
    if (timelineFilter === 'flagged') return event.flagged;
    if (timelineFilter === 'high_relevance') return event.relevance === 'high';
    return event.type === timelineFilter;
  });

  const filteredEvidenceItems = evidenceItems.filter(item => {
    if (evidenceFilter === 'all') return true;
    if (evidenceFilter === 'pending_analysis') return item.analysis.status === 'pending';
    if (evidenceFilter === 'in_analysis') return item.analysis.status === 'in_progress';
    return item.type === evidenceFilter;
  });

  return (
    <div className={`digital-forensics-workbench ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Digital Forensics Workbench</h2>
          <div className="flex items-center gap-4">
            {selectedCase && (
              <div className="text-sm">
                <span className="text-gray-600">Case:</span>
                <span className="ml-2 font-medium">{selectedCase.caseNumber}</span>
              </div>
            )}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              + New Evidence
            </button>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-md ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🏠 Dashboard
          </button>
          <button
            onClick={() => setActiveView('evidence')}
            className={`px-4 py-2 rounded-md ${activeView === 'evidence' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📁 Evidence ({evidenceItems.length})
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-4 py-2 rounded-md ${activeView === 'timeline' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            ⏰ Timeline ({timelineEvents.length})
          </button>
          <button
            onClick={() => setActiveView('analysis')}
            className={`px-4 py-2 rounded-md ${activeView === 'analysis' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔬 Analysis ({analysisTasks.filter(t => t.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`px-4 py-2 rounded-md ${activeView === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📄 Reports
          </button>
          <button
            onClick={() => setActiveView('tools')}
            className={`px-4 py-2 rounded-md ${activeView === 'tools' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔧 Tools ({availableTools.filter(t => t.isInstalled).length})
          </button>
        </div>
      </div>
      
      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {/* Case Overview */}
          {selectedCase && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{selectedCase.title}</h3>
                  <p className="text-gray-600 mb-4">{selectedCase.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedCase.status)}`}>
                    {selectedCase.status.toUpperCase().replace('_', ' ')}
                  </span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedCase.priority)}`}>
                    {selectedCase.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Case Number:</span>
                  <div className="font-medium">{selectedCase.caseNumber}</div>
                </div>
                <div>
                  <span className="text-gray-600">Investigator:</span>
                  <div className="font-medium">{selectedCase.investigator}</div>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <div className="font-medium capitalize">{selectedCase.category.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <div className="font-medium">{selectedCase.createdDate.toLocaleDateString()}</div>
                </div>
              </div>
              
              {selectedCase.deadline && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <span className="text-orange-800 font-medium">
                    Deadline: {selectedCase.deadline.toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-blue-600">{evidenceItems.length}</div>
              <div className="text-sm text-gray-600">Evidence Items</div>
              <div className="text-xs text-gray-500 mt-1">
                {evidenceItems.filter(e => e.analysis.status === 'pending').length} pending analysis
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-600">{timelineEvents.length}</div>
              <div className="text-sm text-gray-600">Timeline Events</div>
              <div className="text-xs text-gray-500 mt-1">
                {timelineEvents.filter(e => e.flagged).length} flagged events
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-orange-600">
                {analysisTasks.filter(t => t.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">Active Analysis</div>
              <div className="text-xs text-gray-500 mt-1">
                {analysisTasks.filter(t => t.status === 'pending').length} queued
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-purple-600">{cases.length}</div>
              <div className="text-sm text-gray-600">Total Cases</div>
              <div className="text-xs text-gray-500 mt-1">
                {cases.filter(c => c.status === 'active').length} active
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Recent Analysis Tasks</h3>
              <div className="space-y-3">
                {analysisTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{task.name}</div>
                      <div className="text-xs text-gray-600">{task.tool} • {task.evidence}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.status === 'in_progress' && (
                        <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                          <div 
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Chain of Custody Activity</h3>
              <div className="space-y-3">
                {evidenceItems.slice(0, 5).map(evidence => (
                  <div key={evidence.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{evidence.name}</span>
                      <span className="text-xs text-gray-500">
                        {evidence.chainOfCustody[evidence.chainOfCustody.length - 1]?.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Last action: {evidence.chainOfCustody[evidence.chainOfCustody.length - 1]?.action} by{' '}
                      {evidence.chainOfCustody[evidence.chainOfCustody.length - 1]?.person}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Evidence View */}
      {activeView === 'evidence' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Evidence</option>
              <option value="pending_analysis">Pending Analysis</option>
              <option value="in_analysis">In Analysis</option>
              <option value="disk_image">Disk Images</option>
              <option value="memory_dump">Memory Dumps</option>
              <option value="network_capture">Network Captures</option>
              <option value="mobile_device">Mobile Devices</option>
            </select>
          </div>
          
          {/* Evidence List */}
          <div className="space-y-4">
            {filteredEvidenceItems.map(evidence => (
              <div
                key={evidence.id}
                onClick={() => setSelectedEvidence(evidence)}
                className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{evidence.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {evidence.type.replace('_', ' ')} • {formatFileSize(evidence.size)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(evidence.analysis.status)}`}>
                      {evidence.analysis.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {evidence.metadata.legalHold && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        LEGAL HOLD
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Acquired:</span>
                    <div className="font-medium">{evidence.metadata.acquisitionDate.toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Tool:</span>
                    <div className="font-medium">{evidence.metadata.acquisitionTool}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Examiner:</span>
                    <div className="font-medium">{evidence.metadata.examiner}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Case:</span>
                    <div className="font-medium">{evidence.metadata.caseNumber}</div>
                  </div>
                </div>
                
                <div className="text-xs">
                  <span className="text-gray-600">SHA256:</span>
                  <span className="ml-2 font-mono">{evidence.hash.sha256.substring(0, 32)}...</span>
                </div>
                
                {evidence.analysis.findings.length > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="text-green-600 font-medium">
                      {evidence.analysis.findings.length} findings discovered
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Timeline View */}
      {activeView === 'timeline' && (
        <div className="space-y-4">
          {/* Timeline Filters */}
          <div className="flex gap-4">
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Events</option>
              <option value="flagged">Flagged Events</option>
              <option value="high_relevance">High Relevance</option>
              <option value="file_created">File Created</option>
              <option value="file_modified">File Modified</option>
              <option value="file_deleted">File Deleted</option>
              <option value="process_started">Process Started</option>
              <option value="network_connection">Network Connection</option>
              <option value="user_login">User Login</option>
            </select>
          </div>
          
          {/* Timeline Events */}
          <div className="space-y-2">
            {filteredTimelineEvents.slice(0, 50).map(event => (
              <div
                key={event.id}
                className={`bg-white rounded-lg border p-4 ${event.flagged ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(event.relevance)}`}>
                      {event.relevance.toUpperCase()}
                    </span>
                    {event.flagged && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        🚩 FLAGGED
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {event.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.timestamp.toLocaleString()}
                  </div>
                </div>
                
                <p className="text-sm mb-2">{event.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                  <div>
                    <span>Source:</span> <span className="font-medium">{event.source}</span>
                  </div>
                  <div>
                    <span>Confidence:</span> <span className="font-medium">{event.confidence.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span>Artifact:</span> <span className="font-medium">{event.artifact}</span>
                  </div>
                  {event.metadata.user && (
                    <div>
                      <span>User:</span> <span className="font-medium">{event.metadata.user}</span>
                    </div>
                  )}
                </div>
                
                {event.metadata.path && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span>Path:</span> <span className="font-mono ml-1">{event.metadata.path}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Analysis View */}
      {activeView === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Analysis Tasks</h3>
            
            <div className="space-y-4">
              {analysisTasks.map(task => (
                <div key={task.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{task.name}</h4>
                      <p className="text-sm text-gray-600">{task.tool} on {task.evidence}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {task.status === 'in_progress' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      {task.estimatedCompletion && (
                        <div className="text-xs text-gray-500 mt-1">
                          ETA: {task.estimatedCompletion.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {task.status === 'completed' && task.findings && (
                    <div className="text-sm text-green-600">
                      ✅ Completed - {task.findings} findings discovered
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200">
                      View Details
                    </button>
                    {task.status === 'in_progress' && (
                      <button className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Tools View */}
      {activeView === 'tools' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTools.map(tool => (
              <div key={tool.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold">{tool.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded ${
                    tool.isInstalled 
                      ? 'text-green-700 bg-green-100' 
                      : 'text-gray-700 bg-gray-100'
                  }`}>
                    {tool.isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                
                <div className="mb-3">
                  <span className="text-xs text-gray-500">Category:</span>
                  <span className="ml-2 text-sm capitalize">{tool.category.replace('_', ' ')}</span>
                </div>
                
                <div className="mb-3">
                  <span className="text-xs text-gray-500">Version:</span>
                  <span className="ml-2 text-sm">{tool.version}</span>
                </div>
                
                <div className="mb-3">
                  <span className="text-xs text-gray-500">License:</span>
                  <span className="ml-2 text-sm capitalize">{tool.licenseType.replace('_', ' ')}</span>
                </div>
                
                <div className="mb-4">
                  <span className="text-xs text-gray-500 block mb-1">Supported Formats:</span>
                  <div className="flex flex-wrap gap-1">
                    {tool.supportedFormats.map(format => (
                      <span key={format} className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button 
                  className={`w-full px-4 py-2 text-sm rounded ${
                    tool.isInstalled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {tool.isInstalled ? 'Launch Tool' : 'Install Tool'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Reports View */}
      {activeView === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Forensic Reports</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                'Preliminary Analysis Report',
                'Technical Examination Report', 
                'Executive Summary Report',
                'Chain of Custody Report',
                'Expert Testimony Report'
              ].map(reportType => (
                <button
                  key={reportType}
                  className="p-4 border rounded-lg text-left hover:shadow-md transition-shadow"
                >
                  <h4 className="font-medium mb-2">{reportType}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Generate a comprehensive {reportType.toLowerCase()} for the current case
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Auto-generated</span>
                    <span className="text-blue-600 text-sm">Generate →</span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Recent Reports</h4>
              {selectedCase?.reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                  <div>
                    <div className="font-medium text-sm">{report.type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-xs text-gray-600">
                      {report.author} • {report.createdDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                    <button className="text-blue-600 text-sm hover:underline">
                      View
                    </button>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No reports generated yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalForensicsWorkbench;