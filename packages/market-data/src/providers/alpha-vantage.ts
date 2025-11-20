import {
  OHLCV,
  Quote,
  MarketStats,
  Security,
  CorporateAction,
  HistoricalDataQuery,
  AssetClass,
  TimeInterval,
  MarketVenue
} from '../types';
import { BaseMarketDataProvider, ProviderConfig, ProviderStatus } from './base';

/**
 * Alpha Vantage API provider
 * Free tier: 5 API calls per minute, 500 calls per day
 * Premium tiers available with higher limits
 */
export class AlphaVantageProvider extends BaseMarketDataProvider {
  readonly name = 'Alpha Vantage';
  readonly supportsRealtime = true;
  readonly supportsHistorical = true;
  readonly supportedAssetClasses = [
    AssetClass.EQUITY,
    AssetClass.CRYPTO,
    AssetClass.FOREX,
    AssetClass.ETF
  ];

  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;
  private requestCount = 0;
  private requestResetTime = Date.now() + 60000;

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Alpha Vantage requires an API key');
    }
    this.apiKey = config.apiKey;
  }

  async connect(): Promise<void> {
    this.setStatus(ProviderStatus.CONNECTING);
    // Test connection with a simple API call
    try {
      await this.makeRequest('GLOBAL_QUOTE', { symbol: 'AAPL' });
      this.setStatus(ProviderStatus.CONNECTED);
    } catch (error) {
      this.setStatus(ProviderStatus.ERROR);
      throw new Error(`Failed to connect to Alpha Vantage: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.setStatus(ProviderStatus.DISCONNECTED);
  }

  async getQuote(symbol: string, assetClass?: AssetClass): Promise<Quote> {
    const data = await this.makeRequest('GLOBAL_QUOTE', { symbol });
    const quote = data['Global Quote'];

    if (!quote || !quote['05. price']) {
      throw new Error(`No quote data available for ${symbol}`);
    }

    return {
      symbol,
      timestamp: new Date(),
      bid: parseFloat(quote['05. price']),
      ask: parseFloat(quote['05. price']),
      bidSize: 0,
      askSize: 0,
      last: parseFloat(quote['05. price']),
      lastSize: parseInt(quote['06. volume']),
      volume: parseInt(quote['06. volume']),
    };
  }

  async getQuotes(symbols: string[], assetClass?: AssetClass): Promise<Quote[]> {
    const quotes = await Promise.all(
      symbols.map(symbol => this.getQuote(symbol, assetClass))
    );
    return quotes;
  }

  async getHistoricalData(query: HistoricalDataQuery): Promise<OHLCV[]> {
    const functionName = this.getTimeSeriesFunction(query.interval);
    const data = await this.makeRequest(functionName, {
      symbol: query.symbol,
      outputsize: 'full'
    });

    const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
    if (!timeSeriesKey) {
      throw new Error(`No time series data available for ${query.symbol}`);
    }

    const timeSeries = data[timeSeriesKey];
    const ohlcvData: OHLCV[] = [];

    for (const [timestamp, values] of Object.entries<any>(timeSeries)) {
      const date = new Date(timestamp);
      if (date >= query.startDate && date <= query.endDate) {
        ohlcvData.push({
          symbol: query.symbol,
          timestamp: date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume']),
          assetClass: query.assetClass,
        });
      }
    }

    return ohlcvData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getMarketStats(symbol: string): Promise<MarketStats> {
    const quote = await this.getQuote(symbol);
    const overview = await this.makeRequest('OVERVIEW', { symbol });

    return {
      symbol,
      timestamp: new Date(),
      open: quote.last!,
      high: quote.last!,
      low: quote.last!,
      close: quote.last!,
      previousClose: quote.last!,
      change: 0,
      changePercent: 0,
      volume: quote.volume || 0,
      marketCap: parseFloat(overview.MarketCapitalization) || undefined,
      peRatio: parseFloat(overview.PERatio) || undefined,
      week52High: parseFloat(overview['52WeekHigh']) || undefined,
      week52Low: parseFloat(overview['52WeekLow']) || undefined,
    };
  }

  async searchSecurities(query: string): Promise<Security[]> {
    const data = await this.makeRequest('SYMBOL_SEARCH', { keywords: query });

    if (!data.bestMatches) {
      return [];
    }

    return data.bestMatches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      assetClass: this.mapAssetType(match['3. type']),
      exchange: match['4. region'] as MarketVenue,
      currency: match['8. currency'],
      isActive: true,
    }));
  }

  async getCorporateActions(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CorporateAction[]> {
    // Alpha Vantage doesn't provide a dedicated corporate actions endpoint
    // This would need to be implemented using company overview and earnings data
    return [];
  }

  private async makeRequest(func: string, params: Record<string, string>): Promise<any> {
    // Rate limiting
    if (this.requestCount >= 5) {
      const now = Date.now();
      if (now < this.requestResetTime) {
        const waitTime = this.requestResetTime - now;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.requestCount = 0;
      this.requestResetTime = Date.now() + 60000;
    }

    const url = new URL(this.baseUrl);
    url.searchParams.append('function', func);
    url.searchParams.append('apikey', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const response = await fetch(url.toString());
    this.requestCount++;

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
    }

    if (data['Note']) {
      throw new Error('Alpha Vantage API rate limit exceeded');
    }

    return data;
  }

  private getTimeSeriesFunction(interval: TimeInterval): string {
    switch (interval) {
      case TimeInterval.MINUTE_1:
      case TimeInterval.MINUTE_5:
      case TimeInterval.MINUTE_15:
      case TimeInterval.MINUTE_30:
        return 'TIME_SERIES_INTRADAY';
      case TimeInterval.DAY_1:
        return 'TIME_SERIES_DAILY';
      case TimeInterval.WEEK_1:
        return 'TIME_SERIES_WEEKLY';
      case TimeInterval.MONTH_1:
        return 'TIME_SERIES_MONTHLY';
      default:
        return 'TIME_SERIES_DAILY';
    }
  }

  private mapAssetType(type: string): AssetClass {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('ETF')) return AssetClass.ETF;
    if (typeUpper.includes('FUND')) return AssetClass.MUTUAL_FUND;
    return AssetClass.EQUITY;
  }
}
