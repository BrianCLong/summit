import { useEffect, useState } from 'react';

export type TrapSnapshot = {
  nodeLabel: string;
  recentTabStops: number;
  timestamp: number;
};

type Options = {
  threshold?: number;
  onTrap?: (snapshot: TrapSnapshot) => void;
};

const defaultOptions: Required<Options> = {
  threshold: 3,
  onTrap: () => undefined,
};

export function useKeyboardTrapDetector(options: Options = defaultOptions): TrapSnapshot | null {
  const { threshold, onTrap } = { ...defaultOptions, ...options };
  const [trapSnapshot, setTrapSnapshot] = useState<TrapSnapshot | null>(null);

  useEffect(() => {
    let lastFocused: Element | null = null;
    let repeatedTabs = 0;

    const handler = () => {
      const active = document.activeElement;
      if (active && active === lastFocused) {
        repeatedTabs += 1;
      } else {
        repeatedTabs = 0;
      }
      lastFocused = active;
      if (repeatedTabs >= threshold && active) {
        const snapshot: TrapSnapshot = {
          nodeLabel: deriveLabel(active as HTMLElement),
          recentTabStops: repeatedTabs,
          timestamp: Date.now(),
        };
        setTrapSnapshot(snapshot);
        onTrap(snapshot);
      }
    };

    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        window.setTimeout(handler, 25);
      }
    };

    document.addEventListener('keydown', listener);

    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [threshold, onTrap]);

  return trapSnapshot;
}

function deriveLabel(node: HTMLElement): string {
  return (
    node.getAttribute('aria-label') ||
    node.textContent?.trim() ||
    node.getAttribute('name') ||
    node.id ||
    node.tagName.toLowerCase()
  );
}
