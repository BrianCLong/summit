/**
 * Stock Market Data Feed
 * Real-time stock price and trade data feed
 */

import WebSocket from 'ws';
import axios from 'axios';
import { BaseMarketDataFeed } from './base-feed';
import { DataType, PriceData, Quote, Trade } from '../types';

export interface StockFeedConfig {
  apiKey: string;
  wsUrl?: string;
  restUrl?: string;
  reconnectDelay?: number;
}

export class StockMarketDataFeed extends BaseMarketDataFeed {
  private ws: WebSocket | null = null;
  private config: StockFeedConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: StockFeedConfig) {
    super();
    this.config = {
      wsUrl: config.wsUrl || 'wss://stream.example.com/v1/stocks',
      restUrl: config.restUrl || 'https://api.example.com/v1',
      reconnectDelay: config.reconnectDelay || 5000,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl!);

      this.ws.on('open', () => {
        this.connected = true;
        this.emit('connected');
        console.log('Stock feed connected');

        // Authenticate
        this.ws?.send(JSON.stringify({
          action: 'authenticate',
          apiKey: this.config.apiKey,
        }));

        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
        console.log('Stock feed disconnected');
        this.scheduleReconnect();
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  async subscribe(symbols: string[], dataTypes: DataType[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to stock feed');
    }

    const message = {
      action: 'subscribe',
      symbols,
      streams: dataTypes.map(dt => this.mapDataTypeToStream(dt)),
    };

    this.ws?.send(JSON.stringify(message));
    this.addSubscriptions(symbols, dataTypes);
  }

  async unsubscribe(symbols: string[], dataTypes: DataType[]): Promise<void> {
    if (!this.connected) {
      return;
    }

    const message = {
      action: 'unsubscribe',
      symbols,
      streams: dataTypes.map(dt => this.mapDataTypeToStream(dt)),
    };

    this.ws?.send(JSON.stringify(message));
    this.removeSubscriptions(symbols, dataTypes);
  }

  async getHistoricalData(
    symbol: string,
    start: Date,
    end: Date,
    interval: string = '1min'
  ): Promise<PriceData[]> {
    const response = await axios.get(`${this.config.restUrl}/stocks/${symbol}/bars`, {
      params: {
        start: start.toISOString(),
        end: end.toISOString(),
        timeframe: interval,
      },
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    return response.data.bars.map((bar: any) => ({
      symbol,
      timestamp: new Date(bar.t),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
      trades: bar.n,
    }));
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const messages = JSON.parse(data.toString());

      if (!Array.isArray(messages)) {
        return;
      }

      for (const message of messages) {
        switch (message.T) {
          case 'q': // Quote
            this.emit('quote', this.parseQuote(message));
            break;
          case 't': // Trade
            this.emit('trade', this.parseTrade(message));
            break;
          case 'b': // Bar
            this.emit('price', this.parseBar(message));
            break;
          default:
            this.emit('message', message);
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private parseQuote(message: any): Quote {
    return {
      symbol: message.S,
      timestamp: new Date(message.t),
      bid: message.bp,
      ask: message.ap,
      bidSize: message.bs,
      askSize: message.as,
      last: message.p,
      lastSize: message.s,
    };
  }

  private parseTrade(message: any): Trade {
    return {
      symbol: message.S,
      timestamp: new Date(message.t),
      price: message.p,
      size: message.s,
      side: message.side || 'BUY',
      conditions: message.c,
    };
  }

  private parseBar(message: any): PriceData {
    return {
      symbol: message.S,
      timestamp: new Date(message.t),
      open: message.o,
      high: message.h,
      low: message.l,
      close: message.c,
      volume: message.v,
      vwap: message.vw,
      trades: message.n,
    };
  }

  private mapDataTypeToStream(dataType: DataType): string {
    const mapping: Record<DataType, string> = {
      [DataType.QUOTE]: 'quotes',
      [DataType.TRADE]: 'trades',
      [DataType.PRICE]: 'bars',
      [DataType.ORDER_BOOK]: 'orderbook',
      [DataType.OPTIONS]: 'options',
      [DataType.NEWS]: 'news',
      [DataType.ECONOMIC]: 'economic',
    };

    return mapping[dataType] || 'quotes';
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('Attempting to reconnect stock feed...');
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.config.reconnectDelay);
  }
}
