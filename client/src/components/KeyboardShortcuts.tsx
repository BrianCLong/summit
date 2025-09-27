import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';

interface ShortcutAction {
  keys: string[];
  description: string;
  action: () => void;
  category?: string;
  global?: boolean;
  actionId?: string;
  customKeys?: string[] | null;
  defaultKeys?: string[];
  updatedAt?: string | null;
}

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift'];
const NORMALIZATION_MAP: Record<string, string> = {
  command: 'ctrl',
  cmd: 'ctrl',
  meta: 'ctrl',
  option: 'alt',
  esc: 'escape',
  return: 'enter',
  spacebar: 'space',
  'arrow-up': 'arrowup',
  up: 'arrowup',
  'arrow-down': 'arrowdown',
  down: 'arrowdown',
  'arrow-left': 'arrowleft',
  left: 'arrowleft',
  'arrow-right': 'arrowright',
  right: 'arrowright',
};

interface KeyboardShortcutsProps {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ shortcuts, enabled = true }) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const pressedKeys = [];
      if (event.ctrlKey || event.metaKey) pressedKeys.push('ctrl');
      if (event.shiftKey) pressedKeys.push('shift');
      if (event.altKey) pressedKeys.push('alt');

      const key = event.key.toLowerCase();
      if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
        pressedKeys.push(key);
      }

      const pressedKeyString = pressedKeys.join('+');

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) =>
        shortcut.keys.some((keyCombo) => keyCombo.toLowerCase() === pressedKeyString),
      );

      if (matchingShortcut) {
        // Check if we should prevent default behavior
        const activeElement = document.activeElement;
        const isInputElement =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true');

        // Allow some shortcuts even in input fields
        const alwaysAllowed = ['escape', 'ctrl+k', 'ctrl+/'];
        const shouldExecute =
          !isInputElement ||
          alwaysAllowed.some((allowed) =>
            matchingShortcut.keys.some((key) => key.toLowerCase() === allowed),
          );

        if (shouldExecute) {
          event.preventDefault();
          event.stopPropagation();
          matchingShortcut.action();
        }
      }
    },
    [shortcuts, enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return null; // This component doesn't render anything
};

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts: ShortcutAction[], enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys = [];
      if (event.ctrlKey || event.metaKey) pressedKeys.push('ctrl');
      if (event.shiftKey) pressedKeys.push('shift');
      if (event.altKey) pressedKeys.push('alt');

      const key = event.key.toLowerCase();
      if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
        pressedKeys.push(key);
      }

      const pressedKeyString = pressedKeys.join('+');

      const matchingShortcut = shortcuts.find((shortcut) =>
        shortcut.keys.some((keyCombo) => keyCombo.toLowerCase() === pressedKeyString),
      );

      if (matchingShortcut) {
        const activeElement = document.activeElement;
        const isInputElement =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true');

        const alwaysAllowed = ['escape', 'ctrl+k', 'ctrl+/'];
        const shouldExecute =
          !isInputElement ||
          alwaysAllowed.some((allowed) =>
            matchingShortcut.keys.some((key) => key.toLowerCase() === allowed),
          );

        if (shouldExecute) {
          event.preventDefault();
          event.stopPropagation();
          matchingShortcut.action();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

// Utility function to format key combinations for display
export const formatKeyCombo = (keys: string): string => {
  return keys
    .split('+')
    .map((key) => {
      switch (key.toLowerCase()) {
        case 'ctrl':
          return '⌘'; // On Mac, show Cmd symbol
        case 'shift':
          return '⇧';
        case 'alt':
          return '⌥';
        case 'escape':
          return 'Esc';
        case 'enter':
          return '↵';
        case 'space':
          return 'Space';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return key.toUpperCase();
      }
    })
    .join('');
};

export const formatShortcutList = (keys: string[]): string =>
  keys.map((combo) => formatKeyCombo(combo)).join(', ');

export function normalizeShortcutInput(combo: string): string {
  const trimmed = combo.trim();
  if (!trimmed) return '';
  if (trimmed === '?') return '?';

  const parts = trimmed
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => NORMALIZATION_MAP[part] || part);

  const modifiers: string[] = [];
  let primary: string | null = null;

  for (const part of parts) {
    if (MODIFIER_ORDER.includes(part)) {
      if (!modifiers.includes(part)) modifiers.push(part);
      continue;
    }

    if (!primary) {
      primary = part;
    }
  }

  const orderedModifiers = MODIFIER_ORDER.filter((modifier) => modifiers.includes(modifier));
  const tokens = primary ? [...orderedModifiers, primary] : orderedModifiers;
  return tokens.join('+');
}

export function parseShortcutInput(value: string): string[] {
  if (!value || !value.trim()) {
    return [];
  }

  const combos = value
    .split(',')
    .map((segment) => normalizeShortcutInput(segment))
    .filter(Boolean);

  return Array.from(new Set(combos));
}

// Component to display available shortcuts
interface ShortcutsHelpProps {
  shortcuts: ShortcutAction[];
  isVisible: boolean;
  onClose: () => void;
  onCustomize?: () => void;
  showCustomize?: boolean;
}

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({
  shortcuts,
  isVisible,
  onClose,
  onCustomize,
  showCustomize = true,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const groupedShortcuts = useMemo(() => {
    return shortcuts.reduce(
      (acc, shortcut) => {
        const category = shortcut.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(shortcut);
        return acc;
      },
      {} as Record<string, ShortcutAction[]>,
    );
  }, [shortcuts]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-heading"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between p-4 border-b gap-2">
          <h2 id="keyboard-shortcuts-heading" className="text-xl font-semibold text-gray-900">
            Keyboard Shortcuts
          </h2>
          <div className="flex items-center gap-2">
            {showCustomize && onCustomize && (
              <button
                type="button"
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={onCustomize}
              >
                Customize
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label="Close keyboard shortcuts"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]" aria-live="polite">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <section key={category} className="mb-6" aria-label={`${category} shortcuts`}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{category}</h3>
              <ul className="space-y-2" role="list">
                {categoryShortcuts.map((shortcut, index) => (
                  <li
                    key={`${shortcut.actionId || shortcut.description}-${index}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="flex flex-col">
                      <span className="text-gray-800 font-medium">
                        {shortcut.description}
                        {shortcut.customKeys && shortcut.customKeys.length > 0 && (
                          <span className="ml-2 text-xs font-semibold text-emerald-600" aria-label="Custom shortcut">
                            Custom
                          </span>
                        )}
                      </span>
                      {shortcut.defaultKeys && shortcut.customKeys && shortcut.customKeys.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Default: {formatShortcutList(shortcut.defaultKeys)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1" aria-label={formatShortcutList(shortcut.keys)}>
                      {shortcut.keys.map((keyCombo, keyIndex) => (
                        <kbd
                          key={`${keyCombo}-${keyIndex}`}
                          className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono"
                        >
                          {formatKeyCombo(keyCombo)}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
          <p>
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> to toggle this help window.
          </p>
        </div>
      </div>
    </div>
  );
};

interface KeyboardShortcutSettingsProps {
  shortcuts: Array<{
    actionId: string;
    description: string;
    category: string;
    defaultKeys: string[];
    customKeys?: string[] | null;
    effectiveKeys: string[];
    updatedAt?: string | null;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Array<{ actionId: string; keys: string[] }>) => Promise<void> | void;
  onReset: (actionIds?: string[]) => Promise<void> | void;
  saving?: boolean;
  resetting?: boolean;
}

type ShortcutFormRow = {
  actionId: string;
  description: string;
  category: string;
  value: string;
  defaultValue: string;
  error: string | null;
  isCustom: boolean;
  updatedAt?: string | null;
};

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export const KeyboardShortcutSettings: React.FC<KeyboardShortcutSettingsProps> = ({
  shortcuts,
  isOpen,
  onClose,
  onSave,
  onReset,
  saving = false,
  resetting = false,
}) => {
  const [rows, setRows] = useState<ShortcutFormRow[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const nextRows = shortcuts.map((shortcut) => {
      const hasCustom = !!(shortcut.customKeys && shortcut.customKeys.length > 0);
      const keysToDisplay = hasCustom ? shortcut.customKeys! : shortcut.defaultKeys;
      return {
        actionId: shortcut.actionId,
        description: shortcut.description,
        category: shortcut.category,
        value: keysToDisplay.join(', '),
        defaultValue: shortcut.defaultKeys.join(', '),
        error: null,
        isCustom: hasCustom,
        updatedAt: shortcut.updatedAt ?? null,
      };
    });
    setRows(nextRows);
  }, [isOpen, shortcuts]);

  const updateRow = (index: number, updater: (row: ShortcutFormRow) => ShortcutFormRow) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? updater(row) : row)));
  };

  const handleChange = (index: number, value: string) => {
    updateRow(index, (row) => ({ ...row, value, error: null }));
  };

  const handleResetRow = (index: number) => {
    updateRow(index, (row) => ({
      ...row,
      value: row.defaultValue,
      error: null,
      isCustom: false,
    }));
  };

  const handleResetAll = async () => {
    await Promise.resolve(onReset());
    setRows((prev) =>
      prev.map((row) => ({ ...row, value: row.defaultValue, error: null, isCustom: false })),
    );
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    let hasError = false;

    const updates: Array<{ actionId: string; keys: string[] }> = [];
    const resets: string[] = [];

    const nextRows = rows.map((row) => {
      const parsed = parseShortcutInput(row.value);
      if (parsed.length === 0) {
        hasError = true;
        return { ...row, error: 'Enter at least one key combination.' };
      }

      const defaults = parseShortcutInput(row.defaultValue);
      if (arraysEqual(parsed, defaults)) {
        if (row.isCustom) {
          resets.push(row.actionId);
        }
        return { ...row, error: null, isCustom: false };
      }

      updates.push({ actionId: row.actionId, keys: parsed });
      return { ...row, error: null, isCustom: true };
    });

    setRows(nextRows);

    if (hasError) {
      return;
    }

    if (resets.length > 0) {
      await Promise.resolve(onReset(resets));
    }

    if (updates.length > 0) {
      await Promise.resolve(onSave(updates));
    } else if (resets.length === 0) {
      await Promise.resolve(onSave([]));
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-settings-heading"
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <header className="p-4 border-b flex items-center justify-between gap-4">
            <div>
              <h2 id="shortcut-settings-heading" className="text-xl font-semibold text-gray-900">
                Customize keyboard shortcuts
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Use commas to separate multiple key combinations (for example, <code>ctrl+1, alt+1</code>). Reset an
                action to restore its default shortcut.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label="Close shortcut settings"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rows.map((row, index) => {
              const fieldId = `shortcut-${row.actionId}`;
              return (
                <div
                  key={row.actionId}
                  className="border rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900">
                        {row.description}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Default: {row.defaultValue || 'None'}
                      </p>
                      {row.updatedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last updated {new Date(row.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetRow(index)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    id={fieldId}
                    name={fieldId}
                    value={row.value}
                    onChange={(event) => handleChange(index, event.target.value)}
                    className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-invalid={row.error ? 'true' : 'false'}
                    aria-describedby={row.error ? `${fieldId}-error` : undefined}
                    placeholder="ctrl+1, alt+1"
                  />
                  {row.error && (
                    <p id={`${fieldId}-error`} className="mt-2 text-sm text-red-600">
                      {row.error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="p-4 border-t flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleResetAll}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-blue-300"
              disabled={resetting}
            >
              {resetting ? 'Resetting…' : 'Reset all to defaults'}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save shortcuts'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
