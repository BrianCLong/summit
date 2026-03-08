"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeRegressions = summarizeRegressions;
exports.toTrendPoints = toTrendPoints;
exports.mergeComparisonPayload = mergeComparisonPayload;
exports.regressionHeatmapMatrix = regressionHeatmapMatrix;
function summarizeRegressions(data) {
    const highlights = [];
    for (const task of data.taskDeltas) {
        for (const metric of task.metrics) {
            if (!metric.isRegression)
                continue;
            const severity = metric.goal === 'maximize'
                ? metric.delta < -0.05
                    ? 'critical'
                    : 'warning'
                : metric.delta > 0.05
                    ? 'critical'
                    : 'warning';
            highlights.push({
                taskId: task.taskId,
                metric: metric.metric,
                delta: metric.delta,
                ci: metric.ci,
                severity,
            });
        }
    }
    return highlights.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
function toTrendPoints(versionScores, confidence = 0.95) {
    const z = 1.959963984540054; // approx for 95%
    return versionScores.map(({ version, score, stderr }) => {
        const delta = z * stderr;
        return { version, score, lower: score - delta, upper: score + delta };
    });
}
function mergeComparisonPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload');
    }
    const taskDeltas = (payload.task_deltas || payload.taskDeltas || []).map((task) => ({
        taskId: task.task_id ?? task.taskId,
        scoreDelta: Number(task.score_delta ?? task.scoreDelta ?? 0),
        metrics: (task.metrics || []).map((metric) => ({
            metric: metric.metric,
            goal: metric.goal ?? 'maximize',
            delta: Number(metric.delta ?? 0),
            stderr: Number(metric.stderr ?? 0),
            ci: metric.ci ?? [0, 0],
            isRegression: Boolean(metric.is_regression ?? metric.isRegression ?? false),
        })),
    }));
    const regressions = payload.regressions ?? {};
    return {
        baselineVersion: payload.baseline_version ?? payload.baselineVersion ?? 'baseline',
        candidateVersion: payload.candidate_version ?? payload.candidateVersion ?? 'candidate',
        overallDelta: Number(payload.overall_delta ?? payload.overallDelta ?? 0),
        taskDeltas,
        regressions,
    };
}
function regressionHeatmapMatrix(data) {
    const rows = data.taskDeltas.length;
    const cols = Math.max(...data.taskDeltas.map(task => task.metrics.length), 0);
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
    data.taskDeltas.forEach((task, rowIndex) => {
        task.metrics.forEach((metric, colIndex) => {
            const magnitude = Math.abs(metric.delta);
            matrix[rowIndex][colIndex] = metric.isRegression ? magnitude : 0;
        });
    });
    return matrix;
}
