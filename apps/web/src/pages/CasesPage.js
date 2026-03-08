"use strict";
/**
 * CasesPage - Analyst Case Management
 *
 * Displays a list of cases with:
 * - Search and filtering
 * - SLA indicators
 * - Priority sorting
 * - Status tracking
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
exports.default = CasesPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const SearchBar_1 = require("@/components/ui/SearchBar");
const EmptyState_1 = require("@/components/ui/EmptyState");
// Mock data for development
const generateMockCases = () => {
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const analysts = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Chen'];
    const titles = [
        'Suspicious Network Activity from Eastern Europe',
        'Potential Data Exfiltration Investigation',
        'APT Group Infrastructure Analysis',
        'Insider Threat Assessment',
        'Phishing Campaign Investigation',
        'Ransomware Incident Response',
        'Supply Chain Compromise Review',
        'Zero-Day Vulnerability Tracking',
    ];
    return Array.from({ length: 12 }, (_, i) => {
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const dueDate = new Date(createdAt.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000);
        return {
            id: `case-${i + 1}`,
            title: titles[i % titles.length] + (i > 7 ? ` - Follow-up ${i - 7}` : ''),
            description: `Detailed investigation into ${titles[i % titles.length].toLowerCase()}. Multiple entities and relationships identified.`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            investigationIds: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => `inv-${i}-${j}`),
            alertIds: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `alert-${i}-${j}`),
            assignedTo: Math.random() > 0.2 ? analysts[Math.floor(Math.random() * analysts.length)] : undefined,
            createdAt: createdAt.toISOString(),
            updatedAt: new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            dueDate: dueDate.toISOString(),
            tags: ['intelligence', 'cyber-threat', 'ongoing'].slice(0, Math.floor(Math.random() * 3) + 1),
        };
    });
};
const PRIORITY_COLORS = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};
const STATUS_COLORS = {
    open: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
function CasesPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [cases] = (0, react_1.useState)(generateMockCases());
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('all');
    const [filterPriority, setFilterPriority] = (0, react_1.useState)('all');
    const [sortBy, setSortBy] = (0, react_1.useState)('priority');
    // Filter and sort cases
    const filteredCases = (0, react_1.useMemo)(() => {
        let filtered = cases.filter(c => {
            const matchesSearch = searchQuery === '' ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
            const matchesPriority = filterPriority === 'all' || c.priority === filterPriority;
            return matchesSearch && matchesStatus && matchesPriority;
        });
        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'priority') {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            else if (sortBy === 'updated') {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            else {
                // Sort by due date
                if (!a.dueDate)
                    return 1;
                if (!b.dueDate)
                    return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
        });
        return filtered;
    }, [cases, searchQuery, filterStatus, filterPriority, sortBy]);
    // Calculate SLA status
    const getSLAStatus = (caseItem) => {
        if (!caseItem.dueDate)
            return 'on-track';
        const now = new Date();
        const due = new Date(caseItem.dueDate);
        const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursRemaining < 0)
            return 'overdue';
        if (hoursRemaining < 24)
            return 'at-risk';
        return 'on-track';
    };
    const formatDueDate = (dueDate) => {
        if (!dueDate)
            return 'No due date';
        const now = new Date();
        const due = new Date(dueDate);
        const diffMs = due.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 0)
            return `Overdue by ${Math.abs(diffDays)}d`;
        if (diffDays === 0)
            return `Due in ${diffHours}h`;
        if (diffDays < 7)
            return `Due in ${diffDays}d`;
        return `Due ${due.toLocaleDateString()}`;
    };
    return (<div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Case Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage analyst investigations and case workflows
          </p>
        </div>
        <Button_1.Button onClick={() => navigate('/cases/new')} className="gap-2">
          <lucide_react_1.Plus className="h-4 w-4"/>
          New Case
        </Button_1.Button>
      </div>

      {/* Filters and Search */}
      <Card_1.Card>
        <Card_1.CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <SearchBar_1.SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search cases by title, description, or tags..." className="w-full"/>
            </div>

            <div>
              <label htmlFor="status-filter" className="text-sm font-medium mb-1 block">
                Status
              </label>
              <select id="status-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority-filter" className="text-sm font-medium mb-1 block">
                Priority
              </label>
              <select id="priority-filter" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm font-medium">Sort by:</span>
            <div className="flex gap-2">
              <Button_1.Button variant={sortBy === 'priority' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('priority')}>
                Priority
              </Button_1.Button>
              <Button_1.Button variant={sortBy === 'updated' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('updated')}>
                Last Updated
              </Button_1.Button>
              <Button_1.Button variant={sortBy === 'due' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('due')}>
                Due Date
              </Button_1.Button>
            </div>
          </div>
        </Card_1.CardContent>
      </Card_1.Card>

      {/* Case List */}
      {filteredCases.length === 0 ? (<EmptyState_1.EmptyState title="No cases found" description="Try adjusting your search or filters, or create a new case to get started." icon="folder"/>) : (<div className="grid gap-4">
          {filteredCases.map(caseItem => {
                const slaStatus = getSLAStatus(caseItem);
                return (<react_router_dom_1.Link key={caseItem.id} to={`/cases/${caseItem.id}`} className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Card_1.Card className="hover:shadow-md transition-shadow group-hover:border-primary/50">
                  <Card_1.CardContent className="p-6">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title and Badges */}
                      <div className="flex items-start gap-3 mb-2">
                        <lucide_react_1.FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0"/>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">
                            {caseItem.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge_1.Badge className={PRIORITY_COLORS[caseItem.priority]}>
                              {caseItem.priority}
                            </Badge_1.Badge>
                            <Badge_1.Badge className={STATUS_COLORS[caseItem.status]}>
                              {caseItem.status.replace('_', ' ')}
                            </Badge_1.Badge>
                            {caseItem.tags.map(tag => (<Badge_1.Badge key={tag} variant="outline">
                                {tag}
                              </Badge_1.Badge>))}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {caseItem.description}
                          </p>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {caseItem.assignedTo && (<div className="flex items-center gap-1">
                            <lucide_react_1.User className="h-4 w-4"/>
                            {caseItem.assignedTo}
                          </div>)}
                        <div className="flex items-center gap-1">
                          <lucide_react_1.AlertCircle className="h-4 w-4"/>
                          {caseItem.alertIds.length} alerts
                        </div>
                        <div className="flex items-center gap-1">
                          <lucide_react_1.FolderOpen className="h-4 w-4"/>
                          {caseItem.investigationIds.length} investigations
                        </div>
                        <div className="flex items-center gap-1">
                          <lucide_react_1.Clock className="h-4 w-4"/>
                          Updated{' '}
                          {new Date(caseItem.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* SLA Indicator */}
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${slaStatus === 'overdue'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : slaStatus === 'at-risk'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                        {formatDueDate(caseItem.dueDate)}
                      </div>
                      </div>
                    </div>
                  </Card_1.CardContent>
                </Card_1.Card>
              </react_router_dom_1.Link>);
            })}
        </div>)}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{cases.length}</div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Open Cases
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">
              {cases.filter(c => c.status === 'open' || c.status === 'in_progress').length}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              At Risk
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {cases.filter(c => getSLAStatus(c) === 'at-risk').length}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cases.filter(c => getSLAStatus(c) === 'overdue').length}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </div>);
}
