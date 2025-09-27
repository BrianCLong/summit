import { useEffect } from 'react';

type ShortcutMap = Record<string, () => void>;

type Options = {
  enabled?: boolean;
  preventDefault?: boolean;
};

const normalize = (event: KeyboardEvent) => {
  const modifiers = [
    event.metaKey ? 'Meta' : '',
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : ''
  ]
    .filter(Boolean)
    .join('+');
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return modifiers ? `${modifiers}+${key}` : key;
};

export function useKeyboardShortcuts(map: ShortcutMap, options: Options = {}) {
  useEffect(() => {
    if (options.enabled === false) {
      return () => undefined;
    }

    const handler = (event: KeyboardEvent) => {
      const key = normalize(event);
      const action = map[key];
      if (action) {
        if (options.preventDefault !== false) {
          event.preventDefault();
        }
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [map, options.enabled, options.preventDefault]);
}
