import React from 'react';

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
}

export interface ChartPoint {
  date: number;
  price: number;
}

export interface MarketChartData {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface TerminalLog {
  id: string;
  type: 'command' | 'response' | 'error' | 'system' | 'analysis';
  content: string | React.ReactNode;
  timestamp: Date;
}

export enum Theme {
  MATRIX = 'theme-matrix',
  AMBER = 'theme-amber',
  CYAN = 'theme-cyan',
  LIGHT = 'theme-light',
}

export interface TradeSignal {
  action: 'LONG' | 'SHORT' | 'WAIT';
  entry: string;
  stopLoss: string;
  takeProfit: string;
  confidence: number;
  reasoning: string;
}

export interface IndicatorState {
  rsi: boolean;
  macd: boolean;
  bb: boolean;
}

export interface CombinedChartData extends ChartPoint {
  rsi?: number | null;
  bbUpper?: number | null;
  bbLower?: number | null;
  bbMiddle?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
}

export interface TradeExecution {
  id: string;
  type: 'BUY' | 'SELL';
  price: number;
  date: number;
  balanceAfter: number;
  profit?: number; // Only calculated on SELL
  profitPercent?: number;
}

export interface BacktestResult {
  strategyName: string;
  totalTrades: number;
  profitableTrades: number;
  winRate: number;
  netProfit: number;
  roi: number;
  maxDrawdown: number;
  trades: TradeExecution[];
  equityCurve: {date: number, balance: number}[];
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: 'bid' | 'ask';
}
