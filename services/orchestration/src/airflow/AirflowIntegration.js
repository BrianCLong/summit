"use strict";
/**
 * Apache Airflow integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirflowIntegration = void 0;
const axios_1 = __importDefault(require("axios"));
class AirflowIntegration {
    logger;
    client;
    constructor(logger) {
        this.logger = logger;
        // Initialize Airflow API client
        const airflowUrl = process.env.AIRFLOW_URL || 'http://localhost:8080';
        const username = process.env.AIRFLOW_USERNAME || 'admin';
        const password = process.env.AIRFLOW_PASSWORD || 'admin';
        this.client = axios_1.default.create({
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
    async triggerDAG(dagId, conf = {}) {
        try {
            const response = await this.client.post(`/dags/${dagId}/dagRuns`, {
                conf
            });
            this.logger.info(`Triggered Airflow DAG ${dagId}`, {
                dagRunId: response.data.dag_run_id
            });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to trigger Airflow DAG ${dagId}`, { error });
            throw error;
        }
    }
    /**
     * Get DAG runs
     */
    async getDAGRuns(dagId, limit = 25) {
        try {
            const response = await this.client.get(`/dags/${dagId}/dagRuns`, {
                params: {
                    limit,
                    order_by: '-execution_date'
                }
            });
            return response.data.dag_runs || [];
        }
        catch (error) {
            this.logger.error(`Failed to get Airflow DAG runs for ${dagId}`, { error });
            throw error;
        }
    }
    /**
     * Get DAG run status
     */
    async getDAGRunStatus(dagId, dagRunId) {
        try {
            const response = await this.client.get(`/dags/${dagId}/dagRuns/${dagRunId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get DAG run status for ${dagRunId}`, { error });
            throw error;
        }
    }
    /**
     * List all DAGs
     */
    async listDAGs() {
        try {
            const response = await this.client.get('/dags');
            return response.data.dags || [];
        }
        catch (error) {
            this.logger.error('Failed to list Airflow DAGs', { error });
            throw error;
        }
    }
    /**
     * Pause/Unpause DAG
     */
    async setDAGState(dagId, isPaused) {
        try {
            await this.client.patch(`/dags/${dagId}`, {
                is_paused: isPaused
            });
            this.logger.info(`${isPaused ? 'Paused' : 'Unpaused'} Airflow DAG ${dagId}`);
        }
        catch (error) {
            this.logger.error(`Failed to set DAG state for ${dagId}`, { error });
            throw error;
        }
    }
}
exports.AirflowIntegration = AirflowIntegration;
