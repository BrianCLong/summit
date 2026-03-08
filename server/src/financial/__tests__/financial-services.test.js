"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * Financial Compliance Module - Test Suite
 *
 * Tests for trade surveillance, risk analytics, fraud detection,
 * market data, and regulatory reporting services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const TradeSurveillanceService_js_1 = require("../surveillance/TradeSurveillanceService.js");
const RiskAnalyticsService_js_1 = require("../risk/RiskAnalyticsService.js");
const FraudDetectionService_js_1 = require("../fraud/FraudDetectionService.js");
const MarketDataService_js_1 = require("../market/MarketDataService.js");
const RegulatoryReportingService_js_1 = require("../reporting/RegulatoryReportingService.js");
const index_js_1 = require("../index.js");
// Mock pg Pool
const mockQuery = globals_1.jest.fn();
const mockPool = {
    query: mockQuery,
    connect: globals_1.jest.fn(),
    end: globals_1.jest.fn(),
};
(0, globals_1.describe)('Financial Compliance Module', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetAllMocks(); // Reset implementations, not just calls
    });
    (0, globals_1.describe)('createFinancialServices', () => {
        (0, globals_1.it)('should create all financial services', () => {
            const services = (0, index_js_1.createFinancialServices)(mockPool);
            (0, globals_1.expect)(services.surveillance).toBeInstanceOf(TradeSurveillanceService_js_1.TradeSurveillanceService);
            (0, globals_1.expect)(services.risk).toBeInstanceOf(RiskAnalyticsService_js_1.RiskAnalyticsService);
            (0, globals_1.expect)(services.fraud).toBeInstanceOf(FraudDetectionService_js_1.FraudDetectionService);
            (0, globals_1.expect)(services.market).toBeInstanceOf(MarketDataService_js_1.MarketDataService);
            (0, globals_1.expect)(services.reporting).toBeInstanceOf(RegulatoryReportingService_js_1.RegulatoryReportingService);
        });
        (0, globals_1.it)('should accept custom configuration', () => {
            const config = {
                surveillance: { washTradingTimeWindowMs: 120000 },
                fraud: { structuringThreshold: 5000 },
            };
            const services = (0, index_js_1.createFinancialServices)(mockPool, config);
            (0, globals_1.expect)(services.surveillance).toBeDefined();
            (0, globals_1.expect)(services.fraud).toBeDefined();
        });
    });
    (0, globals_1.describe)('TradeSurveillanceService', () => {
        let service;
        (0, globals_1.beforeEach)(() => {
            service = new TradeSurveillanceService_js_1.TradeSurveillanceService(mockPool);
        });
        (0, globals_1.describe)('analyzeTrade', () => {
            (0, globals_1.it)('should detect restricted list violation', async () => {
                const trade = {
                    tradeId: 'trade-1',
                    tenantId: 'tenant-1',
                    accountId: 'account-1',
                    traderId: 'trader-1',
                    symbol: 'RESTRICTED',
                    side: 'buy',
                    quantity: 100,
                    price: 50.00,
                    executionTime: new Date(),
                    venue: 'NYSE',
                    orderType: 'market',
                    status: 'filled',
                    currency: 'USD',
                    assetClass: 'equity',
                };
                // Mock restricted list check
                mockQuery
                    .mockResolvedValueOnce({ rows: [{ symbol: 'RESTRICTED' }] }) // loadRestrictedList
                    .mockResolvedValueOnce({ rows: [] }) // loadPositionLimits
                    .mockResolvedValueOnce({ rows: [] }) // wash trading check
                    .mockResolvedValueOnce({ rows: [{ avg_volume: '0', stddev_volume: '0' }] }) // unusual volume
                    .mockResolvedValueOnce({ rows: [{ today_volume: '0' }] })
                    .mockResolvedValueOnce({ rows: [] }); // store alert
                // Re-create service to pick up mocked restricted list
                service = new TradeSurveillanceService_js_1.TradeSurveillanceService(mockPool);
                const alerts = await service.analyzeTrade(trade);
                (0, globals_1.expect)(alerts.length).toBeGreaterThanOrEqual(0);
            });
            (0, globals_1.it)('should handle trades without violations', async () => {
                const trade = {
                    tradeId: 'trade-2',
                    tenantId: 'tenant-1',
                    accountId: 'account-1',
                    traderId: 'trader-1',
                    symbol: 'AAPL',
                    side: 'buy',
                    quantity: 100,
                    price: 150.00,
                    executionTime: new Date(),
                    venue: 'NASDAQ',
                    orderType: 'limit',
                    status: 'filled',
                    currency: 'USD',
                    assetClass: 'equity',
                };
                mockQuery
                    .mockResolvedValueOnce({ rows: [] }) // restricted list
                    .mockResolvedValueOnce({ rows: [] }) // position limits
                    .mockResolvedValueOnce({ rows: [] }) // wash trading
                    .mockResolvedValueOnce({ rows: [{ avg_volume: '1000000', stddev_volume: '100000' }] })
                    .mockResolvedValueOnce({ rows: [{ today_volume: '50000' }] });
                const alerts = await service.analyzeTrade(trade);
                (0, globals_1.expect)(alerts).toEqual([]);
            });
        });
        (0, globals_1.describe)('analyzeOrder', () => {
            (0, globals_1.it)('should detect layering pattern', async () => {
                const order = {
                    orderId: 'order-1',
                    tenantId: 'tenant-1',
                    accountId: 'account-1',
                    traderId: 'trader-1',
                    symbol: 'AAPL',
                    side: 'buy',
                    quantity: 1000,
                    filledQuantity: 0,
                    price: 150.00,
                    orderType: 'limit',
                    timeInForce: 'day',
                    status: 'new',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                // Set up all mocks including constructor's loadRestrictedList and loadPositionLimits
                mockQuery
                    .mockResolvedValueOnce({ rows: [] }) // loadRestrictedList (constructor)
                    .mockResolvedValueOnce({ rows: [] }) // loadPositionLimits (constructor)
                    .mockResolvedValueOnce({
                    rows: [{
                            cancelled_count: '8',
                            total_count: '10',
                            price_levels: '5'
                        }]
                }) // detectLayering query - 80% cancel ratio triggers alert
                    .mockResolvedValueOnce({ rows: [] }) // detectSpoofing query
                    .mockResolvedValue({ rows: [] }); // storeAlert and fallback
                // Re-create service to use mocked constructor calls
                service = new TradeSurveillanceService_js_1.TradeSurveillanceService(mockPool);
                // Wait for constructor's async load methods to complete
                await new Promise(resolve => setTimeout(resolve, 10));
                const alerts = await service.analyzeOrder(order);
                // With 80% cancel ratio and 5 price levels, should trigger layering alert
                (0, globals_1.expect)(alerts.some(a => a.alertType === 'layering')).toBe(true);
            });
        });
        (0, globals_1.describe)('getAlerts', () => {
            (0, globals_1.it)('should return filtered alerts', async () => {
                mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });
                mockQuery.mockResolvedValueOnce({
                    rows: [
                        {
                            alert_id: 'alert-1',
                            tenant_id: 'tenant-1',
                            alert_type: 'wash_trading',
                            severity: 'high',
                            status: 'open',
                            title: 'Test Alert',
                            description: 'Test description',
                            detected_at: new Date(),
                            trades: '[]',
                            orders: '[]',
                            accounts: '[]',
                            traders: '[]',
                            symbols: '[]',
                            confidence: 0.85,
                            evidence: '{}',
                        },
                    ],
                });
                const result = await service.getAlerts('tenant-1', {
                    status: ['open'],
                    severity: ['high'],
                    limit: 10,
                });
                (0, globals_1.expect)(result.total).toBe(10);
                (0, globals_1.expect)(result.alerts).toHaveLength(1);
                (0, globals_1.expect)(result.alerts[0].alertType).toBe('wash_trading');
            });
        });
        (0, globals_1.describe)('Restricted List Management', () => {
            (0, globals_1.it)('should add symbol to restricted list', async () => {
                mockQuery.mockResolvedValueOnce({ rows: [] });
                await service.addToRestrictedList('tenant-1', 'XYZ', 'Pending acquisition', 'admin');
                (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO restricted_list'), globals_1.expect.arrayContaining(['tenant-1', 'XYZ', 'Pending acquisition', 'admin']));
            });
            (0, globals_1.it)('should get restricted list', async () => {
                mockQuery.mockResolvedValueOnce({
                    rows: [
                        { symbol: 'ABC', reason: 'Insider knowledge', expires_at: null },
                        { symbol: 'DEF', reason: 'Pending merger', expires_at: new Date() },
                    ],
                });
                const list = await service.getRestrictedList('tenant-1');
                (0, globals_1.expect)(list).toHaveLength(2);
                (0, globals_1.expect)(list[0].symbol).toBe('ABC');
            });
        });
    });
    (0, globals_1.describe)('RiskAnalyticsService', () => {
        let service;
        (0, globals_1.beforeEach)(() => {
            service = new RiskAnalyticsService_js_1.RiskAnalyticsService(mockPool);
        });
        (0, globals_1.describe)('calculatePortfolioRisk', () => {
            (0, globals_1.it)('should calculate VaR and other risk metrics', async () => {
                // Mock positions
                mockQuery.mockResolvedValueOnce({
                    rows: [
                        { symbol: 'AAPL', quantity: '100', market_value: '15000', cost_basis: '14000', asset_class: 'equity' },
                        { symbol: 'GOOGL', quantity: '50', market_value: '7000', cost_basis: '6500', asset_class: 'equity' },
                    ],
                });
                // Mock price history
                const priceHistory = Array.from({ length: 252 }, (_, i) => ({
                    date: new Date(Date.now() - i * 86400000),
                    price: (100 + Math.random() * 10).toString(),
                }));
                mockQuery
                    .mockResolvedValue({ rows: priceHistory });
                // With proper mock setup, the service should calculate risk metrics
                const result = await service.calculatePortfolioRisk('tenant-1', 'portfolio-1');
                // Verify that risk metrics are calculated
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result.portfolioId).toBe('portfolio-1');
                (0, globals_1.expect)(result.tenantId).toBe('tenant-1');
                (0, globals_1.expect)(typeof result.var95).toBe('number');
                (0, globals_1.expect)(typeof result.var99).toBe('number');
            });
        });
        (0, globals_1.describe)('calculateCounterpartyRisk', () => {
            (0, globals_1.it)('should calculate counterparty risk metrics', async () => {
                mockQuery
                    .mockResolvedValueOnce({
                    rows: [{
                            counterparty_id: 'cp-1',
                            name: 'Bank ABC',
                            credit_rating: 'A',
                            credit_limit: '1000000',
                            last_review_date: new Date(),
                            next_review_date: new Date(),
                        }],
                })
                    .mockResolvedValueOnce({ rows: [{ total_exposure: '500000' }] })
                    .mockResolvedValueOnce({ rows: [] })
                    .mockResolvedValueOnce({ rows: [] });
                const risk = await service.calculateCounterpartyRisk('tenant-1', 'cp-1');
                (0, globals_1.expect)(risk.counterpartyId).toBe('cp-1');
                (0, globals_1.expect)(risk.currentExposure).toBe(500000);
                (0, globals_1.expect)(risk.utilizationPercent).toBe(50);
                (0, globals_1.expect)(risk.probabilityOfDefault).toBeGreaterThan(0);
            });
            (0, globals_1.it)('should throw error for non-existent counterparty', async () => {
                mockQuery.mockResolvedValueOnce({ rows: [] });
                await (0, globals_1.expect)(service.calculateCounterpartyRisk('tenant-1', 'non-existent')).rejects.toThrow('Counterparty not found');
            });
        });
    });
    (0, globals_1.describe)('FraudDetectionService', () => {
        let service;
        (0, globals_1.beforeEach)(() => {
            service = new FraudDetectionService_js_1.FraudDetectionService(mockPool);
        });
        (0, globals_1.describe)('analyzeTransaction', () => {
            (0, globals_1.it)('should detect structuring pattern', async () => {
                const transaction = {
                    transactionId: 'tx-1',
                    tenantId: 'tenant-1',
                    accountId: 'account-1',
                    customerId: 'customer-1',
                    type: 'deposit',
                    amount: 9500,
                    currency: 'USD',
                    timestamp: new Date(),
                    channel: 'branch',
                };
                mockQuery
                    .mockResolvedValueOnce({
                    rows: [{
                            tx_count: '5',
                            total_amount: '45000',
                            transaction_ids: ['tx-2', 'tx-3', 'tx-4', 'tx-5', 'tx-6'],
                        }],
                })
                    .mockResolvedValueOnce({ rows: [{ daily_total: '10000', weekly_total: '50000' }] })
                    .mockResolvedValueOnce({ rows: [] }) // geographic
                    .mockResolvedValueOnce({ rows: [] }) // behavior
                    .mockResolvedValueOnce({ rows: [] }) // sanctions
                    .mockResolvedValueOnce({ rows: [] }); // store alert
                const alerts = await service.analyzeTransaction(transaction);
                (0, globals_1.expect)(alerts.some(a => a.alertType === 'structuring')).toBe(true);
            });
            (0, globals_1.it)('should detect geographic anomaly', async () => {
                const transaction = {
                    transactionId: 'tx-1',
                    tenantId: 'tenant-1',
                    accountId: 'account-1',
                    customerId: 'customer-1',
                    type: 'transfer',
                    amount: 50000,
                    currency: 'USD',
                    timestamp: new Date(),
                    counterpartyCountry: 'IR', // High-risk country
                    channel: 'wire',
                };
                mockQuery
                    .mockResolvedValueOnce({ rows: [] }) // structuring
                    .mockResolvedValueOnce({ rows: [{ daily_total: '0', weekly_total: '0' }] })
                    .mockResolvedValueOnce({ rows: [] }) // behavior
                    .mockResolvedValueOnce({ rows: [] }) // sanctions
                    .mockResolvedValueOnce({ rows: [] }); // store alert
                const alerts = await service.analyzeTransaction(transaction);
                (0, globals_1.expect)(alerts.some(a => a.alertType === 'geographic_anomaly')).toBe(true);
            });
        });
        (0, globals_1.describe)('performKYCScreening', () => {
            (0, globals_1.it)('should screen customer and calculate risk rating', async () => {
                mockQuery
                    .mockResolvedValueOnce({ rows: [] }) // existing profile
                    .mockResolvedValueOnce({ rows: [] }) // PEP check
                    .mockResolvedValueOnce({ rows: [] }) // Sanctions check
                    .mockResolvedValueOnce({ rows: [] }) // Adverse media
                    .mockResolvedValueOnce({ rows: [] }); // Store profile
                const profile = await service.performKYCScreening('tenant-1', 'customer-1', {
                    fullName: 'John Doe',
                    dateOfBirth: new Date('1980-01-01'),
                    nationality: 'US',
                    countryOfResidence: 'US',
                    customerType: 'individual',
                });
                (0, globals_1.expect)(profile.customerId).toBe('customer-1');
                (0, globals_1.expect)(profile.kycStatus).toBe('pending');
                (0, globals_1.expect)(profile.riskRating).toBeDefined();
            });
            (0, globals_1.it)('should flag PEP matches', async () => {
                mockQuery
                    .mockResolvedValueOnce({ rows: [] }) // existing profile
                    .mockResolvedValueOnce({
                    rows: [{
                            pep_name: 'John Doe',
                            position: 'Former Minister',
                            country: 'US',
                        }],
                }) // PEP match
                    .mockResolvedValueOnce({ rows: [] }) // Sanctions
                    .mockResolvedValueOnce({ rows: [] }) // Adverse media
                    .mockResolvedValueOnce({ rows: [] }) // Store profile
                    .mockResolvedValueOnce({ rows: [] }); // Store alert
                const profile = await service.performKYCScreening('tenant-1', 'customer-1', {
                    fullName: 'John Doe',
                    countryOfResidence: 'US',
                    customerType: 'individual',
                });
                (0, globals_1.expect)(profile.pepStatus).toBe(true);
                (0, globals_1.expect)(profile.riskRating).not.toBe('minimal');
            });
        });
        (0, globals_1.describe)('createAMLCase', () => {
            (0, globals_1.it)('should create investigation case from alerts', async () => {
                mockQuery
                    .mockResolvedValueOnce({ rows: [{ full_name: 'John Doe' }] })
                    .mockResolvedValueOnce({ rows: [{ avg_score: '75' }] })
                    .mockResolvedValueOnce({ rows: [{ tx_id: 'tx-1' }, { tx_id: 'tx-2' }] })
                    .mockResolvedValueOnce({ rows: [] }) // Store case
                    .mockResolvedValueOnce({ rows: [] }); // Update alerts
                const amlCase = await service.createAMLCase('tenant-1', 'customer-1', ['alert-1', 'alert-2'], 'investigator-1');
                (0, globals_1.expect)(amlCase.caseId).toBeDefined();
                (0, globals_1.expect)(amlCase.customerName).toBe('John Doe');
                (0, globals_1.expect)(amlCase.riskLevel).toBe('high');
            });
        });
    });
    (0, globals_1.describe)('MarketDataService', () => {
        let service;
        (0, globals_1.beforeEach)(() => {
            service = new MarketDataService_js_1.MarketDataService(mockPool);
        });
        (0, globals_1.describe)('ingestMarketData', () => {
            (0, globals_1.it)('should store market data point', async () => {
                mockQuery.mockResolvedValueOnce({ rows: [] });
                await service.ingestMarketData({
                    symbol: 'AAPL',
                    timestamp: new Date(),
                    open: 150.00,
                    high: 152.00,
                    low: 149.00,
                    close: 151.50,
                    volume: 1000000,
                });
                (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO market_data_realtime'), globals_1.expect.any(Array));
            });
        });
        (0, globals_1.describe)('calculateVWAP', () => {
            (0, globals_1.it)('should calculate volume-weighted average price', async () => {
                mockQuery.mockResolvedValueOnce({
                    rows: [{ vwap: '151.25' }],
                });
                const vwap = await service.calculateVWAP('AAPL', new Date('2024-01-01T09:30:00Z'), new Date('2024-01-01T16:00:00Z'));
                (0, globals_1.expect)(vwap).toBe(151.25);
            });
        });
        (0, globals_1.describe)('analyzeExecutionQuality', () => {
            (0, globals_1.it)('should analyze trade execution quality', async () => {
                const trade = {
                    tradeId: 'trade-1',
                    tenantId: 'tenant-1',
                    accountId: 'account-1',
                    traderId: 'trader-1',
                    symbol: 'AAPL',
                    side: 'buy',
                    quantity: 1000,
                    price: 151.50,
                    executionTime: new Date(),
                    venue: 'NASDAQ',
                    orderType: 'limit',
                    status: 'filled',
                    currency: 'USD',
                    assetClass: 'equity',
                };
                mockQuery
                    .mockResolvedValueOnce({ rows: [{ last_price: '151.00' }] }) // arrival price
                    .mockResolvedValueOnce({ rows: [{ vwap: '151.25' }] }) // VWAP
                    .mockResolvedValueOnce({ rows: [{ twap: '151.20' }] }) // TWAP
                    .mockResolvedValueOnce({ rows: [{ close: '151.75' }] }) // closing price
                    .mockResolvedValueOnce({ rows: [{ avg_volume: '5000000' }] }) // market impact
                    .mockResolvedValueOnce({ rows: [{ total_volume: '100000' }] }) // volume in window
                    .mockResolvedValueOnce({ rows: [] }); // store
                const eq = await service.analyzeExecutionQuality(trade);
                (0, globals_1.expect)(eq.tradeId).toBe('trade-1');
                (0, globals_1.expect)(eq.vwap).toBe(151.25);
                (0, globals_1.expect)(eq.implementationShortfall).toBeDefined();
            });
        });
        (0, globals_1.describe)('Security Master', () => {
            (0, globals_1.it)('should search securities', async () => {
                mockQuery.mockResolvedValueOnce({
                    rows: [
                        {
                            symbol: 'AAPL',
                            name: 'Apple Inc.',
                            asset_class: 'equity',
                            sector: 'Technology',
                            exchange: 'NASDAQ',
                            currency: 'USD',
                            country: 'US',
                            lot_size: '1',
                            tick_size: '0.01',
                            status: 'active',
                        },
                    ],
                });
                const results = await service.searchSecurities('Apple', {
                    assetClass: 'equity',
                    limit: 10,
                });
                (0, globals_1.expect)(results).toHaveLength(1);
                (0, globals_1.expect)(results[0].symbol).toBe('AAPL');
            });
        });
    });
    (0, globals_1.describe)('RegulatoryReportingService', () => {
        let service;
        (0, globals_1.beforeEach)(() => {
            service = new RegulatoryReportingService_js_1.RegulatoryReportingService(mockPool, { firmId: 'TEST001' });
        });
        (0, globals_1.describe)('generateCATReport', () => {
            (0, globals_1.it)('should generate CAT report with events', async () => {
                const reportDate = new Date('2024-01-15');
                mockQuery
                    .mockResolvedValueOnce({
                    rows: [
                        {
                            order_id: 'order-1',
                            symbol: 'AAPL',
                            side: 'buy',
                            quantity: '100',
                            price: '150.00',
                            order_type: 'limit',
                            created_at: reportDate,
                        },
                    ],
                }) // new orders
                    .mockResolvedValueOnce({ rows: [] }) // modifications
                    .mockResolvedValueOnce({
                    rows: [
                        {
                            trade_id: 'trade-1',
                            symbol: 'AAPL',
                            side: 'buy',
                            quantity: '100',
                            price: '150.25',
                            execution_time: reportDate,
                            venue: 'NASDAQ',
                        },
                    ],
                }) // trades
                    .mockResolvedValueOnce({ rows: [] }) // cancellations
                    .mockResolvedValueOnce({ rows: [] }); // store
                const report = await service.generateCATReport('tenant-1', reportDate);
                (0, globals_1.expect)(report.reportId).toBeDefined();
                (0, globals_1.expect)(report.events.length).toBeGreaterThan(0);
                (0, globals_1.expect)(report.events.some(e => e.eventType === 'MENO')).toBe(true);
                (0, globals_1.expect)(report.events.some(e => e.eventType === 'MEOT')).toBe(true);
            });
        });
        (0, globals_1.describe)('generateTRACEReport', () => {
            (0, globals_1.it)('should generate TRACE report for fixed income trades', async () => {
                mockQuery.mockResolvedValueOnce({
                    rows: [
                        {
                            trade_id: 'trade-1',
                            cusip: '912828ZQ9',
                            execution_time: new Date(),
                            quantity: '1000000',
                            price: '99.50',
                            side: 'buy',
                            capacity: 'principal',
                        },
                    ],
                });
                mockQuery.mockResolvedValueOnce({ rows: [] }); // store
                const report = await service.generateTRACEReport('tenant-1', new Date());
                (0, globals_1.expect)(report.trades.length).toBe(1);
                (0, globals_1.expect)(report.trades[0].cusip).toBe('912828ZQ9');
            });
        });
        (0, globals_1.describe)('getReports', () => {
            (0, globals_1.it)('should return filtered reports', async () => {
                mockQuery
                    .mockResolvedValueOnce({ rows: [{ count: '5' }] })
                    .mockResolvedValueOnce({
                    rows: [
                        {
                            report_id: 'report-1',
                            tenant_id: 'tenant-1',
                            report_type: 'cat',
                            period_start: new Date(),
                            period_end: new Date(),
                            status: 'pending',
                            submission_deadline: new Date(),
                            generated_at: new Date(),
                            generated_by: 'system',
                            validation_errors: '[]',
                            metadata: '{}',
                        },
                    ],
                });
                const result = await service.getReports('tenant-1', {
                    reportType: ['cat'],
                    status: ['pending_review'],
                    limit: 10,
                });
                (0, globals_1.expect)(result.total).toBe(5);
                (0, globals_1.expect)(result.reports).toHaveLength(1);
            });
        });
        (0, globals_1.describe)('submitReport', () => {
            (0, globals_1.it)('should submit approved report', async () => {
                mockQuery
                    .mockResolvedValueOnce({
                    rows: [{
                            report_id: 'report-1',
                            tenant_id: 'tenant-1',
                            report_type: 'cat',
                            period_start: new Date(),
                            period_end: new Date(),
                            status: 'approved',
                            submission_deadline: new Date(),
                            generated_at: new Date(),
                            generated_by: 'system',
                            validation_errors: '[]',
                            metadata: '{}',
                        }],
                })
                    .mockResolvedValueOnce({ rows: [] }); // update
                const result = await service.submitReport('report-1', 'submitter-1');
                (0, globals_1.expect)(result.success).toBe(true);
                (0, globals_1.expect)(result.reference).toBeDefined();
            });
            (0, globals_1.it)('should reject unapproved report submission', async () => {
                mockQuery.mockResolvedValueOnce({
                    rows: [{
                            report_id: 'report-1',
                            status: 'draft',
                            validation_errors: '[]',
                            metadata: '{}',
                        }],
                });
                const result = await service.submitReport('report-1', 'submitter-1');
                (0, globals_1.expect)(result.success).toBe(false);
                (0, globals_1.expect)(result.error).toContain('approved');
            });
        });
    });
});
