import React, { useMemo, useState } from 'react';
import { CryptoData, ChartPoint, TradeSignal, BacktestResult, OrderBookEntry } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, Bar, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
import { calculateRSI, calculateBollingerBands, calculateMACD } from '../utils/indicators';

interface AnalysisPanelProps {
  coinData: CryptoData | null;
  chartData: ChartPoint[];
  signal: TradeSignal | null;
  isLive: boolean;
  backtestResult: BacktestResult | null;
}

// Order Book Component
const OrderBook: React.FC<{ price: number; isLive: boolean }> = ({ price, isLive }) => {
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({ bids: [], asks: [] });

  useEffect(() => {
    const generateData = () => {
      const spread = price * 0.0005;
      const depth = 8;
      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];

      let currentBid = price - spread;
      let currentAsk = price + spread;

      for (let i = 0; i < depth; i++) {
        const bidPrice = currentBid - (Math.random() * price * 0.0005);
        const askPrice = currentAsk + (Math.random() * price * 0.0005);
        
        const bidAmt = Math.random() * 2 + 0.1;
        const askAmt = Math.random() * 2 + 0.1;

        bids.push({ price: bidPrice, amount: bidAmt, total: bidAmt * bidPrice, type: 'bid' });
        asks.push({ price: askPrice, amount: askAmt, total: askAmt * askPrice, type: 'ask' });

        currentBid = bidPrice;
        currentAsk = askPrice;
      }
      setOrderBook({ 
        bids: bids.sort((a, b) => b.price - a.price), 
        asks: asks.sort((a, b) => a.price - b.price) 
      });
    };

    generateData();
    
    if (isLive) {
      const interval = setInterval(generateData, 2500);
      return () => clearInterval(interval);
    }
  }, [price, isLive]);

  return (
    <div className="border border-[var(--terminal-color)] bg-black/90 rounded-md p-4 flex flex-col h-full text-xs font-mono">
      <div className="flex items-center justify-between mb-2 border-b border-[var(--terminal-color)] pb-1 opacity-80">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} />
          <span>ORDER BOOK</span>
        </div>
        <span className="text-green-400 font-bold">${price.toFixed(2)}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        <div className="grid grid-cols-3 gap-1 text-center opacity-50">
          <span>PRICE</span>
          <span>SIZE</span>
          <span>TOTAL</span>
        </div>
        {orderBook.bids.slice(0, 5).map((bid, i) => (
          <div key={`bid-${i}`} className="grid grid-cols-3 gap-1 text-green-400">
            <span>${bid.price.toFixed(2)}</span>
            <span>{bid.amount.toFixed(4)}</span>
            <span>${bid.total.toFixed(2)}</span>
          </div>
        ))}
        <div className="h-1 bg-gray-800 my-1"></div>
        {orderBook.asks.slice(0, 5).map((ask, i) => (
          <div key={`ask-${i}`} className="grid grid-cols-3 gap-1 text-red-400">
            <span>${ask.price.toFixed(2)}</span>
            <span>{ask.amount.toFixed(4)}</span>
            <span>${ask.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ coinData, chartData, signal, isLive, backtestResult }) => {
  const [showIndicators, setShowIndicators] = useState({ rsi: true, macd: true, bb: true });

  const indicators = useMemo(() => ({
    rsi: calculateRSI(chartData),
    macd: showIndicators.macd ? calculateMACD(chartData) : null,
    bb: showIndicators.bb ? calculateBollingerBands(chartData) : null,
  }), [chartData, showIndicators]);

  const combinedData = useMemo(() => chartData.map((point, index) => ({
    ...point,
    rsi: indicators.rsi[index],
    macd: indicators.macd?.[index]?.macd,
    macdSignal: indicators.macd?.[index]?.signal,
    macdHist: indicators.macd?.[index]?.histogram,
    bbUpper: indicators.bb?.[index]?.upper,
    bbLower: indicators.bb?.[index]?.lower,
    bbMiddle: indicators.bb?.[index]?.middle,
  })), [chartData, indicators]);

  if (!coinData) {
    return <div className="flex items-center justify-center h-full text-[var(--terminal-color)]">LOADING MARKET DATA...</div>;
  }

  const changeClass = coinData.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400';
  const TrendIcon = coinData.price_change_percentage_24h >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="h-full flex flex-col gap-4 text-[var(--terminal-color)]">
      {/* Coin Header */}
      <div className="bg-black/80 border border-[var(--terminal-color)] rounded-md p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{coinData.name} ({coinData.symbol.toUpperCase()})</h2>
            <TrendIcon size={16} className={changeClass} />
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono">${coinData.current_price.toLocaleString()}</p>
            <p className={`${changeClass} text-sm`}>{coinData.price_change_percentage_24h.toFixed(2)}% (24h)</p>
          </div>
        </div>
      </div>

      {/* Trade Signal */}
      {signal && (
        <div className="bg-black/80 border border-[var(--terminal-color)] rounded-md p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold">TRADE SIGNAL</h3>
            <span className={`px-2 py-1 rounded text-xs ${signal.action === 'LONG' ? 'bg-green-900' : signal.action === 'SHORT' ? 'bg-red-900' : 'bg-gray-900'}`}>
              {signal.action}
            </span>
          </div>
          <p className="text-sm opacity-80 mb-2">Entry: ${signal.entry} | SL: ${signal.stopLoss} | TP: {signal.takeProfit}</p>
          <p className="text-xs opacity-60">Conf: {signal.confidence}% - {signal.reasoning}</p>
        </div>
      )}

      {/* Backtest Result */}
      {backtestResult && (
        <div className="bg-black/80 border border-[var(--terminal-color)] rounded-md p-4">
          <h3 className="font-bold mb-2">BACKTEST RESULTS</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>ROI: {backtestResult.roi.toFixed(2)}%</p>
            <p>Win Rate: {backtestResult.winRate.toFixed(1)}%</p>
            <p>Trades: {backtestResult.totalTrades}</p>
            <p>Max DD: {backtestResult.maxDrawdown.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Left: Charts */}
        <div className="lg:col-span-2 h-full flex flex-col gap-4">
          {/* Main Price Chart */}
          <div className="bg-black/80 border border-[var(--terminal-color)] rounded-md p-2 flex-1">
            <div className="text-xs opacity-50 mb-1">PRICE / VOLUME</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-color)" opacity={0.1} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="var(--terminal-color)" opacity={0.5} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: 'var(--terminal-color)' }} />
                <Area type="monotone" dataKey="price" stroke="#22c55e" fillOpacity={0.2} fill="#22c55e" />
                <Bar dataKey="price" fill="#8884d8" opacity={0.3} /> {/* Volume proxy */}
                {showIndicators.bb && (
                  <>
                    <Line dataKey="bbUpper" stroke="red" strokeWidth={1} dot={false} />
                    <Line dataKey="bbLower" stroke="green" strokeWidth={1} dot={false} />
                    <Line dataKey="bbMiddle" stroke="gray" strokeWidth={1} dot={false} opacity={0.5} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Subcharts */}
          <div className="flex gap-4 h-[120px]">
            {showIndicators.rsi && (
              <div className="flex-1 bg-black/80 border border-[var(--terminal-color)] p-2 rounded-md">
                <div className="text-[10px] opacity-50 mb-1">RSI (14)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-color)" opacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 100]} stroke="var(--terminal-color)" opacity={0.5} tick={{fontSize: 9}} width={30} ticks={[30, 50, 70]} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: 'var(--terminal-color)' }} />
                    <ReferenceLine y={70} stroke="red" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={30} stroke="green" strokeDasharray="3 3" opacity={0.5} />
                    <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {showIndicators.macd && (
              <div className="flex-1 bg-black/80 border border-[var(--terminal-color)] p-2 rounded-md">
                <div className="text-[10px] opacity-50 mb-1">MACD (12, 26, 9)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--terminal-color)" opacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="var(--terminal-color)" opacity={0.5} tick={{fontSize: 9}} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: 'var(--terminal-color)' }} />
                    <Bar dataKey="macdHist" fillOpacity={0.5}>
                      {combinedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.macdHist && entry.macdHist > 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="macdSignal" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Book */}
        <div className="lg:col-span-1 h-full">
          <OrderBook price={coinData.current_price} isLive={isLive} />
        </div>
      </div>

      {/* Indicator Toggles (bottom) */}
      <div className="flex gap-2 text-xs opacity-70">
        <button onClick={() => setShowIndicators(p => ({...p, rsi: !p.rsi}))} className={`p-1 ${showIndicators.rsi ? 'text-yellow-400' : 'opacity-50'}`}>
          RSI
        </button>
        <button onClick={() => setShowIndicators(p => ({...p, macd: !p.macd}))} className={`p-1 ${showIndicators.macd ? 'text-blue-400' : 'opacity-50'}`}>
          MACD
        </button>
        <button onClick={() => setShowIndicators(p => ({...p, bb: !p.bb}))} className={`p-1 ${showIndicators.bb ? 'text-red-400' : 'opacity-50'}`}>
          BB
        </button>
      </div>
    </div>
  );
};
