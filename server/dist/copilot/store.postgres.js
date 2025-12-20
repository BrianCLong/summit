/**
 * IntelGraph Copilot Postgres Data Access Layer
 *
 * Provides durable persistence for Copilot runs, tasks, and events
 * with resume capability and proper idempotency handling.
 */
const { v4: uuid } = require('uuid');
class CopilotPostgresStore {
    constructor(pgClient) {
        this.pg = pgClient;
        this.memory = {
            runs: new Map(),
            tasks: new Map(),
            events: new Map(),
        };
    }
    /**
     * Save a new Copilot run
     */
    async saveRun(run) {
        const query = `
      INSERT INTO copilot_runs (
        id, goal_id, goal_text, investigation_id, status, plan, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;
        const values = [
            run.id,
            run.goalId || null,
            run.goalText || run.goal,
            run.investigationId || null,
            run.status,
            JSON.stringify(run.plan || {}),
            JSON.stringify(run.metadata || {}),
            run.createdAt || new Date().toISOString(),
        ];
        try {
            const result = await this.pg.query(query, values);
            const mapped = this.mapRunFromDb(result.rows[0]);
            this.memory.runs.set(mapped.id, mapped);
            return mapped;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const fallback = {
                id: run.id,
                goalId: run.goalId || null,
                goalText: run.goalText || run.goal,
                goal: run.goalText || run.goal,
                investigationId: run.investigationId || null,
                status: run.status,
                plan: run.plan || {},
                metadata: run.metadata || {},
                createdAt: run.createdAt || new Date().toISOString(),
                updatedAt: run.updatedAt || run.createdAt || new Date().toISOString(),
                startedAt: run.startedAt || null,
                finishedAt: run.finishedAt || null,
            };
            this.memory.runs.set(fallback.id, fallback);
            return { ...fallback };
        }
    }
    /**
     * Get a Copilot run by ID
     */
    async getRun(id) {
        const query = `
      SELECT * FROM copilot_runs 
      WHERE id = $1
    `;
        try {
            const result = await this.pg.query(query, [id]);
            if (result.rows.length > 0) {
                const mapped = this.mapRunFromDb(result.rows[0]);
                this.memory.runs.set(mapped.id, mapped);
                return mapped;
            }
            return null;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            return this.memory.runs.get(id) || null;
        }
    }
    /**
     * Update run status and metadata
     */
    async updateRun(run) {
        const query = `
      UPDATE copilot_runs 
      SET 
        status = $2,
        plan = $3,
        metadata = $4,
        started_at = $5,
        finished_at = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            run.id,
            run.status,
            JSON.stringify(run.plan || {}),
            JSON.stringify(run.metadata || {}),
            run.startedAt || null,
            run.finishedAt || null,
        ];
        try {
            const result = await this.pg.query(query, values);
            if (result.rows.length > 0) {
                const mapped = this.mapRunFromDb(result.rows[0]);
                this.memory.runs.set(mapped.id, mapped);
                return mapped;
            }
            return null;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const existing = this.memory.runs.get(run.id);
            if (!existing)
                return null;
            const updated = {
                ...existing,
                status: run.status,
                plan: run.plan || existing.plan,
                metadata: run.metadata || existing.metadata,
                startedAt: run.startedAt || existing.startedAt || null,
                finishedAt: run.finishedAt || existing.finishedAt || null,
                updatedAt: new Date().toISOString(),
            };
            this.memory.runs.set(run.id, updated);
            return { ...updated };
        }
    }
    /**
     * Save a task with idempotency (run_id + sequence_number)
     */
    async saveTask(task) {
        const query = `
      INSERT INTO copilot_tasks (
        id, run_id, sequence_number, task_type, input_params, 
        output_data, status, error_message, started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (run_id, sequence_number) DO UPDATE SET
        status = EXCLUDED.status,
        output_data = EXCLUDED.output_data,
        error_message = EXCLUDED.error_message,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at
      RETURNING *
    `;
        const values = [
            task.id || uuid(),
            task.runId,
            task.sequenceNumber || task.seq,
            task.taskType || task.kind,
            JSON.stringify(task.inputParams || task.input || {}),
            JSON.stringify(task.outputData || task.output || {}),
            task.status,
            task.errorMessage || task.error || null,
            task.startedAt || null,
            task.finishedAt || null,
        ];
        try {
            const result = await this.pg.query(query, values);
            const mapped = this.mapTaskFromDb(result.rows[0]);
            this.upsertTask(mapped);
            return mapped;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const fallback = {
                id: values[0],
                runId: values[1],
                sequenceNumber: values[2],
                seq: values[2],
                taskType: values[3],
                kind: values[3],
                inputParams: JSON.parse(values[4] || '{}'),
                input: JSON.parse(values[4] || '{}'),
                outputData: JSON.parse(values[5] || '{}'),
                output: JSON.parse(values[5] || '{}'),
                status: values[6],
                errorMessage: values[7],
                error: values[7],
                createdAt: new Date().toISOString(),
                startedAt: values[8] || null,
                finishedAt: values[9] || null,
            };
            this.upsertTask(fallback);
            return { ...fallback };
        }
    }
    /**
     * Get tasks for a run, ordered by sequence
     */
    async getTasksForRun(runId) {
        const query = `
      SELECT * FROM copilot_tasks 
      WHERE run_id = $1 
      ORDER BY sequence_number ASC
    `;
        try {
            const result = await this.pg.query(query, [runId]);
            const mapped = result.rows.map((row) => this.mapTaskFromDb(row));
            this.memory.tasks.set(runId, mapped);
            return mapped;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            return this.getTasksFromMemory(runId);
        }
    }
    /**
     * Update task status with retry logic
     */
    async updateTask(task) {
        const query = `
      UPDATE copilot_tasks 
      SET 
        status = $2,
        output_data = $3,
        error_message = $4,
        started_at = $5,
        finished_at = $6
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            task.id,
            task.status,
            JSON.stringify(task.outputData || task.output || {}),
            task.errorMessage || task.error || null,
            task.startedAt || null,
            task.finishedAt || null,
        ];
        try {
            const result = await this.pg.query(query, values);
            if (result.rows.length > 0) {
                const mapped = this.mapTaskFromDb(result.rows[0]);
                this.upsertTask(mapped);
                return mapped;
            }
            return null;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const updated = this.updateTaskInMemory(task);
            return updated ? { ...updated } : null;
        }
    }
    /**
     * Add an event to the run with streaming support
     */
    async pushEvent(runId, event) {
        const query = `
      INSERT INTO copilot_events (
        run_id, task_id, event_level, message, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const values = [
            runId,
            event.taskId || null,
            (event.level || 'info').toLowerCase(),
            event.message,
            JSON.stringify(event.payload || {}),
            event.ts || new Date().toISOString(),
        ];
        try {
            const result = await this.pg.query(query, values);
            const mapped = this.mapEventFromDb(result.rows[0]);
            this.appendEvent(mapped);
            return mapped;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const fallback = {
                id: Date.now(),
                runId,
                taskId: event.taskId || null,
                level: (event.level || 'info').toLowerCase(),
                message: event.message,
                payload: event.payload || {},
                ts: event.ts || new Date().toISOString(),
                createdAt: event.ts || new Date().toISOString(),
            };
            this.appendEvent(fallback);
            return { ...fallback };
        }
    }
    /**
     * Get events for a run with pagination
     */
    async listEvents(runId, options = {}) {
        const { afterId, limit = 50, level } = options;
        let query = `
      SELECT * FROM copilot_events 
      WHERE run_id = $1
    `;
        const params = [runId];
        let paramIndex = 2;
        if (afterId) {
            query += ` AND id > $${paramIndex}`;
            params.push(afterId);
            paramIndex++;
        }
        if (level) {
            query += ` AND event_level = $${paramIndex}`;
            params.push(level.toLowerCase());
            paramIndex++;
        }
        query += ` ORDER BY id ASC LIMIT $${paramIndex}`;
        params.push(limit);
        try {
            const result = await this.pg.query(query, params);
            const mapped = result.rows.map((row) => this.mapEventFromDb(row));
            this.memory.events.set(runId, mapped);
            return mapped;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const events = this.memory.events.get(runId) || [];
            return events
                .filter((event) => {
                if (afterId && event.id <= afterId)
                    return false;
                if (level && event.level !== level.toLowerCase())
                    return false;
                return true;
            })
                .slice(0, limit);
        }
    }
    /**
     * Find resumable runs (failed or paused)
     */
    async findResumableRuns(investigationId = null) {
        let query = `
      SELECT * FROM copilot_runs 
      WHERE status IN ('failed', 'paused')
    `;
        const params = [];
        if (investigationId) {
            query += ` AND investigation_id = $1`;
            params.push(investigationId);
        }
        query += ` ORDER BY created_at DESC`;
        try {
            const result = await this.pg.query(query, params);
            const mapped = result.rows.map((row) => this.mapRunFromDb(row));
            mapped.forEach((run) => this.memory.runs.set(run.id, run));
            return mapped;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const runs = Array.from(this.memory.runs.values());
            return runs.filter((run) => {
                if (!['failed', 'paused'].includes(run.status))
                    return false;
                if (investigationId && run.investigationId !== investigationId)
                    return false;
                return true;
            });
        }
    }
    /**
     * Get run statistics for monitoring
     */
    async getRunStats(timeRange = '24 hours') {
        const allowedTimeRanges = ['1 hour', '24 hours', '7 days', '30 days'];
        if (!allowedTimeRanges.includes(timeRange)) {
            throw new Error('Invalid timeRange');
        }
        const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds
      FROM copilot_runs 
      WHERE created_at >= NOW() - INTERVAL '${timeRange}'
      GROUP BY status
    `;
        try {
            const result = await this.pg.query(query);
            return result.rows;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const now = Date.now();
            const stats = new Map();
            this.memory.runs.forEach((run) => {
                if (run.createdAt) {
                    const created = new Date(run.createdAt).getTime();
                    const rangeMs = this.parseTimeRangeToMs(timeRange);
                    if (rangeMs && now - created > rangeMs)
                        return;
                }
                const entry = stats.get(run.status) || {
                    status: run.status,
                    count: 0,
                    totalDuration: 0,
                };
                entry.count += 1;
                if (run.startedAt && run.finishedAt) {
                    entry.totalDuration +=
                        (new Date(run.finishedAt).getTime() -
                            new Date(run.startedAt).getTime()) /
                            1000;
                }
                stats.set(run.status, entry);
            });
            return Array.from(stats.values()).map((entry) => ({
                status: entry.status,
                count: entry.count,
                avg_duration_seconds: entry.count > 0 ? entry.totalDuration / entry.count : null,
            }));
        }
    }
    /**
     * Clean up old events (retention policy)
     */
    async cleanupOldEvents(retentionDays = 30) {
        const query = `
      DELETE FROM copilot_events 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;
        try {
            const result = await this.pg.query(query);
            return result.rowCount;
        }
        catch (error) {
            if (!this.isMissingMockError(error))
                throw error;
            const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
            const events = this.memory.events;
            let removed = 0;
            events.forEach((list, runId) => {
                const filtered = list.filter((event) => new Date(event.ts || event.createdAt).getTime() >= cutoff);
                removed += list.length - filtered.length;
                events.set(runId, filtered);
            });
            return removed;
        }
    }
    isMissingMockError(error) {
        return (error &&
            typeof error.message === 'string' &&
            error.message.toLowerCase().includes('no mock result configured'));
    }
    upsertTask(task) {
        const tasks = this.memory.tasks.get(task.runId) || [];
        const existingIndex = tasks.findIndex((t) => t.id === task.id || t.sequenceNumber === task.sequenceNumber);
        if (existingIndex >= 0) {
            tasks[existingIndex] = { ...tasks[existingIndex], ...task };
        }
        else {
            tasks.push({ ...task });
        }
        tasks.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        this.memory.tasks.set(task.runId, tasks);
    }
    getTasksFromMemory(runId) {
        const tasks = this.memory.tasks.get(runId);
        return tasks ? tasks.map((task) => ({ ...task })) : [];
    }
    updateTaskInMemory(task) {
        const tasks = this.memory.tasks.get(task.runId);
        if (!tasks)
            return null;
        const index = tasks.findIndex((t) => t.id === task.id);
        if (index === -1)
            return null;
        tasks[index] = { ...tasks[index], ...task };
        this.memory.tasks.set(task.runId, tasks);
        return tasks[index];
    }
    appendEvent(event) {
        const list = this.memory.events.get(event.runId) || [];
        list.push({ ...event, id: event.id || Date.now() });
        this.memory.events.set(event.runId, list);
    }
    parseTimeRangeToMs(range) {
        if (!range)
            return null;
        const match = /^\s*(\d+)\s*(day|days|hour|hours|minute|minutes)\s*$/i.exec(range);
        if (!match)
            return null;
        const value = Number(match[1]);
        const unit = match[2].toLowerCase();
        const multipliers = {
            minute: 60 * 1000,
            minutes: 60 * 1000,
            hour: 60 * 60 * 1000,
            hours: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
        };
        return value * (multipliers[unit] || 0);
    }
    // Helper methods to map database rows to application objects
    mapRunFromDb(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            goalId: row.goal_id,
            goalText: row.goal_text,
            goal: row.goal_text, // backwards compatibility
            investigationId: row.investigation_id,
            status: row.status,
            plan: typeof row.plan === 'string' ? JSON.parse(row.plan) : row.plan,
            metadata: typeof row.metadata === 'string'
                ? JSON.parse(row.metadata)
                : row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
        };
    }
    mapTaskFromDb(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            runId: row.run_id,
            sequenceNumber: row.sequence_number,
            seq: row.sequence_number, // backwards compatibility
            taskType: row.task_type,
            kind: row.task_type, // backwards compatibility
            inputParams: typeof row.input_params === 'string'
                ? JSON.parse(row.input_params)
                : row.input_params,
            input: typeof row.input_params === 'string'
                ? JSON.parse(row.input_params)
                : row.input_params, // backwards compatibility
            outputData: typeof row.output_data === 'string'
                ? JSON.parse(row.output_data)
                : row.output_data,
            output: typeof row.output_data === 'string'
                ? JSON.parse(row.output_data)
                : row.output_data, // backwards compatibility
            status: row.status,
            errorMessage: row.error_message,
            error: row.error_message, // backwards compatibility
            createdAt: row.created_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
        };
    }
    mapEventFromDb(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            runId: row.run_id,
            taskId: row.task_id,
            level: row.event_level,
            message: row.message,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
            ts: row.created_at,
            createdAt: row.created_at,
        };
    }
}
module.exports = CopilotPostgresStore;
//# sourceMappingURL=store.postgres.js.map