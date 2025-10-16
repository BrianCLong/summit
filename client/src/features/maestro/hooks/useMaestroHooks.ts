import React from 'react';
import { useNavigate } from 'react-router-dom';

type Shortcut = {
  combo: string;
  handler: () => void;
};

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const combo = `${event.metaKey || event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.key.toLowerCase()}`;
      const match = shortcuts.find((shortcut) => shortcut.combo === combo);
      if (match) {
        event.preventDefault();
        match.handler();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);
}

export function useNavigationShortcuts(basePath = '/') {
  const navigate = useNavigate();
  React.useEffect(() => {
    function onSequence(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'g') {
        const handler = (next: KeyboardEvent) => {
          const map: Record<string, string> = {
            d: `${basePath}dashboard`,
            p: `${basePath}pipelines`,
            r: `${basePath}runs/run-1`,
            o: `${basePath}observability`,
            l: `${basePath}releases`,
            a: `${basePath}admin`,
          };
          const dest = map[next.key.toLowerCase()];
          if (dest) {
            next.preventDefault();
            navigate(dest);
          }
          window.removeEventListener('keydown', handler, true);
        };
        window.addEventListener('keydown', handler, true);
      }
    }
    window.addEventListener('keydown', onSequence);
    return () => window.removeEventListener('keydown', onSequence);
  }, [basePath, navigate]);
}

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

export function useLiveLogFeed(
  lines: string[],
  opts: { followTail: boolean; intervalMs?: number },
) {
  const { followTail, intervalMs = 300 } = opts;
  const [visible, setVisible] = React.useState<string[]>(lines.slice(0, 200));
  const [cursor, setCursor] = React.useState(200);

  React.useEffect(() => {
    setVisible(lines.slice(0, 200));
    setCursor(200);
  }, [lines]);

  React.useEffect(() => {
    if (!followTail) return undefined;
    const timer = setInterval(() => {
      setCursor((prevCursor) => {
        const nextCursor = Math.min(lines.length, prevCursor + 10);
        setVisible(lines.slice(0, nextCursor));
        return nextCursor;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [followTail, intervalMs, lines]);

  return visible;
}
