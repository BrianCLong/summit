import React, { useEffect, useState } from 'react';
const stepsAttr = 'data-tour-step';
export default function Tour({
  id,
  role,
  steps,
}: {
  id: string;
  role?: string;
  steps: { selector: string; title: string; body: string }[];
}) {
  const key = `tour:${id}:${role || 'all'}`;
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(key)) setOpen(true);
  }, [key]);
  useEffect(() => {
    if (!open) return;
    const step = steps[i];
    const el = step && document.querySelector(step.selector);
    if (el) el.setAttribute(stepsAttr, '1');
    return () => {
      if (el) el.removeAttribute(stepsAttr);
    };
  }, [open, i, steps]);
  if (!open)
    return (
      <button className="button button--sm" onClick={() => setOpen(true)}>
        Start tour
      </button>
    );
  const s = steps[i];
  return (
    <div className="tour">
      <div className="tour-panel">
        <h4>{s?.title}</h4>
        <p>{s?.body}</p>
        <div className="flex gap-2">
          <button
            className="button button--sm"
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
          >
            Back
          </button>
          <button
            className="button button--sm button--primary"
            onClick={() =>
              i < steps.length - 1
                ? setI(i + 1)
                : (localStorage.setItem(key, 'done'), setOpen(false))
            }
          >
            {i < steps.length - 1 ? 'Next' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}
