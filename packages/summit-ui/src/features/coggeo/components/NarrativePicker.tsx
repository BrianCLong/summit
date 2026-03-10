import React from "react";

export function NarrativePicker(props: {
  narratives: Array<{ id: string; title: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span>Narrative</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.narratives.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>
    </label>
  );
}
