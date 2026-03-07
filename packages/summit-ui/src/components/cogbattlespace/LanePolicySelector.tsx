import React from "react";

export type LaneQueryPolicy =
  | "PROMOTED_ONLY"
  | "TRUSTED_AND_UP"
  | "OBSERVED_AND_UP"
  | "ALL_LANES";

export function LanePolicySelector(props: {
  value: LaneQueryPolicy;
  onChange: (v: LaneQueryPolicy) => void;
}) {
  const options: LaneQueryPolicy[] = [
    "PROMOTED_ONLY",
    "TRUSTED_AND_UP",
    "OBSERVED_AND_UP",
    "ALL_LANES"
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o}
          className={`px-3 py-1 rounded-2xl border text-sm ${
            props.value === o ? "bg-black text-white" : "bg-white"
          }`}
          onClick={() => props.onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
