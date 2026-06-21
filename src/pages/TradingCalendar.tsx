// src/pages/TradingCalendar.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade } from '../types';
import { 
  CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Activity,
  X, DollarSign, BarChart3, PieChart, AlertCircle, CheckCircle2, XCircle,
  RefreshCw, Filter, Calendar, Clock, ArrowUpDown, TrendingUp as TrendUp,
  TrendingDown as TrendDown, Minus, Download, Upload, Eye, EyeOff,
  Maximize2, Minimize2, Settings, Zap, Flame, Award, Target, Grid3x3
} from 'lucide-react';

interface CalendarProps {
  trades: Trade[];
}

interface TradeData {
  [date: string]: Trade[];
}

interface MonthlyStats {
  totalTrades: number;
  totalPnl: number;
  totalInvestment: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  tradingDays: number;
  profitableDays: number;
  losingDays: number;
  breakevenDays: number;
  bestDay: number;
  worstDay: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  currentStreak: number;
}

interface YearlyStats {
  [month: string]: MonthlyStats;
}

// ============================================================================
// UTILITY: Format currency with negative sign BEFORE the currency symbol
// ============================================================================

const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function safeDivision(numerator: number, denominator: number, defaultValue: number = 0): number {
  if (denominator === 0 || denominator === null || isNaN(denominator)) {
    return defaultValue;
  }
  return numerator / denominator;
}

function getMonthName(month: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  return names[month] || '';
}

function getPnLColor(pnl: number): string {
  if (pnl > 0) return '#00ff88';
  if (pnl < 0) return '#ff3366';
  return '#ffdd00';
}

function getPnLClass(pnl: number): string {
  if (pnl > 0) return 'text-[#00ff88]';
  if (pnl < 0) return 'text-[#ff3366]';
  return 'text-[#ffdd00]';
}

function getResultBadge(pnl: number): { label: string; color: string; icon: React.ReactNode } {
  if (pnl > 0) {
    return { label: 'PROFIT', color: 'bg-[rgba(0,255,136,0.15)] text-[#00ff88]', icon: <CheckCircle2 size={12} /> };
  } else if (pnl < 0) {
    return { label: 'LOSS', color: 'bg-[rgba(255,51,102,0.15)] text-[#ff3366]', icon: <XCircle size={12} /> };
  }
  return { label: 'BREAK-EVEN', color: 'bg-[rgba(255,221,0,0.15)] text-[#ffdd00]', icon: <AlertCircle size={12} /> };
}

// ============================================================================
// COMPONENTS
// ============================================================================

// ============================================================================
// STREAK INDICATOR
// ============================================================================

