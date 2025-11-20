/**
 * @intelgraph/fundamental-analysis
 *
 * Comprehensive fundamental analysis tools including:
 * - Financial statement parsing (10-K, 10-Q, earnings reports)
 * - Financial ratio analysis (profitability, liquidity, efficiency, leverage)
 * - Valuation models (DCF, P/E, EV/EBITDA, dividend discount)
 * - Growth metrics and trend analysis
 * - Insider trading and institutional ownership tracking
 */

import { z } from 'zod';
import Decimal from 'decimal.js';

// ===== FINANCIAL STATEMENTS =====

export const IncomeStatementSchema = z.object({
  symbol: z.string(),
  fiscalYear: z.number().int(),
  fiscalQuarter: z.number().int().min(1).max(4).optional(),
  filingDate: z.date(),
  currency: z.string().default('USD'),

  // Revenue
  revenue: z.number(),
  costOfRevenue: z.number().optional(),
  grossProfit: z.number(),

  // Operating Expenses
  operatingExpenses: z.number(),
  researchAndDevelopment: z.number().optional(),
  sellingGeneralAdministrative: z.number().optional(),

  // Operating Income
  operatingIncome: z.number(),
  ebit: z.number(), // Earnings Before Interest and Taxes
  ebitda: z.number().optional(), // EBITDA

  // Non-Operating Items
  interestExpense: z.number().optional(),
  otherIncomeExpense: z.number().optional(),

  // Pre-Tax and Taxes
  pretaxIncome: z.number(),
  incomeTax: z.number(),
  taxRate: z.number().optional(),

  // Net Income
  netIncome: z.number(),
  netIncomeCommon: z.number().optional(),

  // Per Share
  eps: z.number(), // Earnings Per Share (basic)
  epsDiluted: z.number().optional(),
  sharesOutstanding: z.number(),
  sharesOutstandingDiluted: z.number().optional(),

  // Dividends
  dividendsPaid: z.number().optional(),
  dividendPerShare: z.number().optional(),
});

export type IncomeStatement = z.infer<typeof IncomeStatementSchema>;

export const BalanceSheetSchema = z.object({
  symbol: z.string(),
  fiscalYear: z.number().int(),
  fiscalQuarter: z.number().int().min(1).max(4).optional(),
  filingDate: z.date(),
  currency: z.string().default('USD'),

  // Assets
  totalAssets: z.number(),
  currentAssets: z.number(),
  cashAndEquivalents: z.number(),
  shortTermInvestments: z.number().optional(),
  accountsReceivable: z.number(),
  inventory: z.number().optional(),
  otherCurrentAssets: z.number().optional(),

  nonCurrentAssets: z.number(),
  propertyPlantEquipment: z.number(),
  goodwill: z.number().optional(),
  intangibleAssets: z.number().optional(),
  longTermInvestments: z.number().optional(),

  // Liabilities
  totalLiabilities: z.number(),
  currentLiabilities: z.number(),
  accountsPayable: z.number(),
  shortTermDebt: z.number().optional(),
  currentPortionLongTermDebt: z.number().optional(),
  otherCurrentLiabilities: z.number().optional(),

  nonCurrentLiabilities: z.number(),
  longTermDebt: z.number(),
  deferredTaxLiabilities: z.number().optional(),
  otherNonCurrentLiabilities: z.number().optional(),

  // Equity
  totalEquity: z.number(),
  commonStock: z.number(),
  retainedEarnings: z.number(),
  treasuryStock: z.number().optional(),
  additionalPaidInCapital: z.number().optional(),
});

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;

export const CashFlowStatementSchema = z.object({
  symbol: z.string(),
  fiscalYear: z.number().int(),
  fiscalQuarter: z.number().int().min(1).max(4).optional(),
  filingDate: z.date(),
  currency: z.string().default('USD'),

  // Operating Activities
  operatingCashFlow: z.number(),
  netIncome: z.number(),
  depreciation: z.number(),
  amortization: z.number().optional(),
  deferredTaxes: z.number().optional(),
  stockBasedCompensation: z.number().optional(),
  changeInWorkingCapital: z.number(),
  changeInAccountsReceivable: z.number().optional(),
  changeInInventory: z.number().optional(),
  changeInAccountsPayable: z.number().optional(),

  // Investing Activities
  investingCashFlow: z.number(),
  capitalExpenditures: z.number(),
  acquisitions: z.number().optional(),
  investmentPurchases: z.number().optional(),
  investmentSales: z.number().optional(),

  // Financing Activities
  financingCashFlow: z.number(),
  dividendsPaid: z.number().optional(),
  stockRepurchased: z.number().optional(),
  debtIssuance: z.number().optional(),
  debtRepayment: z.number().optional(),

  // Net Change
  netCashFlow: z.number(),
  freeCashFlow: z.number(), // Operating Cash Flow - CapEx
});

