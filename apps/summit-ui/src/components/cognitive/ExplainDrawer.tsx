import React from "react";

export function ExplainDrawer(props: {
  title: string;
  explanation: string[];
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-2">
      <div className="text-lg font-semibold">{props.title}</div>
      <ul className="list-disc ml-5 text-sm space-y-1">
        {props.explanation.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