const StreakIndicator: React.FC<{ streak: number; type: 'win' | 'loss' | 'none' }> = ({ streak, type }) => {
  if (streak === 0 || type === 'none') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(30,40,40,0.4)] border border-[rgba(255,255,255,0.05)]">
        <Minus size={14} className="text-gray-500" />
        <span className="text-xs text-gray-500">No active streak</span>
      </div>
    );
  }

  const isWin = type === 'win';
  const color = isWin ? '#00ff88' : '#ff3366';
  const bgColor = isWin ? 'rgba(0,255,136,0.12)' : 'rgba(255,51,102,0.12)';
  const borderColor = isWin ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,102,0.3)';
  const icon = isWin ? <Flame size={16} /> : <TrendDown size={16} />;
  const label = isWin ? 'Winning Streak' : 'Losing Streak';

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border`} style={{ background: bgColor, borderColor }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-sm font-bold" style={{ color }}>{streak}</span>
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  );
};

// ============================================================================
// PERFORMANCE METRIC CARD
// ============================================================================

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  trend?: number;
  glow?: boolean;
}> = ({ label, value, color, icon, trend, glow = false }) => {
  return (
    <div className={`p-3 rounded-xl bg-[rgba(30,40,40,0.4)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all ${glow ? 'shadow-[0_0_30px_rgba(0,255,136,0.05)]' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">{label}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-lg font-bold" style={{ color: color || '#ffffff' }}>{value}</span>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold ${trend > 0 ? 'text-[#00ff88]' : trend < 0 ? 'text-[#ff3366]' : 'text-gray-500'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// CALENDAR DAY CELL
// ============================================================================

const CalendarDayCell: React.FC<{
  day: number;
  data?: { pnl: number; trades: number; wins: number; hasEmotional: boolean; tradesList: Trade[] };
  isSelected: boolean;
  isToday: boolean;
  hasTrades: boolean;
  onDayClick: (day: number) => void;
}> = ({ day, data, isSelected, isToday, hasTrades, onDayClick }) => {
  const getBackground = () => {
    if (!data) return 'bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]';
    
    const intensity = Math.min(Math.abs(data.pnl) / 50, 1);
    const alpha = 0.15 + (intensity * 0.6);
    
    if (data.hasEmotional) {
      return `bg-[rgba(255,221,0,${alpha})] border border-[rgba(255,221,0,0.3)]`;
    }
    if (data.pnl > 0) {
      return `bg-[rgba(0,255,136,${alpha})] border border-[rgba(0,255,136,${intensity * 0.3 + 0.1})]`;
    }
    if (data.pnl < 0) {
      return `bg-[rgba(255,51,102,${alpha})] border border-[rgba(255,51,102,${intensity * 0.3 + 0.1})]`;
    }
    return 'bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.15)]';
  };

  const getHoverBg = () => {
    if (!data) return 'hover:bg-[rgba(40,50,50,0.4)]';
    if (data.hasEmotional) return 'hover:bg-[rgba(255,221,0,0.25)]';
    if (data.pnl > 0) return 'hover:bg-[rgba(0,255,136,0.25)]';
    if (data.pnl < 0) return 'hover:bg-[rgba(255,51,102,0.25)]';
    return 'hover:bg-[rgba(0,212,255,0.2)]';
  };

  const getShadow = () => {
    if (isSelected) return 'shadow-[0_0_20px_rgba(0,212,255,0.3)] ring-2 ring-[#00d4ff]';
    if (data?.hasEmotional) return 'shadow-[0_0_15px_rgba(255,221,0,0.2)]';
    if (data?.pnl > 10) return 'shadow-[0_0_15px_rgba(0,255,136,0.15)]';
    if (data?.pnl < -10) return 'shadow-[0_0_15px_rgba(255,51,102,0.15)]';
    if (isToday) return 'ring-1 ring-[#ffdd00] shadow-[0_0_10px_rgba(255,221,0,0.15)]';
    return '';
  };

  return (
    <motion.div
      whileHover={{ scale: hasTrades ? 1.08 : 1.02 }}
      whileTap={{ scale: hasTrades ? 0.95 : 1 }}
      onClick={() => hasTrades && onDayClick(day)}
      className={`
        aspect-square rounded-xl p-1 flex flex-col items-center justify-center transition-all duration-200 text-center
        ${getBackground()}
        ${getHoverBg()}
        ${getShadow()}
        ${hasTrades ? 'cursor-pointer' : 'cursor-default'}
        relative overflow-hidden
      `}
    >
      {hasTrades && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50 rounded-xl" />
      )}
      
      <span className={`
        text-sm font-bold relative z-10
        ${isToday ? 'text-[#ffdd00]' : hasTrades ? 'text-white' : 'text-gray-600'}
      `}>
        {day}
      </span>
      
      {data && (
        <>
          <span className={`text-[9px] font-bold mt-0.5 relative z-10 ${getPnLClass(data.pnl)}`}>
            {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(0)}
          </span>
          <span className="text-[7px] opacity-60 text-gray-400 relative z-10">{data.trades}t</span>
        </>
      )}
      
      {data?.hasEmotional && (
        <span className="absolute top-0.5 right-0.5 text-[8px] z-20">⚠️</span>
      )}
      
      {data && data.trades > 0 && data.pnl > 0 && (
        <div className="absolute bottom-0.5 right-0.5 text-[8px] text-[#00ff88] opacity-50 z-10">▲</div>
      )}
      {data && data.trades > 0 && data.pnl < 0 && (
        <div className="absolute bottom-0.5 right-0.5 text-[8px] text-[#ff3366] opacity-50 z-10">▼</div>
      )}
    </motion.div>
  );
};

// ============================================================================
// TRADE HISTORY DIALOG (Enhanced)
// ============================================================================

const TradeHistoryDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: string;
  trades: Trade[];
}> = ({ isOpen, onClose, date, trades }) => {
  const [sortField, setSortField] = useState<'time' | 'pnl' | 'amount'>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'profit' | 'loss'>('all');

  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalInvestment = trades.reduce((sum, t) => sum + t.amount, 0);
    const wins = trades.filter(t => t.isWin).length;
    const losses = trades.filter(t => !t.isWin).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgWin = wins > 0 ? trades.filter(t => t.isWin).reduce((s, t) => s + t.profitLoss, 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(trades.filter(t => !t.isWin).reduce((s, t) => s + t.profitLoss, 0) / losses) : 0;
    const profitFactor = losses > 0 ? (wins / losses) : wins > 0 ? Infinity : 0;
    const maxWin = trades.length > 0 ? Math.max(...trades.map(t => t.profitLoss)) : 0;
    const maxLoss = trades.length > 0 ? Math.min(...trades.map(t => t.profitLoss)) : 0;

    return { totalTrades, totalPnl, totalInvestment, wins, losses, winRate, avgPnl, avgWin, avgLoss, profitFactor, maxWin, maxLoss };
  }, [trades]);

  const sortedTrades = useMemo(() => {
    let filtered = trades;
    if (filterType === 'profit') filtered = filtered.filter(t => t.isWin);
    if (filterType === 'loss') filtered = filtered.filter(t => !t.isWin);

    return [...filtered].sort((a, b) => {
      let compare = 0;
      if (sortField === 'time') compare = a.time.localeCompare(b.time);
      else if (sortField === 'pnl') compare = a.profitLoss - b.profitLoss;
      else if (sortField === 'amount') compare = a.amount - b.amount;
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [trades, sortField, sortDirection, filterType]);

  if (!isOpen) return null;

  const displayDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleSort = (field: 'time' | 'pnl' | 'amount') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[rgba(15,25,25,0.98)] p-6 w-[850px] max-h-[85vh] rounded-2xl border border-[rgba(0,255,136,0.15)] shadow-[0_0_60px_rgba(0,255,136,0.05)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(0,255,136,0.1)]">
          <div>
            <h3 className="text-xl font-bold text-[#00ff88] flex items-center gap-3">
              <CalendarDays size={22} />
              {displayDate}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{trades.length} trades on this day</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-xl text-gray-500 hover:text-[#00ff88] transition-all">
            <X size={22} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard 
            label="Total P&L" 
            value={formatCurrency(stats.totalPnl)} 
            color={getPnLColor(stats.totalPnl)} 
            icon={<DollarSign size={12} />}
            glow={stats.totalPnl > 0}
          />
          <MetricCard 
            label="Win Rate" 
            value={`${stats.winRate.toFixed(1)}%`} 
            color="#00d4ff" 
            icon={<TrendUp size={12} />}
          />
          <MetricCard 
            label="Profit Factor" 
            value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} 
            color={stats.profitFactor >= 1 ? '#00ff88' : '#ff3366'}
            icon={<Award size={12} />}
          />
          <MetricCard 
            label="Avg P&L" 
            value={formatCurrency(stats.avgPnl)} 
            color={getPnLColor(stats.avgPnl)}
            icon={<Target size={12} />}
          />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          <div className="flex justify-between items-center p-2.5 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
            <span className="text-[10px] text-gray-400">Best Trade</span>
            <span className="text-xs font-bold text-[#00ff88]">{formatCurrency(stats.maxWin)}</span>
          </div>
          <div className="flex justify-between items-center p-2.5 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
            <span className="text-[10px] text-gray-400">Worst Trade</span>
            <span className="text-xs font-bold text-[#ff3366]">{formatCurrency(stats.maxLoss)}</span>
          </div>
          <div className="flex justify-between items-center p-2.5 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
            <span className="text-[10px] text-gray-400">Avg Win / Loss</span>
            <span className="text-xs font-bold text-gray-300">
              {formatCurrency(stats.avgWin)} / {formatCurrency(stats.avgLoss)}
            </span>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-3 mb-3 flex-wrap p-2.5 rounded-xl bg-[rgba(30,40,40,0.2)] border border-[rgba(255,255,255,0.05)]">
          <span className="text-[10px] text-gray-500 uppercase font-bold">Filter:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filterType === 'all' 
                ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]' 
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('profit')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filterType === 'profit' 
                ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]' 
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            Profit
          </button>
          <button
            onClick={() => setFilterType('loss')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filterType === 'loss' 
                ? 'bg-[rgba(255,51,102,0.15)] text-[#ff3366] border border-[rgba(255,51,102,0.2)]' 
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            Loss
          </button>
          <span className="text-[10px] text-gray-500 uppercase font-bold ml-2">Sort:</span>
          <button
            onClick={() => handleSort('time')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              sortField === 'time' ? 'text-[#00d4ff] bg-[rgba(0,212,255,0.1)]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Time {sortField === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('pnl')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              sortField === 'pnl' ? 'text-[#00d4ff] bg-[rgba(0,212,255,0.1)]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            P&L {sortField === 'pnl' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('amount')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              sortField === 'amount' ? 'text-[#00d4ff] bg-[rgba(0,212,255,0.1)]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.05)]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[rgba(15,25,25,0.98)] z-10">
              <tr className="text-gray-400 border-b border-[rgba(0,255,136,0.1)]">
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Asset</th>
                <th className="text-left p-3">Dir</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">P&L</th>
                <th className="text-center p-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((trade, idx) => (
                <motion.tr 
                  key={trade.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,255,136,0.03)] transition-colors"
                >
                  <td className="p-3 text-gray-400">{trade.time}</td>
                  <td className="p-3 text-gray-200 font-medium">{trade.asset}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                      trade.direction === 'buy' 
                        ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]' 
                        : 'bg-[rgba(255,51,102,0.1)] text-[#ff3366]'
                    }`}>
                      {trade.direction === 'buy' ? '▲ UP' : '▼ DOWN'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-gray-300">{formatCurrency(trade.amount)}</td>
                  <td className={`p-3 text-right font-bold ${getPnLClass(trade.profitLoss)}`}>
                    {formatCurrency(trade.profitLoss)}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1.5 ${getResultBadge(trade.profitLoss).color}`}>
                      {getResultBadge(trade.profitLoss).icon}
                      {getResultBadge(trade.profitLoss).label}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={onClose} className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(0,255,136,0.15)]">
          Close
        </button>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN CALENDAR COMPONENT
