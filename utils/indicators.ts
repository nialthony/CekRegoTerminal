import { ChartPoint } from '../types';

export const calculateRSI = (data: ChartPoint[], period: number = 14): number[] => {
  if (data.length < period) return new Array(data.length).fill(null);
  
  const rsiArray = new Array(period).fill(null); // Padding
  let gains = 0;
  let losses = 0;

  // Initial calculate
  for (let i = 1; i <= period; i++) {
    const diff = data[i].price - data[i - 1].price;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI
  let rs = avgGain / avgLoss;
  rsiArray.push(100 - (100 / (1 + rs)));

  // Subsequent
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].price - data[i - 1].price;
    
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }

    rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiArray.push(rsi);
  }
  
  return rsiArray;
};

export const calculateBollingerBands = (data: ChartPoint[], period: number = 20, multiplier: number = 2) => {
  return data.map((point, index, arr) => {
    if (index < period - 1) return { upper: null, lower: null, middle: null };
    
    const slice = arr.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.price, 0);
    const mean = sum / period;
    
    const squaredDiffs = slice.map(p => Math.pow(p.price - mean, 2));
    const variance = squaredDiffs.reduce((acc, curr) => acc + curr, 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      middle: mean,
      upper: mean + (stdDev * multiplier),
      lower: mean - (stdDev * multiplier)
    };
  });
};

export const calculateMACD = (data: ChartPoint[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) => {
   const prices = data.map(d => d.price);
   
   const calculateEMA = (values: number[], period: number) => {
       const k = 2 / (period + 1);
       const emaArray = new Array(values.length).fill(null);
       
       // Simple MA for first value
       let sum = 0;
       for(let i = 0; i < Math.min(period, values.length); i++) sum += values[i];
       if (values.length >= period) emaArray[period - 1] = sum / period;
       
       for(let i = period; i < values.length; i++) {
           emaArray[i] = (values[i] * k) + (emaArray[i-1]! * (1-k));
       }
       return emaArray;
   }
   
   const fastEMA = calculateEMA(prices, fastPeriod);
   const slowEMA = calculateEMA(prices, slowPeriod);
   
   const macdLine = prices.map((_, i) => {
       if (fastEMA[i] === null || slowEMA[i] === null) return null;
       return fastEMA[i]! - slowEMA[i]!;
   });

   // Calculate Signal Line (EMA of MACD Line)
   const validMacd = macdLine.filter(x => x !== null) as number[];
   const signalLineRaw = calculateEMA(validMacd, signalPeriod);
   
   // Pad signal line with nulls to match original length
   const padLength = macdLine.length - validMacd.length;
   const signalLine = [...new Array(padLength).fill(null), ...signalLineRaw];

   return data.map((_, i) => ({
       macd: macdLine[i],
       signal: signalLine[i],
       histogram: (macdLine[i] !== null && signalLine[i] !== null) ? macdLine[i]! - signalLine[i]! : null
   }));
};
