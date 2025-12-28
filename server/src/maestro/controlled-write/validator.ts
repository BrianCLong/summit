import { WriteActionType, WritePayload } from './types';

export class WriteValidator {
  private static readonly PROHIBITED_KEYWORDS = [
    'git merge',
    'git push',
    'rm -rf',
    'DROP TABLE',
    'DELETE FROM',
  ];

  public static validateAction(type: WriteActionType, payload: WritePayload): void {
    if (!['DRAFT', 'PROPOSE', 'ANNOTATE'].includes(type)) {
      throw new Error(`Action type ${type} is not allowed.`);
    }

    if (this.isDirectMerge(payload)) {
      throw new Error('Direct merge operations are strictly prohibited.');
    }

    if (this.containsDangerousCommands(payload)) {
      throw new Error('Payload contains prohibited dangerous commands.');
    }
  }

  private static isDirectMerge(payload: WritePayload): boolean {
    // Basic check for merge attempts in diffs or content
    // In a real system, this would be more sophisticated parsing
    const content = (payload.content || '') + (payload.diff || '');
    return content.includes('<<<<<<< SEARCH'); // Conflict markers might indicate merge resolution, but here we want to block initiating merges
  }

  private static containsDangerousCommands(payload: WritePayload): boolean {
    const content = (payload.content || '') + (payload.diff || '');
    return this.PROHIBITED_KEYWORDS.some((keyword) => content.includes(keyword));
  }
}
