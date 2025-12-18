/**
 * useKeyboardShortcuts - Hook for handling keyboard shortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

export type ShortcutHandler = () => void;

export interface ShortcutMap {
  [key: string]: ShortcutHandler;
}

/**
 * Parse a shortcut string into key components
 * Supports: mod (Cmd on Mac, Ctrl on Windows), ctrl, alt, shift, meta
 * Examples: "mod+k", "ctrl+shift+p", "escape"
 */
function parseShortcut(shortcut: string): {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  mod: boolean;
} {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  return {
    key,
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta'),
    mod: parts.includes('mod'),
  };
}

/**
 * Check if an event matches a shortcut
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ReturnType<typeof parseShortcut>
): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Handle "mod" key (Cmd on Mac, Ctrl on Windows)
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  // Check modifier keys
  if (shortcut.mod && !modKey) return false;
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (shortcut.alt && !event.altKey) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.meta && !event.metaKey) return false;

  // Check main key
  return event.key.toLowerCase() === shortcut.key;
}

/**
 * Hook for handling keyboard shortcuts
 *
 * @param shortcuts - Map of shortcut strings to handler functions
 * @param enabled - Whether shortcuts are enabled (default: true)
 *
 * @example
 * useKeyboardShortcuts({
 *   'mod+k': () => openSearch(),
 *   'escape': () => closeModal(),
 *   'mod+shift+p': () => openCommandPalette(),
 * });
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  enabled: boolean = true
): void {
  // Store shortcuts in a ref to avoid re-registering on every render
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape to work even in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Check each registered shortcut
      for (const [shortcutStr, handler] of Object.entries(shortcutsRef.current)) {
        const shortcut = parseShortcut(shortcutStr);

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          handler();
          return;
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

export default useKeyboardShortcuts;
