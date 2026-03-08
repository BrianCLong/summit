"use strict";
/**
 * Multi-Cloud Cost Analyzer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostAnalyzer = void 0;
const client_cost_explorer_1 = require("@aws-sdk/client-cost-explorer");
const logger_1 = require("../utils/logger");
class CostAnalyzer {
    awsClient;
    constructor() {
        this.awsClient = new client_cost_explorer_1.CostExplorerClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
    }
    /**
     * Get current costs across all clouds
     */
    async getCurrentCosts(options = {}) {
        const { provider, startDate, endDate } = options;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        if (!provider || provider === 'aws') {
            return this.getAWSCosts(start, end);
        }
        if (provider === 'azure') {
            return this.getAzureCosts(start, end);
        }
        if (provider === 'gcp') {
            return this.getGCPCosts(start, end);
        }
        // Get all providers
        const [aws, azure, gcp] = await Promise.allSettled([
            this.getAWSCosts(start, end),
            this.getAzureCosts(start, end),
            this.getGCPCosts(start, end)
        ]);
        return {
            aws: aws.status === 'fulfilled' ? aws.value : null,
            azure: azure.status === 'fulfilled' ? azure.value : null,
            gcp: gcp.status === 'fulfilled' ? gcp.value : null,
            total: this.calculateTotal([
                aws.status === 'fulfilled' ? aws.value : null,
                azure.status === 'fulfilled' ? azure.value : null,
                gcp.status === 'fulfilled' ? gcp.value : null
            ])
        };
    }
    /**
     * Forecast costs
     */
    async forecastCosts(options = {}) {
        const { provider, days = 30 } = options;
        if (!provider || provider === 'aws') {
            return this.forecastAWSCosts(days);
        }
        if (provider === 'azure') {
            return this.forecastAzureCosts(days);
        }
        if (provider === 'gcp') {
            return this.forecastGCPCosts(days);
        }
        const [aws, azure, gcp] = await Promise.allSettled([
            this.forecastAWSCosts(days),
            this.forecastAzureCosts(days),
            this.forecastGCPCosts(days)
        ]);
        return {
            aws: aws.status === 'fulfilled' ? aws.value : null,
            azure: azure.status === 'fulfilled' ? azure.value : null,
            gcp: gcp.status === 'fulfilled' ? gcp.value : null
        };
    }
    /**
     * Get cost breakdown by service, region, etc.
     */
    async getCostBreakdown(options = {}) {
        const { provider, groupBy = 'service' } = options;
        if (!provider || provider === 'aws') {
            return this.getAWSCostBreakdown(groupBy);
        }
        if (provider === 'azure') {
            return this.getAzureCostBreakdown(groupBy);
        }
        if (provider === 'gcp') {
            return this.getGCPCostBreakdown(groupBy);
        }
        return {
            aws: await this.getAWSCostBreakdown(groupBy),
            azure: await this.getAzureCostBreakdown(groupBy),
            gcp: await this.getGCPCostBreakdown(groupBy)
        };
    }
    /**
     * Run complete cost analysis
     */
    async runAnalysis() {
        logger_1.logger.info('Running cost analysis...');
        const costs = await this.getCurrentCosts();
        const forecast = await this.forecastCosts();
        const breakdown = await this.getCostBreakdown();
        logger_1.logger.info('Cost analysis completed', {
            currentCosts: costs.total,
            forecast: forecast
        });
        // Store results in database or send to monitoring
        await this.storeAnalysisResults({
            timestamp: new Date(),
            costs,
            forecast,
            breakdown
        });
    }
    /**
     * Generate daily cost report
     */
    async generateDailyReport() {
        logger_1.logger.info('Generating daily cost report...');
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const costs = await this.getCurrentCosts({
            startDate: yesterday,
            endDate: new Date()
        });
        // Send report via email or webhook
        logger_1.logger.info('Daily cost report generated', { costs });
    }
    // AWS-specific methods
    async getAWSCosts(startDate, endDate) {
        try {
            const response = await this.awsClient.send(new client_cost_explorer_1.GetCostAndUsageCommand({
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                },
                Granularity: 'DAILY',
                Metrics: ['UnblendedCost', 'UsageQuantity']
            }));
            const total = response.ResultsByTime?.reduce((sum, result) => {
                const cost = parseFloat(result.Total?.UnblendedCost?.Amount || '0');
                return sum + cost;
            }, 0);
            return {
                provider: 'aws',
                total,
                currency: 'USD',
                period: { start: startDate, end: endDate },
                details: response.ResultsByTime
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get AWS costs:', error);
            throw error;
        }
    }
    async forecastAWSCosts(days) {
        try {
            const startDate = new Date();
            const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            const response = await this.awsClient.send(new client_cost_explorer_1.GetCostForecastCommand({
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                },
                Metric: 'UNBLENDED_COST',
                Granularity: 'DAILY'
            }));
            return {
                provider: 'aws',
                forecast: parseFloat(response.Total?.Amount || '0'),
                currency: 'USD',
                period: { start: startDate, end: endDate }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to forecast AWS costs:', error);
            throw error;
        }
    }
    async getAWSCostBreakdown(groupBy) {
        try {
            const endDate = new Date();
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const groupByDimension = groupBy === 'service' ? 'SERVICE' : 'REGION';
            const response = await this.awsClient.send(new client_cost_explorer_1.GetCostAndUsageCommand({
                TimePeriod: {
                    Start: startDate.toISOString().split('T')[0],
                    End: endDate.toISOString().split('T')[0]
                },
                Granularity: 'MONTHLY',
                Metrics: ['UnblendedCost'],
                GroupBy: [
                    {
                        Type: 'DIMENSION',
                        Key: groupByDimension
                    }
                ]
            }));
            return {
                provider: 'aws',
                groupBy,
                breakdown: response.ResultsByTime
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get AWS cost breakdown:', error);
            throw error;
        }
    }
    // Azure-specific methods (placeholder)
    async getAzureCosts(startDate, endDate) {
        // Implement Azure cost retrieval
        logger_1.logger.warn('Azure cost retrieval not yet implemented');
        return { provider: 'azure', total: 0, currency: 'USD' };
    }
    async forecastAzureCosts(days) {
        logger_1.logger.warn('Azure cost forecast not yet implemented');
        return { provider: 'azure', forecast: 0, currency: 'USD' };
    }
    async getAzureCostBreakdown(groupBy) {
        logger_1.logger.warn('Azure cost breakdown not yet implemented');
        return { provider: 'azure', groupBy, breakdown: [] };
    }
    // GCP-specific methods (placeholder)
    async getGCPCosts(startDate, endDate) {
        logger_1.logger.warn('GCP cost retrieval not yet implemented');
        return { provider: 'gcp', total: 0, currency: 'USD' };
    }
    async forecastGCPCosts(days) {
        logger_1.logger.warn('GCP cost forecast not yet implemented');
        return { provider: 'gcp', forecast: 0, currency: 'USD' };
    }
    async getGCPCostBreakdown(groupBy) {
        logger_1.logger.warn('GCP cost breakdown not yet implemented');
        return { provider: 'gcp', groupBy, breakdown: [] };
    }
    calculateTotal(costs) {
        return costs.reduce((sum, cost) => {
            if (cost && typeof cost.total === 'number') {
                return sum + cost.total;
            }
            return sum;
        }, 0);
    }
    async storeAnalysisResults(results) {
        // Store results in database or send to monitoring system
        logger_1.logger.debug('Storing analysis results:', results);
    }
}
exports.CostAnalyzer = CostAnalyzer;
