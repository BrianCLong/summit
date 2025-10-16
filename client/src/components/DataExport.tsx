import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const EXPORT_DATA = gql`
  mutation ExportData($format: ExportFormat!, $options: ExportOptions!) {
    exportData(format: $format, options: $options) {
      id
      status
      downloadUrl
      expiresAt
      metadata
    }
  }
`;

const GENERATE_REPORT = gql`
  mutation GenerateReport($template: ReportTemplate!, $data: ReportData!) {
    generateReport(template: $template, data: $data) {
      id
      status
      downloadUrl
      format
      size
      createdAt
    }
  }
`;

interface ExportOptions {
  investigationId?: string;
  entityIds?: string[];
  includeRelationships?: boolean;
  includeMetadata?: boolean;
  includeAnalytics?: boolean;
  dateRange?: [string, string];
  filterCriteria?: any;
}

interface DataExportProps {
  investigationId?: string;
  selectedEntities?: string[];
  onExportComplete?: (result: any) => void;
  showReports?: boolean;
}

function DataExport({
  investigationId,
  selectedEntities = [],
  onExportComplete,
  showReports = true,
}: DataExportProps) {
  const [exportFormat, setExportFormat] = useState<
    'json' | 'csv' | 'xlsx' | 'pdf' | 'cypher'
  >('json');
  const [reportTemplate, setReportTemplate] = useState<
    'executive' | 'technical' | 'forensic' | 'custom'
  >('executive');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    investigationId,
    entityIds: selectedEntities,
    includeRelationships: true,
    includeMetadata: true,
    includeAnalytics: false,
    dateRange: ['', ''],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  const [exportData, { loading: exportLoading }] = useMutation(EXPORT_DATA);
  const [generateReport, { loading: reportLoading }] =
    useMutation(GENERATE_REPORT);

  const handleExport = async () => {
    try {
      const result = await exportData({
        variables: {
          format: exportFormat.toUpperCase(),
          options: exportOptions,
        },
      });

      const exportResult = result.data?.exportData;
      if (exportResult) {
        setExportHistory((prev) => [exportResult, ...prev.slice(0, 9)]);
        onExportComplete?.(exportResult);

        // Auto-download if URL is available
        if (exportResult.downloadUrl) {
          window.open(exportResult.downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleReportGeneration = async () => {
    try {
      const result = await generateReport({
        variables: {
          template: reportTemplate.toUpperCase(),
          data: {
            investigationId: exportOptions.investigationId,
            entityIds: exportOptions.entityIds,
            includeGraphs: true,
            includeTimeline: true,
            includeAnalytics: exportOptions.includeAnalytics,
          },
        },
      });

      const reportResult = result.data?.generateReport;
      if (reportResult) {
        setExportHistory((prev) => [reportResult, ...prev.slice(0, 9)]);
        onExportComplete?.(reportResult);

        if (reportResult.downloadUrl) {
          window.open(reportResult.downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Report generation failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="panel" style={{ padding: '24px' }}>
      <h3
        style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}
      >
        📤 Data Export & Reports
      </h3>

      {/* Export Formats */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
            display: 'block',
          }}
        >
          Export Format
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px',
          }}
        >
          {[
            { value: 'json', label: 'JSON', desc: 'Structured data' },
            { value: 'csv', label: 'CSV', desc: 'Spreadsheet format' },
            { value: 'xlsx', label: 'Excel', desc: 'Microsoft Excel' },
            { value: 'pdf', label: 'PDF', desc: 'Document format' },
            { value: 'cypher', label: 'Cypher', desc: 'Neo4j queries' },
          ].map((format) => (
            <label
              key={format.value}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px',
                border:
                  exportFormat === format.value
                    ? '2px solid #1a73e8'
                    : '1px solid var(--hairline)',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor:
                  exportFormat === format.value ? '#f0f4ff' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="radio"
                name="exportFormat"
                value={format.value}
                checked={exportFormat === format.value}
                onChange={(e) => setExportFormat(e.target.value as any)}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '4px',
                }}
              >
                {format.label}
              </div>
              <div
                style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}
              >
                {format.desc}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <label style={{ fontSize: '14px', fontWeight: '600' }}>
            Export Options
          </label>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a73e8',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showAdvanced ? '▼ Hide Advanced' : '▶ Show Advanced'}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <input
              type="checkbox"
              checked={exportOptions.includeRelationships}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  includeRelationships: e.target.checked,
                }))
              }
            />
            Include Relationships
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <input
              type="checkbox"
              checked={exportOptions.includeMetadata}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  includeMetadata: e.target.checked,
                }))
              }
            />
            Include Metadata
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <input
              type="checkbox"
              checked={exportOptions.includeAnalytics}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  includeAnalytics: e.target.checked,
                }))
              }
            />
            Include Analytics
          </label>
        </div>

        {showAdvanced && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Date Range (Optional)
              </label>
              <div
                style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
              >
                <input
                  type="date"
                  value={exportOptions.dateRange?.[0] || ''}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      dateRange: [e.target.value, prev.dateRange?.[1] || ''],
                    }))
                  }
                  style={{
                    flex: 1,
                    padding: '6px',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                  }}
                />
                <span>to</span>
                <input
                  type="date"
                  value={exportOptions.dateRange?.[1] || ''}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      dateRange: [prev.dateRange?.[0] || '', e.target.value],
                    }))
                  }
                  style={{
                    flex: 1,
                    padding: '6px',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Investigation ID
              </label>
              <input
                type="text"
                value={exportOptions.investigationId || ''}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    investigationId: e.target.value,
                  }))
                }
                placeholder="Enter investigation ID..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--hairline)',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Generation */}
      {showReports && (
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              display: 'block',
            }}
          >
            📊 Generate Report
          </label>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <select
              value={reportTemplate}
              onChange={(e) => setReportTemplate(e.target.value as any)}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="executive">Executive Summary</option>
              <option value="technical">Technical Analysis</option>
              <option value="forensic">Forensic Report</option>
              <option value="custom">Custom Template</option>
            </select>
            <button
              onClick={handleReportGeneration}
              disabled={reportLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: reportLoading ? '#ccc' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: reportLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                minWidth: '120px',
              }}
            >
              {reportLoading ? '⏳ Generating...' : '📄 Generate Report'}
            </button>
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={handleExport}
          disabled={exportLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: exportLoading ? '#ccc' : '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: exportLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            minWidth: '150px',
          }}
        >
          {exportLoading ? '⏳ Exporting...' : '📤 Export Data'}
        </button>

        <div style={{ fontSize: '12px', color: '#666' }}>
          {selectedEntities.length > 0 &&
            `${selectedEntities.length} entities selected • `}
          Format: {exportFormat.toUpperCase()}
        </div>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div>
          <h4
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '12px',
            }}
          >
            📁 Recent Exports
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {exportHistory.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: '1px solid var(--hairline)',
                  fontSize: '14px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {item.format || exportFormat.toUpperCase()} Export
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : 'Just now'}
                    {item.size && ` • ${formatFileSize(item.size)}`}
                  </div>
                </div>

                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor:
                        item.status === 'completed'
                          ? '#dcfce7'
                          : item.status === 'processing'
                            ? '#fef3c7'
                            : '#fee2e2',
                      color:
                        item.status === 'completed'
                          ? '#166534'
                          : item.status === 'processing'
                            ? '#a16207'
                            : '#991b1b',
                    }}
                  >
                    {item.status || 'processing'}
                  </span>

                  {item.downloadUrl && (
                    <button
                      onClick={() => window.open(item.downloadUrl, '_blank')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      📥 Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataExport;
