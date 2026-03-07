/**
 * Text Classification Task Component
 *
 * UI for classifying text into predefined categories.
 */

import { useState } from "react";
import type { Sample, LabelingJob, Label } from "../../types";

interface TextClassificationTaskProps {
  sample: Sample;
  job: LabelingJob;
  onSubmit: (labels: Label[]) => void;
  instructions: string;
}

const CLASSIFICATION_CATEGORIES = ["News", "Opinion", "Analysis", "Report", "Other"];

export function TextClassificationTask({
  sample,
  instructions,
  onSubmit,
}: TextClassificationTaskProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const handleSubmit = () => {
    if (!selectedCategory) return;

    onSubmit([
      {
        fieldName: "category",
        value: selectedCategory,
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Text Classification</h2>
        <p className="text-muted-foreground">{instructions}</p>
      </div>

      <div className="rounded-lg border bg-card p-6 mb-6">
        <h3 className="font-medium mb-4">Text Content</h3>
        <div className="text-sm bg-muted p-4 rounded">
          {sample.content.text || "No text content available"}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 mb-6">
        <h3 className="font-medium mb-4">Select Category</h3>
        <div className="space-y-2">
          {CLASSIFICATION_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted cursor-pointer"
            >
              <input
                type="radio"
                name="category"
                value={category}
                checked={selectedCategory === category}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-4 w-4"
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={handleSubmit}
          disabled={!selectedCategory}
          className="inline-flex items-center rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
