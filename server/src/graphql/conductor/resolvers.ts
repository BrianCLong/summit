import { getPostgresPool } from '../../db/postgres.js';
import { approvalProgress } from '../../conductor/approvals.js';

export const conductorResolvers = {
  Mutation: {
    approveStep: async (
      _: any,
      { runId, stepId, justification }: any,
      ctx: any,
    ) => {
      const pool = getPostgresPool();
      const userId = ctx?.user?.id || ctx?.user?.email || 'unknown';
      // Record decision in approvals table
      await pool.query(
        `INSERT INTO approvals(run_id, step_id, user_id, verdict, reason)
         VALUES ($1,$2,$3,'approved',$4)
         ON CONFLICT (run_id, step_id, user_id) DO UPDATE SET verdict='approved', reason=$4`,
        [runId, stepId, userId, justification],
      );
      // Emit event for audit
      await pool.query(
        'INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)',
        [runId, 'approval.approved', { stepId, justification, userId }],
      );
      // Check M-of-N threshold
      const prog = await approvalProgress(runId, stepId);
      if (prog.satisfied) {
        await pool.query(
          'UPDATE run_step SET status=$1, blocked_reason=NULL WHERE run_id=$2 AND step_id=$3',
          ['RUNNING', runId, stepId],
        );
      }
      return true;
    },
    declineStep: async (
      _: any,
      { runId, stepId, justification }: any,
      ctx: any,
    ) => {
      const pool = getPostgresPool();
      const userId = ctx?.user?.id || ctx?.user?.email || 'unknown';
      await pool.query(
        `INSERT INTO approvals(run_id, step_id, user_id, verdict, reason)
         VALUES ($1,$2,$3,'declined',$4)
         ON CONFLICT (run_id, step_id, user_id) DO UPDATE SET verdict='declined', reason=$4`,
        [runId, stepId, userId, justification],
      );
      await pool.query(
        'INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)',
        [runId, 'approval.declined', { stepId, justification, userId }],
      );
      await pool.query(
        'UPDATE run_step SET status=$1, blocked_reason=$2, ended_at=now() WHERE run_id=$3 AND step_id=$4',
        ['FAILED', `declined: ${justification}`, runId, stepId],
      );
      await pool.query(
        'UPDATE run SET status=$1, ended_at=now() WHERE id=$2 AND status<>$1',
        ['FAILED', runId],
      );
      return true;
    },
  },
};
