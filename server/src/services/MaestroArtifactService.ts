// server/src/services/MaestroArtifactService.ts
import { pool } from '../db/pg';
import { AppError, NotFoundError } from '../lib/errors';

export type MaestroRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface MaestroRunArtifact {
  id: string;
  run_id: string;
  pipeline_name: string;
  status: MaestroRunStatus;
  artifacts?: object;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * @class MaestroArtifactService
 * @description A service for managing the persistence of Maestro pipeline run artifacts and statuses in PostgreSQL.
 */
export class MaestroArtifactService {
  private static instance: MaestroArtifactService;

  private constructor() {}

  public static getInstance(): MaestroArtifactService {
    if (!MaestroArtifactService.instance) {
      MaestroArtifactService.instance = new MaestroArtifactService();
    }
    return MaestroArtifactService.instance;
  }

  /**
   * Creates a new record for a pipeline run, initially in PENDING status.
   * @param {string} runId - The unique ID of the run.
   * @param {string} pipelineName - The name of the pipeline being run.
   * @returns {Promise<MaestroRunArtifact>} The newly created artifact record.
   */
  async createRun(runId: string, pipelineName: string): Promise<MaestroRunArtifact> {
    const result = await pool.query(
      `INSERT INTO maestro_run_artifacts (run_id, pipeline_name, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING *`,
      [runId, pipelineName]
    );
    return result.rows[0];
  }

  /**
   * Updates the status and artifacts of a pipeline run upon successful completion.
   * @param {string} runId - The ID of the run to update.
   * @param {object} artifacts - The JSON artifacts to store.
   * @returns {Promise<MaestroRunArtifact>} The updated artifact record.
   */
  async recordRunSuccess(runId: string, artifacts: object): Promise<MaestroRunArtifact> {
    const result = await pool.query(
      `UPDATE maestro_run_artifacts
       SET status = 'SUCCESS', artifacts = $1
       WHERE run_id = $2
       RETURNING *`,
      [JSON.stringify(artifacts), runId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError(`Maestro run with ID ${runId} not found.`);
    }
    return result.rows[0];
  }

  /**
   * Updates the status and error message of a pipeline run upon failure.
   * @param {string} runId - The ID of the run to update.
   * @param {string} errorMessage - The error message to record.
   * @returns {Promise<MaestroRunArtifact>} The updated artifact record.
   */
  async recordRunFailure(runId: string, errorMessage: string): Promise<MaestroRunArtifact> {
    const result = await pool.query(
      `UPDATE maestro_run_artifacts
       SET status = 'FAILED', error_message = $1
       WHERE run_id = $2
       RETURNING *`,
      [errorMessage, runId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError(`Maestro run with ID ${runId} not found.`);
    }
    return result.rows[0];
  }
}

export const maestroArtifactService = MaestroArtifactService.getInstance();
