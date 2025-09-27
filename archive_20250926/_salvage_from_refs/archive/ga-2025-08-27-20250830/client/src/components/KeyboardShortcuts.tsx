import React, { useEffect, useCallback } from 'react';

interface ShortcutAction {
  keys: string[];
  description: string;
  action: () => void;
  category?: string;
  global?: boolean;
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts,
  enabled = true
}) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
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
    const matchingShortcut = shortcuts.find(shortcut =>
      shortcut.keys.some(keyCombo =>
        keyCombo.toLowerCase() === pressedKeyString
      )
    );

    if (matchingShortcut) {
      // Check if we should prevent default behavior
      const activeElement = document.activeElement;
      const isInputElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Allow some shortcuts even in input fields
      const alwaysAllowed = ['escape', 'ctrl+k', 'ctrl+/'];
      const shouldExecute = !isInputElement || 
        alwaysAllowed.some(allowed => 
          matchingShortcut.keys.some(key => key.toLowerCase() === allowed)
        );

      if (shouldExecute) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    }
  }, [shortcuts, enabled]);

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

      const matchingShortcut = shortcuts.find(shortcut =>
        shortcut.keys.some(keyCombo =>
          keyCombo.toLowerCase() === pressedKeyString
        )
      );

      if (matchingShortcut) {
        const activeElement = document.activeElement;
        const isInputElement = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        );

        const alwaysAllowed = ['escape', 'ctrl+k', 'ctrl+/'];
        const shouldExecute = !isInputElement || 
          alwaysAllowed.some(allowed => 
            matchingShortcut.keys.some(key => key.toLowerCase() === allowed)
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
    .map(key => {
      switch (key.toLowerCase()) {
        case 'ctrl': return '⌘'; // On Mac, show Cmd symbol
        case 'shift': return '⇧';
        case 'alt': return '⌥';
        case 'escape': return 'Esc';
        case 'enter': return '↵';
        case 'space': return 'Space';
        case 'arrowup': return '↑';
        case 'arrowdown': return '↓';
        case 'arrowleft': return '←';
        case 'arrowright': return '→';
        default: return key.toUpperCase();
      }
    })
    .join('');
};

// Component to display available shortcuts
interface ShortcutsHelpProps {
  shortcuts: ShortcutAction[];
  isVisible: boolean;
  onClose: () => void;
}

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({
  shortcuts,
  isVisible,
  onClose
}) => {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutAction[]>);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-80vh overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-96">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((keyCombo, keyIndex) => (
                        <kbd 
                          key={keyIndex}
                          className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono"
                        >
                          {formatKeyCombo(keyCombo)}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t">
          <p className="text-sm text-gray-600">
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
};

// Default shortcuts for the application
export const defaultShortcuts: ShortcutAction[] = [
  // Global Navigation
  {
    keys: ['ctrl+1'],
    description: 'Go to Overview tab',
    action: () => {/* Will be implemented by parent component */},
    category: 'Navigation',
    global: true
  },
  {
    keys: ['ctrl+2'],
    description: 'Go to Investigations tab',
    action: () => {},
    category: 'Navigation',
    global: true
  },
  {
    keys: ['ctrl+3'],
    description: 'Go to Search tab',
    action: () => {},
    category: 'Navigation',
    global: true
  },
  {
    keys: ['ctrl+4'],
    description: 'Go to Export tab',
    action: () => {},
    category: 'Navigation',
    global: true
  },
  {
    keys: ['ctrl+k'],
    description: 'Quick search',
    action: () => {},
    category: 'Navigation',
    global: true
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    action: () => {},
    category: 'Help',
    global: true
  },
  {
    keys: ['escape'],
    description: 'Close modals and panels',
    action: () => {},
    category: 'General',
    global: true
  },

  // Search
  {
    keys: ['/'],
    description: 'Focus search box',
    action: () => {},
    category: 'Search'
  },
  {
    keys: ['enter'],
    description: 'Execute search',
    action: () => {},
    category: 'Search'
  },
  {
    keys: ['ctrl+shift+f'],
    description: 'Toggle advanced filters',
    action: () => {},
    category: 'Search'
  },

  // Graph
  {
    keys: ['space'],
    description: 'Pause/resume graph simulation',
    action: () => {},
    category: 'Graph'
  },
  {
    keys: ['f'],
    description: 'Fit graph to screen',
    action: () => {},
    category: 'Graph'
  },
  {
    keys: ['r'],
    description: 'Reset graph view',
    action: () => {},
    category: 'Graph'
  },
  {
    keys: ['ctrl+a'],
    description: 'Select all nodes',
    action: () => {},
    category: 'Graph'
  },

  // Investigation Management
  {
    keys: ['ctrl+n'],
    description: 'New investigation',
    action: () => {},
    category: 'Investigations'
  },
  {
    keys: ['ctrl+s'],
    description: 'Save investigation',
    action: () => {},
    category: 'Investigations'
  },

  // Export
  {
    keys: ['ctrl+e'],
    description: 'Quick export',
    action: () => {},
    category: 'Export'
  },
  {
    keys: ['ctrl+p'],
    description: 'Print current view',
    action: () => {},
    category: 'Export'
  }
];

export default KeyboardShortcuts;