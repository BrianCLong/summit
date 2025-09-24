import * as React from 'react';
import type { ChangeEvent } from 'react';
import { analyzeSample, dryRunTransform, checkLicense, fetchMetadata } from '../../services/ingestWizard';
import type {
  AnalyzeResult,
  CanonicalField,
  IngestFormat,
  LicenseResponse,
  PIIFlag,
  TransformSpecField,
  WizardMetadata,
  WizardState,
} from './types';

const STEPS = [
  'Sample preview',
  'Field mapping',
  'PII guard',
  'License & TOS',
  'Dry run',
];

const severityStyles: Record<string, string> = {
  none: 'bg-emerald-100 text-emerald-900',
  moderate: 'bg-amber-100 text-amber-900',
  restricted: 'bg-rose-100 text-rose-900',
};

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-3" aria-label="Ingest wizard steps">
      {STEPS.map((label, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <li key={label} className="flex items-center text-sm font-medium">
            <span
              className={`mr-2 flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                isActive
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : isCompleted
                    ? 'border-indigo-400 bg-indigo-100 text-indigo-800'
                    : 'border-slate-300 bg-white text-slate-500'
              }`}
            >
              {index + 1}
            </span>
            <span className={isActive ? 'text-indigo-700' : 'text-slate-500'}>{label}</span>
            {index !== STEPS.length - 1 && <span className="mx-3 text-slate-300">/</span>}
          </li>
        );
      })}
    </ol>
  );
}

