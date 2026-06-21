import { motion } from 'framer-motion';
import { Bell, TrendingUp, TrendingDown, Activity, Shield, AlertTriangle, Timer } from 'lucide-react';
import { Trade, AIWarning, RecoveryState, AppSettings } from '../types';
import { getTradeStats, calculateDisciplineScore, calculateEmotionalScore, getFixedTimeTrades, getFixedTimeTradeStats, getTotalFixedTimePnl } from '../store';
import { safeFormatCurrency, getCurrencySymbol, parseCurrencyValue } from '../utils/currency';

interface TopBarProps {
  trades: Trade[];
  warnings: AIWarning[];
  recovery: RecoveryState;
  settings: AppSettings;
  onShowWarnings: () => void;
}

export default function TopBar({ trades, warnings, recovery, settings, onShowWarnings }: TopBarProps) {
  const stats = getTradeStats(trades);
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);
  const activeWarnings = warnings.filter(w => !w.dismissed);
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  
  // Calculate today's PnL with proper parsing
  let todayPnL = 0;
  for (const t of todayTrades) {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    todayPnL += pnl;
  }

  // Fixed time trading stats
  const fixedTimeTrades = getFixedTimeTrades();
  const fixedTimeStats = getFixedTimeTradeStats(fixedTimeTrades);
  const fixedTimePnl = getTotalFixedTimePnl();
  
  // Parse total combined PnL
  const statsTotalPnL = parseCurrencyValue(stats.totalPnL);
  const totalCombinedPnl = statsTotalPnL + fixedTimePnl;
  
  const todayFtTrades = fixedTimeTrades.filter(t => t.timestamp.startsWith(today));
  let todayFtPnl = 0;
  for (const t of todayFtTrades) {
    const pnl = typeof t.tradePnl === 'number' ? t.tradePnl : parseCurrencyValue(t.tradePnl);
    todayFtPnl += pnl;
  }
  const totalTodayPnl = todayPnL + todayFtPnl;

  // Get currency symbol
  const CS = getCurrencySymbol(settings);

  // Format values with proper negative sign placement
  const formattedTotalPnl = safeFormatCurrency(totalCombinedPnl, CS);
  const formattedTodayPnl = safeFormatCurrency(totalTodayPnl, CS);

  const statCards = [
    { label: 'Total P/L', value: formattedTotalPnl, icon: totalCombinedPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />, color: totalCombinedPnl >= 0 ? '#00ff88' : '#ff3366' },
    { label: 'Today', value: formattedTodayPnl, icon: <Activity size={14} />, color: totalTodayPnl >= 0 ? '#00ff88' : '#ff3366' },
    { label: 'Win Rate', value: `${stats.winRate}%`, icon: <TrendingUp size={14} />, color: stats.winRate >= 50 ? '#00ff88' : '#ffdd00' },
    { label: 'FT Win%', value: `${fixedTimeStats.winRate}%`, icon: <Timer size={14} />, color: fixedTimeStats.winRate >= 55 ? '#00ff88' : fixedTimeStats.winRate >= 45 ? '#ffdd00' : '#ff3366' },
    { label: 'Discipline', value: `${discipline}%`, icon: <Shield size={14} />, color: discipline >= 70 ? '#00ff88' : discipline >= 40 ? '#ffdd00' : '#ff3366' },
    { label: 'Emotional', value: `${emotional}%`, icon: <Activity size={14} />, color: emotional >= 60 ? '#00d4ff' : emotional >= 35 ? '#ffdd00' : '#ff3366' },
  ];

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-3 px-4 py-2 border-b border-[rgba(0,255,136,0.1)]"
      style={{ background: 'rgba(10, 10, 15, 0.9)' }}
    >
      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        {statCards.map((card, i) => (
          <div key={i} className="glass-card px-3 py-1.5 flex items-center gap-2 whitespace-nowrap min-w-fit">
            <span style={{ color: card.color }}>{card.icon}</span>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{card.label}</div>
              <div className="text-xs font-bold stat-value" style={{ color: card.color }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {recovery.active && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,51,102,0.3)] bg-[rgba(255,51,102,0.1)]"
        >
          <AlertTriangle size={14} className="text-[#ff3366] animate-pulse-neon" />
          <span className="text-[10px] font-bold text-[#ff3366] uppercase tracking-wider">Recovery Mode</span>
        </motion.div>
      )}

      <button
        onClick={onShowWarnings}
        className="relative p-2 rounded-lg border border-[rgba(0,255,136,0.1)] hover:border-[rgba(0,255,136,0.3)] transition-all"
      >
        <Bell size={16} className="text-gray-400" />
        {activeWarnings.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff3366] text-[8px] flex items-center justify-center text-white font-bold animate-pulse">
            {activeWarnings.length}
          </span>
        )}
      </button>
    </motion.div>
  );
}