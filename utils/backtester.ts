import { ChartPoint, BacktestResult, TradeExecution } from '../types';
import { calculateRSI, calculateMACD, calculateBollingerBands } from './indicators';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_BALANCE = 10000;
const FEE_RATE = 0.001; // 0.1% taker fee

type StrategyType = 'rsi' | 'macd' | 'bb';

export const runBacktest = (
  data: ChartPoint[],
  strategy: StrategyType = 'rsi',
  config: any = {}
): BacktestResult => {
  let balance = INITIAL_BALANCE;
  let position = 0; // 0 = no position, >0 = amount of coin
  let entryPrice = 0;
  let maxBalance = INITIAL_BALANCE;
  let maxDrawdown = 0;
  
  const trades: TradeExecution[] = [];
  const equityCurve: {date: number, balance: number}[] = [];

  // Configuration Defaults
  const rsiPeriod = config.period || 14;
  const macdFast = config.fast || 12;
  const macdSlow = config.slow || 26;
  const macdSignal = config.signal || 9;
  const bbPeriod = config.period || 20;
  const bbMult = config.multiplier || 2;

  // Pre-calculate indicators based on config
  const rsi = strategy === 'rsi' ? calculateRSI(data, rsiPeriod) : [];
  const macd = strategy === 'macd' ? calculateMACD(data, macdFast, macdSlow, macdSignal) : [];
  const bb = strategy === 'bb' ? calculateBollingerBands(data, bbPeriod, bbMult) : [];

  // Generate display name
  let strategyName = strategy.toUpperCase();
  if (strategy === 'rsi') strategyName += ` [${rsiPeriod}]`;
  if (strategy === 'macd') strategyName += ` [${macdFast}/${macdSlow}/${macdSignal}]`;
  if (strategy === 'bb') strategyName += ` [${bbPeriod}, ${bbMult}]`;

  // Helper to execute trade
  const executeTrade = (type: 'BUY' | 'SELL', price: number, date: number) => {
    const id = uuidv4();
    if (type === 'BUY') {
      // Buy with all balance
      const amount = (balance * (1 - FEE_RATE)) / price;
      position = amount;
      balance = 0; // All in
      entryPrice = price;
      
      trades.push({
        id,
        type: 'BUY',
        price,
        date,
        balanceAfter: position * price // Approximate paper value
      });
    } else {
      // Sell all
      const revenue = position * price * (1 - FEE_RATE);
      const profit = revenue - (position * entryPrice);
      const profitPercent = ((price - entryPrice) / entryPrice) * 100;
      
      balance = revenue;
      position = 0;
      
      trades.push({
        id,
        type: 'SELL',
        price,
        date,
        balanceAfter: balance,
        profit,
        profitPercent
      });
    }
  };

  // Loop through data
  for (let i = 0; i < data.length; i++) {
    const price = data[i].price;
    const date = data[i].date;

    let shouldBuy = false;
    let shouldSell = false;

    if (strategy === 'rsi') {
      // Simple RSI Reversal: Buy < 30, Sell > 70
      const val = rsi[i];
      if (val !== null) {
        if (val < 30) shouldBuy = true;
        if (val > 70) shouldSell = true;
      }
    } else if (strategy === 'macd') {
      // Simple MACD Crossover
      const curr = macd[i];
      const prev = i > 0 ? macd[i-1] : null;
      
      if (curr && prev && curr.macd !== null && curr.signal !== null && prev.macd !== null && prev.signal !== null) {
        // Bullish Cross
        if (prev.macd < prev.signal && curr.macd > curr.signal) shouldBuy = true;
        // Bearish Cross
        if (prev.macd > prev.signal && curr.macd < curr.signal) shouldSell = true;
      }
    } else if (strategy === 'bb') {
      // Bollinger Band Bounce
      const band = bb[i];
      if (band.lower !== null && band.upper !== null) {
        if (price <= band.lower) shouldBuy = true;
        if (price >= band.upper) shouldSell = true;
      }
    }

    // Execution Logic
    if (shouldBuy && position === 0) {
      executeTrade('BUY', price, date);
    } else if (shouldSell && position > 0) {
      executeTrade('SELL', price, date);
    }

    // Update Equity Curve
    const currentEquity = position > 0 ? position * price : balance;
    equityCurve.push({ date, balance: currentEquity });

    // Drawdown Calc
    if (currentEquity > maxBalance) maxBalance = currentEquity;
    const drawdown = ((maxBalance - currentEquity) / maxBalance) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Close position at end if open
  if (position > 0) {
    const lastPrice = data[data.length - 1].price;
    executeTrade('SELL', lastPrice, data[data.length - 1].date);
  }

  const profitableTrades = trades.filter(t => t.type === 'SELL' && (t.profit || 0) > 0).length;
  const sellTrades = trades.filter(t => t.type === 'SELL').length;
  const finalBalance = equityCurve[equityCurve.length - 1].balance;
  const netProfit = finalBalance - INITIAL_BALANCE;

  return {
    strategyName,
    totalTrades: trades.length,
    profitableTrades,
    winRate: sellTrades > 0 ? (profitableTrades / sellTrades) * 100 : 0,
    netProfit,
    roi: (netProfit / INITIAL_BALANCE) * 100,
    maxDrawdown,
    trades,
    equityCurve
  };
};
