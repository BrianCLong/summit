/**
 * Entity Match Task Component
 *
 * UI for labeling entity match/no-match tasks.
 */

import React from 'react';
import { Check, X, HelpCircle, Clock } from 'lucide-react';
import { useLabelingStore } from '../../store/labelingStore';
import { cn } from '../../utils/cn';
import type { Sample, LabelingJob, Label } from '../../types';

interface EntityMatchTaskProps {
  sample: Sample;
  job: LabelingJob;
  onSubmit: (labels: Label[]) => void;
  instructions: string;
}

export function EntityMatchTask({
  sample,
  job,
  onSubmit,
  instructions,
}: EntityMatchTaskProps) {
  const [decision, setDecision] = React.useState<boolean | null>(null);
  const [confidenceValue, setConfidenceValue] = React.useState(0.8);
  const { notes, setNotes, getTimeSpent, keyboardShortcutsEnabled } = useLabelingStore();

  const entities = sample.content.entities?.[0];
  const entityA = entities?.entityA;
  const entityB = entities?.entityB;

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'y':
        case 'm':
          setDecision(true);
          break;
        case 'n':
          setDecision(false);
          break;
        case 'u':
          setDecision(null);
          break;
        case 'enter':
          if (decision !== null) {
            handleSubmit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, decision]);

  const handleSubmit = () => {
    if (decision === null) return;

    const labels: Label[] = [
      {
        fieldName: 'match',
        value: decision,
        confidence: confidenceValue,
      },
    ];

    onSubmit(labels);
    setDecision(null);
    setNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Instructions</h3>
        <p className="text-sm text-blue-700">{instructions}</p>
        <p className="text-xs text-blue-600 mt-2">
          Keyboard shortcuts: <kbd className="px-1 bg-blue-100 rounded">Y</kbd> Match,{' '}
          <kbd className="px-1 bg-blue-100 rounded">N</kbd> No Match,{' '}
          <kbd className="px-1 bg-blue-100 rounded">Enter</kbd> Submit
        </p>
      </div>

      {/* Entity Comparison */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <EntityCard
          title="Entity A"
          entity={entityA}
          highlight={decision === true ? 'green' : decision === false ? 'red' : undefined}
        />
        <EntityCard
          title="Entity B"
          entity={entityB}
          highlight={decision === true ? 'green' : decision === false ? 'red' : undefined}
        />
      </div>

      {/* Decision Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setDecision(true)}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            decision === true
              ? 'bg-green-500 text-white ring-4 ring-green-200'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          )}
        >
          <Check className="h-5 w-5" />
          Match
        </button>

        <button
          onClick={() => setDecision(false)}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            decision === false
              ? 'bg-red-500 text-white ring-4 ring-red-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          )}
        >
          <X className="h-5 w-5" />
          No Match
        </button>

        <button
          onClick={() => setDecision(null)}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            'bg-gray-100 text-gray-800 hover:bg-gray-200'
          )}
        >
          <HelpCircle className="h-5 w-5" />
          Unsure
        </button>
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
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about your decision..."
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
          disabled={decision === null}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Label
        </button>
      </div>
    </div>
  );
}

function EntityCard({
  title,
  entity,
  highlight,
}: {
  title: string;
  entity?: { id: string; type: string; name: string; properties: Record<string, unknown> };
  highlight?: 'green' | 'red';
}) {
  if (!entity) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-muted-foreground">No entity data</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 transition-all',
        highlight === 'green' && 'ring-2 ring-green-500',
        highlight === 'red' && 'ring-2 ring-red-500'
      )}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-muted-foreground">Name:</span>
          <p className="font-medium">{entity.name}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Type:</span>
          <p className="font-medium capitalize">{entity.type}</p>
        </div>
        {Object.entries(entity.properties || {}).map(([key, value]) => (
          <div key={key}>
            <span className="text-sm text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}:
            </span>
            <p className="font-medium">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
