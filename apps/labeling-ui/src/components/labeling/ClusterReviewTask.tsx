/**
 * Cluster Review Task Component
 *
 * UI for reviewing and validating entity clusters.
 */

import type { Sample, LabelingJob, Label } from "../../types";

interface ClusterReviewTaskProps {
  sample: Sample;
  job: LabelingJob;
  onSubmit: (labels: Label[]) => void;
  instructions: string;
}

export function ClusterReviewTask({ sample, instructions, onSubmit }: ClusterReviewTaskProps) {
  const handleSubmit = () => {
    // Placeholder implementation
    onSubmit([
      {
        fieldName: "cluster_valid",
        value: true,
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cluster Review</h2>
        <p className="text-muted-foreground">{instructions}</p>
      </div>

      <div className="rounded-lg border bg-card p-6 mb-6">
        <h3 className="font-medium mb-4">Sample Content</h3>
        <pre className="text-sm bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(sample.content, null, 2)}
        </pre>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSubmit}
          className="inline-flex items-center rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