function SamplePreview({ analysis }: { analysis: AnalyzeResult }) {
  const confidencePercent = Math.round(analysis.confidenceScore * 100);
  const requiredCoveragePercent =
    analysis.coverage.required.total === 0
      ? 100
      : Math.round((analysis.coverage.required.satisfied / analysis.coverage.required.total) * 100);
  const overallCoveragePercent =
    analysis.coverage.totalFields === 0
      ? 100
      : Math.round((analysis.coverage.mappedFields / analysis.coverage.totalFields) * 100);
  const averageCompletenessPercent = Math.round(analysis.dataQuality.averageCompleteness * 100);
  const topEmptyFields = analysis.dataQuality.emptyFieldRatios.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800">Sample rows</h3>
        <p className="text-sm text-slate-500">
          {analysis.totalRows} rows detected. Assistant processed the preview in{' '}
          <strong>{analysis.analysisDurationMs}ms</strong> and projects completion in under{' '}
          <strong>{Math.max(analysis.estimatedCompletionMinutes, 3)} minutes</strong> so you stay within the 10 minute SLA.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {Object.keys(analysis.samplePreview[0] ?? {}).map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {analysis.samplePreview.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.keys(analysis.samplePreview[0] ?? {}).map((header) => (
                    <td key={header} className="whitespace-nowrap px-3 py-2 text-sm text-slate-700">
                      {String(row[header] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Average confidence</h4>
          <p className="mt-1 text-xs text-slate-600">Heuristic confidence across detected field mappings.</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 rounded-full bg-white" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${confidencePercent}%` }}
                aria-label={`Average confidence ${confidencePercent}%`}
              />
            </div>
            <span className="text-sm font-semibold text-slate-800">{confidencePercent}%</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Coverage</h4>
          <p className="mt-1 text-xs text-slate-600">
            {analysis.coverage.mappedFields} of {analysis.coverage.totalFields} canonical fields mapped. Required coverage shown
            below.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 rounded-full bg-white">
              <div
                className={`h-2 rounded-full ${
                  requiredCoveragePercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${requiredCoveragePercent}%` }}
                aria-label={`Required coverage ${requiredCoveragePercent}%`}
              />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {analysis.coverage.required.satisfied}/{analysis.coverage.required.total}
            </span>
          </div>
          {analysis.coverage.required.missing.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-600">
              {analysis.coverage.required.missing.map((field) => (
                <li key={field}>{field} missing</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">Overall coverage: {overallCoveragePercent}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Suggestion breakdown</h4>
          <p className="mt-1 text-xs text-slate-600">Confidence tiers across {analysis.fieldAnalyses.length} detected columns.</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs font-medium text-slate-600">
            <div className="rounded bg-white p-2 text-center shadow-sm">
              <dt className="text-[11px] uppercase text-emerald-600">High ≥ 80%</dt>
              <dd className="mt-1 text-base font-semibold text-emerald-700">{analysis.mappingConfidence.high}</dd>
            </div>
            <div className="rounded bg-white p-2 text-center shadow-sm">
              <dt className="text-[11px] uppercase text-amber-600">Medium 60-79%</dt>
              <dd className="mt-1 text-base font-semibold text-amber-700">{analysis.mappingConfidence.medium}</dd>
            </div>
            <div className="rounded bg-white p-2 text-center shadow-sm">
              <dt className="text-[11px] uppercase text-rose-600">Low &lt; 60%</dt>
              <dd className="mt-1 text-base font-semibold text-rose-700">{analysis.mappingConfidence.low}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Data quality</h4>
          <p className="mt-1 text-xs text-slate-600">
            Average completeness <strong>{averageCompletenessPercent}%</strong> across {analysis.dataQuality.rowCount} rows.
          </p>
          {topEmptyFields.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {topEmptyFields.map((entry) => (
                <li key={entry.field}>
                  {entry.field}: {entry.emptyPercentage}% empty values
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No emptiness detected in the preview window.</p>
          )}
        </div>
      </div>
      {analysis.dataQuality.issues.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Quality follow-ups:</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {analysis.dataQuality.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.unmappedSourceFields.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-800">Unmapped source columns</h4>
          <p className="mt-1 text-xs text-slate-600">
            The assistant could not confidently map these columns. Review and assign them in the next step.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {analysis.unmappedSourceFields.map((entry) => (
              <li key={entry.field}>
                <span className="font-semibold text-slate-700">{entry.field}</span>
                <span className="text-slate-500"> — {entry.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {analysis.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Assistant warnings:</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {analysis.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        <strong>Lineage note:</strong> Every field carries provenance showing its source column and planned transforms, visible in
        later steps.
      </div>
    </div>
  );
}

function FieldMappingRow({
  field,
  options,
  value,
  onChange,
  fieldAnalysis,
}: {
  field: CanonicalField;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  fieldAnalysis?: AnalyzeResult['fieldAnalyses'][number];
}) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-3 align-top text-sm font-medium text-slate-800">
        <div>{field.label}</div>
        <div className="text-xs text-slate-500">{field.description}</div>
        {field.required && <span className="mt-1 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-700">Required</span>}
      </td>
      <td className="px-3 py-3 align-top">
        <select
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Map ${field.label}`}
        >
          <option value="">Unmapped</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {fieldAnalysis && (
          <div className="mt-2 text-xs text-slate-500">
            <div>Detected type: {fieldAnalysis.inferredType}</div>
            <div>Sample: {fieldAnalysis.sampleValues.slice(0, 3).join(', ') || 'n/a'}</div>
            {fieldAnalysis.pii && (
              <div className={`mt-2 inline-flex items-center rounded px-2 py-1 text-[11px] font-medium ${severityStyles[fieldAnalysis.pii.severity]}`}>
                {fieldAnalysis.pii.severity.toUpperCase()} PII — {fieldAnalysis.pii.reasons[0]}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-3 align-top text-xs text-slate-500">
        <div className="font-semibold text-slate-700">Lineage</div>
        {fieldAnalysis ? (
          <ul className="mt-1 space-y-1">
            <li>Source column: {fieldAnalysis.lineage.sourceField}</li>
            <li>Transforms: {fieldAnalysis.lineage.transforms.join(', ') || 'none'}</li>
            <li>Policies: {fieldAnalysis.lineage.policyTags.join(', ') || 'none'}</li>
          </ul>
        ) : (
          <div>No lineage yet</div>
        )}
      </td>
    </tr>
  );
}

function PIICard({
  canonicalFieldId,
  fieldLabel,
  flag,
  preset,
  onPresetChange,
  blockedReasons,
}: {
  canonicalFieldId: string;
  fieldLabel: string;
  flag: PIIFlag;
  preset?: string;
  onPresetChange: (preset: string) => void;
  blockedReasons: string[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{fieldLabel}</h4>
          <div className={`mt-1 inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${severityStyles[flag.severity]}`}>
            {flag.severity.toUpperCase()} — {flag.category ?? 'PII'}
          </div>
          <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
            {flag.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {blockedReasons.length > 0 && (
            <div className="mt-2 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
              {blockedReasons.join(' • ')}
            </div>
          )}
        </div>
        <div className="w-48">
          <label className="block text-xs font-medium text-slate-600" htmlFor={`${canonicalFieldId}-preset`}>
            Redaction preset
          </label>
          <select
            id={`${canonicalFieldId}-preset`}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring"
            value={preset ?? ''}
            onChange={(event) => onPresetChange(event.target.value)}
          >
            {!flag.blocked && <option value="none">No redaction</option>}
            {flag.presets.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            {!flag.presets.length && <option value="none">No redaction available</option>}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            {flag.presets.find((option) => option.id === preset)?.description ?? 'Select how to handle this data before ingest.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function DryRunSummary({
  fields,
  previewRows,
}: {
  fields: TransformSpecField[];
  previewRows: Record<string, unknown>[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-800">Transform spec</h3>
        <div className="mt-3 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Canonical field</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Source column</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">PII handling</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Lineage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field) => (
                <tr key={field.canonicalField}>
                  <td className="px-3 py-2 font-medium text-slate-800">{field.canonicalField}</td>
                  <td className="px-3 py-2 text-slate-600">{field.sourceField}</td>
                  <td className="px-3 py-2 text-slate-600">{field.type}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {field.pii ? `${field.pii.severity} → ${field.pii.redaction ?? 'none'}` : 'None'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    <div>Source: {field.lineage.sourceField}</div>
                    <div>Transforms: {field.lineage.transforms.join(', ') || 'none'}</div>
                    <div>Policies: {field.lineage.policyTags.join(', ') || 'none'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-800">Dry-run preview</h3>
        <div className="mt-3 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                {Object.keys(previewRows[0] ?? {}).map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-semibold text-slate-600">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row, index) => (
                <tr key={index}>
                  {Object.keys(previewRows[0] ?? {}).map((header) => (
                    <td key={header} className="px-3 py-2 text-slate-600">
                      {typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function IngestWizard() {
  const [wizardState, setWizardState] = React.useState<WizardState>({
    format: 'csv',
    entityId: 'person',
    mappings: {},
    piiDecisions: {},
    acceptedTerms: false,
  });
  const [currentStep, setCurrentStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [licenseStatus, setLicenseStatus] = React.useState<LicenseResponse | null>(null);
  const [metadata, setMetadata] = React.useState<WizardMetadata | null>(null);
  const [metadataError, setMetadataError] = React.useState<string | null>(null);
  const [sampleMode, setSampleMode] = React.useState<'upload' | 'paste'>('upload');
  const [manualSample, setManualSample] = React.useState('');
  const [manualFormat, setManualFormat] = React.useState<IngestFormat>('csv');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const blockedFields = React.useMemo(
    () => wizardState.analysis?.fieldAnalyses.filter((field) => field.blocked) ?? [],
    [wizardState.analysis],
  );

  const mappedFields = React.useMemo(() => {
    if (!wizardState.analysis) return [] as Array<{ canonicalId: string; label: string; flag: PIIFlag; blockedReasons: string[] }>;
    return Object.entries(wizardState.mappings)
      .map(([canonicalId, sourceField]) => {
        const analysis = wizardState.analysis?.fieldAnalyses.find((field) => field.sourceField === sourceField);
        if (!analysis?.pii) return null;
        return {
          canonicalId,
          label: wizardState.analysis?.entity.fields.find((field) => field.id === canonicalId)?.label ?? canonicalId,
          flag: analysis.pii,
          blockedReasons: analysis.blockedReasons,
        };
      })
      .filter(Boolean) as Array<{ canonicalId: string; label: string; flag: PIIFlag; blockedReasons: string[] }>;
  }, [wizardState.analysis, wizardState.mappings]);

  const availableLicenses = React.useMemo(
    () => wizardState.analysis?.licenses ?? metadata?.licenses ?? [],
    [wizardState.analysis, metadata],
  );

  const duplicateSourceMappings = React.useMemo(
    () => {
      const counts = new Map<string, string[]>();
      for (const [canonicalId, sourceField] of Object.entries(wizardState.mappings)) {
        if (!sourceField) continue;
        const existing = counts.get(sourceField) ?? [];
        existing.push(canonicalId);
        counts.set(sourceField, existing);
      }
      return Array.from(counts.entries())
        .filter(([, canonicalIds]) => canonicalIds.length > 1)
        .map(([sourceField, canonicalIds]) => ({ sourceField, canonicalIds }));
    },
    [wizardState.mappings],
  );

  const suggestionsDiffer = React.useMemo(() => {
    if (!wizardState.analysis) return false;
    const suggestions = wizardState.analysis.suggestedMappings;
    const keys = new Set([...Object.keys(suggestions), ...Object.keys(wizardState.mappings)]);
    for (const key of keys) {
      if ((wizardState.mappings[key] ?? '') !== (suggestions[key] ?? '')) {
        return true;
      }
    }
    return false;
  }, [wizardState.analysis, wizardState.mappings]);

  const lowConfidenceMappings = React.useMemo(() => {
    if (!wizardState.analysis) return [] as Array<{
      canonicalId: string;
      label: string;
      sourceField: string;
      confidence: number;
    }>;
    return wizardState.analysis.entity.fields
      .map((field) => {
        const sourceField = wizardState.mappings[field.id];
        if (!sourceField) return null;
        const analysis = wizardState.analysis?.fieldAnalyses.find(
          (candidate) => candidate.sourceField === sourceField,
        );
        if (!analysis || analysis.confidence >= 0.6) return null;
        return {
          canonicalId: field.id,
          label: field.label,
          sourceField,
          confidence: analysis.confidence,
        };
      })
      .filter(Boolean) as Array<{ canonicalId: string; label: string; sourceField: string; confidence: number }>;
  }, [wizardState.analysis, wizardState.mappings]);

  const hasRedactionSuggestions = React.useMemo(
    () => mappedFields.some((entry) => entry.flag.presets.length > 0),
    [mappedFields],
  );

  const manualSampleOutdated =
    sampleMode === 'paste' &&
    wizardState.analysis &&
    typeof wizardState.sample === 'string' &&
    wizardState.sample !== manualSample;
  const sampleControlId = sampleMode === 'upload' ? 'ingest-sample-upload' : 'ingest-sample-manual';

  const overallCoveragePercent = wizardState.analysis
    ? wizardState.analysis.coverage.totalFields === 0
      ? 100
      : Math.round((wizardState.analysis.coverage.mappedFields / wizardState.analysis.coverage.totalFields) * 100)
    : 0;
  const requiredCoveragePercent = wizardState.analysis
    ? wizardState.analysis.coverage.required.total === 0
      ? 100
      : Math.round(
          (wizardState.analysis.coverage.required.satisfied / wizardState.analysis.coverage.required.total) * 100,
        )
    : 0;
  const confidencePercent = wizardState.analysis
    ? Math.round(wizardState.analysis.confidenceScore * 100)
    : 0;
  const hasSampleInput =
    sampleMode === 'paste'
      ? manualSample.trim().length > 0
      : Boolean(wizardState.sample);

  const selectedEntity = React.useMemo(() => {
    const entityFromMetadata = metadata?.entities.find((entity) => entity.id === wizardState.entityId);
    if (entityFromMetadata) {
      return entityFromMetadata;
    }
    if (wizardState.analysis) {
      return {
        id: wizardState.analysis.entity.id,
        label: wizardState.analysis.entity.label,
        description: wizardState.analysis.entity.description,
        requiredFields: wizardState.analysis.entity.fields.filter((field) => field.required).map((field) => field.id),
      };
    }
    return null;
  }, [metadata, wizardState.analysis, wizardState.entityId]);

  const entityOptions = React.useMemo(() => {
    if (metadata?.entities?.length) {
      return metadata.entities;
    }
    if (wizardState.analysis) {
      return [
        {
          id: wizardState.analysis.entity.id,
          label: wizardState.analysis.entity.label,
          description: wizardState.analysis.entity.description,
          requiredFields: wizardState.analysis.entity.fields
            .filter((field) => field.required)
            .map((field) => field.id),
        },
      ];
    }
    return [];
  }, [metadata, wizardState.analysis]);

  const computeDecisions = React.useCallback(
    (analysis: AnalyzeResult, mappings: Record<string, string>, previous: WizardState['piiDecisions']) => {
      const next: WizardState['piiDecisions'] = {};
      for (const [canonicalId, sourceField] of Object.entries(mappings)) {
        const field = analysis.fieldAnalyses.find((candidate) => candidate.sourceField === sourceField);
        if (field?.pii) {
          const existing = previous[canonicalId]?.preset;
          const recommendedPreset = field.pii.blocked
            ? field.pii.presets.find((option) => option.id === 'drop')?.id ?? field.pii.presets[0]?.id ?? 'none'
            : field.pii.presets[0]?.id ?? 'none';
          const fallback = existing ?? recommendedPreset ?? 'none';
          next[canonicalId] = { preset: fallback };
        }
      }
      return next;
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    fetchMetadata()
      .then((response) => {
        if (cancelled) return;
        setMetadata(response);
        setMetadataError(null);
        if (response.entities.length > 0) {
          setWizardState((prev) => {
            const exists = response.entities.some((entity) => entity.id === prev.entityId);
            return exists
              ? prev
              : {
                  ...prev,
                  entityId: response.entities[0].id,
                };
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMetadataError(err instanceof Error ? err.message : 'Failed to load ingest metadata.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSampleModeChange = (mode: 'upload' | 'paste') => {
    if (mode === sampleMode) {
      return;
    }
    if (mode === 'paste') {
      setManualSample('');
      setManualFormat('csv');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setSampleMode(mode);
    setError(null);
    setWizardState((prev) => ({
      ...prev,
      format: mode === 'paste' ? 'csv' : prev.format,
      sample: undefined,
      analysis: undefined,
      mappings: {},
      piiDecisions: {},
      transformSpec: undefined,
      dryRun: undefined,
      licenseId: undefined,
      acceptedTerms: false,
      sampleName: undefined,
      sampleSource: mode,
    }));
    setLicenseStatus(null);
    setCurrentStep(0);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const contents = reader.result?.toString() ?? '';
      const derivedFormat: IngestFormat = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
      setSampleMode('upload');
      setManualSample('');
      setManualFormat('csv');
      setWizardState((prev) => ({
        ...prev,
        sample: contents,
        format: derivedFormat,
        analysis: undefined,
        mappings: {},
        piiDecisions: {},
        transformSpec: undefined,
        dryRun: undefined,
        licenseId: undefined,
        acceptedTerms: false,
        sampleName: file.name,
        sampleSource: 'upload',
      }));
      setLicenseStatus(null);
      setCurrentStep(0);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleEntityChange = (entityId: string) => {
    setWizardState((prev) => ({
      ...prev,
      entityId,
      analysis: undefined,
      sample: undefined,
      mappings: {},
      piiDecisions: {},
      transformSpec: undefined,
      dryRun: undefined,
      licenseId: undefined,
      acceptedTerms: false,
      sampleName: undefined,
      sampleSource: undefined,
    }));
    setLicenseStatus(null);
    setCurrentStep(0);
    setError(null);
    setSampleMode('upload');
    setManualSample('');
    setManualFormat('csv');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    const usingManual = sampleMode === 'paste';
    const rawSample = usingManual ? manualSample : wizardState.sample;
    const format = usingManual ? manualFormat : wizardState.format;

    if (!rawSample || (typeof rawSample === 'string' && rawSample.trim().length === 0)) {
      setError('Upload or paste a CSV or JSON sample to begin.');
      return;
    }

    if (usingManual && format === 'json' && typeof rawSample === 'string') {
      try {
        const parsed = JSON.parse(rawSample);
        if (!Array.isArray(parsed)) {
          setError('Manual JSON sample must be an array of objects.');
          return;
        }
      } catch (_error) {
        setError('Manual JSON sample must be valid JSON.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeSample({
        sample: rawSample as string | Record<string, unknown>[],
        format,
        entityId: wizardState.entityId,
      });
      setWizardState((prev) => ({
        ...prev,
        sample: rawSample as string | Record<string, unknown>[],
        format,
        analysis,
        mappings: analysis.suggestedMappings,
        piiDecisions: computeDecisions(analysis, analysis.suggestedMappings, prev.piiDecisions),
        transformSpec: undefined,
        dryRun: undefined,
        licenseId: undefined,
        acceptedTerms: false,
        sampleName: usingManual ? `Manual ${format.toUpperCase()} sample` : prev.sampleName,
        sampleSource: usingManual ? 'paste' : 'upload',
      }));
      setLicenseStatus(null);
      setCurrentStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sample.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (canonicalId: string, sourceField: string) => {
    if (!wizardState.analysis) return;
    setWizardState((prev) => {
      const nextMappings = { ...prev.mappings };
      if (sourceField) {
        for (const [key, value] of Object.entries(nextMappings)) {
          if (key !== canonicalId && value === sourceField) {
            delete nextMappings[key];
          }
        }
        nextMappings[canonicalId] = sourceField;
      } else {
        delete nextMappings[canonicalId];
      }
      return {
        ...prev,
        mappings: nextMappings,
        piiDecisions: computeDecisions(prev.analysis!, nextMappings, prev.piiDecisions),
      };
    });
  };

  const handleApplySuggestions = () => {
    setWizardState((prev) => {
      if (!prev.analysis) {
        return prev;
      }
      const suggested = prev.analysis.suggestedMappings;
      return {
        ...prev,
        mappings: { ...suggested },
        piiDecisions: computeDecisions(prev.analysis, suggested, prev.piiDecisions),
      };
    });
    setError(null);
  };

  const handleClearMappings = () => {
    setWizardState((prev) => ({
      ...prev,
      mappings: {},
      piiDecisions: {},
    }));
    setError(null);
  };

  const handleApplyRedactionPresets = () => {
    setWizardState((prev) => {
      if (!prev.analysis) {
        return prev;
      }
      const nextDecisions = { ...prev.piiDecisions };
      for (const [canonicalId, sourceField] of Object.entries(prev.mappings)) {
        if (!sourceField) continue;
        const analysis = prev.analysis.fieldAnalyses.find((field) => field.sourceField === sourceField);
        if (!analysis?.pii) continue;
        const preset = analysis.pii.blocked
          ? analysis.pii.presets.find((option) => option.id === 'drop')?.id ?? analysis.pii.presets[0]?.id ?? 'none'
          : analysis.pii.presets.find((option) => option.id !== 'drop')?.id ?? analysis.pii.presets[0]?.id ?? 'none';
        if (preset && preset !== 'none') {
          nextDecisions[canonicalId] = { preset };
        }
      }
      return { ...prev, piiDecisions: nextDecisions };
    });
    setError(null);
  };

  const handlePIIPresetChange = (canonicalId: string, preset: string) => {
    setWizardState((prev) => ({
      ...prev,
      piiDecisions: { ...prev.piiDecisions, [canonicalId]: { preset } },
    }));
  };

  const handleLicenseChange = (licenseId: string) => {
    setWizardState((prev) => ({ ...prev, licenseId }));
    setLicenseStatus(null);
  };

  const handleTermsToggle = (accepted: boolean) => {
    setWizardState((prev) => ({ ...prev, acceptedTerms: accepted }));
  };

  const handleReset = () => {
    setWizardState((prev) => ({
      format: 'csv',
      entityId: prev.entityId,
      sample: undefined,
      analysis: undefined,
      mappings: {},
      piiDecisions: {},
      licenseId: undefined,
      acceptedTerms: false,
      transformSpec: undefined,
      dryRun: undefined,
      sampleName: undefined,
      sampleSource: undefined,
    }));
    setManualSample('');
    setManualFormat('csv');
    setSampleMode('upload');
    setLicenseStatus(null);
    setError(null);
    setCurrentStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canProceedFromStep = async (stepIndex: number): Promise<boolean> => {
    if (manualSampleOutdated) {
      setError('Manual sample changed. Re-run the analysis to refresh results.');
      return false;
    }
    if (stepIndex === 0) {
      if (!wizardState.analysis) {
        setError('Run the analysis before proceeding.');
        return false;
      }
    }
    if (stepIndex === 1) {
      const missingRequired = wizardState.analysis?.entity.fields
        .filter((field) => field.required)
        .filter((field) => !wizardState.mappings[field.id]) ?? [];
      if (missingRequired.length > 0) {
        setError(`Map all required fields. Missing: ${missingRequired.map((field) => field.label).join(', ')}`);
        return false;
      }
    }
    if (stepIndex === 2) {
      const blockedWithoutPreset = mappedFields.filter((entry) => {
        if (!entry.flag.blocked) {
          return false;
        }
        const preset = wizardState.piiDecisions[entry.canonicalId]?.preset;
        return !preset || preset === 'none';
      });
      if (blockedWithoutPreset.length > 0) {
        setError('Choose a redaction preset for each blocked field before continuing.');
        return false;
      }
    }
    if (stepIndex === 3) {
      if (!wizardState.licenseId) {
        setError('Select a license before continuing.');
        return false;
      }
      if (!wizardState.acceptedTerms) {
        setError('Accept the license terms to continue.');
        return false;
      }
      setLoading(true);
      setError(null);
      try {
        const evaluation = await checkLicense({
          licenseId: wizardState.licenseId,
          accepted: wizardState.acceptedTerms,
          piiFlags: wizardState.analysis?.piiFlags ?? [],
        });
        setLicenseStatus(evaluation);
        if (!evaluation.allowed) {
          setError(evaluation.issues?.join(' ') ?? 'License policy blocked this ingest.');
          return false;
        }
        const dryRun = await dryRunTransform({
          sample: wizardState.sample!,
          format: wizardState.format,
          entityId: wizardState.entityId,
          mappings: wizardState.mappings,
          piiDecisions: wizardState.piiDecisions,
          licenseId: wizardState.licenseId,
        });
        setWizardState((prev) => ({ ...prev, transformSpec: dryRun.spec, dryRun }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to validate license.');
        return false;
      } finally {
        setLoading(false);
      }
    }
    return true;
  };

  const handleNext = async () => {
    const allowed = await canProceedFromStep(currentStep);
    if (!allowed) return;
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleDownloadSpec = () => {
    if (!wizardState.transformSpec) {
      return;
    }
    if (typeof window.URL?.createObjectURL !== 'function') {
      console.warn('Unable to download transform spec: createObjectURL missing in this environment.');
      return;
    }
    const blob = new Blob([JSON.stringify(wizardState.transformSpec, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `transform-spec-${wizardState.transformSpec.entity}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 0);
  };

  const renderStep = () => {
    if (!wizardState.analysis && currentStep > 0) {
      return <p className="text-sm text-slate-500">Upload and analyze a sample to continue.</p>;
    }

    switch (currentStep) {
      case 0:
        return wizardState.analysis ? (
          <SamplePreview analysis={wizardState.analysis} />
        ) : (
          <div className="space-y-3">
            <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Upload or paste a CSV or JSON sample. The assistant inspects the first 200 rows to propose mappings and policy guardrails.
            </p>
            {selectedEntity && (
              <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Target entity: <strong className="text-slate-800">{selectedEntity.label}</strong>. Required fields:{' '}
                {selectedEntity.requiredFields.length > 0
                  ? selectedEntity.requiredFields.join(', ')
                  : 'None'}.
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            {wizardState.analysis && (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <h4 className="text-sm font-semibold text-slate-800">Mapping progress</h4>
                  <p className="mt-1">
                    {Object.keys(wizardState.mappings).length} of {wizardState.analysis.entity.fields.length} canonical fields
                    mapped.
                  </p>
                  <p className="mt-1">
                    Required coverage {wizardState.analysis.coverage.required.satisfied}/
                    {wizardState.analysis.coverage.required.total} satisfied.
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <h4 className="text-sm font-semibold text-slate-800">Confidence watchlist</h4>
                  {lowConfidenceMappings.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {lowConfidenceMappings.map((entry) => (
                        <li key={entry.canonicalId}>
                          {entry.label} → {entry.sourceField} ({Math.round(entry.confidence * 100)}% confidence)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1">All mapped fields meet the 60% confidence threshold.</p>
                  )}
                </div>
              </div>
            )}
            {wizardState.analysis?.warnings.length ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong className="font-semibold">Assistant warnings:</strong>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {wizardState.analysis.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {duplicateSourceMappings.length > 0 && (
              <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <strong className="font-semibold">Duplicate source mappings detected:</strong>{' '}
                {duplicateSourceMappings
                  .map((duplicate) => `${duplicate.sourceField} → ${duplicate.canonicalIds.join(', ')}`)
                  .join(' • ')}.
                The most recent selection is kept.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplySuggestions}
                disabled={!suggestionsDiffer}
                className="inline-flex items-center rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reapply assistant suggestions
              </button>
              <button
                type="button"
                onClick={handleClearMappings}
                disabled={Object.keys(wizardState.mappings).length === 0}
                className="inline-flex items-center rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear current mappings
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Canonical field</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source column</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lineage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wizardState.analysis?.entity.fields.map((field) => (
                    <FieldMappingRow
                      key={field.id}
                      field={field}
                      options={wizardState.analysis?.fieldAnalyses.map((candidate) => candidate.sourceField) ?? []}
                      value={wizardState.mappings[field.id]}
                      onChange={(value) => handleMappingChange(field.id, value)}
                      fieldAnalysis={wizardState.analysis?.fieldAnalyses.find(
                        (candidate) => candidate.sourceField === wizardState.mappings[field.id],
                      )}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {wizardState.analysis?.requiredFieldIssues.length ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong className="font-semibold">Missing required fields:</strong>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {wizardState.analysis.requiredFieldIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      case 2:
        return mappedFields.length > 0 ? (
          <div className="space-y-4">
            {hasRedactionSuggestions && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApplyRedactionPresets}
                  className="inline-flex items-center rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Apply recommended redactions
                </button>
              </div>
            )}
            {mappedFields.map((entry) => (
              <PIICard
                key={entry.canonicalId}
                canonicalFieldId={entry.canonicalId}
                fieldLabel={entry.label}
                flag={entry.flag}
                preset={wizardState.piiDecisions[entry.canonicalId]?.preset}
                onPresetChange={(preset) => handlePIIPresetChange(entry.canonicalId, preset)}
                blockedReasons={entry.blockedReasons}
              />
            ))}
            {blockedFields.length > 0 && (
              <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <strong>Policy reminder:</strong> The following source fields require redaction before ingest:{' '}
                {blockedFields.map((field) => field.sourceField).join(', ')}.
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No mapped columns carry PII.</p>
        );
      case 3:
        return (
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-800">Select a license</legend>
              {availableLicenses.length === 0 ? (
                <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Licenses will become available after the assistant inspects your sample.
                </p>
              ) : (
                availableLicenses.map((license) => (
                  <label key={license.id} className="flex cursor-pointer items-start gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm">
                    <input
                      type="radio"
                      name="license"
                      value={license.id}
                      className="mt-1"
                      checked={wizardState.licenseId === license.id}
                      onChange={() => handleLicenseChange(license.id)}
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{license.label}</div>
                      <div className="text-xs text-slate-500">{license.notes}</div>
                    </div>
                  </label>
                ))
              )}
            </fieldset>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={wizardState.acceptedTerms}
                onChange={(event) => handleTermsToggle(event.target.checked)}
              />
              I confirm the license terms and certify the ingest complies with policy.
            </label>
            {licenseStatus?.issues && licenseStatus.issues.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {licenseStatus.issues.join(' ')}
              </div>
            )}
            {licenseStatus?.allowed && licenseStatus.license && (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                License <strong>{licenseStatus.license.label}</strong> approved. Restricted PII is permitted with configured presets.
              </div>
            )}
          </div>
        );
      case 4:
        return wizardState.dryRun && wizardState.transformSpec ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Dry-run complete</h3>
                <p className="text-sm text-slate-600">
                  License context: {wizardState.transformSpec.policies.license ?? 'Not provided'} · Required field issues:{' '}
                  {wizardState.transformSpec.notes.requiredFieldIssues.length || '0'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSpec}
                className="inline-flex items-center justify-center rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900"
              >
                Download transform spec
              </button>
            </div>
            <DryRunSummary fields={wizardState.dryRun.spec.fields} previewRows={wizardState.dryRun.previewRows} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Run the dry-run to see the transform spec and lineage.</p>
        );
      default:
        return null;
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6" aria-live="polite">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow">
        <h2 className="text-2xl font-semibold text-slate-800">Ingest wizard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Map CSV or JSON data to canonical entities, flag PII, and produce a transform spec with lineage in under ten minutes.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_auto_auto] md:items-end">
          <label className="flex flex-col text-sm text-slate-700">
            <span className="font-medium">Canonical entity</span>
            <select
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
              value={wizardState.entityId}
              onChange={(event) => handleEntityChange(event.target.value)}
              disabled={loading || entityOptions.length === 0}
            >
              {entityOptions.length === 0 ? (
                <option value={wizardState.entityId}>Loading…</option>
              ) : (
                entityOptions.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))
              )}
            </select>
            {selectedEntity && (
              <p className="mt-2 text-xs text-slate-500">
                {selectedEntity.description} · Required fields:{' '}
                {selectedEntity.requiredFields.length > 0
                  ? selectedEntity.requiredFields.join(', ')
                  : 'None'}
              </p>
            )}
          </label>
          <div className="flex flex-col text-sm text-slate-700">
            <label className="font-medium" htmlFor={sampleControlId}>
              Upload or paste sample
            </label>
            <div className="mt-2 inline-flex w-full gap-2 rounded border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                className={`flex-1 rounded px-2 py-1 transition-colors focus:outline-none focus:ring focus:ring-indigo-100 ${
                  sampleMode === 'upload' ? 'bg-white text-slate-800 shadow' : 'hover:bg-white/70'
                }`}
                onClick={() => handleSampleModeChange('upload')}
                aria-pressed={sampleMode === 'upload'}
              >
                Upload file
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-2 py-1 transition-colors focus:outline-none focus:ring focus:ring-indigo-100 ${
                  sampleMode === 'paste' ? 'bg-white text-slate-800 shadow' : 'hover:bg-white/70'
                }`}
                onClick={() => handleSampleModeChange('paste')}
                aria-pressed={sampleMode === 'paste'}
              >
                Paste sample
              </button>
            </div>
            {sampleMode === 'upload' ? (
              <>
                <input
                  id={sampleControlId}
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  aria-describedby="ingest-sample-help"
                  className="mt-2 block w-full cursor-pointer rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
                />
                <span id="ingest-sample-help" className="mt-2 text-xs text-slate-500">
                  CSV/JSON up to 2MB · Assistant samples the first 200 rows.
                </span>
              </>
            ) : (
              <>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-xs text-slate-600" htmlFor="manual-format">
                    Format
                    <select
                      id="manual-format"
                      className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring"
                      value={manualFormat}
                      onChange={(event) => setManualFormat(event.target.value as IngestFormat)}
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </label>
                  <span className="text-xs text-slate-500">Paste a representative sample for quick inference.</span>
                </div>
                <textarea
                  id={sampleControlId}
                  className="mt-2 h-32 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring"
                  placeholder={
                    manualFormat === 'json'
                      ? '[{"full_name":"Alice Doe"}]'
                      : 'full_name,email\\nAlice Doe,alice@example.com'
                  }
                  value={manualSample}
                  onChange={(event) => setManualSample(event.target.value)}
                />
              </>
            )}
            {wizardState.sampleName && (
              <span className="mt-2 text-xs text-slate-500">
                Loaded {wizardState.sampleSource === 'paste' ? 'manual sample' : 'file'}:{' '}
                <span className="font-semibold text-slate-700">{wizardState.sampleName}</span>
              </span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !hasSampleInput}
              className="inline-flex h-10 w-full items-center justify-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Analyzing…' : 'Analyze sample'}
            </button>
            {manualSampleOutdated && (
              <span className="text-xs text-amber-600">Manual sample changed. Re-run analysis.</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset wizard
          </button>
        </div>
        {metadataError && (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{metadataError}</p>
        )}
        {wizardState.analysis && (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rows detected</dt>
              <dd className="text-lg font-semibold text-slate-800">{wizardState.analysis.totalRows}</dd>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated completion</dt>
              <dd className="text-lg font-semibold text-slate-800">
                ≈ {wizardState.analysis.estimatedCompletionMinutes} minutes
              </dd>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flagged PII columns</dt>
              <dd className="text-lg font-semibold text-slate-800">
                {wizardState.analysis.piiFlags.length}
              </dd>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mapping coverage</dt>
              <dd className="text-lg font-semibold text-slate-800">
                {overallCoveragePercent}% ({wizardState.analysis.coverage.mappedFields}/
                {wizardState.analysis.coverage.totalFields})
              </dd>
              <dd className="mt-1 text-xs text-slate-500">
                Required: {requiredCoveragePercent}% ({wizardState.analysis.coverage.required.satisfied}/
                {wizardState.analysis.coverage.required.total})
              </dd>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence</dt>
              <dd className="text-lg font-semibold text-slate-800">{confidencePercent}%</dd>
              <dd className="mt-1 text-xs text-slate-500">Average heuristic mapping confidence.</dd>
            </div>
          </dl>
        )}
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow">
        <StepIndicator currentStep={currentStep} />
        {error && <div className="mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>}
        {renderStep()}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="inline-flex items-center rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentStep === STEPS.length - 1 || loading}
            className="inline-flex items-center rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {currentStep === STEPS.length - 1 ? 'Complete' : 'Continue'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default IngestWizard;