export type CashFlowStatement = z.infer<typeof CashFlowStatementSchema>;

// ===== FINANCIAL RATIOS =====

export interface FinancialRatios {
  // Profitability Ratios
  grossMargin: number; // (Revenue - COGS) / Revenue
  operatingMargin: number; // Operating Income / Revenue
  netMargin: number; // Net Income / Revenue
  returnOnAssets: number; // ROA = Net Income / Total Assets
  returnOnEquity: number; // ROE = Net Income / Shareholder Equity
  returnOnInvestedCapital: number; // ROIC = NOPAT / Invested Capital

  // Liquidity Ratios
  currentRatio: number; // Current Assets / Current Liabilities
  quickRatio: number; // (Current Assets - Inventory) / Current Liabilities
  cashRatio: number; // Cash / Current Liabilities

  // Efficiency Ratios
  assetTurnover: number; // Revenue / Total Assets
  inventoryTurnover: number; // COGS / Average Inventory
  receivablesTurnover: number; // Revenue / Average Receivables
  daysSalesOutstanding: number; // 365 / Receivables Turnover
  daysInventoryOutstanding: number; // 365 / Inventory Turnover

  // Leverage Ratios
  debtToEquity: number; // Total Debt / Total Equity
  debtToAssets: number; // Total Debt / Total Assets
  equityMultiplier: number; // Total Assets / Total Equity
  interestCoverage: number; // EBIT / Interest Expense

  // Valuation Ratios (requires market data)
  priceToEarnings?: number; // P/E = Market Price / EPS
  priceToBook?: number; // P/B = Market Price / Book Value Per Share
  priceToSales?: number; // P/S = Market Cap / Revenue
  evToEbitda?: number; // EV/EBITDA
  pegRatio?: number; // PEG = P/E / Earnings Growth Rate
}

/**
 * Calculate comprehensive financial ratios
 */
export function calculateFinancialRatios(
  incomeStatement: IncomeStatement,
  balanceSheet: BalanceSheet,
  cashFlow: CashFlowStatement,
  marketPrice?: number
): FinancialRatios {
  const ratios: FinancialRatios = {
    // Profitability
    grossMargin: incomeStatement.grossProfit / incomeStatement.revenue,
    operatingMargin: incomeStatement.operatingIncome / incomeStatement.revenue,
    netMargin: incomeStatement.netIncome / incomeStatement.revenue,
    returnOnAssets: incomeStatement.netIncome / balanceSheet.totalAssets,
    returnOnEquity: incomeStatement.netIncome / balanceSheet.totalEquity,
    returnOnInvestedCapital: incomeStatement.ebit * (1 - (incomeStatement.taxRate || 0.21)) /
      (balanceSheet.totalAssets - balanceSheet.currentLiabilities),

    // Liquidity
    currentRatio: balanceSheet.currentAssets / balanceSheet.currentLiabilities,
    quickRatio: (balanceSheet.currentAssets - (balanceSheet.inventory || 0)) / balanceSheet.currentLiabilities,
    cashRatio: balanceSheet.cashAndEquivalents / balanceSheet.currentLiabilities,

    // Efficiency
    assetTurnover: incomeStatement.revenue / balanceSheet.totalAssets,
    inventoryTurnover: balanceSheet.inventory ?
      (incomeStatement.costOfRevenue || incomeStatement.revenue * 0.7) / balanceSheet.inventory : 0,
    receivablesTurnover: incomeStatement.revenue / balanceSheet.accountsReceivable,
    daysSalesOutstanding: 365 / (incomeStatement.revenue / balanceSheet.accountsReceivable),
    daysInventoryOutstanding: balanceSheet.inventory ?
      365 / ((incomeStatement.costOfRevenue || incomeStatement.revenue * 0.7) / balanceSheet.inventory) : 0,

    // Leverage
    debtToEquity: balanceSheet.longTermDebt / balanceSheet.totalEquity,
    debtToAssets: balanceSheet.longTermDebt / balanceSheet.totalAssets,
    equityMultiplier: balanceSheet.totalAssets / balanceSheet.totalEquity,
    interestCoverage: incomeStatement.interestExpense ?
      incomeStatement.ebit / incomeStatement.interestExpense : Infinity,
  };

  // Valuation ratios (if market price provided)
  if (marketPrice) {
    const marketCap = marketPrice * incomeStatement.sharesOutstanding;
    const bookValuePerShare = balanceSheet.totalEquity / incomeStatement.sharesOutstanding;

    ratios.priceToEarnings = marketPrice / incomeStatement.eps;
    ratios.priceToBook = marketPrice / bookValuePerShare;
    ratios.priceToSales = marketCap / incomeStatement.revenue;

    if (incomeStatement.ebitda) {
      const enterpriseValue = marketCap + balanceSheet.longTermDebt - balanceSheet.cashAndEquivalents;
      ratios.evToEbitda = enterpriseValue / incomeStatement.ebitda;
    }
  }

  return ratios;
}

