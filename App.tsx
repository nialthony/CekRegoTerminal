import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { AnalysisPanel } from './components/AnalysisPanel';
import { CryptoData, ChartPoint, TerminalLog, Theme, TradeSignal, BacktestResult } from './types';
import { getCoinData, getMarketChart, searchCoins } from './services/coingeckoService';
import { analyzeMarket } from './services/geminiService';
import { runBacktest } from './utils/backtester';
import { RefreshCw, Sun, Moon } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_LOGS: TerminalLog[] = [
  {
    id: 'init-1',
    type: 'system',
    content: 'BOOT_SEQUENCE_INITIATED...',
    timestamp: new Date()
  },
  {
    id: 'init-2',
    type: 'system',
    content: 'LOADING_NEURAL_MODULES... OK',
    timestamp: new Date()
  },
  {
    id: 'init-3',
    type: 'system',
    content: 'CONNECTING_TO_CRYPTO_GRID... ESTABLISHED',
    timestamp: new Date()
  },
  {
    id: 'welcome',
    type: 'response',
    content: (
      <div className="my-2">
        <pre className="text-xs md:text-sm leading-tight font-bold text-glow">
{`
   ______     __   ____                  
  / ____/__  / /__/ __ \\___  ____ _____  
 / /   / _ \\/ //_/ /_/ / _ \\/ __ \`/ __ \\ 
/ /___/  __/ ,< / _, _/  __/ /_/ / /_/ / 
\\____/\\___/_/|_/_/ |_|\\___/\\__, /\\____/  
                          /____/         
  TERMINAL.AI v3.0.0 [CEK-REGO BUILD]
`}
        </pre>
        <p className="mt-2">Type 'help' for available commands.</p>
        <p className="text-xs opacity-70">Powered by Mock AI Engine</p>
      </div>
    ),
    timestamp: new Date()
  }
];

