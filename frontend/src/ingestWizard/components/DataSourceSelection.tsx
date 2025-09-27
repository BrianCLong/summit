import { useMemo } from 'react';
import { DataSourceConfig, SourceType } from '../types';
import '../styles.css';

export interface DataSourceSelectionProps {
  value: Partial<DataSourceConfig>;
  onChange: (value: Partial<DataSourceConfig>) => void;
  onNext?: () => void;
  disabled?: boolean;
}

const SOURCE_OPTIONS: { label: string; value: SourceType }[] = [
  { label: 'CSV Upload', value: 'csv' },
  { label: 'JSON API', value: 'json' },
  { label: 'Elasticsearch', value: 'elasticsearch' },
  { label: 'ESRI ArcGIS', value: 'esri' },
  { label: 'REST API', value: 'api' }
];

const LICENSE_OPTIONS = [
  { value: 'cc-by-4.0', label: 'Creative Commons Attribution 4.0' },
  { value: 'commercial-restricted', label: 'Commercial License - Export Restricted' },
  { value: 'research-only', label: 'Academic Research Only' },
  { value: 'custom', label: 'Custom License' }
];

const formatGeographicValue = (regions: string[] | undefined) => (regions || []).join(', ');

export const DataSourceSelection = ({ value, onChange, onNext, disabled }: DataSourceSelectionProps) => {
  const isComplete = useMemo(() => {
    return Boolean(value.name && value.source_type && (value.license_template || value.custom_license));
  }, [value.custom_license, value.license_template, value.name, value.source_type]);

  const handleRegionChange = (input: string) => {
    const regions = input
      .split(',')
      .map((region) => region.trim())
      .filter(Boolean);
    onChange({ ...value, geographic_restrictions: regions });
  };

  return (
    <section className="iw-section">
      <header>
        <h2>Data source</h2>
        <p className="description">
          Describe the origin of the dataset and pick the connector template that matches your source.
        </p>
      </header>

      <div className="iw-grid two-column">
        <label className="iw-field">
          <span className="iw-label">Name</span>
          <input
            type="text"
            className="iw-text-input"
            placeholder="e.g. OSINT Leads Feed"
            value={value.name ?? ''}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            disabled={disabled}
            required
          />
        </label>

        <label className="iw-field">
          <span className="iw-label">Source type</span>
          <select
            className="iw-select"
            value={value.source_type ?? ''}
            onChange={(event) => onChange({ ...value, source_type: event.target.value as SourceType })}
            disabled={disabled}
            required
          >
            <option value="" disabled>
              Choose a connector
            </option>
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="iw-field" style={{ gridColumn: '1 / -1' }}>
          <span className="iw-label">Short description</span>
          <textarea
            className="iw-textarea"
            placeholder="Summarize the content, cadence, and any sensitivity of the source"
            value={value.description ?? ''}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            disabled={disabled}
          />
        </label>

        <label className="iw-field">
          <span className="iw-label">License template</span>
          <select
            className="iw-select"
            value={value.license_template ?? ''}
            onChange={(event) => onChange({ ...value, license_template: event.target.value })}
            disabled={disabled}
          >
            <option value="" disabled>
              Choose a template
            </option>
            {LICENSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="iw-field">
          <span className="iw-label">Retention period (days)</span>
          <input
            type="number"
            min={1}
            max={2555}
            className="iw-text-input"
            value={value.retention_period ?? 30}
            onChange={(event) =>
              onChange({ ...value, retention_period: Number.parseInt(event.target.value || '0', 10) })
            }
            disabled={disabled}
          />
        </label>

        <label className="iw-field" style={{ gridColumn: '1 / -1' }}>
          <span className="iw-label">Geographic restrictions</span>
          <input
            type="text"
            className="iw-text-input"
            placeholder="Comma separated, e.g. US, EU, UK"
            value={formatGeographicValue(value.geographic_restrictions)}
            onChange={(event) => handleRegionChange(event.target.value)}
            disabled={disabled}
          />
        </label>

        <label className="iw-checkbox-row" style={{ gridColumn: '1 / -1' }}>
          <input
            type="checkbox"
            checked={Boolean(value.tos_accepted)}
            onChange={(event) => onChange({ ...value, tos_accepted: event.target.checked })}
            disabled={disabled}
          />
          <span>I confirm that the data provider has authorized IntelGraph to ingest and process this dataset.</span>
        </label>
      </div>

      <footer className="iw-actions">
        <button
          type="button"
          className="iw-button iw-button-primary"
          onClick={onNext}
          disabled={disabled || !isComplete}
        >
          Continue to mapping
        </button>
      </footer>
    </section>
  );
};

export default DataSourceSelection;
