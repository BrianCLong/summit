"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCommand = void 0;
const commander_1 = require("commander");
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const ora_1 = __importDefault(require("ora"));
exports.metricsCommand = new commander_1.Command('metrics')
    .description('View agentic system metrics');
const API_URL = process.env.SUMMIT_API_URL || 'http://localhost:4000/agentic';
exports.metricsCommand
    .action(async () => {
    const spinner = (0, ora_1.default)('Fetching metrics...').start();
    try {
        const response = await axios_1.default.get(`${API_URL}/metrics`);
        spinner.stop();
        const metrics = response.data;
        console.log(chalk_1.default.bold.blue('\n🚀 Agentic Velocity Metrics'));
        const velocityTable = new cli_table3_1.default({
            head: ['Metric', 'Value'],
            style: { head: ['cyan'] }
        });
        velocityTable.push(['Daily Tasks Completed', metrics.velocity.daily_tasks_completed], ['Avg Task Duration', `${(metrics.velocity.avg_task_duration_ms / 1000).toFixed(1)}s`], ['Success Rate', `${(metrics.velocity.success_rate * 100).toFixed(1)}%`]);
        console.log(velocityTable.toString());
        console.log(chalk_1.default.bold.blue('\n🤖 Agent Status'));
        const agentTable = new cli_table3_1.default({
            head: ['Agent', 'Active', 'Queued'],
            style: { head: ['cyan'] }
        });
        Object.entries(metrics.agents).forEach(([name, stats]) => {
            agentTable.push([name, stats.active, stats.queued]);
        });
        console.log(agentTable.toString());
        console.log(chalk_1.default.bold.blue('\n💰 Budget & Health'));
        console.log(`  Daily Spend: ${chalk_1.default.green('$' + metrics.budget.daily_spend)} / $${metrics.budget.limit}`);
        console.log(`  SLO Status: ${metrics.slo.status === 'healthy' ? chalk_1.default.green('HEALTHY') : chalk_1.default.red(metrics.slo.status)}`);
        console.log(`  Latency P95: ${metrics.slo.latency_p95}ms`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to fetch metrics'));
        console.error(chalk_1.default.red(error.message));
    }
});
