"use strict";
/**
 * ReportsPage - Intelligence Report Studio
 *
 * Features:
 * - Report list and creation
 * - Report composition with sections
 * - Snapshot embedding (graph/timeline/map)
 * - AI Copilot text blocks with citations
 * - Export to HTML and PDF
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
exports.default = ReportsPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const SearchBar_1 = require("@/components/ui/SearchBar");
const EmptyState_1 = require("@/components/ui/EmptyState");
// Mock data
const generateMockReports = () => [
    {
        id: 'report-1',
        title: 'APT29 Infrastructure Analysis - Q4 2025',
        description: 'Comprehensive analysis of APT29 C2 infrastructure and TTPs',
        status: 'review',
        classification: 'secret',
        caseId: 'case-1',
        caseName: 'APT Group Infrastructure Analysis',
        author: 'Alice Johnson',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        sectionCount: 7,
        snapshotCount: 3,
        aiBlockCount: 2,
    },
    {
        id: 'report-2',
        title: 'Phishing Campaign Threat Assessment',
        description: 'Analysis of ongoing phishing campaign targeting financial sector',
        status: 'draft',
        classification: 'confidential',
        caseId: 'case-2',
        caseName: 'Phishing Campaign Investigation',
        author: 'Bob Smith',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        sectionCount: 4,
        snapshotCount: 1,
        aiBlockCount: 1,
    },
    {
        id: 'report-3',
        title: 'Monthly Threat Intelligence Summary - November 2025',
        description: 'Executive summary of threat landscape and key findings',
        status: 'published',
        classification: 'unclassified',
        author: 'Carol Davis',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        sectionCount: 5,
        snapshotCount: 2,
        aiBlockCount: 3,
    },
];
const CLASSIFICATION_COLORS = {
    'unclassified': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'confidential': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'secret': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'top-secret': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};
const STATUS_COLORS = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'review': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'published': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};
function ReportsPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [reports] = (0, react_1.useState)(generateMockReports());
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('all');
    const [selectedReport, setSelectedReport] = (0, react_1.useState)(null);
    const [showComposer, setShowComposer] = (0, react_1.useState)(false);
    const filteredReports = reports.filter(r => {
        const matchesSearch = searchQuery === '' ||
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    const handleExportHTML = (report) => {
        console.log('Exporting report to HTML:', report.id);
        // In a real implementation, this would call the backend export API
        alert(`Exporting "${report.title}" to HTML format`);
    };
    const handleExportPDF = (report) => {
        console.log('Exporting report to PDF:', report.id);
        // In a real implementation, this would call the backend PDF generation API
        alert(`Generating PDF for "${report.title}". This will call the backend PDF service.`);
    };
    const handleCreateReport = () => {
        setShowComposer(true);
    };
    // Report Composer Modal
    const ReportComposer = () => (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <Card_1.Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <Card_1.CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <Card_1.CardTitle>Create Intelligence Report</Card_1.CardTitle>
            <Button_1.Button variant="ghost" onClick={() => setShowComposer(false)}>
              Close
            </Button_1.Button>
          </div>
        </Card_1.CardHeader>
        <Card_1.CardContent className="p-6 space-y-6">
          {/* Report Metadata */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Report Title</label>
              <input type="text" placeholder="e.g., APT Campaign Analysis - Q4 2025" className="w-full px-3 py-2 rounded-md border border-input bg-background"/>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea placeholder="Brief overview of the report content..." className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[80px] resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Classification</label>
                <select className="w-full px-3 py-2 rounded-md border border-input bg-background">
                  <option value="unclassified">Unclassified</option>
                  <option value="confidential">Confidential</option>
                  <option value="secret">Secret</option>
                  <option value="top-secret">Top Secret</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Link to Case (Optional)</label>
                <select className="w-full px-3 py-2 rounded-md border border-input bg-background">
                  <option value="">None</option>
                  <option value="case-1">APT Group Infrastructure Analysis</option>
                  <option value="case-2">Phishing Campaign Investigation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Report Sections</h3>
            <div className="space-y-3">
              <Card_1.Card className="bg-muted/30">
                <Card_1.CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">1. Executive Summary</h4>
                    <Badge_1.Badge variant="secondary">Text</Badge_1.Badge>
                  </div>
                  <textarea placeholder="Write your executive summary..." className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[100px] resize-none"/>
                </Card_1.CardContent>
              </Card_1.Card>

              <Card_1.Card className="bg-muted/30">
                <Card_1.CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">2. Key Findings</h4>
                    <Badge_1.Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <lucide_react_1.MessageSquare className="h-3 w-3 mr-1"/>
                      AI-Generated
                    </Badge_1.Badge>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-2">
                    <p className="text-sm italic text-muted-foreground">
                      AI Copilot will generate findings based on case data with inline citations.
                    </p>
                  </div>
                  <Button_1.Button variant="outline" size="sm">
                    <lucide_react_1.MessageSquare className="h-4 w-4 mr-2"/>
                    Generate with AI Copilot
                  </Button_1.Button>
                </Card_1.CardContent>
              </Card_1.Card>

              <Card_1.Card className="bg-muted/30">
                <Card_1.CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">3. Threat Actor Infrastructure</h4>
                    <Badge_1.Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <lucide_react_1.Image className="h-3 w-3 mr-1"/>
                      Snapshot
                    </Badge_1.Badge>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4 mb-2 flex items-center justify-center">
                    <div className="text-center">
                      <lucide_react_1.Image className="h-12 w-12 mx-auto mb-2 text-muted-foreground"/>
                      <p className="text-sm text-muted-foreground">Graph snapshot will be embedded here</p>
                    </div>
                  </div>
                  <Button_1.Button variant="outline" size="sm">
                    <lucide_react_1.Image className="h-4 w-4 mr-2"/>
                    Select Snapshot from Case
                  </Button_1.Button>
                </Card_1.CardContent>
              </Card_1.Card>

              <Card_1.Card className="bg-muted/30">
                <Card_1.CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">4. Recommendations</h4>
                    <Badge_1.Badge variant="secondary">Text</Badge_1.Badge>
                  </div>
                  <textarea placeholder="List recommendations for stakeholders..." className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[100px] resize-none"/>
                </Card_1.CardContent>
              </Card_1.Card>
            </div>

            <Button_1.Button variant="outline" className="w-full mt-4">
              <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
              Add Section
            </Button_1.Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="space-x-2">
              <Button_1.Button variant="outline">Save as Draft</Button_1.Button>
              <Button_1.Button variant="outline">Request Review</Button_1.Button>
            </div>
            <div className="space-x-2">
              <Button_1.Button variant="outline" onClick={() => alert('Exporting to HTML...')}>
                <lucide_react_1.Download className="h-4 w-4 mr-2"/>
                Export HTML
              </Button_1.Button>
              <Button_1.Button onClick={() => alert('Generating PDF via backend...')}>
                <lucide_react_1.Download className="h-4 w-4 mr-2"/>
                Export PDF
              </Button_1.Button>
            </div>
          </div>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
    return (<div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intelligence Reports</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and export intelligence reports and briefing documents
          </p>
        </div>
        <Button_1.Button onClick={handleCreateReport} className="gap-2">
          <lucide_react_1.Plus className="h-4 w-4"/>
          New Report
        </Button_1.Button>
      </div>

      {/* Filters */}
      <Card_1.Card>
        <Card_1.CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SearchBar_1.SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search reports by title, description, or author..." className="w-full"/>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </Card_1.CardContent>
      </Card_1.Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (<EmptyState_1.EmptyState title="No reports found" description="Create your first intelligence report to get started." icon="file"/>) : (<div className="grid gap-4">
          {filteredReports.map(report => (<Card_1.Card key={report.id} className="hover:shadow-md transition-shadow">
              <Card_1.CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <lucide_react_1.FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0"/>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge_1.Badge className={STATUS_COLORS[report.status]}>
                            {report.status}
                          </Badge_1.Badge>
                          <Badge_1.Badge className={CLASSIFICATION_COLORS[report.classification]}>
                            {report.classification.toUpperCase()}
                          </Badge_1.Badge>
                          {report.caseName && (<Badge_1.Badge variant="outline">
                              <lucide_react_1.ExternalLink className="h-3 w-3 mr-1"/>
                              {report.caseName}
                            </Badge_1.Badge>)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {report.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <lucide_react_1.User className="h-4 w-4"/>
                            {report.author}
                          </div>
                          <div className="flex items-center gap-1">
                            <lucide_react_1.Calendar className="h-4 w-4"/>
                            Updated {new Date(report.updatedAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{report.sectionCount} sections</span>
                            <span>•</span>
                            <span>{report.snapshotCount} snapshots</span>
                            <span>•</span>
                            <span>{report.aiBlockCount} AI blocks</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <Button_1.Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}`)}>
                      <lucide_react_1.Edit className="h-4 w-4 mr-2"/>
                      Edit
                    </Button_1.Button>
                    <Button_1.Button variant="outline" size="sm" onClick={() => handleExportHTML(report)}>
                      <lucide_react_1.Download className="h-4 w-4 mr-2"/>
                      HTML
                    </Button_1.Button>
                    <Button_1.Button variant="outline" size="sm" onClick={() => handleExportPDF(report)}>
                      <lucide_react_1.Download className="h-4 w-4 mr-2"/>
                      PDF
                    </Button_1.Button>
                  </div>
                </div>
              </Card_1.CardContent>
            </Card_1.Card>))}
        </div>)}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reports
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              In Draft
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'draft').length}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              In Review
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'review').length}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Published
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'published').length}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {/* Report Composer Modal */}
      {showComposer && <ReportComposer />}
    </div>);
}
