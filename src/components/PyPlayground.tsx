import React, { useEffect, useRef, useState } from 'react';

export default function PyPlayground({
  code,
  requirements = [],
}: {
  code: string;
  requirements?: string[];
}) {
  const [ready, setReady] = useState(false);
  const [out, setOut] = useState('');
  const py = useRef<any>(null);
  useEffect(() => {
    (async () => {
      // Load Pyodide
      // @ts-ignore
      const { loadPyodide } = await import(
        'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs'
      );
      py.current = await loadPyodide({
        stdout: (t: string) => setOut((o) => o + t + '\n'),
      });
      for (const r of requirements) {
        await py.current.runPythonAsync(
          `import micropip; await micropip.install('${r}')`,
        );
      }
      setReady(true);
    })();
  }, []);
  const run = async () => {
    setOut('');
    try {
      await py.current.runPythonAsync(code);
    } catch (e: any) {
      setOut(String(e));
    }
  };
  return (
    <div className="card padding--md">
      <button
        disabled={!ready}
        className="button button--primary"
        onClick={run}
      >
        {ready ? 'Run Python' : 'Loading…'}
      </button>
      <pre aria-live="polite">
        <code>{out || '\n'}</code>
      </pre>
    </div>
  );
}
