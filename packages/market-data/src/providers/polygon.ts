import {
  OHLCV,
  Quote,
  Trade,
  MarketStats,
  Security,
  CorporateAction,
  CorporateActionType,
  HistoricalDataQuery,
  AssetClass,
  TimeInterval,
  MarketVenue
} from '../types';
import { BaseMarketDataProvider, IStreamingProvider, ProviderConfig, ProviderStatus } from './base';

/**
 * Polygon.io API provider
 * Real-time and historical market data for stocks, options, forex, and crypto
 * Free tier: delayed data, Premium: real-time streaming
 */
export class PolygonProvider extends BaseMarketDataProvider implements IStreamingProvider {
  readonly name = 'Polygon.io';
  readonly supportsRealtime = true;
  readonly supportsHistorical = true;
  readonly supportedAssetClasses = [
    AssetClass.EQUITY,
    AssetClass.OPTION,
    AssetClass.CRYPTO,
    AssetClass.FOREX,
    AssetClass.INDEX
  ];

  private baseUrl = 'https://api.polygon.io';
  private wsUrl = 'wss://socket.polygon.io';
  private apiKey: string;
  private ws?: WebSocket;
  private subscriptions = new Map<string, (data: any) => void>();

  constructor(config: ProviderConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Polygon.io requires an API key');
    }
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  async connect(): Promise<void> {
    this.setStatus(ProviderStatus.CONNECTING);
    try {
      // Test REST API connection
      await this.makeRequest('/v2/aggs/ticker/AAPL/prev');
      this.setStatus(ProviderStatus.CONNECTED);
    } catch (error) {
      this.setStatus(ProviderStatus.ERROR);
      throw new Error(`Failed to connect to Polygon.io: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setStatus(ProviderStatus.DISCONNECTED);
  }

  async getQuote(symbol: string, assetClass?: AssetClass): Promise<Quote> {
    const endpoint = `/v2/last/trade/${symbol}`;
    const data = await this.makeRequest(endpoint);

    if (!data.results) {
      throw new Error(`No quote data available for ${symbol}`);
    }

    const result = data.results;
    return {
      symbol,
      timestamp: new Date(result.t / 1000000), // Nanoseconds to milliseconds
      bid: result.p,
      ask: result.p,
      bidSize: result.s,
      askSize: result.s,
      last: result.p,
      lastSize: result.s,
      venue: result.x as MarketVenue,
    };
  }

  async getQuotes(symbols: string[], assetClass?: AssetClass): Promise<Quote[]> {
    const endpoint = '/v2/snapshot/locale/us/markets/stocks/tickers';
    const data = await this.makeRequest(endpoint);

    if (!data.tickers) {
      return [];
    }

    const symbolSet = new Set(symbols);
    return data.tickers
      .filter((ticker: any) => symbolSet.has(ticker.ticker))
      .map((ticker: any) => this.mapSnapshotToQuote(ticker));
  }

  async getHistoricalData(query: HistoricalDataQuery): Promise<OHLCV[]> {
    const multiplier = this.getMultiplier(query.interval);
    const timespan = this.getTimespan(query.interval);

    const endpoint = `/v2/aggs/ticker/${query.symbol}/range/${multiplier}/${timespan}/${query.startDate.getTime()}/${query.endDate.getTime()}`;

    const params: Record<string, string> = {
      adjusted: query.adjustForSplits ? 'true' : 'false',
    };

    const data = await this.makeRequest(endpoint, params);

    if (!data.results) {
      return [];
    }

    return data.results.map((bar: any) => ({
      symbol: query.symbol,
      timestamp: new Date(bar.t),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
      trades: bar.n,
      assetClass: query.assetClass,
    }));
  }

  async getMarketStats(symbol: string): Promise<MarketStats> {
    const endpoint = `/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`;
    const data = await this.makeRequest(endpoint);

    if (!data.ticker) {
      throw new Error(`No market stats available for ${symbol}`);
    }

    const ticker = data.ticker;
    const day = ticker.day;
    const prevDay = ticker.prevDay;

    return {
      symbol,
      timestamp: new Date(ticker.updated / 1000000),
      open: day.o,
      high: day.h,
      low: day.l,
      close: day.c,
      previousClose: prevDay.c,
      change: day.c - prevDay.c,
      changePercent: ((day.c - prevDay.c) / prevDay.c) * 100,
      volume: day.v,
      avgVolume: ticker.avgVolume,
      week52High: ticker.week52High,
      week52Low: ticker.week52Low,
    };
  }

  async searchSecurities(query: string): Promise<Security[]> {
    const endpoint = '/v3/reference/tickers';
    const params = {
      search: query,
      active: 'true',
    };

    const data = await this.makeRequest(endpoint, params);

    if (!data.results) {
      return [];
    }

    return data.results.map((ticker: any) => ({
      symbol: ticker.ticker,
      name: ticker.name,
      assetClass: this.mapMarketType(ticker.market),
      exchange: ticker.primary_exchange as MarketVenue,
      currency: ticker.currency_name || 'USD',
      cusip: ticker.cusip,
      isin: ticker.isin,
      description: ticker.description,
      isActive: ticker.active,
      listingDate: ticker.list_date ? new Date(ticker.list_date) : undefined,
      delistingDate: ticker.delisted_utc ? new Date(ticker.delisted_utc) : undefined,
    }));
  }

  async getCorporateActions(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<CorporateAction[]> {
    const actions: CorporateAction[] = [];

    // Get splits
    try {
      const splitsEndpoint = `/v3/reference/splits`;
      const splitsData = await this.makeRequest(splitsEndpoint, {
        ticker: symbol,
        execution_date_gte: startDate.toISOString().split('T')[0],
        execution_date_lte: endDate.toISOString().split('T')[0],
      });

      if (splitsData.results) {
        actions.push(...splitsData.results.map((split: any) => ({
          symbol,
          actionType: CorporateActionType.SPLIT,
          announcementDate: new Date(split.declaration_date || split.execution_date),
          exDate: new Date(split.execution_date),
          paymentDate: new Date(split.payment_date),
          ratio: split.split_from / split.split_to,
          currency: 'USD',
          description: `${split.split_from}-for-${split.split_to} stock split`,
        })));
      }
    } catch (error) {
      console.error('Error fetching splits:', error);
    }

    // Get dividends
    try {
      const dividendsEndpoint = `/v3/reference/dividends`;
      const dividendsData = await this.makeRequest(dividendsEndpoint, {
        ticker: symbol,
        ex_dividend_date_gte: startDate.toISOString().split('T')[0],
        ex_dividend_date_lte: endDate.toISOString().split('T')[0],
      });

      if (dividendsData.results) {
        actions.push(...dividendsData.results.map((dividend: any) => ({
          symbol,
          actionType: dividend.dividend_type === 'CD'
            ? CorporateActionType.DIVIDEND
            : CorporateActionType.SPECIAL_DIVIDEND,
          announcementDate: new Date(dividend.declaration_date || dividend.ex_dividend_date),
          exDate: new Date(dividend.ex_dividend_date),
          paymentDate: new Date(dividend.pay_date),
          recordDate: new Date(dividend.record_date),
          amount: dividend.cash_amount,
          currency: dividend.currency || 'USD',
          description: `${dividend.frequency || 'Special'} dividend`,
        })));
      }
    } catch (error) {
      console.error('Error fetching dividends:', error);
    }

    return actions.sort((a, b) => a.exDate.getTime() - b.exDate.getTime());
  }

  async subscribeQuotes(symbols: string[], callback: (quote: Quote) => void): Promise<string> {
    await this.connectWebSocket();

    const subscriptionId = `quotes-${Date.now()}`;
    this.subscriptions.set(subscriptionId, callback);

    // Subscribe to quote stream
    const subscribeMsg = {
      action: 'subscribe',
      params: symbols.map(s => `Q.${s}`).join(',')
    };

    this.ws?.send(JSON.stringify(subscribeMsg));

    return subscriptionId;
  }

  async subscribeTrades(symbols: string[], callback: (trade: Trade) => void): Promise<string> {
    await this.connectWebSocket();

    const subscriptionId = `trades-${Date.now()}`;
    this.subscriptions.set(subscriptionId, callback);

    // Subscribe to trade stream
    const subscribeMsg = {
      action: 'subscribe',
      params: symbols.map(s => `T.${s}`).join(',')
    };

    this.ws?.send(JSON.stringify(subscribeMsg));

    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  private async connectWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.wsUrl}/stocks`);

      this.ws.onopen = () => {
        // Authenticate
        this.ws?.send(JSON.stringify({
          action: 'auth',
          params: this.apiKey
        }));
        resolve();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onmessage = (event) => {
        const messages = JSON.parse(event.data);
        for (const msg of messages) {
          this.handleWebSocketMessage(msg);
        }
      };
    });
  }

