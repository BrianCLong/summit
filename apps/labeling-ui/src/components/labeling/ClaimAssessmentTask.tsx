/**
 * Claim Assessment Task Component
 *
 * UI for assessing claims with evidence.
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useLabelingStore } from '../../store/labelingStore';
import { cn } from '../../utils/cn';
import type { Sample, LabelingJob, Label } from '../../types';

type ClaimVerdict = 'supported' | 'refuted' | 'insufficient_evidence';

interface ClaimAssessmentTaskProps {
  sample: Sample;
  job: LabelingJob;
  onSubmit: (labels: Label[]) => void;
  instructions: string;
}

export function ClaimAssessmentTask({
  sample,
  job,
  onSubmit,
  instructions,
}: ClaimAssessmentTaskProps) {
  const [verdict, setVerdict] = React.useState<ClaimVerdict | null>(null);
  const [confidenceValue, setConfidenceValue] = React.useState(0.8);
  const { notes, setNotes, getTimeSpent, keyboardShortcutsEnabled } = useLabelingStore();

  const claim = sample.content.claims?.[0];

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 's':
          setVerdict('supported');
          break;
        case 'r':
          setVerdict('refuted');
          break;
        case 'i':
          setVerdict('insufficient_evidence');
          break;
        case 'enter':
          if (verdict) {
            handleSubmit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, verdict]);

  const handleSubmit = () => {
    if (!verdict) return;

    const labels: Label[] = [
      {
        fieldName: 'verdict',
        value: verdict,
        confidence: confidenceValue,
      },
    ];

    onSubmit(labels);
    setVerdict(null);
    setNotes('');
  };

  const verdictConfig = {
    supported: {
      icon: CheckCircle,
      color: 'green',
      label: 'Supported',
      description: 'The claim is supported by the available evidence.',
    },
    refuted: {
      icon: XCircle,
      color: 'red',
      label: 'Refuted',
      description: 'The claim is contradicted by the available evidence.',
    },
    insufficient_evidence: {
      icon: AlertTriangle,
      color: 'yellow',
      label: 'Insufficient Evidence',
      description: 'There is not enough evidence to determine the claim\'s validity.',
    },
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Instructions</h3>
        <p className="text-sm text-blue-700">{instructions}</p>
        <p className="text-xs text-blue-600 mt-2">
          Keyboard shortcuts: <kbd className="px-1 bg-blue-100 rounded">S</kbd> Supported,{' '}
          <kbd className="px-1 bg-blue-100 rounded">R</kbd> Refuted,{' '}
          <kbd className="px-1 bg-blue-100 rounded">I</kbd> Insufficient,{' '}
          <kbd className="px-1 bg-blue-100 rounded">Enter</kbd> Submit
        </p>
      </div>

      {/* Claim Card */}
      <div className="mb-6 rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Claim to Assess</h3>
        {claim ? (
          <>
            <blockquote className="border-l-4 border-primary pl-4 py-2 mb-4 text-lg">
              "{claim.claimText}"
            </blockquote>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Source: {claim.source}</span>
              {claim.confidence && (
                <span>Original Confidence: {(claim.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">No claim data available</p>
        )}
      </div>

      {/* Supporting Evidence */}
      {claim?.supportingEvidence && claim.supportingEvidence.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Supporting Evidence</h3>
          <ul className="space-y-3">
            {claim.supportingEvidence.map((evidence, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
              >
                <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verdict Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Assessment</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {(Object.entries(verdictConfig) as [ClaimVerdict, typeof verdictConfig.supported][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setVerdict(key)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-left',
                    verdict === key
                      ? config.color === 'green'
                        ? 'bg-green-100 border-green-500 ring-2 ring-green-500'
                        : config.color === 'red'
                        ? 'bg-red-100 border-red-500 ring-2 ring-red-500'
                        : 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-500'
                      : 'bg-card hover:bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-8 w-8',
                      config.color === 'green'
                        ? 'text-green-600'
                        : config.color === 'red'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    )}
                  />
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-center text-muted-foreground">
                    {config.description}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Confidence Slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Confidence: {(confidenceValue * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={confidenceValue * 100}
          onChange={(e) => setConfidenceValue(parseInt(e.target.value) / 100)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Reasoning (recommended)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Explain your reasoning for this assessment..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px]"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1" />
          Time: {formatTime(getTimeSpent())}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!verdict}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Assessment
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
