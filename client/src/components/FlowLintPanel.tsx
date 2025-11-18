import React, { useEffect, useState, useRef } from 'react';
import $ from 'jquery';
export default function FlowLintPanel() {
  const [items, setItems] = useState<any[]>([]);
  const handlerBoundRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/flow/lint', { signal: controller.signal })
      .then((r) => r.json())
      .then(setItems)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });

    if (!handlerBoundRef.current) {
      handlerBoundRef.current = true;
      $('#q').on('input', function (this: HTMLElement) {
        const v = $(this).val()?.toString().toLowerCase() || '';
        $('.lint-row').each(function (this: HTMLElement) {
          $(this).toggle($(this).text().toLowerCase().includes(v));
        });
      });
    }

    return () => {
      controller.abort();
      if (handlerBoundRef.current) {
        $('#q').off('input');
        handlerBoundRef.current = false;
      }
    };
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">FlowLint</h3>
        <input
          id="q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <ul className="text-sm">
        {items.map((x: any, i: number) => (
          <li
            key={i}
            className={`lint-row border-b py-1 ${x.level === 'error' ? 'text-red-600' : ''}`}
          >
            {x.id} — {x.msg}
          </li>
        ))}
      </ul>
    </div>
  );
}
