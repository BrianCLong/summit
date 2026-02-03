/**
 * Data Integrity UI Components
 *
 * Visual indicators for data provenance, confidence, and simulation mode
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 */

import React, { useState } from 'react';
import {
  DataEnvelope,
  DataClassification,
  getConfidenceLevel,
  getClassificationColor,
  formatProvenance,
  isAIGenerated,
} from '../utils/data-envelope-validator';

/**
 * Props for confidence indicator
 */
export interface ConfidenceIndicatorProps {
  confidence?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

/**
 * AI Confidence Indicator Component
 */
export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  size = 'medium',
  showLabel = true,
}) => {
  if (confidence === undefined || confidence === null) {
    return null;
  }

  const level = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);

  const colors = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
    none: '#6b7280',
  };

  const sizeClasses = {
    small: 'w-16 h-2',
    medium: 'w-24 h-3',
    large: 'w-32 h-4',
  };

  return (
    <div className="confidence-indicator" data-testid="confidence-indicator">
      {showLabel && (
        <div className="text-xs text-gray-600 mb-1">
          AI Confidence: {percentage}% ({level})
        </div>
      )}
      <div className={`bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: colors[level],
          }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
};

/**
 * Props for simulation badge
 */
export interface SimulationBadgeProps {
  isSimulated: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Simulation Mode Badge Component
 */
export const SimulationBadge: React.FC<SimulationBadgeProps> = ({
  isSimulated,
  size = 'medium',
}) => {
  if (!isSimulated) {
    return null;
  }

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-1.5',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 font-semibold border-2 border-yellow-400 ${sizeClasses[size]}`}
      data-testid="simulation-badge"
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      SIMULATED DATA
    </div>
  );
};

/**
 * Props for classification badge
 */
export interface ClassificationBadgeProps {
  classification: DataClassification;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Data Classification Badge Component
 */
export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification,
  size = 'medium',
}) => {
  const color = getClassificationColor(classification);

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-1.5',
  };

  return (
    <div
      className={`inline-flex items-center rounded font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      data-testid="classification-badge"
    >
      {classification}
    </div>
  );
};

/**
 * Props for provenance display
 */
export interface ProvenanceDisplayProps {
  envelope: DataEnvelope;
  expandable?: boolean;
}

/**
 * Provenance Display Component
 */
export const ProvenanceDisplay: React.FC<ProvenanceDisplayProps> = ({
  envelope,
  expandable = true,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="provenance-display border border-gray-300 rounded-lg p-3 bg-gray-50"
      data-testid="provenance-display"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-700">Data Provenance</div>
          <div className="text-xs text-gray-600 mt-1">
            {formatProvenance(envelope.provenance)}
          </div>
        </div>
        {expandable && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 text-sm hover:text-blue-800"
            aria-expanded={expanded}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs">
          <div>
            <span className="font-semibold">Provenance ID:</span>{' '}
            <code className="bg-gray-200 px-1 rounded">{envelope.provenance.provenanceId}</code>
          </div>

          <div>
            <span className="font-semibold">Source:</span> {envelope.provenance.source}
          </div>

          {envelope.provenance.version && (
            <div>
              <span className="font-semibold">Version:</span> {envelope.provenance.version}
            </div>
          )}

          <div>
            <span className="font-semibold">Data Hash:</span>{' '}
            <code className="bg-gray-200 px-1 rounded text-xs break-all">
              {envelope.dataHash.substring(0, 16)}...
            </code>
          </div>

          {envelope.provenance.lineage.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Lineage Chain:</div>
              <div className="space-y-1 pl-3 border-l-2 border-blue-300">
                {envelope.provenance.lineage.map((node, index) => (
                  <div key={node.id} className="text-xs">
                    <span className="text-gray-500">#{index + 1}</span> {node.operation}
                    <span className="text-gray-500 ml-2">
                      {new Date(node.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Props for data envelope card
 */
export interface DataEnvelopeCardProps {
  envelope: DataEnvelope;
  children?: React.ReactNode;
  showProvenance?: boolean;
}

/**
 * Complete Data Envelope Card Component
 */
export const DataEnvelopeCard: React.FC<DataEnvelopeCardProps> = ({
  envelope,
  children,
  showProvenance = true,
}) => {
  return (
    <div className="data-envelope-card border-2 border-gray-300 rounded-lg" data-testid="envelope-card">
      {/* Header with badges */}
      <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClassificationBadge classification={envelope.classification} size="small" />
          <SimulationBadge isSimulated={envelope.isSimulated} size="small" />
        </div>

        {isAIGenerated(envelope) && (
          <ConfidenceIndicator confidence={envelope.confidence} size="small" />
        )}
      </div>

      {/* Warnings */}
      {envelope.warnings.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          {envelope.warnings.map((warning, index) => (
            <div key={index} className="text-sm text-yellow-800 flex items-start">
              <svg
                className="w-5 h-5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">{children}</div>

      {/* Provenance footer */}
      {showProvenance && (
        <div className="px-4 pb-4">
          <ProvenanceDisplay envelope={envelope} />
        </div>
      )}
    </div>
  );
};

/**
 * Hook to use data envelope validation in components
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDataEnvelopeValidation<T>(envelope: DataEnvelope<T>) {
  const [isValid, setIsValid] = React.useState(true);

  React.useEffect(() => {
    const { validateDataEnvelope } = require('../utils/data-envelope-validator');
    const validation = validateDataEnvelope(envelope);
    setIsValid(validation.valid);

    if (!validation.valid) {
      console.error('[Data Envelope] Validation failed:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('[Data Envelope] Validation warnings:', validation.warnings);
    }
  }, [envelope]);

  return { isValid };
}

/**
 * Error boundary for invalid envelopes
 */
export class DataEnvelopeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Data Envelope] Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="data-envelope-error bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-red-600 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Data Integrity Error</h3>
              <p className="text-sm text-red-700 mt-1">
                This data failed integrity validation and cannot be displayed.
              </p>
              {this.state.error && (
                <p className="text-xs text-red-600 mt-2 font-mono">{this.state.error.message}</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
