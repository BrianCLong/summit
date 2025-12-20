/**
 * Apache Airflow integration
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from 'winston';

export interface AirflowDAGRun {
  dag_run_id: string;
  dag_id: string;
  state: string;
  execution_date: string;
  start_date: string;
  end_date?: string;
  conf: any;
}

export class AirflowIntegration {
  private logger: Logger;
  private client: AxiosInstance;

  constructor(logger: Logger) {
    this.logger = logger;

    // Initialize Airflow API client
    const airflowUrl = process.env.AIRFLOW_URL || 'http://localhost:8080';
    const username = process.env.AIRFLOW_USERNAME || 'admin';
    const password = process.env.AIRFLOW_PASSWORD || 'admin';

    this.client = axios.create({
      baseURL: `${airflowUrl}/api/v1`,
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Trigger Airflow DAG
   */
  async triggerDAG(dagId: string, conf: any = {}): Promise<AirflowDAGRun> {
    try {
      const response = await this.client.post(`/dags/${dagId}/dagRuns`, {
        conf
      });

      this.logger.info(`Triggered Airflow DAG ${dagId}`, {
        dagRunId: response.data.dag_run_id
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to trigger Airflow DAG ${dagId}`, { error });
      throw error;
    }
  }

  /**
   * Get DAG runs
   */
  async getDAGRuns(dagId: string, limit: number = 25): Promise<AirflowDAGRun[]> {
    try {
      const response = await this.client.get(`/dags/${dagId}/dagRuns`, {
        params: {
          limit,
          order_by: '-execution_date'
        }
      });

      return response.data.dag_runs || [];
    } catch (error) {
      this.logger.error(`Failed to get Airflow DAG runs for ${dagId}`, { error });
      throw error;
    }
  }

  /**
   * Get DAG run status
   */
  async getDAGRunStatus(dagId: string, dagRunId: string): Promise<AirflowDAGRun> {
    try {
      const response = await this.client.get(`/dags/${dagId}/dagRuns/${dagRunId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get DAG run status for ${dagRunId}`, { error });
      throw error;
    }
  }

  /**
   * List all DAGs
   */
  async listDAGs(): Promise<any[]> {
    try {
      const response = await this.client.get('/dags');
      return response.data.dags || [];
    } catch (error) {
      this.logger.error('Failed to list Airflow DAGs', { error });
      throw error;
    }
  }

  /**
   * Pause/Unpause DAG
   */
  async setDAGState(dagId: string, isPaused: boolean): Promise<void> {
    try {
      await this.client.patch(`/dags/${dagId}`, {
        is_paused: isPaused
      });

      this.logger.info(`${isPaused ? 'Paused' : 'Unpaused'} Airflow DAG ${dagId}`);
    } catch (error) {
      this.logger.error(`Failed to set DAG state for ${dagId}`, { error });
      throw error;
    }
  }
}
