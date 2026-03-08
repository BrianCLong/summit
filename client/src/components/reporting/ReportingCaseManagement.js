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
require("./ReportingCaseManagement.css");
const ReportingCaseManagement = ({ investigationId, initialCases = [], initialReports = [], onCaseSelect, onReportGenerated, onTaskAssigned, onExportComplete, }) => {
    // State Management
    const [cases, setCases] = (0, react_1.useState)(initialCases);
    const [reports, setReports] = (0, react_1.useState)(initialReports);
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [templates, setTemplates] = (0, react_1.useState)([]);
    const [selectedCase, setSelectedCase] = (0, react_1.useState)(null);
    const [selectedReport, setSelectedReport] = (0, react_1.useState)(null);
    // UI State
    const [activeTab, setActiveTab] = (0, react_1.useState)('cases');
    const [viewMode, setViewMode] = (0, react_1.useState)('grid');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('all');
    const [filterType, setFilterType] = (0, react_1.useState)('all');
    const [sortBy, setSortBy] = (0, react_1.useState)('updated');
    // Modal States
    const [showNewCaseModal, setShowNewCaseModal] = (0, react_1.useState)(false);
    const [showNewReportModal, setShowNewReportModal] = (0, react_1.useState)(false);
    const [showExportModal, setShowExportModal] = (0, react_1.useState)(false);
    const [isGeneratingReport, setIsGeneratingReport] = (0, react_1.useState)(false);
    const [isExporting, setIsExporting] = (0, react_1.useState)(false);
    // Generate Mock Data
    const generateMockData = (0, react_1.useCallback)(() => {
        const mockCases = [
            {
                id: 'case-001',
                title: 'Financial Fraud Investigation - Pacific Holdings',
                description: 'Complex financial fraud investigation involving offshore accounts and shell companies',
                caseType: 'investigation',
                status: 'active',
                priority: 'high',
                classification: 'confidential',
                assignedTo: {
                    primary: 'John Smith',
                    team: ['Maria Rodriguez', 'David Chen', 'Sarah Johnson'],
                    reviewers: ['Michael Brown', 'Lisa Wilson'],
                },
                timeline: {
                    created: new Date('2024-01-10'),
                    updated: new Date('2024-01-25'),
                    deadline: new Date('2024-02-15'),
                },
                entities: [
                    {
                        id: 'e1',
                        type: 'organization',
                        name: 'Pacific Holdings Ltd',
                        role: 'subject',
                    },
                    { id: 'e2', type: 'person', name: 'Alex Morrison', role: 'subject' },
                    {
                        id: 'e3',
                        type: 'location',
                        name: 'Zurich Office Complex',
                        role: 'location',
                    },
                    {
                        id: 'e4',
                        type: 'financial_account',
                        name: 'Account #78429X',
                        role: 'evidence',
                    },
                ],
                evidence: [
                    {
                        id: 'ev1',
                        type: 'document',
                        name: 'Bank Statements 2023-Q4',
                        source: 'Financial Institution',
                        hash: 'sha256:abc123def456',
                        chainOfCustody: [
                            {
                                timestamp: new Date('2024-01-12'),
                                handler: 'John Smith',
                                action: 'received',
                            },
                            {
                                timestamp: new Date('2024-01-13'),
                                handler: 'Maria Rodriguez',
                                action: 'analyzed',
                            },
                        ],
                    },
                    {
                        id: 'ev2',
                        type: 'digital',
                        name: 'Email Communications',
                        source: 'IT Forensics',
                        hash: 'sha256:def789ghi012',
                        chainOfCustody: [
                            {
                                timestamp: new Date('2024-01-14'),
                                handler: 'David Chen',
                                action: 'extracted',
                            },
                            {
                                timestamp: new Date('2024-01-15'),
                                handler: 'Sarah Johnson',
                                action: 'reviewed',
                            },
                        ],
                    },
                ],
                findings: [
                    {
                        id: 'f1',
                        title: 'Suspicious Transfer Patterns',
                        description: 'Multiple large transfers to offshore accounts outside normal business hours',
                        confidence: 85,
                        impact: 'high',
                        category: 'financial_irregularities',
                        supporting_evidence: ['ev1', 'ev2'],
                    },
                ],
                tags: ['financial_fraud', 'offshore', 'high_priority'],
                metadata: { jurisdiction: 'International', estimated_loss: 2500000 },
            },
            {
                id: 'case-002',
                title: 'Cybersecurity Incident Response - Data Breach',
                description: 'Investigation into unauthorized data access and potential data exfiltration',
                caseType: 'incident',
                status: 'review',
                priority: 'critical',
                classification: 'restricted',
                assignedTo: {
                    primary: 'Sarah Johnson',
                    team: ['David Chen', 'Mike Anderson'],
                    reviewers: ['Lisa Wilson'],
                },
                timeline: {
                    created: new Date('2024-01-20'),
                    updated: new Date('2024-01-26'),
                    deadline: new Date('2024-02-05'),
                },
                entities: [
                    {
                        id: 'e5',
                        type: 'system',
                        name: 'Corporate Database Server',
                        role: 'subject',
                    },
                    {
                        id: 'e6',
                        type: 'person',
                        name: 'Unknown Attacker',
                        role: 'subject',
                    },
                    {
                        id: 'e7',
                        type: 'ip_address',
                        name: '192.168.1.100',
                        role: 'evidence',
                    },
                ],
                evidence: [
                    {
                        id: 'ev3',
                        type: 'log',
                        name: 'System Access Logs',
                        source: 'SIEM System',
                        chainOfCustody: [
                            {
                                timestamp: new Date('2024-01-21'),
                                handler: 'Sarah Johnson',
                                action: 'collected',
                            },
                        ],
                    },
                ],
                findings: [
                    {
                        id: 'f2',
                        title: 'Unauthorized Database Access',
                        description: 'Evidence of unauthorized access to customer database between 2-4 AM',
                        confidence: 92,
                        impact: 'critical',
                        category: 'security_breach',
                        supporting_evidence: ['ev3'],
                    },
                ],
                tags: ['cybersecurity', 'data_breach', 'critical'],
                metadata: { affected_records: 15000, attack_vector: 'SQL_injection' },
            },
        ];
        const mockReports = [
            {
                id: 'report-001',
                title: 'Executive Summary - Pacific Holdings Investigation',
                type: 'executive',
                template: 'executive_summary_template',
                caseId: 'case-001',
                status: 'approved',
                audience: 'executive',
                classification: 'confidential',
                sections: [
                    {
                        id: 's1',
                        title: 'Executive Summary',
                        type: 'summary',
                        content: 'Investigation reveals significant financial irregularities...',
                        order: 1,
                        required: true,
                    },
                    {
                        id: 's2',
                        title: 'Key Findings',
                        type: 'findings',
                        content: 'Primary findings include suspicious transfer patterns...',
                        order: 2,
                        required: true,
                    },
                    {
                        id: 's3',
                        title: 'Recommendations',
                        type: 'recommendations',
                        content: 'Immediate actions recommended include asset freeze...',
                        order: 3,
                        required: true,
                    },
                ],
                exports: [
                    { format: 'pdf', timestamp: new Date('2024-01-24'), version: '1.0' },
                    { format: 'docx', timestamp: new Date('2024-01-24'), version: '1.0' },
                ],
                author: {
                    primary: 'John Smith',
                    contributors: ['Maria Rodriguez'],
                    reviewers: ['Michael Brown'],
                },
                timeline: {
                    created: new Date('2024-01-22'),
                    updated: new Date('2024-01-24'),
                    published: new Date('2024-01-25'),
                },
                analytics: { views: 45, downloads: 12, shares: 3 },
                tags: ['executive', 'financial_fraud', 'approved'],
            },
        ];
        const mockTasks = [
            {
                id: 'task-001',
                title: 'Complete Financial Analysis',
                description: 'Analyze bank statements and transaction patterns for suspicious activity',
                type: 'analysis',
                priority: 'high',
                status: 'in_progress',
                assignedTo: 'Maria Rodriguez',
                caseId: 'case-001',
                deadline: new Date('2024-01-28'),
                estimatedHours: 16,
                actualHours: 8,
                dependencies: [],
                checklist: [
                    { item: 'Review Q4 bank statements', completed: true },
                    { item: 'Identify suspicious transactions', completed: true },
                    {
                        item: 'Cross-reference with business activities',
                        completed: false,
                    },
                    { item: 'Document findings', completed: false },
                ],
                created: new Date('2024-01-15'),
                updated: new Date('2024-01-25'),
            },
            {
                id: 'task-002',
                title: 'Incident Response Report Review',
                description: 'Review and approve the cybersecurity incident response report',
                type: 'review',
                priority: 'critical',
                status: 'pending',
                assignedTo: 'Lisa Wilson',
                caseId: 'case-002',
                deadline: new Date('2024-01-27'),
                estimatedHours: 4,
                dependencies: ['task-003'],
                checklist: [
                    { item: 'Review technical analysis', completed: false },
                    { item: 'Verify compliance requirements', completed: false },
                    { item: 'Approve for publication', completed: false },
                ],
                created: new Date('2024-01-24'),
                updated: new Date('2024-01-26'),
            },
        ];
        const mockTemplates = [
            {
                id: 'executive_summary_template',
                name: 'Executive Summary Report',
                type: 'executive',
                description: 'High-level summary report for executive audiences',
                sections: [
                    {
                        id: 'exec_summary',
                        title: 'Executive Summary',
                        type: 'summary',
                        required: true,
                        placeholder: 'Brief overview of the investigation...',
                        order: 1,
                    },
                    {
                        id: 'key_findings',
                        title: 'Key Findings',
                        type: 'findings',
                        required: true,
                        placeholder: 'Primary discoveries and conclusions...',
                        order: 2,
                    },
                    {
                        id: 'business_impact',
                        title: 'Business Impact',
                        type: 'summary',
                        required: true,
                        placeholder: 'Assessment of impact on business operations...',
                        order: 3,
                    },
                    {
                        id: 'recommendations',
                        title: 'Recommendations',
                        type: 'recommendations',
                        required: true,
                        placeholder: 'Recommended actions and next steps...',
                        order: 4,
                    },
                ],
                audience: ['executive', 'client'],
                classification: ['internal', 'confidential'],
                customFields: [
                    {
                        name: 'estimated_financial_impact',
                        type: 'number',
                        required: false,
                    },
                    {
                        name: 'risk_level',
                        type: 'select',
                        required: true,
                        options: ['Low', 'Medium', 'High', 'Critical'],
                    },
                ],
            },
            {
                id: 'forensic_analysis_template',
                name: 'Forensic Analysis Report',
                type: 'forensic',
                description: 'Detailed technical report for forensic investigations',
                sections: [
                    {
                        id: 'methodology',
                        title: 'Methodology',
                        type: 'summary',
                        required: true,
                        placeholder: 'Description of analysis methodology...',
                        order: 1,
                    },
                    {
                        id: 'evidence_analysis',
                        title: 'Evidence Analysis',
                        type: 'evidence',
                        required: true,
                        placeholder: 'Detailed analysis of collected evidence...',
                        order: 2,
                    },
                    {
                        id: 'timeline',
                        title: 'Timeline of Events',
                        type: 'timeline',
                        required: true,
                        placeholder: 'Chronological sequence of events...',
                        order: 3,
                    },
                    {
                        id: 'technical_findings',
                        title: 'Technical Findings',
                        type: 'findings',
                        required: true,
                        placeholder: 'Detailed technical discoveries...',
                        order: 4,
                    },
                    {
                        id: 'appendices',
                        title: 'Technical Appendices',
                        type: 'appendix',
                        required: false,
                        placeholder: 'Supporting technical documentation...',
                        order: 5,
                    },
                ],
                audience: ['technical', 'legal'],
                classification: ['confidential', 'restricted'],
                customFields: [
                    {
                        name: 'chain_of_custody_verified',
                        type: 'select',
                        required: true,
                        options: ['Yes', 'No'],
                    },
                    {
                        name: 'analysis_tools_used',
                        type: 'multiselect',
                        required: true,
                        options: [
                            'EnCase',
                            'FTK',
                            'Autopsy',
                            'Volatility',
                            'Wireshark',
                            'Other',
                        ],
                    },
                ],
            },
        ];
        setCases(mockCases);
        setReports(mockReports);
        setTasks(mockTasks);
        setTemplates(mockTemplates);
    }, []);
    // Initialize data
    (0, react_1.useEffect)(() => {
        if (cases.length === 0) {
            generateMockData();
        }
    }, [generateMockData, cases.length]);
    // Generate Report
    const generateReport = (0, react_1.useCallback)(async (caseId, templateId, options) => {
        setIsGeneratingReport(true);
        // Simulate report generation
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const caseFile = cases.find((c) => c.id === caseId);
        const template = templates.find((t) => t.id === templateId);
        if (!caseFile || !template) {
            setIsGeneratingReport(false);
            return;
        }
        const newReport = {
            id: `report-${Date.now()}`,
            title: `${template.name} - ${caseFile.title}`,
            type: template.type,
            template: templateId,
            caseId,
            status: 'draft',
            audience: options.audience || 'internal',
            classification: options.classification || 'internal',
            sections: template.sections.map((section) => ({
                ...section,
                content: section.placeholder,
            })),
            exports: [],
            author: {
                primary: caseFile.assignedTo.primary,
                contributors: caseFile.assignedTo.team,
                reviewers: caseFile.assignedTo.reviewers,
            },
            timeline: {
                created: new Date(),
                updated: new Date(),
            },
            analytics: { views: 0, downloads: 0, shares: 0 },
            tags: [...caseFile.tags, template.type, 'auto_generated'],
        };
        setReports((prev) => [...prev, newReport]);
        setSelectedReport(newReport);
        setIsGeneratingReport(false);
        onReportGenerated?.(newReport);
    }, [cases, templates, onReportGenerated]);
    // Export Report
    const exportReport = (0, react_1.useCallback)(async (reportId, formats) => {
        setIsExporting(true);
        // Simulate export process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const exportInfo = {
            reportId,
            formats,
            timestamp: new Date(),
            downloadUrls: formats.map((format) => `https://reports.intelgraph.com/export/${reportId}.${format}`),
        };
        // Update report with new exports
        setReports((prev) => prev.map((report) => {
            if (report.id === reportId) {
                const newExports = formats.map((format) => ({
                    format: format,
                    timestamp: new Date(),
                    version: '1.0',
                    downloadUrl: `https://reports.intelgraph.com/export/${reportId}.${format}`,
                }));
                return {
                    ...report,
                    exports: [...report.exports, ...newExports],
                };
            }
            return report;
        }));
        setIsExporting(false);
        onExportComplete?.(exportInfo);
    }, [onExportComplete]);
    // Filter and Sort Functions
    const filteredCases = (0, react_1.useMemo)(() => {
        return cases.filter((caseFile) => {
            const matchesSearch = searchTerm === '' ||
                caseFile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                caseFile.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                caseFile.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = filterStatus === 'all' || caseFile.status === filterStatus;
            const matchesType = filterType === 'all' || caseFile.caseType === filterType;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [cases, searchTerm, filterStatus, filterType]);
    const filteredReports = (0, react_1.useMemo)(() => {
        return reports.filter((report) => {
            const matchesSearch = searchTerm === '' ||
                report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
            const matchesType = filterType === 'all' || report.type === filterType;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [reports, searchTerm, filterStatus, filterType]);
    const filteredTasks = (0, react_1.useMemo)(() => {
        return tasks.filter((task) => {
            const matchesSearch = searchTerm === '' ||
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
            const matchesType = filterType === 'all' || task.type === filterType;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [tasks, searchTerm, filterStatus, filterType]);
    return (<div className="reporting-case-management">
      {/* Header */}
      <div className="rcm-header">
        <div className="header-main">
          <h2>📋 Reporting & Case Management</h2>
          <div className="header-stats">
            <span className="stat">
              <strong>{cases.length}</strong> Cases
            </span>
            <span className="stat">
              <strong>{reports.length}</strong> Reports
            </span>
            <span className="stat">
              <strong>
                {tasks.filter((t) => t.status !== 'completed').length}
              </strong>{' '}
              Active Tasks
            </span>
            <span className="stat">
              <strong>
                {cases.filter((c) => c.priority === 'critical' || c.priority === 'high').length}
              </strong>{' '}
              High Priority
            </span>
          </div>
        </div>

        <div className="header-controls">
          <input type="text" placeholder="Search cases, reports, and tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input"/>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">All Status</option>
            {activeTab === 'cases' && (<>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="review">Review</option>
                <option value="closed">Closed</option>
              </>)}
            {activeTab === 'reports' && (<>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </>)}
            {activeTab === 'tasks' && (<>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </>)}
          </select>
          <div className="view-controls">
            <button className={`view-button ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
              ⊞
            </button>
            <button className={`view-button ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View">
              ☰
            </button>
            <button className={`view-button ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')} title="Kanban View">
              ⋮⋮⋮
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="rcm-tabs">
        <button className={`tab-button ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>
          📁 Cases
        </button>
        <button className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          📄 Reports
        </button>
        <button className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          ✓ Tasks
        </button>
        <button className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
          📝 Templates
        </button>
        <button className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          📊 Analytics
        </button>
      </div>

      <div className="rcm-content">
        {/* Cases Tab */}
        {activeTab === 'cases' && (<div className="cases-tab">
            <div className="tab-header">
              <h3>Case Files</h3>
              <button className="primary-button" onClick={() => setShowNewCaseModal(true)}>
                + New Case
              </button>
            </div>

            <div className={`cases-container ${viewMode}`}>
              {viewMode === 'grid' && (<div className="cases-grid">
                  {filteredCases.map((caseFile) => (<div key={caseFile.id} className={`case-card ${selectedCase?.id === caseFile.id ? 'selected' : ''}`} onClick={() => {
                        setSelectedCase(caseFile);
                        onCaseSelect?.(caseFile);
                    }}>
                      <div className="case-header">
                        <div className="case-meta">
                          <span className={`case-type ${caseFile.caseType}`}>
                            {caseFile.caseType.replace('_', ' ')}
                          </span>
                          <span className={`priority-badge ${caseFile.priority}`}>
                            {caseFile.priority}
                          </span>
                        </div>
                        <div className={`status-indicator ${caseFile.status}`}></div>
                      </div>

                      <div className="case-title">{caseFile.title}</div>
                      <div className="case-description">
                        {caseFile.description}
                      </div>

                      <div className="case-stats">
                        <div className="stat-item">
                          <span className="stat-icon">👤</span>
                          <span>{caseFile.entities.length} Entities</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">🔍</span>
                          <span>{caseFile.evidence.length} Evidence</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">📋</span>
                          <span>{caseFile.findings.length} Findings</span>
                        </div>
                      </div>

                      <div className="case-team">
                        <div className="team-info">
                          <strong>Lead:</strong> {caseFile.assignedTo.primary}
                        </div>
                        <div className="team-size">
                          +{caseFile.assignedTo.team.length} team members
                        </div>
                      </div>

                      <div className="case-timeline">
                        <div className="timeline-item">
                          <strong>Updated:</strong>{' '}
                          {caseFile.timeline.updated.toLocaleDateString()}
                        </div>
                        {caseFile.timeline.deadline && (<div className="timeline-item">
                            <strong>Deadline:</strong>{' '}
                            {caseFile.timeline.deadline.toLocaleDateString()}
                          </div>)}
                      </div>

                      <div className="case-tags">
                        {caseFile.tags.slice(0, 3).map((tag) => (<span key={tag} className="tag">
                            {tag}
                          </span>))}
                      </div>
                    </div>))}
                </div>)}

              {viewMode === 'list' && (<div className="cases-list">
                  <div className="list-header">
                    <div className="col-title">Title</div>
                    <div className="col-type">Type</div>
                    <div className="col-status">Status</div>
                    <div className="col-priority">Priority</div>
                    <div className="col-assignee">Assignee</div>
                    <div className="col-updated">Updated</div>
                    <div className="col-actions">Actions</div>
                  </div>
                  {filteredCases.map((caseFile) => (<div key={caseFile.id} className="list-item">
                      <div className="col-title">
                        <div className="case-title">{caseFile.title}</div>
                        <div className="case-id">#{caseFile.id}</div>
                      </div>
                      <div className="col-type">
                        <span className={`case-type-badge ${caseFile.caseType}`}>
                          {caseFile.caseType}
                        </span>
                      </div>
                      <div className="col-status">
                        <span className={`status-badge ${caseFile.status}`}>
                          {caseFile.status}
                        </span>
                      </div>
                      <div className="col-priority">
                        <span className={`priority-badge ${caseFile.priority}`}>
                          {caseFile.priority}
                        </span>
                      </div>
                      <div className="col-assignee">
                        {caseFile.assignedTo.primary}
                      </div>
                      <div className="col-updated">
                        {caseFile.timeline.updated.toLocaleDateString()}
                      </div>
                      <div className="col-actions">
                        <button className="action-button">View</button>
                        <button className="action-button">Edit</button>
                      </div>
                    </div>))}
                </div>)}

              {viewMode === 'kanban' && (<div className="kanban-board">
                  {['draft', 'active', 'review', 'approved', 'closed'].map((status) => (<div key={status} className="kanban-column">
                        <div className="column-header">
                          <h4>{status.toUpperCase()}</h4>
                          <span className="count">
                            {filteredCases.filter((c) => c.status === status)
                        .length}
                          </span>
                        </div>
                        <div className="column-cards">
                          {filteredCases
                        .filter((c) => c.status === status)
                        .map((caseFile) => (<div key={caseFile.id} className="kanban-card">
                                <div className="card-header">
                                  <span className={`priority-dot ${caseFile.priority}`}></span>
                                  <span className="case-type">
                                    {caseFile.caseType}
                                  </span>
                                </div>
                                <div className="card-title">
                                  {caseFile.title}
                                </div>
                                <div className="card-assignee">
                                  👤 {caseFile.assignedTo.primary}
                                </div>
                                <div className="card-stats">
                                  <span>📋 {caseFile.findings.length}</span>
                                  <span>🔍 {caseFile.evidence.length}</span>
                                </div>
                              </div>))}
                        </div>
                      </div>))}
                </div>)}
            </div>

            {/* Case Details Panel */}
            {selectedCase && (<div className="case-details-panel">
                <div className="panel-header">
                  <h3>{selectedCase.title}</h3>
                  <div className="panel-actions">
                    <button className="action-button" onClick={() => setShowNewReportModal(true)}>
                      📄 Generate Report
                    </button>
                    <button className="action-button">✏️ Edit Case</button>
                    <button className="close-button" onClick={() => setSelectedCase(null)}>
                      ✕
                    </button>
                  </div>
                </div>

                <div className="panel-content">
                  <div className="detail-section">
                    <h4>Case Information</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Type:</label>
                        <span className={`case-type-badge ${selectedCase.caseType}`}>
                          {selectedCase.caseType}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Status:</label>
                        <span className={`status-badge ${selectedCase.status}`}>
                          {selectedCase.status}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Priority:</label>
                        <span className={`priority-badge ${selectedCase.priority}`}>
                          {selectedCase.priority}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Classification:</label>
                        <span className={`classification-badge ${selectedCase.classification}`}>
                          {selectedCase.classification}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Team Assignment</h4>
                    <div className="team-details">
                      <div>
                        <strong>Lead Investigator:</strong>{' '}
                        {selectedCase.assignedTo.primary}
                      </div>
                      <div>
                        <strong>Team Members:</strong>{' '}
                        {selectedCase.assignedTo.team.join(', ')}
                      </div>
                      <div>
                        <strong>Reviewers:</strong>{' '}
                        {selectedCase.assignedTo.reviewers.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Key Findings ({selectedCase.findings.length})</h4>
                    <div className="findings-list">
                      {selectedCase.findings.map((finding) => (<div key={finding.id} className="finding-item">
                          <div className="finding-header">
                            <span className="finding-title">
                              {finding.title}
                            </span>
                            <div className="finding-metrics">
                              <span className="confidence">
                                Confidence: {finding.confidence}%
                              </span>
                              <span className={`impact-badge ${finding.impact}`}>
                                {finding.impact}
                              </span>
                            </div>
                          </div>
                          <div className="finding-description">
                            {finding.description}
                          </div>
                        </div>))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Evidence Chain ({selectedCase.evidence.length})</h4>
                    <div className="evidence-list">
                      {selectedCase.evidence.map((evidence) => (<div key={evidence.id} className="evidence-item">
                          <div className="evidence-header">
                            <span className={`evidence-type ${evidence.type}`}>
                              {evidence.type}
                            </span>
                            <span className="evidence-name">
                              {evidence.name}
                            </span>
                          </div>
                          <div className="evidence-details">
                            <div>
                              <strong>Source:</strong> {evidence.source}
                            </div>
                            {evidence.hash && (<div>
                                <strong>Hash:</strong>{' '}
                                <code>{evidence.hash}</code>
                              </div>)}
                            <div>
                              <strong>Chain of Custody:</strong>{' '}
                              {evidence.chainOfCustody.length} entries
                            </div>
                          </div>
                        </div>))}
                    </div>
                  </div>
                </div>
              </div>)}
          </div>)}

        {/* Reports Tab */}
        {activeTab === 'reports' && (<div className="reports-tab">
            <div className="tab-header">
              <h3>Generated Reports</h3>
              <button className="primary-button" onClick={() => setShowNewReportModal(true)}>
                + Generate Report
              </button>
            </div>

            <div className="reports-grid">
              {filteredReports.map((report) => (<div key={report.id} className={`report-card ${selectedReport?.id === report.id ? 'selected' : ''}`} onClick={() => setSelectedReport(report)}>
                  <div className="report-header">
                    <div className="report-meta">
                      <span className={`report-type ${report.type}`}>
                        {report.type}
                      </span>
                      <span className={`status-badge ${report.status}`}>
                        {report.status}
                      </span>
                    </div>
                    <div className={`audience-badge ${report.audience}`}>
                      {report.audience}
                    </div>
                  </div>

                  <div className="report-title">{report.title}</div>

                  <div className="report-info">
                    <div className="info-item">
                      <strong>Case:</strong>{' '}
                      {cases.find((c) => c.id === report.caseId)?.title ||
                    'N/A'}
                    </div>
                    <div className="info-item">
                      <strong>Author:</strong> {report.author.primary}
                    </div>
                    <div className="info-item">
                      <strong>Updated:</strong>{' '}
                      {report.timeline.updated.toLocaleDateString()}
                    </div>
                  </div>

                  <div className="report-stats">
                    <div className="stat-item">
                      <span className="stat-icon">👁</span>
                      <span>{report.analytics.views} views</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">📥</span>
                      <span>{report.analytics.downloads} downloads</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">🔗</span>
                      <span>{report.analytics.shares} shares</span>
                    </div>
                  </div>

                  <div className="report-exports">
                    <strong>Exports:</strong>
                    {report.exports.map((exp, index) => (<span key={index} className={`export-badge ${exp.format}`}>
                        {exp.format.toUpperCase()}
                      </span>))}
                  </div>

                  <div className="report-actions">
                    <button className="action-button" onClick={(e) => {
                    e.stopPropagation();
                    setShowExportModal(true);
                }}>
                      📤 Export
                    </button>
                    <button className="action-button">✏️ Edit</button>
                    <button className="action-button">👁 Preview</button>
                  </div>
                </div>))}
            </div>

            {/* Report Details Panel */}
            {selectedReport && (<div className="report-details-panel">
                <div className="panel-header">
                  <h3>{selectedReport.title}</h3>
                  <div className="panel-actions">
                    <button className="action-button" onClick={() => setShowExportModal(true)}>
                      📤 Export Report
                    </button>
                    <button className="action-button">✏️ Edit Report</button>
                    <button className="close-button" onClick={() => setSelectedReport(null)}>
                      ✕
                    </button>
                  </div>
                </div>

                <div className="panel-content">
                  <div className="detail-section">
                    <h4>Report Information</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Type:</label>
                        <span className={`report-type-badge ${selectedReport.type}`}>
                          {selectedReport.type}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Status:</label>
                        <span className={`status-badge ${selectedReport.status}`}>
                          {selectedReport.status}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Audience:</label>
                        <span className={`audience-badge ${selectedReport.audience}`}>
                          {selectedReport.audience}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Classification:</label>
                        <span className={`classification-badge ${selectedReport.classification}`}>
                          {selectedReport.classification}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Report Sections ({selectedReport.sections.length})</h4>
                    <div className="sections-list">
                      {selectedReport.sections
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (<div key={section.id} className="section-item">
                            <div className="section-header">
                              <span className="section-order">
                                {section.order}
                              </span>
                              <span className="section-title">
                                {section.title}
                              </span>
                              <span className={`section-type ${section.type}`}>
                                {section.type}
                              </span>
                              {section.required && (<span className="required-badge">Required</span>)}
                            </div>
                            <div className="section-preview">
                              {section.content.substring(0, 150)}...
                            </div>
                          </div>))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Export History</h4>
                    <div className="exports-list">
                      {selectedReport.exports.map((exp, index) => (<div key={index} className="export-item">
                          <span className={`format-badge ${exp.format}`}>
                            {exp.format.toUpperCase()}
                          </span>
                          <span className="export-date">
                            {exp.timestamp.toLocaleDateString()}{' '}
                            {exp.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="export-version">v{exp.version}</span>
                          {exp.downloadUrl && (<button className="download-button">
                              📥 Download
                            </button>)}
                        </div>))}
                    </div>
                  </div>
                </div>
              </div>)}
          </div>)}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (<div className="tasks-tab">
            <div className="tab-header">
              <h3>Task Management</h3>
              <button className="primary-button">+ New Task</button>
            </div>

            <div className="tasks-grid">
              {filteredTasks.map((task) => (<div key={task.id} className="task-card">
                  <div className="task-header">
                    <div className="task-meta">
                      <span className={`task-type ${task.type}`}>
                        {task.type}
                      </span>
                      <span className={`priority-badge ${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                    <span className={`status-indicator ${task.status}`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="task-title">{task.title}</div>
                  <div className="task-description">{task.description}</div>

                  <div className="task-details">
                    <div className="detail-item">
                      <strong>Assigned to:</strong> {task.assignedTo}
                    </div>
                    <div className="detail-item">
                      <strong>Deadline:</strong>{' '}
                      {task.deadline.toLocaleDateString()}
                    </div>
                    <div className="detail-item">
                      <strong>Progress:</strong>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                    width: `${(task.checklist.filter((item) => item.completed).length / task.checklist.length) * 100}%`,
                }}></div>
                      </div>
                      <span className="progress-text">
                        {task.checklist.filter((item) => item.completed).length}{' '}
                        / {task.checklist.length}
                      </span>
                    </div>
                  </div>

                  <div className="task-checklist">
                    <h5>Checklist:</h5>
                    {task.checklist.slice(0, 3).map((item, index) => (<div key={index} className="checklist-item">
                        <span className={`checkbox ${item.completed ? 'checked' : ''}`}>
                          {item.completed ? '✓' : '☐'}
                        </span>
                        <span className={item.completed ? 'completed' : ''}>
                          {item.item}
                        </span>
                      </div>))}
                    {task.checklist.length > 3 && (<div className="checklist-more">
                        +{task.checklist.length - 3} more items
                      </div>)}
                  </div>

                  <div className="task-time">
                    {task.actualHours && (<span>
                        {task.actualHours}h / {task.estimatedHours}h
                      </span>)}
                    {!task.actualHours && (<span>Est. {task.estimatedHours}h</span>)}
                  </div>
                </div>))}
            </div>
          </div>)}

        {/* Templates Tab */}
        {activeTab === 'templates' && (<div className="templates-tab">
            <div className="tab-header">
              <h3>Report Templates</h3>
              <button className="primary-button">+ New Template</button>
            </div>

            <div className="templates-grid">
              {templates.map((template) => (<div key={template.id} className="template-card">
                  <div className="template-header">
                    <span className={`template-type ${template.type}`}>
                      {template.type}
                    </span>
                  </div>

                  <div className="template-title">{template.name}</div>
                  <div className="template-description">
                    {template.description}
                  </div>

                  <div className="template-info">
                    <div className="info-item">
                      <strong>Sections:</strong> {template.sections.length}
                      <span className="required-count">
                        ({template.sections.filter((s) => s.required).length}{' '}
                        required)
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Audience:</strong> {template.audience.join(', ')}
                    </div>
                    <div className="info-item">
                      <strong>Classification:</strong>{' '}
                      {template.classification.join(', ')}
                    </div>
                  </div>

                  <div className="template-sections-preview">
                    <h5>Sections:</h5>
                    {template.sections.slice(0, 4).map((section) => (<div key={section.id} className="section-preview-item">
                        <span className="section-title">{section.title}</span>
                        {section.required && (<span className="required-indicator">*</span>)}
                      </div>))}
                    {template.sections.length > 4 && (<div className="sections-more">
                        +{template.sections.length - 4} more sections
                      </div>)}
                  </div>

                  <div className="template-actions">
                    <button className="action-button primary" onClick={() => {
                    if (cases.length > 0) {
                        generateReport(cases[0].id, template.id, {
                            audience: template.audience[0],
                            classification: template.classification[0],
                        });
                    }
                }}>
                      🚀 Use Template
                    </button>
                    <button className="action-button">✏️ Edit</button>
                    <button className="action-button">👁 Preview</button>
                  </div>
                </div>))}
            </div>
          </div>)}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (<div className="analytics-tab">
            <div className="tab-header">
              <h3>Analytics Dashboard</h3>
            </div>

            <div className="analytics-dashboard">
              <div className="metrics-overview">
                <div className="metric-card">
                  <div className="metric-value">{cases.length}</div>
                  <div className="metric-label">Total Cases</div>
                  <div className="metric-change">+12% this month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{reports.length}</div>
                  <div className="metric-label">Reports Generated</div>
                  <div className="metric-change">+8% this month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">
                    {Math.round((tasks.filter((t) => t.status === 'completed').length /
                tasks.length) *
                100)}
                    %
                  </div>
                  <div className="metric-label">Task Completion Rate</div>
                  <div className="metric-change">+5% this month</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">
                    {Math.round(reports.reduce((acc, r) => acc + r.analytics.views, 0) /
                reports.length)}
                  </div>
                  <div className="metric-label">Avg Report Views</div>
                  <div className="metric-change">+15% this month</div>
                </div>
              </div>

              <div className="analytics-charts">
                <div className="chart-section">
                  <h4>Case Status Distribution</h4>
                  <div className="status-chart">
                    {['active', 'review', 'closed', 'draft'].map((status) => {
                const count = cases.filter((c) => c.status === status).length;
                const percentage = Math.round((count / cases.length) * 100);
                return (<div key={status} className="status-bar">
                          <div className="bar-label">
                            <span className={`status-dot ${status}`}></span>
                            <span>{status.toUpperCase()}</span>
                            <span className="count">({count})</span>
                          </div>
                          <div className="bar-container">
                            <div className={`bar-fill ${status}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="percentage">{percentage}%</span>
                        </div>);
            })}
                  </div>
                </div>

                <div className="chart-section">
                  <h4>Priority Distribution</h4>
                  <div className="priority-chart">
                    {['critical', 'high', 'medium', 'low'].map((priority) => {
                const count = cases.filter((c) => c.priority === priority).length;
                const percentage = Math.round((count / cases.length) * 100);
                return (<div key={priority} className="priority-item">
                          <span className={`priority-dot ${priority}`}></span>
                          <span className="priority-label">
                            {priority.toUpperCase()}
                          </span>
                          <span className="priority-count">
                            {count} ({percentage}%)
                          </span>
                        </div>);
            })}
                  </div>
                </div>

                <div className="chart-section">
                  <h4>Report Performance</h4>
                  <div className="performance-list">
                    {reports
                .sort((a, b) => b.analytics.views - a.analytics.views)
                .slice(0, 5)
                .map((report) => (<div key={report.id} className="performance-item">
                          <div className="report-info">
                            <div className="report-name">{report.title}</div>
                            <div className="report-type">{report.type}</div>
                          </div>
                          <div className="performance-stats">
                            <span>👁 {report.analytics.views}</span>
                            <span>📥 {report.analytics.downloads}</span>
                            <span>🔗 {report.analytics.shares}</span>
                          </div>
                        </div>))}
                  </div>
                </div>

                <div className="chart-section">
                  <h4>Team Workload</h4>
                  <div className="workload-chart">
                    {Array.from(new Set(cases.map((c) => c.assignedTo.primary))).map((assignee) => {
                const assignedCases = cases.filter((c) => c.assignedTo.primary === assignee);
                const activeCases = assignedCases.filter((c) => c.status === 'active').length;
                return (<div key={assignee} className="workload-item">
                          <div className="assignee-name">{assignee}</div>
                          <div className="workload-bar">
                            <div className="bar-container">
                              <div className="bar-fill workload" style={{
                        width: `${Math.min((activeCases / 5) * 100, 100)}%`,
                    }}></div>
                            </div>
                            <span className="workload-count">
                              {activeCases} active cases
                            </span>
                          </div>
                        </div>);
            })}
                  </div>
                </div>
              </div>
            </div>
          </div>)}
      </div>

      {/* Loading Overlays */}
      {isGeneratingReport && (<div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner large"></div>
            <h3>Generating Report...</h3>
            <p>Analyzing case data and compiling report sections...</p>
          </div>
        </div>)}

      {isExporting && (<div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner large"></div>
            <h3>Exporting Report...</h3>
            <p>Preparing report files for download...</p>
          </div>
        </div>)}
    </div>);
};
exports.default = ReportingCaseManagement;
