// src/pages/FixedTimeTrading.tsx - Full updated file
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FixedTimeTrade, FixedTimeStatus, FixedTimeDirection, ExpiryDuration,
  AppSettings, RecoveryState, AIWarning,
  EXPIRY_DURATIONS, FIXED_TIME_ASSETS, FIXED_TIME_STRATEGIES
} from '../types';
import {
  getFixedTimeTrades, saveFixedTimeTrades, createFixedTimeTrade, addFixedTimeTrade,
  completeFixedTimeTrade, getFixedTimeTradeStats,
  getFixedTimeStatsByAsset, getFixedTimeStreakInfo,
  getFixedTimeDailyPnl, analyzeFixedTimeWarnings, generateFixedTimeAIInsights,
} from '../store';
import {
  Zap, TrendingUp, Clock, Award, Brain,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw, Play,
  ChevronUp, ChevronDown, Activity, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { safeFormatCurrency, getCurrencySymbol, parseCurrencyValue } from '../utils/currency';

interface FixedTimeTradingProps {
  settings: AppSettings;
  recovery: RecoveryState;
  onWarnings: (w: AIWarning[]) => void;
  onBalanceUpdate: () => void;
  getAvailableBalance: () => number;
}

// Format seconds to MM:SS or HH:MM:SS
const formatTime = (seconds: number): string => {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Get time color based on urgency
const getTimeColor = (remaining: number, total: number): string => {
  const percent = (remaining / total) * 100;
  if (percent > 50) return '#00ff88';
  if (percent > 25) return '#ffdd00';
  if (percent > 10) return '#ff8800';
  return '#ff3366';
};

export default function FixedTimeTrading({
  settings, recovery, onWarnings, onBalanceUpdate, getAvailableBalance
}: FixedTimeTradingProps) {
  // State
  const [allTrades, setAllTrades] = useState<FixedTimeTrade[]>([]);
  const [activeTrades, setActiveTrades] = useState<FixedTimeTrade[]>([]);
  const [_selectedTradeForResult, _setSelectedTradeForResult] = useState<string | null>(null);
  void _selectedTradeForResult; void _setSelectedTradeForResult;

  // Form state
  const [asset, setAsset] = useState('EUR/USD');
  const [direction, setDirection] = useState<FixedTimeDirection>('UP');
  const [duration, setDuration] = useState<ExpiryDuration>(30);
  const [amount, setAmount] = useState(10);
  const [payout, setPayout] = useState(80);
  const [entryPrice, setEntryPrice] = useState('');
  const [strategy, setStrategy] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState('');

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get currency symbol
  const CS = getCurrencySymbol(settings);

  // Helper to format currency values - handles any type
  const formatCurrency = (value: any): string => {
    const num = parseCurrencyValue(value);
    return safeFormatCurrency(num, CS);
  };

  // Load data
  const loadData = useCallback(() => {
    const trades = getFixedTimeTrades();
    setAllTrades(trades);
    
    // Update active trades
    const active = trades.filter(t => 
      t.status === 'ACTIVE' || t.status === 'PENDING_RESULT' || t.status === 'EXPIRED'
    );
    setActiveTrades(active);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer for countdown updates
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveTrades(prev => {
        const now = new Date().getTime();
        let changed = false;

        const updated = prev.map(trade => {
          const expiryTime = new Date(trade.expiryTime).getTime();
          const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));

          if (remaining === 0 && trade.status === 'ACTIVE') {
            changed = true;
            return { ...trade, status: 'PENDING_RESULT' as FixedTimeStatus };
          }
          return trade;
        });

        if (changed) {
          // Save updated statuses
          const allTrades = getFixedTimeTrades();
          const updatedAll = allTrades.map(t => {
            const match = updated.find(u => u.id === t.id);
            return match || t;
          });
          saveFixedTimeTrades(updatedAll);
        }

        return updated;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Get remaining seconds for a trade
  const getRemainingSeconds = (trade: FixedTimeTrade): number => {
    const now = new Date().getTime();
    const expiry = new Date(trade.expiryTime).getTime();
    return Math.max(0, Math.floor((expiry - now) / 1000));
  };

  // Get progress percent
  const getProgress = (trade: FixedTimeTrade): number => {
    const elapsed = trade.duration - getRemainingSeconds(trade);
    return Math.min(100, (elapsed / trade.duration) * 100);
  };

  // Calculate potential profit
  const potentialProfit = amount * (payout / 100);
  const availableBalance = getAvailableBalance();

  // Handle trade submission
  const handleSubmitTrade = () => {
    if (amount <= 0) return;
    if (amount > availableBalance) {
      alert('Insufficient balance');
      return;
    }

    // Check limits
    const todayTrades = allTrades.filter(t => 
      t.timestamp.startsWith(new Date().toISOString().split('T')[0])
    );
    const limit = recovery.active ? recovery.dailyTradeLimit : settings.dailyTradeLimit;
    if (todayTrades.length >= limit) {
      alert(`Daily trade limit (${limit}) reached`);
      return;
    }

    // Check active trade limit
    if (activeTrades.filter(t => t.status === 'ACTIVE').length >= 5) {
      alert('Maximum 5 active trades allowed');
      return;
    }

    const trade = createFixedTimeTrade({
      timestamp: new Date().toISOString(),
      asset,
      direction,
      entryPrice: parseFloat(entryPrice) || 0,
      duration,
      payoutPercent: payout,
      tradeAmount: amount,
      status: 'ACTIVE',
      entryTime: new Date().toISOString(),
      notes,
      strategy,
      confidence,
      marketCondition: '',
      isOtc: asset.includes('OTC'),
    });

    addFixedTimeTrade(trade);
    loadData();
    onBalanceUpdate();

    // Check for warnings
    const warnings = analyzeFixedTimeWarnings(getFixedTimeTrades(), settings);
    if (warnings.length > 0) {
      onWarnings(warnings);
    }

    // Reset form
    setEntryPrice('');
    setNotes('');
  };

  // Handle result selection
  const handleResult = (tradeId: string, result: 'WON' | 'LOST' | 'REFUND') => {
    completeFixedTimeTrade(tradeId, result);
    loadData();
    onBalanceUpdate();

    // Check warnings after completion
    const warnings = analyzeFixedTimeWarnings(getFixedTimeTrades(), settings);
    if (warnings.length > 0) {
      onWarnings(warnings);
    }
  };

  // Stats
  const stats = getFixedTimeTradeStats(allTrades);
  const byAsset = getFixedTimeStatsByAsset(allTrades);
  const streak = getFixedTimeStreakInfo(allTrades);
  const dailyPnl = getFixedTimeDailyPnl(allTrades);
  const insights = generateFixedTimeAIInsights(allTrades);

  // Today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = allTrades.filter(t => t.timestamp.startsWith(today));
  const todayPnl = todayTrades.reduce((s, t) => {
    const pnl = typeof t.tradePnl === 'number' ? t.tradePnl : parseCurrencyValue(t.tradePnl);
    return s + pnl;
  }, 0);
  const todayWins = todayTrades.filter(t => t.status === 'WON').length;
  const todayLosses = todayTrades.filter(t => t.status === 'LOST').length;

  // History (last 20 completed)
  const history = allTrades
    .filter(t => t.status === 'WON' || t.status === 'LOST' || t.status === 'REFUND')
    .slice(0, 20);

  const COLORS = ['#00ff88', '#00d4ff', '#a855f7', '#ffdd00', '#ff3366', '#ff8800'];

  // Format all currency values for display
  const formattedTotalPnl = formatCurrency(stats.totalPnl);
  const formattedTodayPnl = formatCurrency(todayPnl);
  const formattedAvailableBalance = formatCurrency(availableBalance);
  const formattedPotentialProfit = formatCurrency(potentialProfit);

  return (
    <div className="space-y-4">
      {/* Recovery Warning */}
      {recovery.active && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="warning-banner flex items-center gap-3">
          <AlertTriangle className="text-[#ff3366]" size={20} />
          <div>
            <div className="text-sm font-bold text-[#ff3366]">Recovery Mode Active</div>
            <div className="text-xs text-gray-400">
              Trade limit reduced to {recovery.dailyTradeLimit}/day. Use conservative amounts.
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Trade Entry */}
        <div className="space-y-4">
          {/* Trade Entry Card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <h3 className="text-sm font-bold text-[#00ff88] mb-4 flex items-center gap-2">
              <Zap size={16} /> Fixed Time Trade
            </h3>

            {/* Asset */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Asset</label>
              <select
                className="cyber-select"
                value={asset}
                onChange={e => setAsset(e.target.value)}
              >
                {FIXED_TIME_ASSETS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Direction Buttons */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Direction</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDirection('UP')}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    direction === 'UP'
                      ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88] border-2 border-[#00ff88]'
                      : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border-2 border-transparent hover:border-[rgba(0,255,136,0.3)]'
                  }`}
                >
                  <ChevronUp size={20} /> UP / CALL
                </button>
                <button
                  onClick={() => setDirection('DOWN')}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    direction === 'DOWN'
                      ? 'bg-[rgba(255,51,102,0.2)] text-[#ff3366] border-2 border-[#ff3366]'
                      : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border-2 border-transparent hover:border-[rgba(255,51,102,0.3)]'
                  }`}
                >
                  <ChevronDown size={20} /> DOWN / PUT
                </button>
              </div>
            </div>

            {/* Expiry Duration */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Expiry Time</label>
              
              {/* Seconds Row */}
              <div className="mb-1">
                <div className="text-[8px] text-gray-600 mb-1">SECONDS</div>
                <div className="grid grid-cols-5 gap-1">
                  {EXPIRY_DURATIONS.filter(d => d.value < 60).map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`py-2 rounded text-[10px] font-bold transition-all ${
                        duration === d.value
                          ? 'bg-[rgba(255,136,0,0.2)] text-[#ff8800] border border-[#ff8800]'
                          : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border border-transparent hover:border-[rgba(255,136,0,0.3)]'
                      }`}
                    >
                      {d.value}s
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Minutes Row */}
              <div>
                <div className="text-[8px] text-gray-600 mb-1">MINUTES / HOUR</div>
                <div className="grid grid-cols-4 gap-1">
                  {EXPIRY_DURATIONS.filter(d => d.value >= 60).map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={`py-2 rounded text-[10px] font-bold transition-all ${
                        duration === d.value
                          ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[#00d4ff]'
                          : 'bg-[rgba(30,42,58,0.5)] text-gray-500 border border-transparent hover:border-[rgba(0,212,255,0.3)]'
                      }`}
                    >
                      {d.label.replace(' Minutes', 'm').replace(' Minute', 'm').replace(' Hour', 'h').replace(' Seconds', 's')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amount and Payout */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Amount ({CS})</label>
                <input
                  type="number"
                  className="cyber-input"
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  min={1}
                  step={1}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Payout (%)</label>
                <input
                  type="number"
                  className="cyber-input"
                  value={payout}
                  onChange={e => setPayout(parseFloat(e.target.value) || 80)}
                  min={1}
                  max={1000}
                />
              </div>
            </div>

            {/* Balance and Potential */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(30,42,58,0.3)] mb-3">
              <div>
                <div className="text-[9px] text-gray-500">Available</div>
                <div className="text-sm font-bold text-[#00d4ff]">{formattedAvailableBalance}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-gray-500">Potential Profit</div>
                <div className="text-sm font-bold text-[#00ff88]">+{formattedPotentialProfit}</div>
              </div>
            </div>

            {/* Entry Price (optional) */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Entry Price (Optional)</label>
              <input
                type="text"
                className="cyber-input"
                placeholder="For logging purposes"
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
              />
            </div>

            {/* Strategy */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Strategy</label>
              <select className="cyber-select" value={strategy} onChange={e => setStrategy(e.target.value)}>
                <option value="">Select...</option>
                {FIXED_TIME_STRATEGIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Confidence */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
                <span>Confidence</span>
                <span className="text-[#00d4ff]">{confidence}%</span>
              </label>
              <input
                type="range"
                className="w-full"
                min={0}
                max={100}
                value={confidence}
                onChange={e => setConfidence(parseInt(e.target.value))}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitTrade}
              disabled={amount <= 0 || amount > availableBalance}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
              style={{
                background: direction === 'UP'
                  ? 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.1))'
                  : 'linear-gradient(135deg, rgba(255,51,102,0.2), rgba(255,136,0,0.1))',
                border: `2px solid ${direction === 'UP' ? '#00ff88' : '#ff3366'}`,
                color: direction === 'UP' ? '#00ff88' : '#ff3366',
                opacity: amount <= 0 || amount > availableBalance ? 0.5 : 1,
              }}
            >
              <Play size={20} />
              PLACE {direction} TRADE
            </button>
          </motion.div>

          {/* Stats Card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-[#a855f7]" /> Statistics
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 55 ? '#00ff88' : stats.winRate >= 45 ? '#ffdd00' : '#ff3366' },
                { label: 'Total P/L', value: formattedTotalPnl, color: stats.totalPnl >= 0 ? '#00ff88' : '#ff3366' },
                { label: 'Trades', value: stats.totalTrades, color: '#00d4ff' },
                { label: 'Profit Factor', value: stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1 ? '#00ff88' : '#ff3366' },
                { label: 'Today P/L', value: formattedTodayPnl, color: todayPnl >= 0 ? '#00ff88' : '#ff3366' },
                { label: 'Streak', value: streak.currentStreak > 0 ? `+${streak.currentStreak}` : streak.currentStreak, color: streak.currentStreak >= 0 ? '#00ff88' : '#ff3366' },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg bg-[rgba(30,42,58,0.3)] text-center">
                  <div className="text-[8px] text-gray-500 uppercase">{s.label}</div>
                  <div className="text-sm font-bold" style={{ color: s.color as string }}>{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Center Column - Active Trades & Countdown */}
        <div className="space-y-4">
          {/* Main Countdown Card */}
          {activeTrades.filter(t => t.status === 'ACTIVE').length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 neon-border-animated">
              {(() => {
                const trade = activeTrades.find(t => t.status === 'ACTIVE');
                if (!trade) return null;
                const remaining = getRemainingSeconds(trade);
                const progress = getProgress(trade);
                const color = getTimeColor(remaining, trade.duration);

                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-lg font-bold text-gray-200">{trade.asset}</div>
                        <div className="text-xs" style={{ color: trade.direction === 'UP' ? '#00ff88' : '#ff3366' }}>
                          {trade.direction === 'UP' ? '▲ UP / CALL' : '▼ DOWN / PUT'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Amount</div>
                        <div className="text-sm font-bold text-[#00d4ff]">{formatCurrency(trade.tradeAmount)}</div>
                      </div>
                    </div>

                    <div className="text-center py-4">
                      <div
                        className="text-6xl font-bold font-mono"
                        style={{ color, textShadow: `0 0 30px ${color}66` }}
                      >
                        {formatTime(remaining)}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {remaining > 0 ? 'Time Remaining' : 'EXPIRED - Select Result'}
                      </div>
                    </div>

                    <div className="h-3 rounded-full bg-[rgba(30,42,58,0.5)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                      />
                    </div>

                    <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                      <span>Potential: +{formatCurrency(trade.tradeAmount * trade.payoutPercent / 100)}</span>
                      <span>Payout: {trade.payoutPercent}%</span>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* Active Trades List */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={14} className="text-[#00d4ff]" /> Active Trades ({activeTrades.length})
            </h3>

            {activeTrades.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activeTrades.map(trade => {
                  const remaining = getRemainingSeconds(trade);
                  const progress = getProgress(trade);
                  const color = getTimeColor(remaining, trade.duration);
                  const isPending = trade.status === 'PENDING_RESULT' || remaining === 0;

                  return (
                    <div key={trade.id} className="p-3 rounded-lg bg-[rgba(22,27,34,0.8)] border border-[rgba(0,255,136,0.1)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-200">{trade.asset}</span>
                          <span className={`text-[10px] font-bold ${trade.direction === 'UP' ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                            {trade.direction === 'UP' ? '▲' : '▼'}
                          </span>
                        </div>
                        <div className="text-lg font-bold font-mono" style={{ color }}>
                          {formatTime(remaining)}
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-[rgba(30,42,58,0.5)] overflow-hidden mb-2">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">{formatCurrency(trade.tradeAmount)} · {trade.payoutPercent}%</span>
                        {isPending ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleResult(trade.id, 'WON')}
                              className="px-2 py-1 rounded bg-[rgba(0,255,136,0.2)] text-[#00ff88] font-bold hover:bg-[rgba(0,255,136,0.3)]"
                            >
                              WON
                            </button>
                            <button
                              onClick={() => handleResult(trade.id, 'LOST')}
                              className="px-2 py-1 rounded bg-[rgba(255,51,102,0.2)] text-[#ff3366] font-bold hover:bg-[rgba(255,51,102,0.3)]"
                            >
                              LOST
                            </button>
                            <button
                              onClick={() => handleResult(trade.id, 'REFUND')}
                              className="px-2 py-1 rounded bg-[rgba(255,221,0,0.2)] text-[#ffdd00] font-bold hover:bg-[rgba(255,221,0,0.3)]"
                            >
                              TIE
                            </button>
                          </div>
                        ) : (
                          <span style={{ color }}>ACTIVE</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-600 py-6 text-sm">
                No active trades. Place a trade to start.
              </div>
            )}
          </motion.div>

          {/* AI Insights */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain size={14} className="text-[#a855f7]" /> AI Insights
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {insights.map((insight, i) => (
                <div key={i} className="text-xs text-gray-300 p-2 rounded-lg bg-[rgba(30,42,58,0.3)] leading-relaxed">
                  {insight}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - History & Analytics */}
        <div className="space-y-4">
          {/* Today Summary */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Today's Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-[rgba(0,255,136,0.1)]">
                <div className="text-xl font-bold text-[#00ff88]">{todayWins}</div>
                <div className="text-[9px] text-gray-500">WINS</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[rgba(255,51,102,0.1)]">
                <div className="text-xl font-bold text-[#ff3366]">{todayLosses}</div>
                <div className="text-[9px] text-gray-500">LOSSES</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[rgba(0,212,255,0.1)]">
                <div className="text-xl font-bold" style={{ color: todayPnl >= 0 ? '#00ff88' : '#ff3366' }}>
                  {formattedTodayPnl}
                </div>
                <div className="text-[9px] text-gray-500">P/L</div>
              </div>
            </div>
          </motion.div>

          {/* Performance Chart */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#00ff88]" /> Performance
            </h3>
            {dailyPnl.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={dailyPnl.slice(-14)}>
                  <defs>
                    <linearGradient id="ftGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
                  <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: '#4a5568', fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 11 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="cumPnl" stroke="#00ff88" fill="url(#ftGrad)" strokeWidth={2} name="Cumulative P/L" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-gray-600 text-sm">No data yet</div>
            )}
          </motion.div>

          {/* Best Assets */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Award size={14} className="text-[#ffdd00]" /> Best Assets
            </h3>
            {byAsset.length > 0 ? (
              <div className="space-y-1">
                {byAsset.slice(0, 5).map((a, i) => (
                  <div key={a.asset} className="flex items-center justify-between p-2 rounded bg-[rgba(30,42,58,0.3)]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-300">{a.asset}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">{a.winRate}%</span>
                      <span className="text-xs font-bold" style={{ color: a.pnl >= 0 ? '#00ff88' : '#ff3366' }}>
                        {formatCurrency(a.pnl)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-600 py-4 text-sm">No data</div>
            )}
          </motion.div>

          {/* Recent History */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={14} className="text-[#8899aa]" /> Recent Trades
            </h3>
            {history.length > 0 ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {history.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded bg-[rgba(22,27,34,0.6)]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${t.direction === 'UP' ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                        {t.direction === 'UP' ? '▲' : '▼'}
                      </span>
                      <span className="text-xs text-gray-300">{t.asset.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'WON' && <CheckCircle2 size={12} className="text-[#00ff88]" />}
                      {t.status === 'LOST' && <XCircle size={12} className="text-[#ff3366]" />}
                      {t.status === 'REFUND' && <RotateCcw size={12} className="text-[#ffdd00]" />}
                      <span className="text-xs font-bold" style={{ color: t.tradePnl >= 0 ? '#00ff88' : '#ff3366' }}>
                        {t.tradePnl >= 0 ? '+' : ''}{formatCurrency(t.tradePnl)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-600 py-4 text-sm">No history yet</div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}