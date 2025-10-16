import React, { useEffect, useState, useRef } from 'react';
import $ from 'jquery';
export default function RepoGraphSidebar({ files }: { files: string[] }) {
  const [imp, setImp] = useState<string[]>([]);
  const handlerBoundRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/repograph/impacted?files=${files.join(',')}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setImp(d.impacted || []))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });
    return () => controller.abort();
  }, [files.join(',')]);

  useEffect(() => {
    if (!handlerBoundRef.current) {
      handlerBoundRef.current = true;
      $('#rg-q').on('input', function () {
        const v = $(this).val()?.toString().toLowerCase() || '';
        $('.rg-row').each(function () {
          $(this).toggle($(this).text().toLowerCase().includes(v));
        });
      });
    }
    return () => {
      if (handlerBoundRef.current) {
        $('#rg-q').off('input');
        handlerBoundRef.current = false;
      }
    };
  }, [imp.length]);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2">
        <h4 className="font-semibold">Impacted entities</h4>
        <input
          id="rg-q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <ul className="mt-2 text-sm">
        {imp.map((x, i) => (
          <li key={i} className="rg-row border-b py-1">
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
