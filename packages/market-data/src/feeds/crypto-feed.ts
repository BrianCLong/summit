/**
 * Cryptocurrency Market Data Feed
 * Real-time crypto price, order book, and trade data
 */

import WebSocket from 'ws';
import axios from 'axios';
import { BaseMarketDataFeed } from './base-feed';
import { DataType, PriceData, Trade, OrderBook } from '../types';

export interface CryptoFeedConfig {
  exchange: string; // binance, coinbase, kraken, etc.
  wsUrl?: string;
  restUrl?: string;
  apiKey?: string;
  apiSecret?: string;
}

export class CryptoMarketDataFeed extends BaseMarketDataFeed {
  private ws: WebSocket | null = null;
  private config: CryptoFeedConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: CryptoFeedConfig) {
    super();
    this.config = this.getExchangeConfig(config);
  }

  private getExchangeConfig(config: CryptoFeedConfig): CryptoFeedConfig {
    const exchanges: Record<string, Partial<CryptoFeedConfig>> = {
      binance: {
        wsUrl: 'wss://stream.binance.com:9443/ws',
        restUrl: 'https://api.binance.com/api/v3',
      },
      coinbase: {
        wsUrl: 'wss://ws-feed.exchange.coinbase.com',
        restUrl: 'https://api.exchange.coinbase.com',
      },
      kraken: {
        wsUrl: 'wss://ws.kraken.com',
        restUrl: 'https://api.kraken.com/0/public',
      },
    };

    return {
      ...exchanges[config.exchange.toLowerCase()],
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
        console.log(`Crypto feed connected to ${this.config.exchange}`);
        this.startHeartbeat();
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
        this.stopHeartbeat();
        console.log(`Crypto feed disconnected from ${this.config.exchange}`);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  async subscribe(symbols: string[], dataTypes: DataType[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to crypto feed');
    }

    const message = this.buildSubscribeMessage(symbols, dataTypes);
    this.ws?.send(JSON.stringify(message));
    this.addSubscriptions(symbols, dataTypes);
  }

  async unsubscribe(symbols: string[], dataTypes: DataType[]): Promise<void> {
    if (!this.connected) {
      return;
    }

    const message = this.buildUnsubscribeMessage(symbols, dataTypes);
    this.ws?.send(JSON.stringify(message));
    this.removeSubscriptions(symbols, dataTypes);
  }

  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const response = await axios.get(`${this.config.restUrl}/depth`, {
      params: {
        symbol: symbol.replace('/', ''),
        limit: depth,
      },
    });

    return {
      symbol,
      timestamp: new Date(),
      bids: response.data.bids.map((level: [string, string]) => ({
        price: parseFloat(level[0]),
        size: parseFloat(level[1]),
        orders: 1,
      })),
      asks: response.data.asks.map((level: [string, string]) => ({
        price: parseFloat(level[0]),
        size: parseFloat(level[1]),
        orders: 1,
      })),
    };
  }

  async getHistoricalData(
    symbol: string,
    start: Date,
    end: Date,
    interval: string = '1m'
  ): Promise<PriceData[]> {
    const response = await axios.get(`${this.config.restUrl}/klines`, {
      params: {
        symbol: symbol.replace('/', ''),
        interval,
        startTime: start.getTime(),
        endTime: end.getTime(),
        limit: 1000,
      },
    });

    return response.data.map((candle: any[]) => ({
      symbol,
      timestamp: new Date(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  }

  private buildSubscribeMessage(symbols: string[], dataTypes: DataType[]): any {
    // Binance-style subscription
    if (this.config.exchange.toLowerCase() === 'binance') {
      const streams = symbols.flatMap(symbol =>
        dataTypes.map(type => {
          const normalizedSymbol = symbol.replace('/', '').toLowerCase();
          switch (type) {
            case DataType.TRADE:
              return `${normalizedSymbol}@trade`;
            case DataType.PRICE:
              return `${normalizedSymbol}@kline_1m`;
            case DataType.ORDER_BOOK:
              return `${normalizedSymbol}@depth20`;
            default:
              return `${normalizedSymbol}@ticker`;
          }
        })
      );

      return {
        method: 'SUBSCRIBE',
        params: streams,
        id: Date.now(),
      };
    }

    // Coinbase-style subscription
    if (this.config.exchange.toLowerCase() === 'coinbase') {
      const channels = dataTypes.map(type => {
        switch (type) {
          case DataType.TRADE:
            return 'matches';
          case DataType.PRICE:
            return 'ticker';
          case DataType.ORDER_BOOK:
            return 'level2';
          default:
            return 'ticker';
        }
      });

      return {
        type: 'subscribe',
        product_ids: symbols,
        channels,
      };
    }

    return {};
  }

  private buildUnsubscribeMessage(symbols: string[], dataTypes: DataType[]): any {
    if (this.config.exchange.toLowerCase() === 'binance') {
      const streams = symbols.flatMap(symbol =>
        dataTypes.map(type => {
          const normalizedSymbol = symbol.replace('/', '').toLowerCase();
          return `${normalizedSymbol}@${type.toLowerCase()}`;
        })
      );

      return {
        method: 'UNSUBSCRIBE',
        params: streams,
        id: Date.now(),
      };
    }

    if (this.config.exchange.toLowerCase() === 'coinbase') {
      return {
        type: 'unsubscribe',
        product_ids: symbols,
        channels: dataTypes.map(t => t.toLowerCase()),
      };
    }

    return {};
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // Binance message handling
      if (message.e === 'trade') {
        this.emit('trade', this.parseBinanceTrade(message));
      } else if (message.e === 'kline') {
        this.emit('price', this.parseBinanceKline(message));
      } else if (message.e === 'depthUpdate') {
        this.emit('orderbook', message);
      }

      // Coinbase message handling
      if (message.type === 'match') {
        this.emit('trade', this.parseCoinbaseTrade(message));
      } else if (message.type === 'ticker') {
        this.emit('price', message);
      } else if (message.type === 'l2update') {
        this.emit('orderbook', message);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private parseBinanceTrade(message: any): Trade {
    return {
      symbol: message.s,
      timestamp: new Date(message.T),
      price: parseFloat(message.p),
      size: parseFloat(message.q),
      side: message.m ? 'SELL' : 'BUY',
    };
  }

  private parseBinanceKline(message: any): PriceData {
    const k = message.k;
    return {
      symbol: message.s,
      timestamp: new Date(k.t),
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    };
  }

  private parseCoinbaseTrade(message: any): Trade {
    return {
      symbol: message.product_id,
      timestamp: new Date(message.time),
      price: parseFloat(message.price),
      size: parseFloat(message.size),
      side: message.side.toUpperCase() as 'BUY' | 'SELL',
    };
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