// ============================================================================

export default function TradingCalendar({ trades }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'heatmap'>('monthly');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [selectedDateTrades, setSelectedDateTrades] = useState<Trade[]>([]);
  const [showStats, setShowStats] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ============================================================================
  // MONTHLY DATA CALCULATIONS
  // ============================================================================

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group trades by date
  const dayData = useMemo(() => {
    const map = new Map<number, { pnl: number; trades: number; wins: number; hasEmotional: boolean; tradesList: Trade[] }>();
    for (const t of trades) {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const ex = map.get(day) || { pnl: 0, trades: 0, wins: 0, hasEmotional: false, tradesList: [] };
        ex.pnl += t.profitLoss;
        ex.trades++;
        if (t.isWin) ex.wins++;
        ex.tradesList.push(t);
        if (['angry', 'frustrated', 'fearful', 'greedy', 'revenge', 'fomo'].includes(t.emotionBefore.toLowerCase())) {
          ex.hasEmotional = true;
        }
        map.set(day, ex);
      }
    }
    return map;
  }, [trades, year, month]);

  // Calculate streaks
  const streaks = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | 'none' = 'none';

    for (const trade of sortedTrades) {
      if (trade.isWin) {
        currentWinStreak++;
        currentLossStreak = 0;
        currentStreak++;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
        streakType = 'win';
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        currentStreak = -currentLossStreak;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
        streakType = 'loss';
      }
    }

    return {
      currentWinStreak,
      currentLossStreak,
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      streakType: currentStreak === 0 ? 'none' : streakType,
    };
  }, [trades]);

  // Monthly stats
  const monthlyStats = useMemo((): MonthlyStats => {
    const monthTrades = trades.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    
    const totalTrades = monthTrades.length;
    const totalPnl = monthTrades.reduce((s, t) => s + t.profitLoss, 0);
    const totalInvestment = monthTrades.reduce((s, t) => s + t.amount, 0);
    const wins = monthTrades.filter(t => t.isWin).length;
    const losses = monthTrades.filter(t => !t.isWin).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgWin = wins > 0 ? monthTrades.filter(t => t.isWin).reduce((s, t) => s + t.profitLoss, 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(monthTrades.filter(t => !t.isWin).reduce((s, t) => s + t.profitLoss, 0) / losses) : 0;
    const tradingDays = dayData.size;
    const profitableDays = [...dayData.values()].filter(d => d.pnl > 0).length;
    const losingDays = [...dayData.values()].filter(d => d.pnl < 0).length;
    const breakevenDays = tradingDays - profitableDays - losingDays;
    const bestDay = tradingDays > 0 ? Math.max(...[...dayData.values()].map(d => d.pnl)) : 0;
    const worstDay = tradingDays > 0 ? Math.min(...[...dayData.values()].map(d => d.pnl)) : 0;

    return {
      totalTrades,
      totalPnl,
      totalInvestment,
      wins,
      losses,
      winRate,
      profitFactor,
      avgPnl,
      avgWin,
      avgLoss,
      tradingDays,
      profitableDays,
      losingDays,
      breakevenDays,
      bestDay,
      worstDay,
      consecutiveWins: streaks.maxWinStreak,
      consecutiveLosses: streaks.maxLossStreak,
      currentStreak: streaks.currentStreak,
    };
  }, [trades, year, month, dayData, streaks]);

  // ============================================================================
  // HEATMAP DATA
  // ============================================================================

  const heatmapData = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; winRate: number }>();
    for (const t of trades) {
      const key = t.date;
      const ex = map.get(key) || { pnl: 0, trades: 0, wins: 0 };
      ex.pnl += t.profitLoss;
      ex.trades++;
      if (t.isWin) ex.wins = (ex.wins || 0) + 1;
      map.set(key, { ...ex, winRate: ex.trades > 0 ? (ex.wins || 0) / ex.trades * 100 : 0 });
    }
    return map;
  }, [trades]);

  // ============================================================================
  // YEARLY DATA CALCULATIONS
  // ============================================================================

  const yearlyStats = useMemo((): YearlyStats => {
    const stats: YearlyStats = {};
    
    for (let m = 0; m < 12; m++) {
      const monthTrades = trades.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      
      const totalTrades = monthTrades.length;
      const totalPnl = monthTrades.reduce((s, t) => s + t.profitLoss, 0);
      const wins = monthTrades.filter(t => t.isWin).length;
      const losses = monthTrades.filter(t => !t.isWin).length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
      const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
      const avgWin = wins > 0 ? monthTrades.filter(t => t.isWin).reduce((s, t) => s + t.profitLoss, 0) / wins : 0;
      const avgLoss = losses > 0 ? Math.abs(monthTrades.filter(t => !t.isWin).reduce((s, t) => s + t.profitLoss, 0) / losses) : 0;
      
      const monthDayData = new Set<string>();
      monthTrades.forEach(t => monthDayData.add(t.date));
      const tradingDays = monthDayData.size;
      
      const dayPnL = new Map<string, number>();
      monthTrades.forEach(t => {
        dayPnL.set(t.date, (dayPnL.get(t.date) || 0) + t.profitLoss);
      });
      const profitableDays = [...dayPnL.values()].filter(pnl => pnl > 0).length;
      const losingDays = [...dayPnL.values()].filter(pnl => pnl < 0).length;
      const breakevenDays = tradingDays - profitableDays - losingDays;
      const bestDay = tradingDays > 0 ? Math.max(...dayPnL.values()) : 0;
      const worstDay = tradingDays > 0 ? Math.min(...dayPnL.values()) : 0;
      
      stats[getMonthName(m)] = {
        totalTrades,
        totalPnl,
        wins,
        losses,
        winRate,
        profitFactor,
        avgPnl,
        avgWin,
        avgLoss,
        tradingDays,
        profitableDays,
        losingDays,
        breakevenDays,
        bestDay,
        worstDay,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        currentStreak: 0,
        totalInvestment: 0
      };
    }
    
    return stats;
  }, [trades, year]);

  // ============================================================================
  // YEARLY TOTALS
  // ============================================================================

  const yearlyTotals = useMemo(() => {
    const allYearTrades = trades.filter(t => new Date(t.date).getFullYear() === year);
    const totalTrades = allYearTrades.length;
    const totalPnl = allYearTrades.reduce((s, t) => s + t.profitLoss, 0);
    const wins = allYearTrades.filter(t => t.isWin).length;
    const losses = allYearTrades.filter(t => !t.isWin).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgWin = wins > 0 ? allYearTrades.filter(t => t.isWin).reduce((s, t) => s + t.profitLoss, 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(allYearTrades.filter(t => !t.isWin).reduce((s, t) => s + t.profitLoss, 0) / losses) : 0;
    const tradingDays = new Set(allYearTrades.map(t => t.date)).size;
    
    return { totalTrades, totalPnl, wins, losses, winRate, profitFactor, avgPnl, avgWin, avgLoss, tradingDays };
  }, [trades, year]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevYear = () => setCurrentDate(new Date(year - 1, month, 1));
  const nextYear = () => setCurrentDate(new Date(year + 1, month, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrades = dayData.get(day)?.tradesList || [];
    
    if (dayTrades.length > 0) {
      setSelectedDateTrades(dayTrades);
      setSelectedDay(dateStr);
      setShowTradeDialog(true);
    }
  };

  const handleRefresh = () => {
    setCurrentDate(new Date(currentDate));
  };

  const toggleFullScreen = () => {
    setFullScreen(!fullScreen);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-4 ${fullScreen ? 'fixed inset-0 z-50 p-6 bg-[rgba(10,15,15,0.98)] overflow-y-auto' : ''}`}>
      {/* Trade History Dialog */}
      <TradeHistoryDialog
        isOpen={showTradeDialog}
        onClose={() => setShowTradeDialog(false)}
        date={selectedDay || ''}
        trades={selectedDateTrades}
      />

      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 bg-[rgba(30,40,40,0.3)] p-1 rounded-xl border border-[rgba(255,255,255,0.05)]">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'monthly'
                ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] shadow-[0_0_20px_rgba(0,255,136,0.05)]'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Monthly
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'yearly'
                ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] shadow-[0_0_20px_rgba(0,255,136,0.05)]'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Yearly
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'heatmap'
                ? 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] shadow-[0_0_20px_rgba(0,255,136,0.05)]'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            <Grid3x3 size={16} className="inline mr-2" />
            Heatmap
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2.5 rounded-xl bg-[rgba(30,40,40,0.4)] border border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-[#00ff88] hover:border-[rgba(0,255,136,0.2)] transition-all"
            title="Toggle Stats"
          >
            {showStats ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2.5 rounded-xl bg-[rgba(30,40,40,0.4)] border border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-[#00ff88] hover:border-[rgba(0,255,136,0.2)] transition-all"
            title="Toggle Full Screen"
          >
            {fullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-[rgba(30,40,40,0.4)] border border-[rgba(255,255,255,0.06)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] hover:border-[rgba(0,255,136,0.2)] transition-all"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MONTHLY VIEW */}
      {/* ============================================================ */}
      {viewMode === 'monthly' && (
        <>
          {/* Month Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-5 flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.06)]"
          >
            <button 
              onClick={prevMonth} 
              className="p-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-[#00ff88] transition-all"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#00d4ff] flex items-center gap-3">
                <CalendarDays size={24} /> {monthName}
              </h2>
              <button 
                onClick={goToToday} 
                className="text-[11px] text-gray-500 hover:text-[#00ff88] transition-colors mt-1"
              >
                Today
              </button>
            </div>
            <button 
              onClick={nextMonth} 
              className="p-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-[#00ff88] transition-all"
            >
              <ChevronRight size={22} />
            </button>
          </motion.div>

          {/* Streak Indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            <StreakIndicator 
              streak={Math.abs(streaks.currentStreak)} 
              type={streaks.streakType} 
            />
            {streaks.maxWinStreak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.1)]">
                <Flame size={14} className="text-[#00ff88]" />
                <span className="text-xs text-gray-400">Best Win Streak: <span className="text-[#00ff88] font-bold">{streaks.maxWinStreak}</span></span>
              </div>
            )}
            {streaks.maxLossStreak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.1)]">
                <TrendDown size={14} className="text-[#ff3366]" />
                <span className="text-xs text-gray-400">Worst Loss Streak: <span className="text-[#ff3366] font-bold">{streaks.maxLossStreak}</span></span>
              </div>
            )}
          </div>

          {/* Monthly Stats */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard 
                label="Month P/L" 
                value={formatCurrency(monthlyStats.totalPnl)} 
                color={getPnLColor(monthlyStats.totalPnl)}
                icon={<DollarSign size={12} />}
                glow={monthlyStats.totalPnl > 0}
              />
              <MetricCard 
                label="Win Rate" 
                value={`${monthlyStats.winRate.toFixed(1)}%`} 
                color="#00d4ff"
                icon={<TrendUp size={12} />}
              />
              <MetricCard 
                label="Total Trades" 
                value={monthlyStats.totalTrades} 
                color="#ffffff"
                icon={<Activity size={12} />}
              />
              <MetricCard 
                label="Trading Days" 
                value={monthlyStats.tradingDays} 
                color="#ffdd00"
                icon={<Calendar size={12} />}
              />
              <MetricCard 
                label="Profit Factor" 
                value={monthlyStats.profitFactor === Infinity ? '∞' : monthlyStats.profitFactor.toFixed(2)} 
                color={monthlyStats.profitFactor >= 1 ? '#00ff88' : '#ff3366'}
                icon={<Award size={12} />}
              />
            </div>
          )}

          {/* Calendar Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-5 rounded-2xl border border-[rgba(255,255,255,0.06)]"
          >
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[11px] text-gray-500 font-bold uppercase py-2 bg-[rgba(30,40,40,0.2)] rounded-xl">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-xl bg-[rgba(30,40,40,0.15)]" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const data = dayData.get(day);
                const isSelected = selectedDay === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                const hasTrades = data && data.trades > 0;

                return (
                  <CalendarDayCell
                    key={day}
                    day={day}
                    data={data}
                    isSelected={isSelected}
                    isToday={isToday}
                    hasTrades={!!hasTrades}
                    onDayClick={handleDayClick}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 justify-center flex-wrap p-3 rounded-xl bg-[rgba(30,40,40,0.2)] border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <div className="w-3 h-3 rounded-lg bg-[rgba(0,255,136,0.7)] border border-[rgba(0,255,136,0.2)]" /> Strong Profit
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <div className="w-3 h-3 rounded-lg bg-[rgba(0,255,136,0.3)] border border-[rgba(0,255,136,0.1)]" /> Profit
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <div className="w-3 h-3 rounded-lg bg-[rgba(255,51,102,0.3)] border border-[rgba(255,51,102,0.1)]" /> Loss
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <div className="w-3 h-3 rounded-lg bg-[rgba(255,51,102,0.7)] border border-[rgba(255,51,102,0.2)]" /> Strong Loss
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <div className="w-3 h-3 rounded-lg bg-[rgba(255,221,0,0.4)] border border-[rgba(255,221,0,0.2)]" /> Emotional
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <div className="w-3 h-3 rounded-lg bg-[rgba(0,212,255,0.2)] border border-[rgba(0,212,255,0.1)]" /> Break-even
              </div>
            </div>
          </motion.div>

          {/* Month Summary */}
          {showStats && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 rounded-2xl border border-[rgba(255,255,255,0.06)]"
            >
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChart size={14} className="text-[#00d4ff]" />
                Month Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Trading Days</span>
                  <span className="text-sm font-bold text-white">{monthlyStats.tradingDays}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Profitable Days</span>
                  <span className="text-sm font-bold text-[#00ff88]">{monthlyStats.profitableDays}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Losing Days</span>
                  <span className="text-sm font-bold text-[#ff3366]">{monthlyStats.losingDays}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Break-even Days</span>
                  <span className="text-sm font-bold text-[#ffdd00]">{monthlyStats.breakevenDays}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Best / Worst Day</span>
                  <span className="text-sm font-bold text-gray-300">
                    {formatCurrency(monthlyStats.bestDay)} / {formatCurrency(monthlyStats.worstDay)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Avg Win / Loss</span>
                  <span className="text-sm font-bold text-gray-300">
                    {formatCurrency(monthlyStats.avgWin)} / {formatCurrency(monthlyStats.avgLoss)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Max Streak</span>
                  <span className="text-sm font-bold text-[#00ff88]">
                    {monthlyStats.consecutiveWins}W / {monthlyStats.consecutiveLosses}L
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Current Streak</span>
                  <span className={`text-sm font-bold ${monthlyStats.currentStreak > 0 ? 'text-[#00ff88]' : monthlyStats.currentStreak < 0 ? 'text-[#ff3366]' : 'text-gray-500'}`}>
                    {monthlyStats.currentStreak > 0 ? `+${monthlyStats.currentStreak}` : monthlyStats.currentStreak < 0 ? `${monthlyStats.currentStreak}` : '0'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* YEARLY VIEW */}
      {/* ============================================================ */}
      {viewMode === 'yearly' && (
        <>
          {/* Year Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-5 flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.06)]"
          >
            <button 
              onClick={prevYear} 
              className="p-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-[#00ff88] transition-all"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#00d4ff] flex items-center gap-3">
                <CalendarDays size={24} /> {year}
              </h2>
            </div>
            <button 
              onClick={nextYear} 
              className="p-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-[#00ff88] transition-all"
            >
              <ChevronRight size={22} />
            </button>
          </motion.div>

          {/* Yearly Stats */}
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard 
                label="Year P/L" 
                value={formatCurrency(yearlyTotals.totalPnl)} 
                color={getPnLColor(yearlyTotals.totalPnl)}
                icon={<DollarSign size={12} />}
                glow={yearlyTotals.totalPnl > 0}
              />
              <MetricCard 
                label="Win Rate" 
                value={`${yearlyTotals.winRate.toFixed(1)}%`} 
                color="#00d4ff"
                icon={<TrendUp size={12} />}
              />
              <MetricCard 
                label="Total Trades" 
                value={yearlyTotals.totalTrades} 
                color="#ffffff"
                icon={<Activity size={12} />}
              />
              <MetricCard 
                label="Trading Days" 
                value={yearlyTotals.tradingDays} 
                color="#ffdd00"
                icon={<Calendar size={12} />}
              />
            </div>
          )}

          {/* Yearly Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-x-auto"
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-[rgba(0,255,136,0.1)]">
                  <th className="text-left p-3">Month</th>
                  <th className="text-right p-3">Trades</th>
                  <th className="text-right p-3">P&L</th>
                  <th className="text-right p-3">Avg P&L</th>
                  <th className="text-right p-3">Win Rate</th>
                  <th className="text-right p-3">Profit Factor</th>
                  <th className="text-right p-3">Best Day</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(yearlyStats).map(([month, stats]) => {
                  const isPositiveMonth = stats.totalPnl > 0;
                  
                  return (
                    <tr key={month} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,255,136,0.02)] transition-colors">
                      <td className="p-3 text-gray-300 font-medium">{month}</td>
                      <td className="p-3 text-right text-gray-400">{stats.totalTrades}</td>
                      <td className={`p-3 text-right font-bold ${getPnLClass(stats.totalPnl)}`}>
                        {formatCurrency(stats.totalPnl)}
                      </td>
                      <td className={`p-3 text-right ${getPnLClass(stats.avgPnl)}`}>
                        {formatCurrency(stats.avgPnl)}
                      </td>
                      <td className={`p-3 text-right ${stats.winRate >= 60 ? 'text-[#00ff88]' : stats.winRate >= 40 ? 'text-[#ffdd00]' : 'text-[#ff3366]'}`}>
                        {stats.winRate.toFixed(1)}%
                      </td>
                      <td className={`p-3 text-right ${stats.profitFactor >= 1.5 ? 'text-[#00ff88]' : stats.profitFactor >= 1 ? 'text-[#ffdd00]' : 'text-[#ff3366]'}`}>
                        {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${stats.bestDay > 0 ? 'text-[#00ff88]' : 'text-[#ffdd00]'}`}>
                        {formatCurrency(stats.bestDay)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold ${
                          isPositiveMonth 
                            ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.1)]' 
                            : stats.totalTrades > 0 
                              ? 'bg-[rgba(255,51,102,0.1)] text-[#ff3366] border border-[rgba(255,51,102,0.1)]'
                              : 'bg-[rgba(255,221,0,0.05)] text-[#ffdd00] border border-[rgba(255,221,0,0.05)]'
                        }`}>
                          {isPositiveMonth ? '✅ PROFIT' : stats.totalTrades > 0 ? '❌ LOSS' : '⚖️ NO TRADES'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Year Total Footer */}
              <tfoot>
                <tr className="border-t-2 border-[rgba(0,255,136,0.2)] bg-[rgba(30,42,58,0.4)]">
                  <td className="p-3 text-[#00ff88] font-bold">📊 YEAR TOTAL</td>
                  <td className="p-3 text-right font-bold text-white">{yearlyTotals.totalTrades}</td>
                  <td className={`p-3 text-right font-bold ${getPnLClass(yearlyTotals.totalPnl)}`}>
                    {formatCurrency(yearlyTotals.totalPnl)}
                  </td>
                  <td className={`p-3 text-right ${getPnLClass(yearlyTotals.avgPnl)}`}>
                    {formatCurrency(yearlyTotals.avgPnl)}
                  </td>
                  <td className={`p-3 text-right ${yearlyTotals.winRate >= 60 ? 'text-[#00ff88]' : yearlyTotals.winRate >= 40 ? 'text-[#ffdd00]' : 'text-[#ff3366]'}`}>
                    {yearlyTotals.winRate.toFixed(1)}%
                  </td>
                  <td className={`p-3 text-right ${yearlyTotals.profitFactor >= 1.5 ? 'text-[#00ff88]' : yearlyTotals.profitFactor >= 1 ? 'text-[#ffdd00]' : 'text-[#ff3366]'}`}>
                    {yearlyTotals.profitFactor === Infinity ? '∞' : yearlyTotals.profitFactor.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-gray-400">—</td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-bold ${
                      yearlyTotals.totalPnl > 0 
                        ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.1)]' 
                        : yearlyTotals.totalTrades > 0 
                          ? 'bg-[rgba(255,51,102,0.1)] text-[#ff3366] border border-[rgba(255,51,102,0.1)]'
                          : 'bg-[rgba(255,221,0,0.05)] text-[#ffdd00] border border-[rgba(255,221,0,0.05)]'
                    }`}>
                      {yearlyTotals.totalPnl > 0 ? '✅ PROFIT' : yearlyTotals.totalTrades > 0 ? '❌ LOSS' : '⚖️ NO TRADES'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </motion.div>
        </>
      )}

      {/* ============================================================ */}
      {/* HEATMAP VIEW */}
      {/* ============================================================ */}
      {viewMode === 'heatmap' && (
        <>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-5 rounded-2xl border border-[rgba(255,255,255,0.06)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <Activity size={22} className="text-[#00d4ff]" />
              <h2 className="text-lg font-bold text-[#00d4ff]">Trading Activity Heatmap</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">Color intensity represents P&L magnitude</p>
            
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] text-gray-500 font-bold uppercase py-2 bg-[rgba(30,40,40,0.2)] rounded-xl">
                  {d}
                </div>
              ))}
              
              {Array.from({ length: 42 }, (_, i) => {
                const date = new Date(year, month, 1);
                date.setDate(date.getDate() - firstDay + i);
                const isCurrentMonth = date.getMonth() === month;
                const dateStr = date.toISOString().split('T')[0];
                const data = heatmapData.get(dateStr);
                const isToday = new Date().toDateString() === date.toDateString();
                
                if (!isCurrentMonth) {
                  return <div key={i} className="aspect-square rounded-xl bg-[rgba(30,40,40,0.1)]" />;
                }
                
                const intensity = data ? Math.min(Math.abs(data.pnl) / 100, 1) : 0;
                const color = data?.pnl > 0 ? '0,255,136' : data?.pnl < 0 ? '255,51,102' : '0,212,255';
                const alpha = 0.1 + (intensity * 0.7);
                
                return (
                  <motion.div
                    key={i}
                    whileHover={{ scale: data ? 1.08 : 1 }}
                    whileTap={{ scale: data ? 0.95 : 1 }}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                      ${data ? 'cursor-pointer' : 'cursor-default'}
                      ${isToday ? 'ring-2 ring-[#ffdd00] shadow-[0_0_20px_rgba(255,221,0,0.15)]' : ''}
                    `}
                    style={{
                      background: data ? `rgba(${color}, ${alpha})` : 'rgba(30,40,40,0.15)',
                      border: data ? `1px solid rgba(${color}, ${intensity * 0.3 + 0.1})` : '1px solid rgba(255,255,255,0.03)',
                    }}
                    onClick={() => {
                      if (data && data.trades > 0) {
                        const dayTrades = dayData.get(date.getDate())?.tradesList || [];
                        if (dayTrades.length > 0) {
                          setSelectedDateTrades(dayTrades);
                          setSelectedDay(dateStr);
                          setShowTradeDialog(true);
                        }
                      }
                    }}
                  >
                    <span className="text-[11px] font-bold text-white">{date.getDate()}</span>
                    {data && (
                      <span className={`text-[9px] font-bold ${data.pnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                        {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(0)}
                      </span>
                    )}
                    {data && data.trades > 0 && (
                      <span className="text-[7px] text-gray-400">{data.trades}t</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
            
            <div className="flex items-center gap-4 mt-5 justify-center flex-wrap p-3 rounded-xl bg-[rgba(30,40,40,0.2)] border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <div className="w-4 h-4 rounded-lg bg-[rgba(0,255,136,0.8)] border border-[rgba(0,255,136,0.2)]" /> High Profit
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <div className="w-4 h-4 rounded-lg bg-[rgba(0,255,136,0.4)] border border-[rgba(0,255,136,0.1)]" /> Medium Profit
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <div className="w-4 h-4 rounded-lg bg-[rgba(0,255,136,0.15)] border border-[rgba(0,255,136,0.05)]" /> Low Profit
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <div className="w-4 h-4 rounded-lg bg-[rgba(255,51,102,0.15)] border border-[rgba(255,51,102,0.05)]" /> Low Loss
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <div className="w-4 h-4 rounded-lg bg-[rgba(255,51,102,0.4)] border border-[rgba(255,51,102,0.1)]" /> Medium Loss
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <div className="w-4 h-4 rounded-lg bg-[rgba(255,51,102,0.8)] border border-[rgba(255,51,102,0.2)]" /> High Loss
              </div>
            </div>
          </motion.div>

          {/* Heatmap Stats */}
          {showStats && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 rounded-2xl border border-[rgba(255,255,255,0.06)]"
            >
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChart size={14} className="text-[#00d4ff]" />
                Heatmap Statistics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Total Days</span>
                  <span className="text-sm font-bold text-white">{heatmapData.size}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Profitable Days</span>
                  <span className="text-sm font-bold text-[#00ff88]">
                    {[...heatmapData.values()].filter(d => d.pnl > 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Losing Days</span>
                  <span className="text-sm font-bold text-[#ff3366]">
                    {[...heatmapData.values()].filter(d => d.pnl < 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[rgba(30,40,40,0.3)] border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xs text-gray-400">Best Day</span>
                  <span className="text-sm font-bold text-[#00ff88]">
                    {heatmapData.size > 0 ? formatCurrency(Math.max(...[...heatmapData.values()].map(d => d.pnl))) : '—'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Bottom Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-[rgba(0,255,136,0.08)]">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            📊 {trades.length} total trades • {new Set(trades.map(t => t.date)).size} trading days
          </span>
          <span className={`text-xs font-bold ${trades.reduce((s, t) => s + t.profitLoss, 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
            Total P&L: {formatCurrency(trades.reduce((s, t) => s + t.profitLoss, 0))}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(30,40,40,0.4)] border border-[rgba(255,255,255,0.06)] text-[#00ff88] text-sm hover:bg-[rgba(0,255,136,0.08)] hover:border-[rgba(0,255,136,0.2)] transition-all"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
}