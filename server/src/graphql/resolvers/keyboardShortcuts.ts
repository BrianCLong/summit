import baseLogger from '../../config/logger';
import {
  listUserKeyboardShortcuts,
  removeUserKeyboardShortcuts,
  upsertUserKeyboardShortcut,
} from '../../db/repositories/keyboardShortcuts';
import {
  DEFAULT_SHORTCUT_MAP,
  KEYBOARD_SHORTCUT_DEFAULTS,
  KeyboardShortcutDefinition,
} from '../keyboardShortcuts/defaults';

const logger = baseLogger.child({ name: 'keyboardShortcutResolvers' });

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

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift'];

function normalizeKeyCombo(combo: string): string {
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
  const pieces = primary ? [...orderedModifiers, primary] : orderedModifiers;
  return pieces.join('+');
}

function buildShortcut(
  definition: KeyboardShortcutDefinition,
  override?: { keys: string[]; description: string | null; updatedAt?: Date | null },
) {
  const customKeys = override?.keys?.map(normalizeKeyCombo).filter(Boolean) || null;
  const effectiveKeys = customKeys && customKeys.length > 0 ? customKeys : definition.defaultKeys;

  return {
    actionId: definition.actionId,
    description: override?.description?.trim() || definition.description,
    category: definition.category,
    defaultKeys: definition.defaultKeys,
    customKeys,
    effectiveKeys,
    updatedAt: override?.updatedAt ?? null,
  };
}

async function assembleUserShortcuts(userId: string) {
  const overrides = await listUserKeyboardShortcuts(userId);
  const overrideMap = new Map(overrides.map((entry) => [entry.actionId, entry]));

  const shortcuts = KEYBOARD_SHORTCUT_DEFAULTS.map((definition) =>
    buildShortcut(definition, overrideMap.get(definition.actionId)),
  );

  overrides.forEach((override) => {
    if (DEFAULT_SHORTCUT_MAP.has(override.actionId)) return;
    shortcuts.push({
      actionId: override.actionId,
      description: override.description?.trim() || override.actionId,
      category: 'Custom',
      defaultKeys: [],
      customKeys: override.keys.map(normalizeKeyCombo).filter(Boolean),
      effectiveKeys: override.keys.map(normalizeKeyCombo).filter(Boolean),
      updatedAt: override.updatedAt ?? null,
    });
  });

  return shortcuts;
}

export const keyboardShortcutResolvers = {
  Query: {
    keyboardShortcuts: async (_: unknown, __: unknown, context: any) => {
      const userId = context?.user?.id || context?.user?.sub;
      if (!userId) {
        throw new Error('Authentication required');
      }

      try {
        return await assembleUserShortcuts(userId);
      } catch (error) {
        logger.error({ err: error }, 'Failed to load keyboard shortcuts');
        throw new Error('Failed to load keyboard shortcuts');
      }
    },
  },
  Mutation: {
    saveKeyboardShortcuts: async (
      _: unknown,
      { input }: { input: Array<{ actionId: string; keys: string[]; description?: string | null }> },
      context: any,
    ) => {
      const userId = context?.user?.id || context?.user?.sub;
      if (!userId) {
        throw new Error('Authentication required');
      }

      if (!Array.isArray(input) || input.length === 0) {
        return assembleUserShortcuts(userId);
      }

      const sanitized = input
        .map((entry) => ({
          actionId: entry.actionId.trim(),
          keys: Array.from(
            new Set(
              (entry.keys || [])
                .map(normalizeKeyCombo)
                .filter((key) => key && key !== '')),
          ),
          description: entry.description?.trim() ?? null,
        }))
        .filter((entry) => entry.actionId && entry.keys.length > 0);

      const tasks = sanitized.map((entry) =>
        upsertUserKeyboardShortcut(userId, entry.actionId, entry.keys, entry.description),
      );

      try {
        await Promise.all(tasks);
        return await assembleUserShortcuts(userId);
      } catch (error) {
        logger.error({ err: error }, 'Failed to save keyboard shortcuts');
        throw new Error('Failed to save keyboard shortcuts');
      }
    },
    resetKeyboardShortcuts: async (
      _: unknown,
      { actionIds }: { actionIds?: string[] | null },
      context: any,
    ) => {
      const userId = context?.user?.id || context?.user?.sub;
      if (!userId) {
        throw new Error('Authentication required');
      }

      try {
        await removeUserKeyboardShortcuts(
          userId,
          actionIds?.map((id) => id.trim()).filter(Boolean),
        );
        return true;
      } catch (error) {
        logger.error({ err: error }, 'Failed to reset keyboard shortcuts');
        throw new Error('Failed to reset keyboard shortcuts');
      }
    },
  },
};

export default keyboardShortcutResolvers;
