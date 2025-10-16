import React from 'react';
export default function AnswerCard({
  tldr,
  steps,
  facts,
}: {
  tldr: string;
  steps?: string[];
  facts?: string[];
}) {
  return (
    <div className="card padding--md">
      <p>
        <strong>TL;DR</strong> {tldr}
      </p>
      {steps?.length ? (
        <>
          <h4>Steps</h4>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      ) : null}
      {facts?.length ? (
        <>
          <h4>Key facts</h4>
          <ul>
            {facts.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
