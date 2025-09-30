/**
 * @intelgraph/ingest-wizard
 * Shared UI components for data ingestion with DPIA compliance
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';
import * as Form from '@radix-ui/react-form';
import * as Select from '@radix-ui/react-select';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Progress from '@radix-ui/react-progress';
import { clsx } from 'clsx';
import {
  DataPreviewTable,
  inferPreviewColumns,
  normalizePreviewRows,
  RawPreviewRow,
  DataPreviewRow
} from './DataPreviewTable';

// Schemas
export const DataSourceConfigSchema = z.object({
  name: z.string().min(1, 'Data source name is required'),
  source_type: z.enum(['csv', 'json', 'elasticsearch', 'esri', 'api']),
  source_config: z.record(z.any()),
  license_template: z.string().optional(),
  custom_license: z.object({
    name: z.string(),
    type: z.enum(['commercial', 'open_source', 'proprietary', 'restricted']),
    restrictions: z.object({
      commercial_use: z.boolean(),
      export_allowed: z.boolean(),
      research_only: z.boolean(),
      attribution_required: z.boolean(),
      share_alike: z.boolean()
    })
  }).optional(),
  tos_accepted: z.boolean(),
  retention_period: z.number().min(1).max(2555), // max 7 years
  geographic_restrictions: z.array(z.string())
});

export const DPIAFormSchema = z.object({
  processing_purpose: z.string().min(10, 'Please provide detailed processing purpose'),
  data_categories: z.array(z.string()).min(1, 'Select at least one data category'),
  retention_justification: z.string().min(10, 'Retention justification required'),
  security_measures: z.array(z.string()).min(1, 'Select security measures'),
  third_party_sharing: z.boolean(),
  automated_decision_making: z.boolean(),
  pii_classification: z.enum(['none', 'low', 'medium', 'high', 'critical'])
});

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;
export type DPIAForm = z.infer<typeof DPIAFormSchema>;

type DataPreviewFormat = 'csv' | 'json';

const SUPPORTED_PREVIEW_FORMATS: DataPreviewFormat[] = ['csv', 'json'];
const DEFAULT_PAGE_SIZE = 10;

const DEFAULT_PREVIEW_QUERY = `
  query DataPreview($input: DataPreviewInput!) {
    dataPreview(input: $input) {
      format
      columns
      rows
      totalRows
      truncated
    }
  }
`;

// Step indicator component
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps
}) => {
  const progress = Math.min(
    100,
    Math.max(0, ((currentStep + 1) / totalSteps) * 100)
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="text-xs mt-2 text-center max-w-20">
              {step}
            </div>
          </div>
        ))}
      </div>
      <Progress.Root className="relative overflow-hidden bg-gray-200 rounded-full w-full h-2 mt-4">
        <Progress.Indicator
          className="bg-blue-500 w-full h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${100 - progress}%)` }}
        />
      </Progress.Root>
    </div>
  );
};

// Data source configuration step
interface DataSourceStepProps {
  config: Partial<DataSourceConfig>;
  onChange: (config: Partial<DataSourceConfig>) => void;
  onNext: () => void;
}

export const DataSourceStep: React.FC<DataSourceStepProps> = ({
  config,
  onChange,
  onNext
}) => {
  const [licenseTemplates] = useState([
    { id: 'cc-by-4.0', name: 'Creative Commons Attribution 4.0' },
    { id: 'commercial-restricted', name: 'Commercial License - Export Restricted' },
    { id: 'research-only', name: 'Academic Research Only' },
    { id: 'custom', name: 'Custom License' }
  ]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate current step
      const stepSchema = DataSourceConfigSchema.pick({
        name: true,
        source_type: true,
        license_template: true
      });
      stepSchema.parse(config);
      onNext();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [config, onNext]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Data Source Configuration</h2>

      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="name" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Data Source Name
          </Form.Label>
          <Form.Control asChild>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              type="text"
              value={config.name || ''}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              placeholder="Enter descriptive name for data source"
            />
          </Form.Control>
          <Form.Message className="text-red-500 text-sm mt-1" match="valueMissing">
            Please enter a data source name
          </Form.Message>
        </Form.Field>

        <Form.Field name="source_type" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Source Type
          </Form.Label>
          <Select.Root
            value={config.source_type || ''}
            onValueChange={(value) => onChange({ ...config, source_type: value as any })}
          >
            <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <Select.Value placeholder="Select source type" />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Item value="csv">
                    <Select.ItemText>CSV File</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="json">
                    <Select.ItemText>JSON API</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="elasticsearch">
                    <Select.ItemText>Elasticsearch</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="esri">
                    <Select.ItemText>ESRI ArcGIS</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="api">
                    <Select.ItemText>REST API</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        <Form.Field name="license_template" className="mb-6">
          <Form.Label className="block text-sm font-medium mb-2">
            License Template
          </Form.Label>
          <Select.Root
            value={config.license_template || ''}
            onValueChange={(value) => onChange({ ...config, license_template: value })}
          >
            <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <Select.Value placeholder="Select license template" />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {licenseTemplates.map((template) => (
                    <Select.Item key={template.id} value={template.id}>
                      <Select.ItemText>{template.name}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        <Form.Submit asChild>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Next: Preview Data
          </button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
};

interface GraphQLPreviewPayload {
  columns?: string[] | null;
  rows?: RawPreviewRow[] | null;
  totalRows?: number | null;
  format?: string | null;
  truncated?: boolean | null;
}

interface GraphQLPreviewResponse {
  data?: Record<string, GraphQLPreviewPayload | null | undefined>;
  errors?: Array<{ message?: string }>;
}

interface DataPreviewResult {
  columns: string[];
  rows: DataPreviewRow[];
  totalRows: number;
  format: DataPreviewFormat;
  truncated?: boolean;
}

interface DataPreviewStepProps {
  config: Partial<DataSourceConfig>;
  graphqlEndpoint: string;
  graphqlHeaders?: Record<string, string>;
  query: string;
  previewField: string;
  onBack: () => void;
  onNext: () => void;
}

export const DataPreviewStep: React.FC<DataPreviewStepProps> = ({
  config,
  graphqlEndpoint,
  graphqlHeaders,
  query,
  previewField,
  onBack,
  onNext
}) => {
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<DataPreviewResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFormat, setActiveFormat] = useState<DataPreviewFormat>('csv');

  const configSignature = useMemo(() => JSON.stringify(config ?? {}), [config]);
  const resolvedHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', ...(graphqlHeaders ?? {}) }),
    [graphqlHeaders]
  );

  const previewSupported = useMemo(() => {
    return config?.source_type
      ? SUPPORTED_PREVIEW_FORMATS.includes(config.source_type as DataPreviewFormat)
      : false;
  }, [config?.source_type]);

  const hasConnectionDetails = useMemo(() => {
    if (!config?.source_config) {
      return false;
    }
    return Object.keys(config.source_config).length > 0;
  }, [config?.source_config]);

  const totalPages = useMemo(() => {
    if (!previewData || previewData.totalRows === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(previewData.totalRows / DEFAULT_PAGE_SIZE));
  }, [previewData]);

  const canGoForward = useMemo(() => {
    if (loading) {
      return false;
    }

    if (!previewSupported) {
      return true;
    }

    if (!hasConnectionDetails) {
      return true;
    }

    return Boolean(previewData) || Boolean(error);
  }, [error, hasConnectionDetails, loading, previewData, previewSupported]);

  useEffect(() => {
    const defaultFormat = previewSupported
      ? (config?.source_type as DataPreviewFormat)
      : 'csv';

    setActiveFormat((current) => (current === defaultFormat ? current : defaultFormat));
  }, [config?.source_type, previewSupported]);

  useEffect(() => {
    setPage(0);
  }, [configSignature, activeFormat]);

  useEffect(() => {
    if (!previewSupported || !hasConnectionDetails) {
      setPreviewData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: resolvedHeaders,
          body: JSON.stringify({
            query,
            variables: {
              input: {
                config,
                format: activeFormat,
                pagination: {
                  offset: page * DEFAULT_PAGE_SIZE,
                  limit: DEFAULT_PAGE_SIZE
                }
              }
            }
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`GraphQL request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as GraphQLPreviewResponse;

        if (payload.errors?.length) {
          throw new Error(
            payload.errors
              .map((item) => item.message)
              .filter(Boolean)
              .join('; ') || 'Unable to fetch preview data.'
          );
        }

        const graphData = payload.data ?? {};
        const previewPayload = graphData[previewField] as GraphQLPreviewPayload | undefined;

        const rawRows = (previewPayload?.rows ?? []) as RawPreviewRow[];
        const normalizedRows = normalizePreviewRows(rawRows, previewPayload?.columns ?? undefined);
        const columns = inferPreviewColumns(normalizedRows, previewPayload?.columns ?? undefined);
        const resolvedFormat = (previewPayload?.format?.toLowerCase() as DataPreviewFormat) || activeFormat;

        if (!cancelled) {
          setPreviewData({
            columns,
            rows: normalizedRows,
            totalRows: previewPayload?.totalRows ?? normalizedRows.length,
            format: SUPPORTED_PREVIEW_FORMATS.includes(resolvedFormat) ? resolvedFormat : activeFormat,
            truncated: previewPayload?.truncated ?? false
          });
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        if ((err as Error).name === 'AbortError') {
          return;
        }

        const message = (err as Error).message || 'Failed to load preview data.';
        setError(message);
        setPreviewData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    activeFormat,
    config,
    configSignature,
    graphqlEndpoint,
    resolvedHeaders,
    hasConnectionDetails,
    page,
    previewField,
    previewSupported,
    query,
    refreshKey
  ]);

  if (!previewSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Sample Data Preview</h2>
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Data previews are currently supported for CSV and JSON sources. You can continue to the DPIA
          assessment without previewing this data source.
        </div>
        <div className="mt-6 flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Next: DPIA Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">Sample Data Preview</h2>
      <p className="mb-6 text-sm text-gray-600">
        The wizard requests a small sample via GraphQL so you can validate formatting and column headers before
        continuing.
      </p>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          Source type: <span className="font-medium text-gray-800">{config?.source_type || 'unknown'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Format</span>
          <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
            {SUPPORTED_PREVIEW_FORMATS.map((format) => {
              const disabled = previewSupported && format !== (config?.source_type as DataPreviewFormat);
              return (
                <button
                  key={format}
                  type="button"
                  onClick={() => {
                    if (!disabled) {
                      setActiveFormat(format);
                    }
                  }}
                  className={clsx(
                    'px-3 py-1 text-sm font-medium transition-colors',
                    activeFormat === format
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100',
                    disabled && 'cursor-not-allowed opacity-40'
                  )}
                  disabled={disabled}
                >
                  {format === 'csv' ? 'CSV Preview' : 'JSON Preview'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!hasConnectionDetails && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Provide connection details in the previous step to request a preview. You can still continue to the next
          step if a preview is not required.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="mb-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-500">Loading sample data…</div>
        ) : (
          <DataPreviewTable
            columns={previewData?.columns ?? []}
            rows={previewData?.rows ?? []}
            totalRows={previewData?.totalRows}
            isTruncated={previewData?.truncated}
            emptyMessage={
              hasConnectionDetails
                ? 'No sample rows returned for this data source.'
                : 'Provide connection details to preview data.'
            }
          />
        )}
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-gray-600">
        <div>
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || page === 0}
          >
            Previous page
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              loading || !previewData || previewData.totalRows <= (page + 1) * DEFAULT_PAGE_SIZE
            }
          >
            Next page
          </button>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || !hasConnectionDetails}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className={clsx(
            'flex-1 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600',
            (!canGoForward || loading) && 'cursor-not-allowed opacity-50'
          )}
          disabled={!canGoForward}
        >
          Next: DPIA Assessment
        </button>
      </div>
    </div>
  );
};

// DPIA assessment step
interface DPIAStepProps {
  assessment: Partial<DPIAForm>;
  onChange: (assessment: Partial<DPIAForm>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const DPIAStep: React.FC<DPIAStepProps> = ({
  assessment,
  onChange,
  onNext,
  onBack
}) => {
  const dataCategories = [
    'Personal identifiers',
    'Contact information',
    'Financial data',
    'Health information',
    'Biometric data',
    'Location data',
    'Behavioral data',
    'Professional information'
  ];

  const securityMeasures = [
    'Encryption at rest',
    'Encryption in transit',
    'Access controls',
    'Audit logging',
    'Data anonymization',
    'Regular security assessments',
    'Staff training',
    'Incident response plan'
  ];

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    try {
      DPIAFormSchema.parse(assessment);
      onNext();
    } catch (error) {
      console.error('DPIA validation failed:', error);
    }
  }, [assessment, onNext]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Data Protection Impact Assessment</h2>

      <Form.Root onSubmit={handleSubmit}>
        <Form.Field name="processing_purpose" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Processing Purpose *
          </Form.Label>
          <Form.Control asChild>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              value={assessment.processing_purpose || ''}
              onChange={(e) => onChange({ ...assessment, processing_purpose: e.target.value })}
              placeholder="Describe the purpose and legal basis for processing this data"
            />
          </Form.Control>
        </Form.Field>

        <Form.Field name="data_categories" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Data Categories *
          </Form.Label>
          <div className="space-y-2">
            {dataCategories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox.Root
                  className="w-4 h-4 border border-gray-300 rounded"
                  checked={assessment.data_categories?.includes(category) || false}
                  onCheckedChange={(checked) => {
                    const current = assessment.data_categories || [];
                    const updated = checked
                      ? [...current, category]
                      : current.filter(c => c !== category);
                    onChange({ ...assessment, data_categories: updated });
                  }}
                >
                  <Checkbox.Indicator className="text-blue-500">✓</Checkbox.Indicator>
                </Checkbox.Root>
                <label className="text-sm">{category}</label>
              </div>
            ))}
          </div>
        </Form.Field>

        <Form.Field name="pii_classification" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            PII Risk Classification *
          </Form.Label>
          <Select.Root
            value={assessment.pii_classification || ''}
            onValueChange={(value) => onChange({ ...assessment, pii_classification: value as any })}
          >
            <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <Select.Value placeholder="Select risk level" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Item value="none">
                    <Select.ItemText>None - No PII</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="low">
                    <Select.ItemText>Low - Basic identifiers</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="medium">
                    <Select.ItemText>Medium - Contact info</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="high">
                    <Select.ItemText>High - Financial/health data</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="critical">
                    <Select.ItemText>Critical - Biometric/sensitive</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        <Form.Field name="security_measures" className="mb-4">
          <Form.Label className="block text-sm font-medium mb-2">
            Security Measures *
          </Form.Label>
          <div className="space-y-2">
            {securityMeasures.map((measure) => (
              <div key={measure} className="flex items-center space-x-2">
                <Checkbox.Root
                  className="w-4 h-4 border border-gray-300 rounded"
                  checked={assessment.security_measures?.includes(measure) || false}
                  onCheckedChange={(checked) => {
                    const current = assessment.security_measures || [];
                    const updated = checked
                      ? [...current, measure]
                      : current.filter(m => m !== measure);
                    onChange({ ...assessment, security_measures: updated });
                  }}
                >
                  <Checkbox.Indicator className="text-blue-500">✓</Checkbox.Indicator>
                </Checkbox.Root>
                <label className="text-sm">{measure}</label>
              </div>
            ))}
          </div>
        </Form.Field>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
          >
            Back
          </button>
          <Form.Submit asChild>
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Next: Review & Submit
            </button>
          </Form.Submit>
        </div>
      </Form.Root>
    </div>
  );
};

// Complete wizard component
interface IngestWizardProps {
  graphqlEndpoint?: string;
  graphqlHeaders?: Record<string, string>;
  previewQuery?: string;
  previewField?: string;
  onComplete: (config: DataSourceConfig, dpia: DPIAForm) => void;
  onCancel?: () => void;
}

export const IngestWizard: React.FC<IngestWizardProps> = ({
  graphqlEndpoint = '/graphql',
  graphqlHeaders,
  previewQuery = DEFAULT_PREVIEW_QUERY,
  previewField = 'dataPreview',
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dataSourceConfig, setDataSourceConfig] = useState<Partial<DataSourceConfig>>({});
  const [dpiaAssessment, setDPIAAssessment] = useState<Partial<DPIAForm>>({});

  const steps = ['Data Source', 'Preview Data', 'DPIA Assessment', 'Review'];

  const handleNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleComplete = useCallback(() => {
    try {
      const validConfig = DataSourceConfigSchema.parse(dataSourceConfig);
      const validDPIA = DPIAFormSchema.parse(dpiaAssessment);
      onComplete(validConfig, validDPIA);
    } catch (error) {
      console.error('Final validation failed:', error);
    }
  }, [dataSourceConfig, dpiaAssessment, onComplete]);

  return (
    <div className="min-h-screen bg-gray-50">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={steps.length}
        steps={steps}
      />

      <div className="py-8">
        {currentStep === 0 && (
          <DataSourceStep
            config={dataSourceConfig}
            onChange={setDataSourceConfig}
            onNext={handleNext}
          />
        )}

        {currentStep === 1 && (
          <DataPreviewStep
            config={dataSourceConfig}
            graphqlEndpoint={graphqlEndpoint}
            graphqlHeaders={graphqlHeaders}
            query={previewQuery}
            previewField={previewField}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <DPIAStep
            assessment={dpiaAssessment}
            onChange={setDPIAAssessment}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Review & Submit</h2>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="font-semibold mb-4">Data Source Configuration</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {dataSourceConfig.name}</div>
                <div><strong>Type:</strong> {dataSourceConfig.source_type}</div>
                <div><strong>License:</strong> {dataSourceConfig.license_template}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="font-semibold mb-4">DPIA Assessment</h3>
              <div className="space-y-2 text-sm">
                <div><strong>PII Classification:</strong> {dpiaAssessment.pii_classification}</div>
                <div><strong>Data Categories:</strong> {dpiaAssessment.data_categories?.join(', ')}</div>
                <div><strong>Security Measures:</strong> {dpiaAssessment.security_measures?.length} selected</div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}
      </div>

      {onCancel && (
        <div className="fixed top-4 right-4">
          <button
            onClick={onCancel}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export { DataPreviewTable, formatPreviewValue, normalizePreviewRows, inferPreviewColumns } from './DataPreviewTable';

// Utility functions
export const createLicenseEnforcementClient = (baseUrl: string) => ({
  async checkCompliance(operation: string, dataSourceIds: string[], purpose: string) {
    const response = await fetch(`${baseUrl}/compliance/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation,
        data_source_ids: dataSourceIds,
        purpose
      })
    });
    return response.json();
  }
});

export const createDataSourceRegistration = (baseUrl: string) => ({
  async registerDataSource(config: DataSourceConfig) {
    const response = await fetch(`${baseUrl}/data-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return response.json();
  },

  async submitDPIA(dataSourceId: string, assessment: DPIAForm) {
    const response = await fetch(`${baseUrl}/dpia/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...assessment,
        data_source_id: dataSourceId
      })
    });
    return response.json();
  }
});