  private handleWebSocketMessage(msg: any): void {
    // Route message to appropriate subscription callbacks
    for (const callback of this.subscriptions.values()) {
      if (msg.ev === 'Q') {
        // Quote message
        callback(this.mapWebSocketQuote(msg));
      } else if (msg.ev === 'T') {
        // Trade message
        callback(this.mapWebSocketTrade(msg));
      }
    }
  }

  private mapWebSocketQuote(msg: any): Quote {
    return {
      symbol: msg.sym,
      timestamp: new Date(msg.t / 1000000),
      bid: msg.bp,
      ask: msg.ap,
      bidSize: msg.bs,
      askSize: msg.as,
      venue: msg.x as MarketVenue,
    };
  }

  private mapWebSocketTrade(msg: any): Trade {
    return {
      symbol: msg.sym,
      timestamp: new Date(msg.t / 1000000),
      price: msg.p,
      size: msg.s,
      venue: msg.x as MarketVenue,
      conditions: msg.c,
    };
  }

  private mapSnapshotToQuote(ticker: any): Quote {
    return {
      symbol: ticker.ticker,
      timestamp: new Date(ticker.updated / 1000000),
      bid: ticker.lastQuote?.p || ticker.day.c,
      ask: ticker.lastQuote?.p || ticker.day.c,
      bidSize: ticker.lastQuote?.s || 0,
      askSize: ticker.lastQuote?.s || 0,
      last: ticker.day.c,
      volume: ticker.day.v,
    };
  }

  private async makeRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('apiKey', this.apiKey);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Polygon.io API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private getMultiplier(interval: TimeInterval): number {
    const match = interval.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  private getTimespan(interval: TimeInterval): string {
    if (interval.includes('s')) return 'second';
    if (interval.includes('m')) return 'minute';
    if (interval.includes('h')) return 'hour';
    if (interval.includes('d')) return 'day';
    if (interval.includes('w')) return 'week';
    if (interval.includes('M')) return 'month';
    if (interval.includes('y')) return 'year';
    return 'day';
  }

  private mapMarketType(market: string): AssetClass {
    switch (market?.toLowerCase()) {
      case 'stocks':
        return AssetClass.EQUITY;
      case 'options':
        return AssetClass.OPTION;
      case 'crypto':
        return AssetClass.CRYPTO;
      case 'fx':
        return AssetClass.FOREX;
      case 'indices':
        return AssetClass.INDEX;
      default:
        return AssetClass.EQUITY;
    }
  }
}
