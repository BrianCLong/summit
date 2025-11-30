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

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Download,
  Eye,
  Edit,
  Image,
  MessageSquare,
  Calendar,
  User,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'

interface Report {
  id: string
  title: string
  description: string
  status: 'draft' | 'review' | 'approved' | 'published'
  classification: 'unclassified' | 'confidential' | 'secret' | 'top-secret'
  caseId?: string
  caseName?: string
  author: string
  createdAt: string
  updatedAt: string
  sectionCount: number
  snapshotCount: number
  aiBlockCount: number
}

interface ReportSection {
  id: string
  title: string
  content: string
  type: 'text' | 'snapshot' | 'ai-generated'
  order: number
  citations?: string[]
  snapshotUrl?: string
}

// Mock data
const generateMockReports = (): Report[] => [
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
]

const CLASSIFICATION_COLORS = {
  'unclassified': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'confidential': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'secret': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'top-secret': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const STATUS_COLORS = {
  'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'review': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'published': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [reports] = useState<Report[]>(generateMockReports())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showComposer, setShowComposer] = useState(false)

  const filteredReports = reports.filter(r => {
    const matchesSearch =
      searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.author.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus === 'all' || r.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleExportHTML = (report: Report) => {
    console.log('Exporting report to HTML:', report.id)
    // In a real implementation, this would call the backend export API
    alert(`Exporting "${report.title}" to HTML format`)
  }

  const handleExportPDF = (report: Report) => {
    console.log('Exporting report to PDF:', report.id)
    // In a real implementation, this would call the backend PDF generation API
    alert(`Generating PDF for "${report.title}". This will call the backend PDF service.`)
  }

  const handleCreateReport = () => {
    setShowComposer(true)
  }

  // Report Composer Modal
  const ReportComposer = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Create Intelligence Report</CardTitle>
            <Button variant="ghost" onClick={() => setShowComposer(false)}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Report Metadata */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Report Title</label>
              <input
                type="text"
                placeholder="e.g., APT Campaign Analysis - Q4 2025"
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea
                placeholder="Brief overview of the report content..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[80px] resize-none"
              />
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
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">1. Executive Summary</h4>
                    <Badge variant="secondary">Text</Badge>
                  </div>
                  <textarea
                    placeholder="Write your executive summary..."
                    className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[100px] resize-none"
                  />
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">2. Key Findings</h4>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      AI-Generated
                    </Badge>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-2">
                    <p className="text-sm italic text-muted-foreground">
                      AI Copilot will generate findings based on case data with inline citations.
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Generate with AI Copilot
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">3. Threat Actor Infrastructure</h4>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <Image className="h-3 w-3 mr-1" />
                      Snapshot
                    </Badge>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4 mb-2 flex items-center justify-center">
                    <div className="text-center">
                      <Image className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Graph snapshot will be embedded here</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Image className="h-4 w-4 mr-2" />
                    Select Snapshot from Case
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">4. Recommendations</h4>
                    <Badge variant="secondary">Text</Badge>
                  </div>
                  <textarea
                    placeholder="List recommendations for stakeholders..."
                    className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[100px] resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            <Button variant="outline" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="space-x-2">
              <Button variant="outline">Save as Draft</Button>
              <Button variant="outline">Request Review</Button>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => alert('Exporting to HTML...')}>
                <Download className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
              <Button onClick={() => alert('Generating PDF via backend...')}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intelligence Reports</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and export intelligence reports and briefing documents
          </p>
        </div>
        <Button onClick={handleCreateReport} className="gap-2">
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search reports by title, description, or author..."
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title="No reports found"
          description="Create your first intelligence report to get started."
          icon="file"
        />
      ) : (
        <div className="grid gap-4">
          {filteredReports.map(report => (
            <Card
              key={report.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={STATUS_COLORS[report.status]}>
                            {report.status}
                          </Badge>
                          <Badge className={CLASSIFICATION_COLORS[report.classification]}>
                            {report.classification.toUpperCase()}
                          </Badge>
                          {report.caseName && (
                            <Badge variant="outline">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {report.caseName}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {report.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {report.author}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportHTML(report)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      HTML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(report)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'review').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'published').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Composer Modal */}
      {showComposer && <ReportComposer />}
    </div>
  )
}