// ===== VALUATION MODELS =====

/**
 * Discounted Cash Flow (DCF) Valuation
 */
export function dcfValuation(
  freeCashFlows: number[],
  discountRate: number,
  terminalGrowthRate: number = 0.025,
  sharesOutstanding: number
): {
  presentValue: number;
  terminalValue: number;
  enterpriseValue: number;
  equityValuePerShare: number;
} {
  let presentValue = 0;

  // Calculate present value of projected cash flows
  for (let i = 0; i < freeCashFlows.length; i++) {
    presentValue += freeCashFlows[i] / Math.pow(1 + discountRate, i + 1);
  }

  // Calculate terminal value
  const lastYearFCF = freeCashFlows[freeCashFlows.length - 1];
  const terminalFCF = lastYearFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
  const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, freeCashFlows.length);

  const enterpriseValue = presentValue + pvTerminalValue;
  const equityValuePerShare = enterpriseValue / sharesOutstanding;

  return {
    presentValue,
    terminalValue: pvTerminalValue,
    enterpriseValue,
    equityValuePerShare,
  };
}

/**
 * Dividend Discount Model (DDM)
 */
export function dividendDiscountModel(
  currentDividend: number,
  growthRate: number,
  requiredReturn: number
): number {
  return (currentDividend * (1 + growthRate)) / (requiredReturn - growthRate);
}

/**
 * PEG Ratio Analysis
 */
export function calculatePEG(
  priceToEarnings: number,
  earningsGrowthRate: number
): number {
  return priceToEarnings / (earningsGrowthRate * 100);
}

// ===== GROWTH ANALYSIS =====

export interface GrowthMetrics {
  revenueGrowth: number; // YoY or QoQ
  earningsGrowth: number;
  epGrowth: number;
  fcfGrowth: number;

  // Compound Annual Growth Rate
  revenueCAGR?: number;
  earningsCAGR?: number;
}

/**
 * Calculate growth metrics comparing two periods
 */
export function calculateGrowthMetrics(
  current: IncomeStatement & CashFlowStatement,
  previous: IncomeStatement & CashFlowStatement
): GrowthMetrics {
  return {
    revenueGrowth: (current.revenue - previous.revenue) / previous.revenue,
    earningsGrowth: (current.netIncome - previous.netIncome) / previous.netIncome,
    epsGrowth: (current.eps - previous.eps) / previous.eps,
    fcfGrowth: (current.freeCashFlow - previous.freeCashFlow) / previous.freeCashFlow,
  };
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

// ===== EARNINGS ANALYSIS =====

export interface EarningsReport {
  symbol: string;
  fiscalQuarter: number;
  fiscalYear: number;
  reportDate: date;

  // Actual Results
  epsActual: number;
  revenueActual: number;

  // Estimates
  epsEstimate: number;
  revenueEstimate: number;

  // Surprises
  epsSurprise: number; // (Actual - Estimate) / Estimate
  revenueSurprise: number;

  // Guidance
  epsGuidance?: { low: number; high: number };
  revenueGuidance?: { low: number; high: number };
}

/**
 * Analyze earnings surprise impact
 */
export function analyzeEarningsSurprise(
  epsActual: number,
  epsEstimate: number,
  revenueActual: number,
  revenueEstimate: number
): {
  epsSurprise: number;
  revenueSurprise: number;
  beatsBoth: boolean;
  severity: 'major-beat' | 'beat' | 'inline' | 'miss' | 'major-miss';
} {
  const epsSurprise = (epsActual - epsEstimate) / epsEstimate;
  const revenueSurprise = (revenueActual - revenueEstimate) / revenueEstimate;
  const beatsBoth = epsSurprise > 0 && revenueSurprise > 0;

  let severity: 'major-beat' | 'beat' | 'inline' | 'miss' | 'major-miss' = 'inline';
  if (epsSurprise > 0.1) severity = 'major-beat';
  else if (epsSurprise > 0.02) severity = 'beat';
  else if (epsSurprise < -0.1) severity = 'major-miss';
  else if (epsSurprise < -0.02) severity = 'miss';

  return {
    epsSurprise,
    revenueSurprise,
    beatsBoth,
    severity,
  };
}

export * from './models';
export * from './ratios';
export * from './parsers';
