import { DataSourceConfig, SchemaMappingState, ValidationState } from '../types';
import '../styles.css';

export interface ValidationStepProps {
  dataSource: Partial<DataSourceConfig>;
  schemaMapping: SchemaMappingState;
  validation: ValidationState;
  onRunValidation?: () => void;
  onBack?: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
}

export const ValidationStep = ({
  dataSource,
  schemaMapping,
  validation,
  onRunValidation,
  onBack,
  onSubmit,
  disabled
}: ValidationStepProps) => {
  const hasBlockingIssues = validation.issues.some((issue) => issue.severity === 'error');

  return (
    <section className="iw-section">
      <header>
        <h2>Validation &amp; review</h2>
        <p className="description">
          Run automated checks to confirm licensing, schema alignment, and privacy posture before activating the connector.
        </p>
      </header>

      <div style={{ display: 'grid', gap: '16px' }}>
        <section className="iw-validation-card">
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#829ab1', letterSpacing: '0.08em', margin: 0 }}>
            Summary
          </h3>
          <dl className="iw-summary-grid">
            <div>
              <dt>Data source</dt>
              <dd>{dataSource.name ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Connector type</dt>
              <dd>{dataSource.source_type ?? 'Not selected'}</dd>
            </div>
            <div>
              <dt>Mapped fields</dt>
              <dd>{schemaMapping.mappings.length}</dd>
            </div>
            <div>
              <dt>Retention</dt>
              <dd>{dataSource.retention_period ? `${dataSource.retention_period} days` : 'Default (30 days)'}</dd>
            </div>
          </dl>
        </section>

        <section className="iw-validation-card">
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#829ab1', letterSpacing: '0.08em' }}>
              Automated checks
            </h3>
            <button
              type="button"
              className="iw-button iw-button-primary"
              onClick={onRunValidation}
              disabled={disabled}
            >
              Run validation
            </button>
          </header>

          <div className="iw-validation-issues">
            {validation.issues.length === 0 && (
              <p style={{ color: '#61748f', fontSize: '0.9rem' }}>
                No issues detected yet. Trigger a validation run to populate automated checks.
              </p>
            )}

            {validation.issues.map((issue) => (
              <article key={issue.id} className={`iw-issue ${issue.severity}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontWeight: 600, textTransform: 'capitalize' }}>{issue.severity}</h4>
                  {issue.field && (
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{issue.field}</span>
                  )}
                </div>
                <p style={{ margin: 0 }}>{issue.message}</p>
                {issue.suggestion && (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#486581' }}>Suggested fix: {issue.suggestion}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="iw-actions" style={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          className="iw-button iw-button-secondary"
          onClick={onBack}
          disabled={disabled}
        >
          Back to mapping
        </button>

        <button
          type="button"
          className="iw-button iw-button-primary"
          onClick={onSubmit}
          disabled={disabled || hasBlockingIssues}
        >
          Activate connector
        </button>
      </footer>
    </section>
  );
};

export default ValidationStep;
