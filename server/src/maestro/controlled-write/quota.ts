import { WriteAction, WriteBudget, WritePayload } from './types';

export class WriteQuotaManager {
    // Default budget if none specified
    private static readonly DEFAULT_BUDGET: WriteBudget = {
        maxFiles: 5,
        maxLines: 200,
        maxSteps: 10
    };

    public static checkBudget(action: WriteAction, budgetOverride?: WriteBudget): void {
        const budget = budgetOverride || action.budget || this.DEFAULT_BUDGET;
        const payload = action.payload;

        // check file count (simplified: payload target is usually 1 file)
        // If payload involved multiple files (e.g. batch), we'd check that
        const fileCount = 1;
        if (fileCount > budget.maxFiles) {
            throw new Error(`Budget exceeded: ${fileCount} files > limit ${budget.maxFiles}`);
        }

        // Check line count
        const lines = this.countLines(payload);
        if (lines > budget.maxLines) {
            throw new Error(`Budget exceeded: ${lines} lines > limit ${budget.maxLines}`);
        }

        // Steps would be checked during execution flow if it's a multi-step action
    }

    private static countLines(payload: WritePayload): number {
        const content = (payload.content || '') + (payload.diff || '');
        if (!content) return 0;
        return content.split('\n').length;
    }
}
