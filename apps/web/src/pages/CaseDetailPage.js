"use strict";
/**
 * CaseDetailPage - Comprehensive Case Workspace
 *
 * Features:
 * - Case header with status and metadata
 * - Tasks list with 4-eyes support
 * - Watchlists for entity tracking
 * - Comments with @mentions and audit markers
 * - Integrated tri-pane explorer
 */
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
exports.default = CaseDetailPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const Tabs_1 = require("@/components/ui/Tabs");
const Tooltip_1 = require("@/components/ui/Tooltip");
const triPane_1 = require("@/features/triPane");
const mockData_1 = require("@/features/triPane/mockData");
const CaseExportModal_1 = require("@/components/case/CaseExportModal");
const DataIntegrityNotice_1 = require("@/components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const EmptyState_1 = require("@/components/ui/EmptyState");
// Mock data generators
const generateMockCase = (id) => ({
    id,
    title: 'APT Group Infrastructure Analysis',
    description: 'Comprehensive investigation into APT29 infrastructure, focusing on C2 servers and data exfiltration patterns.',
    status: 'in_progress',
    priority: 'high',
    investigationIds: ['inv-1', 'inv-2'],
    alertIds: ['alert-1', 'alert-2', 'alert-3'],
    assignedTo: 'Alice Johnson',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['apt29', 'nation-state', 'critical-infra'],
});
const generateMockTasks = (caseId) => [
    {
        id: 'task-1',
        caseId,
        title: 'Review C2 server infrastructure',
        description: 'Analyze IP addresses and domain registrations',
        status: 'completed',
        priority: 'high',
        assignedTo: 'Alice Johnson',
        createdBy: 'Alice Johnson',
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        requiresFourEyes: true,
        reviewedBy: 'Bob Smith',
    },
    {
        id: 'task-2',
        caseId,
        title: 'Map entity relationships',
        description: 'Create comprehensive graph of threat actor infrastructure',
        status: 'in_progress',
        priority: 'high',
        assignedTo: 'Alice Johnson',
        createdBy: 'Alice Johnson',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        requiresFourEyes: true,
    },
    {
        id: 'task-3',
        caseId,
        title: 'Identify potential victims',
        description: 'Cross-reference with known targeting patterns',
        status: 'pending',
        priority: 'medium',
        assignedTo: 'Bob Smith',
        createdBy: 'Alice Johnson',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'task-4',
        caseId,
        title: 'Draft intelligence report',
        description: 'Summarize findings for stakeholder distribution',
        status: 'pending',
        priority: 'medium',
        createdBy: 'Alice Johnson',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        requiresFourEyes: true,
    },
];
const generateMockWatchlists = (caseId) => [
    {
        id: 'watch-1',
        caseId,
        name: 'Suspected C2 Servers',
        description: 'Monitor for changes in C2 infrastructure',
        entityIds: ['entity-1', 'entity-2', 'entity-3'],
        alertOnChange: true,
        createdBy: 'Alice Johnson',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'watch-2',
        caseId,
        name: 'Key Threat Actors',
        description: 'Track known APT29 personas',
        entityIds: ['entity-4', 'entity-5'],
        alertOnChange: true,
        createdBy: 'Bob Smith',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
];
const generateMockComments = (caseId) => [
    {
        id: 'comment-1',
        caseId,
        content: 'Initial analysis shows strong correlation with known APT29 TTPs. @bob-smith please review the C2 patterns.',
        author: 'Alice Johnson',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        mentions: ['bob-smith'],
        auditMarker: 'AUDIT-2025-001-001',
    },
    {
        id: 'comment-2',
        caseId,
        content: 'Confirmed. The domain registration patterns match our previous findings from Q3 2024. Escalating to high priority.',
        author: 'Bob Smith',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        mentions: [],
        auditMarker: 'AUDIT-2025-001-002',
        replyToId: 'comment-1',
    },
    {
        id: 'comment-3',
        caseId,
        content: '@alice-johnson discovered 3 new victim organizations. Adding to watchlist for monitoring.',
        author: 'Carol Davis',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        mentions: ['alice-johnson'],
        auditMarker: 'AUDIT-2025-001-003',
    },
];
const PRIORITY_COLORS = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};
function CaseDetailPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    const [caseData, setCaseData] = (0, react_1.useState)(null);
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [watchlists, setWatchlists] = (0, react_1.useState)([]);
    const [comments, setComments] = (0, react_1.useState)([]);
    const [newComment, setNewComment] = (0, react_1.useState)('');
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [exportOpen, setExportOpen] = (0, react_1.useState)(false);
    const tenantId = isDemoMode ? 'tenant-demo' : 'tenant-unavailable';
    const [triPaneData, setTriPaneData] = (0, react_1.useState)({
        entities: [],
        relationships: [],
        timelineEvents: [],
        geospatialEvents: [],
    });
    (0, react_1.useEffect)(() => {
        if (!isDemoMode) {
            setCaseData(null);
            setTasks([]);
            setWatchlists([]);
            setComments([]);
            setTriPaneData({
                entities: [],
                relationships: [],
                timelineEvents: [],
                geospatialEvents: [],
            });
            return;
        }
        const caseId = id || 'case-1';
        setCaseData(generateMockCase(caseId));
        setTasks(generateMockTasks(caseId));
        setWatchlists(generateMockWatchlists(caseId));
        setComments(generateMockComments(caseId));
        const loadTriPaneData = async () => {
            const data = await (0, mockData_1.useMockTriPaneData)();
            setTriPaneData(data);
        };
        loadTriPaneData();
    }, [id, isDemoMode]);
    // Task management
    const handleToggleTaskStatus = (0, react_1.useCallback)((taskId) => {
        setTasks(prev => prev.map(task => {
            if (task.id === taskId) {
                const newStatus = task.status === 'completed'
                    ? 'pending'
                    : task.status === 'pending'
                        ? 'in_progress'
                        : 'completed';
                return { ...task, status: newStatus };
            }
            return task;
        }));
    }, []);
    const safeCaseId = caseData?.id ?? id ?? 'case-unavailable';
    const safeCaseTitle = caseData?.title ?? 'Case';
    // Comment submission
    const handleSubmitComment = (0, react_1.useCallback)(() => {
        if (!newComment.trim())
            return;
        const mentions = extractMentions(newComment);
        const newCommentObj = {
            id: `comment-${Date.now()}`,
            caseId: safeCaseId,
            content: newComment,
            author: 'Current User',
            createdAt: new Date().toISOString(),
            mentions,
            auditMarker: `AUDIT-${new Date().getFullYear()}-${safeCaseId.split('-')[1] ?? 'case'}-${String(comments.length + 1).padStart(3, '0')}`,
        };
        setComments(prev => [...prev, newCommentObj]);
        setNewComment('');
    }, [newComment, safeCaseId, comments.length]);
    const extractMentions = (text) => {
        const mentionRegex = /@([a-z-]+)/g;
        const matches = text.match(mentionRegex);
        return matches ? matches.map(m => m.substring(1)) : [];
    };
    const renderMentionedContent = (content) => {
        const parts = content.split(/(@[a-z-]+)/g);
        return (<span>
        {parts.map((part, i) => part.startsWith('@') ? (<span key={i} className="text-blue-600 dark:text-blue-400 font-medium">
              {part}
            </span>) : (<span key={i}>{part}</span>))}
      </span>);
    };
    const taskStats = (0, react_1.useMemo)(() => {
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            pending: tasks.filter(t => t.status === 'pending').length,
            needsReview: tasks.filter(t => t.requiresFourEyes && !t.reviewedBy && t.status === 'completed').length,
        };
    }, [tasks]);
    if (!isDemoMode && !caseData) {
        return (<div className="h-full flex items-center justify-center p-6">
        <EmptyState_1.EmptyState icon="alert" title="Case data unavailable" description="Connect the backend case service to load live case data." action={{ label: 'Go back', onClick: () => navigate('/cases') }}/>
      </div>);
    }
    if (!caseData) {
        return (<div className="h-full flex items-center justify-center p-6">
        <EmptyState_1.EmptyState icon="alert" title="Loading case data" description="Preparing case workspace..."/>
      </div>);
    }
    return (<div className="h-screen flex flex-col">
      <CaseExportModal_1.CaseExportModal tenantId={tenantId} caseId={safeCaseId} caseTitle={safeCaseTitle} open={exportOpen} onOpenChange={setExportOpen}/>
      <div className="px-6 pt-6">
        <DataIntegrityNotice_1.DataIntegrityNotice mode={isDemoMode ? 'demo' : 'unavailable'} context="Case workspace"/>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <Tooltip_1.Tooltip>
              <Tooltip_1.TooltipTrigger asChild>
                <Button_1.Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="mt-1" aria-label="Go back to cases">
                  <lucide_react_1.ArrowLeft className="h-4 w-4"/>
                </Button_1.Button>
              </Tooltip_1.TooltipTrigger>
              <Tooltip_1.TooltipContent>
                <p>Go back to cases</p>
              </Tooltip_1.TooltipContent>
            </Tooltip_1.Tooltip>
            <div>
              <h1 className="text-2xl font-bold mb-2">{caseData.title}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge_1.Badge className={PRIORITY_COLORS[caseData.priority]}>
                  {caseData.priority}
                </Badge_1.Badge>
                <Badge_1.Badge variant="outline">{caseData.status.replace('_', ' ')}</Badge_1.Badge>
                {caseData.tags.map(tag => (<Badge_1.Badge key={tag} variant="secondary">
                    {tag}
                  </Badge_1.Badge>))}
              </div>
              <p className="text-muted-foreground max-w-3xl">
                {caseData.description}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button_1.Button variant="default" onClick={() => setExportOpen(true)} aria-label="Export case">
              <lucide_react_1.Download className="h-4 w-4 mr-2"/>
              Export
            </Button_1.Button>
            <Button_1.Button variant="outline" onClick={() => navigate(`/reports/new?caseId=${caseData.id}`)}>
              <lucide_react_1.FileText className="h-4 w-4 mr-2"/>
              Create Report
            </Button_1.Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <lucide_react_1.User className="h-4 w-4"/>
            Assigned to {caseData.assignedTo}
          </div>
          <div className="flex items-center gap-1">
            <lucide_react_1.AlertCircle className="h-4 w-4"/>
            {caseData.alertIds.length} alerts
          </div>
          <div className="flex items-center gap-1">
            <lucide_react_1.Network className="h-4 w-4"/>
            {caseData.investigationIds.length} investigations
          </div>
          <div className="flex items-center gap-1">
            <lucide_react_1.Clock className="h-4 w-4"/>
            Due {new Date(caseData.dueDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <Tabs_1.Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 border-b px-6">
            <Tabs_1.TabsList className="flex w-full justify-start gap-4 bg-transparent p-0 h-auto">
              <Tabs_1.TabsTrigger value="overview" className="px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors">
                Overview
              </Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="tasks" className="px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors">
                Tasks ({taskStats.total})
              </Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="explorer" className="px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors">
                Graph Explorer
              </Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="watchlists" className="px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors">
                Watchlists ({watchlists.length})
              </Tabs_1.TabsTrigger>
            </Tabs_1.TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {/* Overview Tab */}
            <Tabs_1.TabsContent value="overview" className="mt-0 h-full">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Tasks Summary */}
                  <div className="lg:col-span-2 space-y-4">
                    <Card_1.Card>
                      <Card_1.CardHeader>
                        <Card_1.CardTitle className="flex items-center justify-between">
                          <span>Recent Tasks</span>
                          <Button_1.Button variant="outline" size="sm" onClick={() => setActiveTab('tasks')}>
                            View All
                          </Button_1.Button>
                        </Card_1.CardTitle>
                      </Card_1.CardHeader>
                      <Card_1.CardContent>
                        <div className="space-y-3">
                          {tasks.slice(0, 4).map(task => (<div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              <button onClick={() => handleToggleTaskStatus(task.id)} className="mt-0.5" aria-label={task.status === 'completed' ? "Mark task as pending" : "Mark task as completed"}>
                                {task.status === 'completed' ? (<lucide_react_1.CheckCircle2 className="h-5 w-5 text-green-600"/>) : (<lucide_react_1.Circle className="h-5 w-5 text-muted-foreground"/>)}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium">{task.title}</p>
                                  <Badge_1.Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
                                    {task.priority}
                                  </Badge_1.Badge>
                                </div>
                                {task.description && (<p className="text-sm text-muted-foreground mt-1">
                                    {task.description}
                                  </p>)}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {task.assignedTo && <span>{task.assignedTo}</span>}
                                  {task.requiresFourEyes && (<Badge_1.Badge variant="secondary" className="text-xs">
                                      <lucide_react_1.Eye className="h-3 w-3 mr-1"/>
                                      4-Eyes
                                      {task.reviewedBy && ' ✓'}
                                    </Badge_1.Badge>)}
                                </div>
                              </div>
                            </div>))}
                        </div>
                      </Card_1.CardContent>
                    </Card_1.Card>

                    {/* Comments Section */}
                    <Card_1.Card>
                      <Card_1.CardHeader>
                        <Card_1.CardTitle className="flex items-center gap-2">
                          <lucide_react_1.MessageSquare className="h-5 w-5"/>
                          Activity & Comments ({comments.length})
                        </Card_1.CardTitle>
                      </Card_1.CardHeader>
                      <Card_1.CardContent>
                        <div className="space-y-4">
                          {comments.map(comment => (<div key={comment.id} className="border-l-2 border-muted pl-4 py-2">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <span className="font-medium">{comment.author}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <Badge_1.Badge variant="outline" className="text-xs font-mono">
                                  {comment.auditMarker}
                                </Badge_1.Badge>
                              </div>
                              <p className="text-sm">
                                {renderMentionedContent(comment.content)}
                              </p>
                            </div>))}

                          {/* New Comment Input */}
                          <div className="mt-4 pt-4 border-t">
                            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment... Use @username to mention colleagues" className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"/>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-muted-foreground">
                                Tip: Use @alice-johnson, @bob-smith, @carol-davis to mention team members
                              </p>
                              <Tooltip_1.Tooltip>
                                <Tooltip_1.TooltipTrigger asChild>
                                  {/* Span needed because disabled buttons don't fire events in some browsers/screen readers correctly unless wrapped or configured carefully, though we removed pointer-events-none */}
                                  <span tabIndex={!newComment.trim() ? 0 : -1}>
                                    <Button_1.Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                                      Post Comment
                                    </Button_1.Button>
                                  </span>
                                </Tooltip_1.TooltipTrigger>
                                {!newComment.trim() && (<Tooltip_1.TooltipContent>
                                    <p>Please enter a comment to post</p>
                                  </Tooltip_1.TooltipContent>)}
                              </Tooltip_1.Tooltip>
                            </div>
                          </div>
                        </div>
                      </Card_1.CardContent>
                    </Card_1.Card>
                  </div>

                  {/* Right: Stats & Watchlists */}
                  <div className="space-y-4">
                    <Card_1.Card>
                      <Card_1.CardHeader>
                        <Card_1.CardTitle className="text-sm">Task Progress</Card_1.CardTitle>
                      </Card_1.CardHeader>
                      <Card_1.CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium">
                            {taskStats.completed}/{taskStats.total}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full transition-all" style={{
            width: `${(taskStats.completed / taskStats.total) * 100}%`,
        }}/>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="text-lg font-bold text-blue-600">
                              {taskStats.inProgress}
                            </div>
                            <div className="text-xs text-muted-foreground">In Progress</div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                            <div className="text-lg font-bold text-orange-600">
                              {taskStats.needsReview}
                            </div>
                            <div className="text-xs text-muted-foreground">Needs Review</div>
                          </div>
                        </div>
                      </Card_1.CardContent>
                    </Card_1.Card>

                    <Card_1.Card>
                      <Card_1.CardHeader>
                        <Card_1.CardTitle className="flex items-center gap-2 text-sm">
                          <lucide_react_1.Star className="h-4 w-4"/>
                          Watchlists
                        </Card_1.CardTitle>
                      </Card_1.CardHeader>
                      <Card_1.CardContent>
                        <div className="space-y-3">
                          {watchlists.map(watchlist => (<div key={watchlist.id} className="p-3 rounded-lg border">
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-medium text-sm">{watchlist.name}</p>
                                <Badge_1.Badge variant="secondary" className="text-xs">
                                  {watchlist.entityIds.length}
                                </Badge_1.Badge>
                              </div>
                              {watchlist.description && (<p className="text-xs text-muted-foreground">
                                  {watchlist.description}
                                </p>)}
                            </div>))}
                          <Button_1.Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('watchlists')}>
                            <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
                            Add Watchlist
                          </Button_1.Button>
                        </div>
                      </Card_1.CardContent>
                    </Card_1.Card>
                  </div>
                </div>
              </div>
            </Tabs_1.TabsContent>

            {/* Tasks Tab */}
            <Tabs_1.TabsContent value="tasks" className="mt-0 h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">All Tasks</h2>
                  <Button_1.Button>
                    <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
                    Add Task
                  </Button_1.Button>
                </div>

                <div className="space-y-3">
                  {tasks.map(task => (<Card_1.Card key={task.id}>
                      <Card_1.CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleToggleTaskStatus(task.id)} className="mt-1" aria-label={task.status === 'completed' ? "Mark task as pending" : "Mark task as completed"}>
                            {task.status === 'completed' ? (<lucide_react_1.CheckCircle2 className="h-6 w-6 text-green-600"/>) : (<lucide_react_1.Circle className="h-6 w-6 text-muted-foreground"/>)}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              <div className="flex gap-2">
                                <Badge_1.Badge className={PRIORITY_COLORS[task.priority]}>
                                  {task.priority}
                                </Badge_1.Badge>
                                <Badge_1.Badge variant="outline">{task.status.replace('_', ' ')}</Badge_1.Badge>
                              </div>
                            </div>
                            {task.description && (<p className="text-sm text-muted-foreground mb-3">
                                {task.description}
                              </p>)}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {task.assignedTo && (<div className="flex items-center gap-1">
                                  <lucide_react_1.User className="h-4 w-4"/>
                                  {task.assignedTo}
                                </div>)}
                              {task.requiresFourEyes && (<Badge_1.Badge variant="secondary">
                                  <lucide_react_1.Eye className="h-3 w-3 mr-1"/>
                                  4-Eyes Review
                                  {task.reviewedBy && ` by ${task.reviewedBy}`}
                                </Badge_1.Badge>)}
                              {task.dueDate && (<div className="flex items-center gap-1">
                                  <lucide_react_1.Clock className="h-4 w-4"/>
                                  Due {new Date(task.dueDate).toLocaleDateString()}
                                </div>)}
                            </div>
                          </div>
                        </div>
                      </Card_1.CardContent>
                    </Card_1.Card>))}
                </div>
              </div>
            </Tabs_1.TabsContent>

            {/* Graph Explorer Tab */}
            <Tabs_1.TabsContent value="explorer" className="mt-0 h-full">
              <div className="h-full p-6">
                <triPane_1.TriPaneShell {...triPaneData} onExport={() => {
            console.log('Exporting case data');
        }}/>
              </div>
            </Tabs_1.TabsContent>

            {/* Watchlists Tab */}
            <Tabs_1.TabsContent value="watchlists" className="mt-0 h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Watchlists</h2>
                  <Button_1.Button>
                    <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
                    Create Watchlist
                  </Button_1.Button>
                </div>

                <div className="grid gap-4">
                  {watchlists.map(watchlist => (<Card_1.Card key={watchlist.id}>
                      <Card_1.CardHeader>
                        <Card_1.CardTitle className="flex items-center justify-between">
                          <span>{watchlist.name}</span>
                          <Badge_1.Badge variant="secondary">
                            {watchlist.entityIds.length} entities
                          </Badge_1.Badge>
                        </Card_1.CardTitle>
                      </Card_1.CardHeader>
                      <Card_1.CardContent>
                        {watchlist.description && (<p className="text-muted-foreground mb-4">
                            {watchlist.description}
                          </p>)}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div>
                            Created by {watchlist.createdBy}
                          </div>
                          <div>
                            {new Date(watchlist.createdAt).toLocaleDateString()}
                          </div>
                          {watchlist.alertOnChange && (<Badge_1.Badge variant="outline">Auto-alert enabled</Badge_1.Badge>)}
                        </div>
                      </Card_1.CardContent>
                    </Card_1.Card>))}
                </div>
              </div>
            </Tabs_1.TabsContent>
          </div>
        </Tabs_1.Tabs>
      </div>
    </div>);
}