export default function App() {
  const [logs, setLogs] = useState<TerminalLog[]>(INITIAL_LOGS);
  const [theme, setTheme] = useState<Theme>(Theme.MATRIX);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCoin, setActiveCoin] = useState<CryptoData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [tradeSignal, setTradeSignal] = useState<TradeSignal | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error'>('connected');
  
  // Ref to keep track of coin ID for interval
  const activeCoinIdRef = useRef<string | null>(null);

  // Apply theme to body
  useEffect(() => {
    document.body.className = `${theme} crt`;
  }, [theme]);

  // Add log helper
  const addLog = useCallback((type: TerminalLog['type'], content: TerminalLog['content']) => {
    const log: TerminalLog = {
      id: generateId(),
      type,
      content,
      timestamp: new Date()
    };
    setLogs(prev => [...prev, log]);
  }, []);

  // Fetch data function
  const fetchCoinData = useCallback(async (coinId: string) => {
    setIsProcessing(true);
    try {
      const coin = await getCoinData(coinId);
      setActiveCoin(coin);
      activeCoinIdRef.current = coinId;

      const marketChart = await getMarketChart(coinId, 1); // 24h data
      const chartPoints: ChartPoint[] = marketChart.prices.map(([timestamp, price]) => ({
        date: timestamp,
        price
      }));
      setChartData(chartPoints);

      const signal = await analyzeMarket(coin, chartPoints);
      setTradeSignal(signal);
      setConnectionStatus('connected');

      addLog('system', `DATA_VISUALIZATION_UPDATED: ${coin.name} (${coin.symbol.toUpperCase()}).`);
      addLog('analysis', `${signal.reasoning}`);
    } catch (error: any) {
      addLog('error', `ERROR: ${error.message}`);
      setConnectionStatus('error');
      setTradeSignal(null);
    } finally {
      setIsProcessing(false);
    }
  }, [addLog]);

  // Initial load: Fetch Bitcoin
  useEffect(() => {
    fetchCoinData('bitcoin');
  }, []);

  // Polling logic
  useEffect(() => {
    if (!isLive || !activeCoinIdRef.current) return;

    const interval = setInterval(() => {
      if (activeCoinIdRef.current) {
        fetchCoinData(activeCoinIdRef.current);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [isLive, fetchCoinData]);

  // Handle command
  const handleCommand = useCallback(async (input: string) => {
    const trimmed = input.toLowerCase().trim();
    addLog('command', `> ${trimmed}`);

    if (trimmed === 'help') {
      addLog('response', (
        <div className="my-2">
          <p className="font-bold">COMMANDS:</p>
          <ul className="text-xs list-disc ml-4 space-y-1">
            <li>scan &lt;coin&gt; - e.g., scan ethereum</li>
            <li>backtest &lt;rsi|macd|bb&gt; - Run strategy backtest</li>
            <li>live - Toggle live updates</li>
            <li>theme - Cycle themes</li>
            <li>clear - Clear terminal</li>
          </ul>
        </div>
      ));
      return;
    }

    if (trimmed === 'clear') {
      setLogs([]);
      return;
    }

    if (trimmed === 'live') {
      setIsLive(prev => !prev);
      addLog('system', `LIVE_UPDATES: ${!isLive ? 'ENABLED' : 'DISABLED'}`);
      return;
    }

    if (trimmed === 'theme') {
      cycleTheme();
      addLog('system', `THEME: ${theme.toUpperCase()}`);
      return;
    }

    // Scan
    if (trimmed.startsWith('scan ')) {
      const query = trimmed.slice(5).trim();
      if (!query) {
        addLog('error', 'ERROR: Usage - scan &lt;coin&gt;');
        return;
      }
      setIsProcessing(true);
      try {
        const results = await searchCoins(query);
        if (results.length === 0) {
          addLog('error', 'ERROR: No coin found');
          return;
        }
        const selected = results[0];
        await fetchCoinData(selected.id);
        addLog('system', `SCANNING: ${selected.name}...`);
      } catch (error: any) {
        addLog('error', `ERROR: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Backtest
    if (trimmed.startsWith('backtest ')) {
      const strategy = trimmed.slice(8).trim() as 'rsi' | 'macd' | 'bb';
      if (!['rsi', 'macd', 'bb'].includes(strategy) || !chartData.length) {
        addLog('error', 'ERROR: Invalid/No data. Use: backtest rsi|macd|bb after scan');
        return;
      }
      setIsProcessing(true);
      try {
        const result = runBacktest(chartData, strategy);
        setBacktestResult(result);
        addLog('analysis', `BACKTEST ${strategy.toUpperCase()}: ROI ${result.roi.toFixed(2)}% | Win Rate ${result.winRate.toFixed(1)}% | Trades: ${result.totalTrades}`);
      } catch (error: any) {
        addLog('error', `ERROR: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    addLog('error', `ERROR: Unknown command '${trimmed}'. Type 'help'.`);
  }, [addLog, isLive, theme, chartData.length, fetchCoinData]);

  // Theme Cycle Helper
  const cycleTheme = useCallback(() => {
    const themes = [Theme.MATRIX, Theme.AMBER, Theme.CYAN, Theme.LIGHT];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  }, [theme]);

  return (
    <div className="h-screen w-screen p-2 md:p-6 flex flex-col md:flex-row gap-4 relative bg-black overflow-hidden">
      <div className="scanline"></div>
      
      {/* Theme Switcher */}
      <div className="fixed top-4 right-4 flex items-center gap-4 z-50 bg-black/80 p-2 rounded-full border border-[var(--terminal-color)] box-glow transition-all duration-300 hover:scale-105">
        <button 
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold transition-colors ${!isLive ? 'text-gray-500' : connectionStatus === 'error' ? 'text-red-500' : 'text-green-400'}`}
        >
          <RefreshCw size={14} className={`${isLive && connectionStatus !== 'error' ? 'animate-spin' : ''}`} />
          {connectionStatus === 'error' ? 'RECONNECTING' : isLive ? 'LIVE' : 'PAUSED'}
        </button>
        
        <div className="h-4 w-[1px] bg-[var(--terminal-color)] opacity-30"></div>

        <button onClick={cycleTheme} className="relative group">
          <div className={`absolute inset-0 blur-sm opacity-50 ${theme === Theme.LIGHT ? 'bg-white' : 'bg-[var(--terminal-color)]'}`}></div>
          <div className="relative flex items-center gap-2 px-2 py-1 cursor-pointer">
            {theme === Theme.LIGHT ? <Sun size={16} className="text-yellow-900"/> : <Moon size={16} className="text-[var(--terminal-color)]"/>}
            <span className="text-xs uppercase font-bold text-[var(--terminal-color)] hidden md:block">
              {theme.replace('theme-', '')?.toUpperCase()}
            </span>
          </div>
        </button>
      </div>

      {/* Left Panel: Terminal */}
      <div className="flex-1 md:w-1/3 min-h-[40vh] md:min-h-0 z-20 flex flex-col">
        <Terminal logs={logs} onCommand={handleCommand} isProcessing={isProcessing} />
      </div>

      {/* Right Panel: Visualization */}
      <div className="flex-1 md:w-2/3 min-h-[50vh] md:min-h-0 z-20 flex flex-col">
        <AnalysisPanel 
          coinData={activeCoin}
          chartData={chartData}
          signal={tradeSignal}
          isLive={isLive}
          backtestResult={backtestResult}
        />
      </div>
    </div>
  );
}
