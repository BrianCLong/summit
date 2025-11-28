/**
 * Safety Decision Task Component
 *
 * UI for content safety assessment.
 */

import React from 'react';
import { Shield, AlertTriangle, Clock, Flag } from 'lucide-react';
import { useLabelingStore } from '../../store/labelingStore';
import { cn } from '../../utils/cn';
import type { Sample, LabelingJob, Label } from '../../types';

type SafetyCategory =
  | 'safe'
  | 'violence'
  | 'hate_speech'
  | 'harassment'
  | 'sexual_content'
  | 'misinformation'
  | 'privacy_violation'
  | 'other';

interface SafetyDecisionTaskProps {
  sample: Sample;
  job: LabelingJob;
  onSubmit: (labels: Label[]) => void;
  instructions: string;
}

const safetyCategories: { value: SafetyCategory; label: string; description: string }[] = [
  { value: 'safe', label: 'Safe', description: 'Content is safe and appropriate' },
  { value: 'violence', label: 'Violence', description: 'Contains violent or graphic content' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Promotes hatred against protected groups' },
  { value: 'harassment', label: 'Harassment', description: 'Targets individuals for harassment' },
  { value: 'sexual_content', label: 'Sexual Content', description: 'Contains explicit sexual material' },
  { value: 'misinformation', label: 'Misinformation', description: 'Spreads false or misleading information' },
  { value: 'privacy_violation', label: 'Privacy Violation', description: 'Exposes private information' },
  { value: 'other', label: 'Other', description: 'Other safety concern not listed' },
];

export function SafetyDecisionTask({
  sample,
  job,
  onSubmit,
  instructions,
}: SafetyDecisionTaskProps) {
  const [selectedCategories, setSelectedCategories] = React.useState<SafetyCategory[]>([]);
  const [severity, setSeverity] = React.useState<'low' | 'medium' | 'high' | null>(null);
  const [confidenceValue, setConfidenceValue] = React.useState(0.8);
  const { notes, setNotes, getTimeSpent } = useLabelingStore();

  const content = sample.content.text || JSON.stringify(sample.content.raw, null, 2);

  const toggleCategory = (category: SafetyCategory) => {
    if (category === 'safe') {
      setSelectedCategories(['safe']);
      setSeverity(null);
    } else {
      setSelectedCategories((prev) => {
        const filtered = prev.filter((c) => c !== 'safe');
        return filtered.includes(category)
          ? filtered.filter((c) => c !== category)
          : [...filtered, category];
      });
    }
  };

  const handleSubmit = () => {
    if (selectedCategories.length === 0) return;
    if (selectedCategories[0] !== 'safe' && !severity) return;

    const labels: Label[] = [
      {
        fieldName: 'safety_categories',
        value: selectedCategories,
        confidence: confidenceValue,
      },
    ];

    if (severity) {
      labels.push({
        fieldName: 'severity',
        value: severity,
      });
    }

    onSubmit(labels);
    setSelectedCategories([]);
    setSeverity(null);
    setNotes('');
  };

  const isSafe = selectedCategories.length === 1 && selectedCategories[0] === 'safe';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-amber-800" />
          <h3 className="text-sm font-medium text-amber-800">Safety Assessment Instructions</h3>
        </div>
        <p className="text-sm text-amber-700">{instructions}</p>
      </div>

      {/* Content to Review */}
      <div className="mb-6 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Content to Review</h3>
          <span className="text-xs text-muted-foreground">
            {content.length} characters
          </span>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-auto">
          {content}
        </div>
      </div>

      {/* Safety Categories */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Safety Categories</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select all applicable categories. If content is safe, only select "Safe".
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {safetyCategories.map((category) => (
            <button
              key={category.value}
              onClick={() => toggleCategory(category.value)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                selectedCategories.includes(category.value)
                  ? category.value === 'safe'
                    ? 'bg-green-100 border-green-500'
                    : 'bg-red-100 border-red-500'
                  : 'bg-card hover:bg-muted'
              )}
            >
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border-2 flex-shrink-0',
                  selectedCategories.includes(category.value)
                    ? category.value === 'safe'
                      ? 'border-green-500 bg-green-500'
                      : 'border-red-500 bg-red-500'
                    : 'border-muted-foreground'
                )}
              >
                {selectedCategories.includes(category.value) && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <span className="font-medium">{category.label}</span>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Severity (only if not safe) */}
      {!isSafe && selectedCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Severity Level</h3>
          <div className="flex gap-4">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSeverity(level)}
                className={cn(
                  'flex-1 py-3 rounded-lg border font-medium transition-all',
                  severity === level
                    ? level === 'low'
                      ? 'bg-yellow-100 border-yellow-500'
                      : level === 'medium'
                      ? 'bg-orange-100 border-orange-500'
                      : 'bg-red-100 border-red-500'
                    : 'bg-card hover:bg-muted'
                )}
              >
                <span className="capitalize">{level}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
          Notes (required for flagged content)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Explain your safety assessment..."
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
          disabled={
            selectedCategories.length === 0 ||
            (!isSafe && !severity) ||
            (!isSafe && !notes.trim())
          }
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
