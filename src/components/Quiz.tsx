import React, { useState } from 'react';
export default function Quiz({
  items,
}: {
  items: { id: string; prompt: string; options: string[]; answer: number }[];
}) {
  const [score, setScore] = useState<number | null>(null);
  const [sel, setSel] = useState<Record<string, number>>({});
  const submit = () => {
    let s = 0;
    for (const it of items) if (sel[it.id] === it.answer) s++;
    setScore(s);
  };
  return (
    <div>
      {items.map((it) => (
        <fieldset key={it.id} className="margin-vert--md">
          <legend>{it.prompt}</legend>
          {it.options.map((o, i) => (
            <label key={i} className="block">
              <input
                type="radio"
                name={it.id}
                onChange={() => setSel({ ...sel, [it.id]: i })}
              />{' '}
              {o}
            </label>
          ))}
        </fieldset>
      ))}
      <button className="button button--primary" onClick={submit}>
        Submit
      </button>
      {score !== null && (
        <p>
          Score: {score}/{items.length}
        </p>
      )}
    </div>
  );
}
