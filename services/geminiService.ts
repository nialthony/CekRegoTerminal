import { ChartPoint, CryptoData, TradeSignal } from '../types';

// Mock function to simulate trade signal without external API
// Heuristics: Based on 24h price change %
// - > +2%: LONG (bullish momentum)
// - < -2%: SHORT (bearish momentum)
// - Otherwise: WAIT
// Entry: Current price
// Stop Loss: +/- 5% from entry
// Take Profits: Tiered (TP1: 2% gain, TP2: 4%, TP3: 6% from entry) for 1:2+ R:R
// Confidence: Scaled by |change| magnitude (max 85 to simulate realism)

export const analyzeMarket = async (
  coinData: CryptoData,
  chartHistory: ChartPoint[]
): Promise<TradeSignal> => {
  const change24h = coinData.price_change_percentage_24h;
  const currentPrice = coinData.current_price;
  let action: 'LONG' | 'SHORT' | 'WAIT' = 'WAIT';
  let entry = currentPrice.toFixed(2);
  let stopLoss: string;
  let takeProfit: string;
  let confidence: number;
  let reasoning: string;

  if (change24h > 2) {
    action = 'LONG';
    stopLoss = (currentPrice * 0.95).toFixed(2); // -5%
    takeProfit = `${(currentPrice * 1.02).toFixed(2)} | ${(currentPrice * 1.04).toFixed(2)} | ${(currentPrice * 1.06).toFixed(2)}`;
    confidence = Math.min(85, 50 + (change24h * 10)); // 50-85
    reasoning = `BULLISH_MOMENTUM_DETECTED. 24H SURGE INDICATES BREAKOUT POTENTIAL. R:R OPTIMIZED FOR SWING HOLD.`;
  } else if (change24h < -2) {
    action = 'SHORT';
    stopLoss = (currentPrice * 1.05).toFixed(2); // +5%
    takeProfit = `${(currentPrice * 0.98).toFixed(2)} | ${(currentPrice * 0.96).toFixed(2)} | ${(currentPrice * 0.94).toFixed(2)}`;
    confidence = Math.min(85, 50 + (Math.abs(change24h) * 10));
    reasoning = `BEARISH_PRESSURE_CONFIRMED. VOLUME SPIKE SUGGESTS DUMP CONTINUATION. TIGHTEN POSITION SIZE.`;
  } else {
    action = 'WAIT';
    stopLoss = 'N/A';
    takeProfit = 'N/A';
    confidence = 20;
    reasoning = `SIDEWAYS_CHOP. NO CLEAR EDGE. AWAIT VOLUME BREAK OR RSI EXTREME FOR ENTRY.`;
  }

  // Simulate slight randomness in confidence for variety (but deterministic per run)
  confidence += (Math.random() * 5 - 2.5);

  return {
    action,
    entry,
    stopLoss,
    takeProfit,
    confidence: Math.max(0, Math.min(100, confidence)),
    reasoning
  };
};
