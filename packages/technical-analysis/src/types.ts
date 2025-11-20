/**
 * Technical Analysis Types
 */

import { PriceData } from '@intelgraph/market-data';

export interface IndicatorResult {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface IndicatorSeries {
  indicator: string;
  symbol: string;
  data: IndicatorResult[];
}

export interface Pattern {
  type: PatternType;
  symbol: string;
  startTime: Date;
  endTime: Date;
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  points: PatternPoint[];
  metadata?: Record<string, any>;
}

export interface PatternPoint {
  timestamp: Date;
  price: number;
  role: string; // 'head', 'shoulder', 'neckline', etc.
}

export enum PatternType {
  HEAD_AND_SHOULDERS = 'HEAD_AND_SHOULDERS',
  INVERSE_HEAD_AND_SHOULDERS = 'INVERSE_HEAD_AND_SHOULDERS',
  DOUBLE_TOP = 'DOUBLE_TOP',
  DOUBLE_BOTTOM = 'DOUBLE_BOTTOM',
  TRIPLE_TOP = 'TRIPLE_TOP',
  TRIPLE_BOTTOM = 'TRIPLE_BOTTOM',
  ASCENDING_TRIANGLE = 'ASCENDING_TRIANGLE',
  DESCENDING_TRIANGLE = 'DESCENDING_TRIANGLE',
  SYMMETRICAL_TRIANGLE = 'SYMMETRICAL_TRIANGLE',
  WEDGE_RISING = 'WEDGE_RISING',
  WEDGE_FALLING = 'WEDGE_FALLING',
  FLAG = 'FLAG',
  PENNANT = 'PENNANT',
  CUP_AND_HANDLE = 'CUP_AND_HANDLE',
}

export interface SupportResistance {
  symbol: string;
  timestamp: Date;
  supports: PriceLevel[];
  resistances: PriceLevel[];
}

export interface PriceLevel {
  price: number;
  strength: number; // 0-1
  touches: number;
  lastTouch: Date;
}

export interface TrendAnalysis {
  symbol: string;
  timestamp: Date;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  strength: number; // 0-1
  duration: number; // in periods
  angle: number; // trend line angle in degrees
}

export { PriceData };
