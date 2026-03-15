import React, { useId } from "react";

export interface TimeBucketOption {
  label: string;
  value: string;
}

export function NarrativeControls(props: {
  narrativeId: string;
  onNarrativeIdChange: (value: string) => void;
  timeBucket: string;
  onTimeBucketChange: (value: string) => void;
  timeBuckets?: TimeBucketOption[];
}) {
  const narrativeInputId = useId();
  const timeBucketSelectId = useId();

  const buckets = props.timeBuckets ?? [
    { label: "24h", value: "24h" },
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" }
  ];

  return (
    <div className="rounded-2xl border p-4 flex flex-col md:flex-row gap-3 md:items-end">
      <div className="flex-1">
        <label htmlFor={narrativeInputId} className="text-sm font-medium block mb-1">Narrative ID</label>
        <input
          id={narrativeInputId}
          className="border rounded-xl px-3 py-2 w-full"
          value={props.narrativeId}
          onChange={(e) => props.onNarrativeIdChange(e.target.value)}
          placeholder="Narrative ID"
        />
      </div>

      <div className="w-full md:w-48">
        <label htmlFor={timeBucketSelectId} className="text-sm font-medium block mb-1">Time bucket</label>
        <select
          id={timeBucketSelectId}
          className="border rounded-xl px-3 py-2 w-full"
          value={props.timeBucket}
          onChange={(e) => props.onTimeBucketChange(e.target.value)}
        >
          {buckets.map((bucket) => (
            <option key={bucket.value} value={bucket.value}>
              {bucket.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
