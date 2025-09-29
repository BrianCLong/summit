import React, { useState, useEffect } from 'react';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
}

interface HelpSystemProps {
  isVisible: boolean;
  onClose: () => void;
  initialTopic?: string;
}

const HelpSystem: React.FC<HelpSystemProps> = ({
  isVisible,
  onClose,
  initialTopic
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTopic, setActiveTopic] = useState<string | null>(initialTopic || null);

  const helpTopics: HelpTopic[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      category: 'basics',
      keywords: ['start', 'begin', 'introduction', 'overview'],
      content: `
        # Getting Started with IntelGraph

        Welcome to IntelGraph, your comprehensive intelligence analysis platform.

        ## Quick Start
        1. **Navigate** using the main tabs: Overview, Investigations, Search, Export
        2. **Create** your first investigation from the Investigations tab
        3. **Search** for entities using advanced filters and DSL queries
        4. **Visualize** relationships in the interactive graph view
        5. **Export** reports in multiple formats (PDF, CSV, Excel)
        6. **Explore** advanced features: AI Assistant, Timeline, Threat Intel, MLOps
        7. **Enterprise** features: Collaboration, Security, Monitoring, Integrations

        ## Key Features
        - **Real-time Collaboration**: Live updates and notifications
        - **Advanced Search**: Powerful DSL with visual filters
        - **Graph Visualization**: Interactive network analysis
        - **Multi-format Export**: Professional report generation
        - **Investigation Management**: Full lifecycle tracking
        - **AI-Powered Analysis**: ML recommendations and insights
        - **Enterprise Security**: Audit, monitoring, and compliance
        - **System Integration**: Advanced connectors and data flows

        ## Keyboard Shortcuts
        - **Ctrl+1-0**: Navigate between core tabs
        - **Alt+1-6**: Access enterprise features
        - **Ctrl+K**: Quick search
        - **?**: Show all shortcuts
        - **Ctrl+H**: Open help system

        Need more help? Use the search above or browse categories.
      `
    },
    {
      id: 'advanced-search',
      title: 'Advanced Search Guide',
      category: 'search',
      keywords: ['search', 'query', 'filter', 'dsl', 'syntax'],
      content: `
        # Advanced Search Guide

        ## Search Syntax (DSL)
        Use these patterns for precise searches:

        ### Entity Filters
        - \`type:person\` - Find all person entities
        - \`type:organization\` - Find organizations
        - \`confidence:>80\` - High confidence entities
        - \`confidence:50..90\` - Confidence range

        ### Date Filters
        - \`created:2024-01-01\` - Specific date
        - \`created:>2024-01-01\` - After date
        - \`created:2024-01-01..2024-12-31\` - Date range
        - \`created:last-7d\` - Last 7 days
        - \`created:last-30d\` - Last 30 days

        ### Investigation Filters
        - \`investigation:APT-2024-001\` - Specific investigation
        - \`status:active\` - Active investigations
        - \`priority:high\` - High priority items

        ### Boolean Logic
        - \`malware AND campaign\` - Both terms
        - \`APT OR advanced\` - Either term
        - \`NOT suspicious\` - Exclude term
        - \`(APT OR malware) AND active\` - Grouping

        ### Visual Filters
        Click the filter chips to modify search parameters visually.
      `
    },
    {
      id: 'graph-visualization',
      title: 'Graph Visualization',
      category: 'analysis',
      keywords: ['graph', 'visualization', 'network', 'nodes', 'relationships'],
      content: `
        # Graph Visualization Guide

        ## Navigation
        - **Zoom**: Mouse wheel or pinch gesture
        - **Pan**: Click and drag empty space
        - **Select Node**: Click on any node
        - **Multi-select**: Ctrl+click multiple nodes

        ## Layout Options
        - **Force-directed**: Physics-based natural clustering
        - **Circular**: Nodes arranged in circles
        - **Hierarchical**: Tree-like structure
        - **Grid**: Organized rows and columns

        ## Node Information
        - **Size**: Represents importance or connection count
        - **Color**: Indicates entity type or status
        - **Hover**: Shows detailed tooltip
        - **Double-click**: Expands neighborhood

        ## Performance Tips
        - Graphs with 500+ nodes maintain 60fps
        - Use filters to focus on relevant data
        - Collapse distant nodes to improve performance
        - Export subgraphs for detailed analysis

        ## Keyboard Shortcuts
        - \`Space\`: Pause/resume physics simulation
        - \`F\`: Fit graph to screen
        - \`R\`: Reset zoom and position
        - \`Escape\`: Clear selection
      `
    },
    {
      id: 'investigations',
      title: 'Investigation Management',
      category: 'investigations',
      keywords: ['investigation', 'case', 'manage', 'workflow', 'status'],
      content: `
        # Investigation Management

        ## Creating Investigations
        1. Click **"New Investigation"** from the Investigations tab
        2. Fill required fields:
           - **Name**: Unique identifier (e.g., APT-2024-001)
           - **Description**: Brief summary of scope
           - **Priority**: Low, Medium, High, Critical
           - **Status**: Draft, Active, On-Hold, Closed
           - **Tags**: Searchable keywords

        ## Investigation Lifecycle
        1. **Draft**: Initial planning and setup
        2. **Active**: Ongoing investigation work
        3. **On-Hold**: Paused, awaiting resources
        4. **Closed**: Investigation completed
        5. **Archived**: Long-term storage

        ## Collaboration Features
        - **Team Assignment**: Add investigators and analysts
        - **Activity Feed**: Track all changes and updates
        - **Comments**: Threaded discussions with @mentions
        - **File Attachments**: Evidence and supporting documents

        ## Best Practices
        - Use consistent naming conventions
        - Update status regularly
        - Add meaningful tags for discoverability
        - Document key findings in description
        - Archive completed investigations
      `
    },
    {
      id: 'data-export',
      title: 'Data Export & Reports',
      category: 'export',
      keywords: ['export', 'report', 'pdf', 'csv', 'download', 'template'],
      content: `
        # Data Export & Reports

        ## Export Formats
        - **CSV**: Spreadsheet-compatible data
        - **Excel**: Advanced formatting and charts
        - **JSON**: Machine-readable structured data
        - **PDF**: Professional formatted reports
        - **Cypher**: Neo4j database queries

        ## Report Templates
        ### Executive Summary
        - High-level findings and recommendations
        - Risk assessment and impact analysis
        - Timeline of key events
        - Actionable next steps

        ### Technical Report
        - Detailed technical analysis
        - IOCs and indicators
        - Network diagrams and topology
        - Tool outputs and evidence

        ### Forensic Report
        - Chain of custody documentation
        - Evidence preservation details
        - Legal compliance formatting
        - Digital signatures and hashes

        ## Export Options
        - **Include Metadata**: Timestamps, confidence scores
        - **Include Relationships**: Connection details
        - **Date Range**: Filter by time period
        - **Investigation Scope**: Current investigation only

        ## Export Queue
        - Monitor job progress in Export tab
        - Download links remain active for 7 days
        - Re-download from export history
        - Email notifications for large exports
      `
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      category: 'reference',
      keywords: ['keyboard', 'shortcuts', 'hotkeys', 'productivity'],
      content: `
        # Keyboard Shortcuts

        ## Global Navigation
        - \`Ctrl+1\`: Overview tab
        - \`Ctrl+2\`: Investigations tab
        - \`Ctrl+3\`: Search tab
        - \`Ctrl+4\`: Export tab
        - \`Ctrl+5\`: Analytics tab
        - \`Ctrl+6\`: AI Assistant tab
        - \`Ctrl+7\`: Graph Visualization tab
        - \`Ctrl+8\`: Timeline Analysis tab
        - \`Ctrl+9\`: Threat Intelligence tab
        - \`Ctrl+0\`: MLOps tab
        - \`Ctrl+K\`: Quick search
        - \`Escape\`: Close modals/panels

        ## Enterprise Features
        - \`Alt+1\`: Collaboration workspace
        - \`Alt+2\`: Security audit dashboard
        - \`Alt+3\`: System monitoring
        - \`Alt+4\`: Data integrations
        - \`Alt+5\`: AI recommendations
        - \`Alt+6\`: Enterprise dashboard

        ## Search & Filtering
        - \`/\`: Focus search box
        - \`Enter\`: Execute search
        - \`Ctrl+Enter\`: Search in new tab
        - \`Tab\`: Navigate filter chips
        - \`Ctrl+Shift+F\`: Advanced filters

        ## Graph Visualization
        - \`Space\`: Pause/resume simulation
        - \`F\`: Fit to screen
        - \`R\`: Reset view
        - \`+/-\`: Zoom in/out
        - \`Ctrl+A\`: Select all nodes
        - \`Delete\`: Remove selected nodes

        ## Investigation Management
        - \`Ctrl+N\`: New investigation
        - \`Ctrl+S\`: Save current investigation
        - \`Ctrl+D\`: Duplicate investigation
        - \`Ctrl+Shift+A\`: Archive investigation

        ## Export & Reports
        - \`Ctrl+E\`: Quick export
        - \`Ctrl+P\`: Print current view
        - \`Ctrl+Shift+E\`: Export with options
      `
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      category: 'support',
      keywords: ['help', 'problem', 'error', 'bug', 'issue', 'troubleshoot'],
      content: `
        # Troubleshooting

        ## Common Issues

        ### Blank Page or Loading Issues
        1. **Clear browser cache** (Ctrl+Shift+Delete)
        2. **Disable browser extensions** temporarily
        3. **Check network connection**
        4. **Try incognito/private mode**
        5. **Update browser** to latest version

        ### Search Not Working
        1. **Check search syntax** - see Advanced Search guide
        2. **Verify filters** are not too restrictive
        3. **Clear existing filters** and try again
        4. **Refresh page** to reset state

        ### Graph Performance Issues
        1. **Reduce node count** using filters
        2. **Pause physics simulation** (Spacebar)
        3. **Close other browser tabs**
        4. **Check system memory usage**
        5. **Use simpler layout algorithm**

        ### Export Failures
        1. **Check file permissions** in download folder
        2. **Verify sufficient disk space**
        3. **Try smaller data set**
        4. **Use different export format**
        5. **Contact admin** for large exports

        ## Error Reporting
        If you encounter persistent issues:
        1. **Note error message** exactly
        2. **Record steps to reproduce**
        3. **Check browser console** (F12)
        4. **Include browser/OS version**
        5. **Contact support** with details

        ## Performance Tips
        - **Close unused tabs** to free memory
        - **Use modern browser** (Chrome, Firefox, Safari)
        - **Enable hardware acceleration**
        - **Regular browser updates**
        - **Adequate system RAM** (8GB+ recommended)
      `
    },
    {
      id: 'enterprise-features',
      title: 'Enterprise Features Guide',
      category: 'enterprise',
      keywords: ['enterprise', 'collaboration', 'security', 'monitoring', 'integrations', 'advanced'],
      content: `
        # Enterprise Features Guide

        IntelGraph includes advanced enterprise features for large-scale intelligence operations.

        ## Collaboration (Alt+1)
        - **Real-time Workspace**: Live cursors, annotations, and shared editing
        - **Team Presence**: See who's online and what they're working on
        - **Workspace Sharing**: Share investigations with team members
        - **Activity Feed**: Track all team activities and changes
        - **Comment System**: Threaded discussions on entities and investigations

        ## Security & Audit (Alt+2)
        - **Event Monitoring**: Track all security-relevant events
        - **Compliance Rules**: Automated compliance checking
        - **Risk Assessment**: Real-time security scoring
        - **Audit Trails**: Complete activity logging
        - **Access Control**: Role-based permissions and policies

        ## System Monitoring (Alt+3)
        - **Service Health**: Monitor all system components
        - **Performance Metrics**: CPU, memory, network, and application metrics
        - **Log Aggregation**: Centralized logging with search and analysis
        - **Alert Management**: Configurable thresholds and notifications
        - **Real-time Dashboards**: Live system status and performance

        ## Data Integrations (Alt+4)
        - **Multiple Connector Types**: API, database, file, stream, webhook, cloud
        - **Data Source Categories**: Threat intel, logs, OSINT, forensics, financial
        - **Template System**: Pre-configured integration templates
        - **Health Monitoring**: Track connector status and data flows
        - **Custom Configurations**: Flexible connector setup and management

        ## AI Recommendations (Alt+5)
        - **Intelligent Suggestions**: ML-powered investigation recommendations
        - **Similar Cases**: Find related investigations and patterns
        - **Entity Discovery**: Automated entity relationship suggestions
        - **Investigation Strategies**: AI-guided investigation methodologies
        - **Confidence Scoring**: Quality assessment of recommendations

        ## Enterprise Dashboard (Alt+6)
        - **Role-based Views**: Customized dashboards for different user types
        - **Executive Summary**: High-level KPIs and metrics
        - **Automated Reports**: Scheduled report generation and distribution
        - **Widget System**: Customizable dashboard components
        - **Multi-format Export**: PDF, DOCX, CSV report templates

        ## Getting Started with Enterprise Features
        1. Use **Alt+1-6** keyboard shortcuts to access enterprise tabs
        2. Configure your role in the Enterprise Dashboard for personalized views
        3. Set up data integrations in the Integrations tab
        4. Enable security monitoring and configure compliance rules
        5. Use AI Recommendations to enhance your investigation workflows
        6. Collaborate with team members using the real-time workspace features
      `
    }
  ];

  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'basics', label: 'Getting Started' },
    { id: 'search', label: 'Search & Filtering' },
    { id: 'analysis', label: 'Analysis & Visualization' },
    { id: 'investigations', label: 'Investigations' },
    { id: 'export', label: 'Export & Reports' },
    { id: 'enterprise', label: 'Enterprise Features' },
    { id: 'reference', label: 'Reference' },
    { id: 'support', label: 'Support' }
  ];

  const filteredTopics = helpTopics.filter(topic => {
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase())) ||
      topic.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (initialTopic) {
      setActiveTopic(initialTopic);
    }
  }, [initialTopic]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r bg-gray-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Help & Documentation</h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categories */}
          <div className="p-4 border-b">
            <div className="space-y-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded text-sm
                    ${selectedCategory === category.id 
                      ? 'bg-blue-100 text-blue-800 font-medium' 
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topics List */}
          <div className="flex-1 overflow-y-auto">
            {filteredTopics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic.id)}
                className={`
                  w-full text-left p-4 border-b hover:bg-gray-100
                  ${activeTopic === topic.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                `}
              >
                <div className="font-medium text-gray-900">{topic.title}</div>
                <div className="text-sm text-gray-500 capitalize mt-1">{topic.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {activeTopic ? (
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const topic = helpTopics.find(t => t.id === activeTopic);
                if (!topic) return <div className="p-8">Topic not found</div>;
                
                return (
                  <div className="p-8">
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: topic.content
                          .split('\n')
                          .map(line => line.trim())
                          .join('\n')
                          .replace(/^# (.*)/gm, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
                          .replace(/^## (.*)/gm, '<h2 class="text-2xl font-semibold mb-3 mt-6">$1</h2>')
                          .replace(/^### (.*)/gm, '<h3 class="text-xl font-medium mb-2 mt-4">$1</h3>')
                          .replace(/^\- (.*)/gm, '<li>$1</li>')
                          .replace(/^(\d+)\. (.*)/gm, '<li>$1. $1</li>')
                          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/^(.*)$/gm, '<p>$1</p>')
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📚</div>
                <div className="text-lg">Select a help topic to get started</div>
                <div className="text-sm mt-2">Use the search or browse categories on the left</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook to easily trigger help system
export const useHelpSystem = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [initialTopic, setInitialTopic] = useState<string | undefined>();

  const showHelp = (topic?: string) => {
    setInitialTopic(topic);
    setIsVisible(true);
  };

  const hideHelp = () => {
    setIsVisible(false);
    setInitialTopic(undefined);
  };

  return {
    isVisible,
    showHelp,
    hideHelp,
    HelpComponent: (props: Partial<HelpSystemProps>) => (
      <HelpSystem
        isVisible={isVisible}
        onClose={hideHelp}
        initialTopic={initialTopic}
        {...props}
      />
    )
  };
};

export default HelpSystem;