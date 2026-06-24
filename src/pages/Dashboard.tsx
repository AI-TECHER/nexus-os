// src/pages/Dashboard.tsx
import { motion } from 'framer-motion';
import { Trade, RecoveryState, AppSettings } from '../types';
import {
  getTradeStats, calculateDisciplineScore, calculateEmotionalScore
} from '../store';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Target, Shield, Brain, AlertTriangle
} from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
  recovery: RecoveryState;
  settings: AppSettings;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

// Helper function to format currency with negative sign BEFORE the currency symbol
const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// STRONG parser - handles ANY format including "$ -124,186.55", "$-124,186.55", etc.
const parseCurrencyValue = (value: any): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove ALL non-numeric characters except the negative sign and decimal point
    // This handles: $, ,, spaces, currency symbols, etc.
    let cleaned = value.replace(/[^0-9.\-]/g, '');
    // Handle case where there's a negative sign and then nothing
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return num;
  }
  return 0;
};

export default function Dashboard({ trades, recovery, settings }: DashboardProps) {
  const stats = getTradeStats(trades);
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);

  const wins = trades.filter(t => t.isWin).length;
  const losses = trades.filter(t => !t.isWin).length;
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
  
  // Calculate totalProfit directly from trades to avoid any formatting issues
  let totalProfit = 0;
  for (const t of trades) {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    totalProfit += pnl;
  }
  
  const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
  let bestTrade = 0;
  if (trades.length > 0) {
    for (const t of trades) {
      const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
      if (pnl > bestTrade) bestTrade = pnl;
    }
  }

  // Equity Growth
  const growthData = trades.reduce((acc: any[], t, i) => {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    const cumProfit = (acc[i - 1]?.profit || 0) + pnl;
    acc.push({ name: `T${i + 1}`, profit: Math.round(cumProfit * 100) / 100 });
    return acc;
  }, []);

  // Win/Loss Pie
  const pieData = [
    { name: 'Wins', value: wins, color: '#00ff88' },
    { name: 'Losses', value: losses, color: '#ff0040' },
  ];

  // Daily Performance - calculate directly from trades
  const dailyMap = new Map<string, number>();
  for (const t of trades) {
    const pnl = typeof t.profitLoss === 'number' ? t.profitLoss : parseCurrencyValue(t.profitLoss);
    dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + pnl);
  }
  const dailyData = Array.from(dailyMap.entries()).map(([date, profit]) => ({
    date,
    profit: Math.round(profit * 100) / 100
  }));

  // AI Scores
  const aiScores = [
    { label: 'Discipline', value: discipline, color: '#8b5cf6' },
    { label: 'Emotional', value: emotional, color: '#00e5ff' },
    { label: 'Win Rate', value: winRate, color: '#00ff88' },
  ];

  // Get currency symbol
  const CS = settings.currencySymbol || '$';

  // Parse the totalPnL from stats - it might be a string with wrong format
  const totalPnlNum = parseCurrencyValue(stats.totalPnL);
  
  // Format values with proper negative sign placement
  const formattedTotalPnl = formatCurrency(totalPnlNum, CS);
  const formattedAvgProfit = formatCurrency(avgProfit, CS);
  const formattedBestTrade = formatCurrency(bestTrade, CS);

  const statCards = [
    { label: 'Total P/L', value: formattedTotalPnl, icon: <TrendingUp size={20} />, color: totalPnlNum >= 0 ? '#00ff88' : '#ff3366', sub: `${stats.totalTrades} trades` },
    { label: 'Win Rate', value: `${stats.winRate}%`, icon: <Target size={20} />, color: stats.winRate >= 50 ? '#00ff88' : '#ffdd00', sub: `${stats.wins}W / ${stats.losses}L` },
    { label: 'Discipline', value: `${discipline}%`, icon: <Shield size={20} />, color: discipline >= 70 ? '#00ff88' : discipline >= 40 ? '#ffdd00' : '#ff3366', sub: 'score' },
    { label: 'Emotional', value: `${emotional}%`, icon: <Brain size={20} />, color: emotional >= 60 ? '#00d4ff' : emotional >= 35 ? '#ffdd00' : '#ff3366', sub: 'stability' },
    { label: 'Avg Trade', value: formattedAvgProfit, icon: <TrendingUp size={20} />, color: '#00e5ff', sub: 'per trade' },
    { label: 'Best Trade', value: formattedBestTrade, icon: <Target size={20} />, color: '#ffd700', sub: 'max profit' },
  ];

  // Only sort by date (newest first)
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const recentTrades = sortedTrades.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Recovery Banner */}
      {recovery.active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="warning-banner flex items-center gap-3"
        >
          <AlertTriangle className="text-[#ff3366] flex-shrink-0" size={20} />
          <div>
            <div className="text-sm font-bold text-[#ff3366]">Recovery Mode Active</div>
            <div className="text-xs text-gray-400">
              Reason: {recovery.reason} · Progress: {recovery.recoveryProgress}% · Safe trades: {recovery.safeTradesCompleted}/{recovery.safeTradesRequired}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="glass-card p-4 neon-glow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{card.label}</span>
              <span style={{ color: card.color, opacity: 0.7 }}>{card.icon}</span>
            </div>
            <div className="text-xl font-bold stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[10px] text-gray-500 mt-1">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row - Equity Growth + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equity Growth */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Equity Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="name" stroke="#4a4a6a" fontSize={10} />
              <YAxis stroke="#4a4a6a" fontSize={10} />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12 }}
                formatter={(value: number) => {
                  if (typeof value === 'number') return formatCurrency(value, CS);
                  return value;
                }}
              />
              <Area type="monotone" dataKey="profit" stroke="#8b5cf6" fill="url(#growthGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Win/Loss Pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Win / Loss Ratio</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs mt-2">
            <span>Wins: {wins}</span>
            <span>Losses: {losses}</span>
          </div>
        </motion.div>
      </div>

      {/* Daily Performance + AI Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Daily Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="date" stroke="#4a4a6a" fontSize={9} />
              <YAxis stroke="#4a4a6a" fontSize={10} />
              <Tooltip 
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12 }}
                formatter={(value: number) => {
                  if (typeof value === 'number') return formatCurrency(value, CS);
                  return value;
                }}
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {dailyData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.profit >= 0 ? '#00ff88' : '#ff0040'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Scores */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">AI Scores</h3>
          <div className="space-y-4">
            {aiScores.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{s.label}</span>
                  <span style={{ color: s.color }} className="font-bold">{s.value}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-[#1a1a2e]">
                  <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Trades */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Trades</h3>

        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-[rgba(30,42,58,0.5)]">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Asset</th>
                  <th className="text-left p-2">Direction</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Payout/Risk</th>
                  <th className="text-left p-2">Expiry</th>
                  <th className="text-left p-2">Result</th>
                  <th className="text-right p-2">P/L</th>
                  <th className="text-left p-2">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => {
                  const pnlNum = parseCurrencyValue(t.profitLoss);
                  const amtNum = parseCurrencyValue(t.amount);
                  const formattedPnl = formatCurrency(pnlNum, CS);
                  const formattedAmount = formatCurrency(amtNum, CS);
                  return (
                    <tr key={t.id} className="border-b border-[rgba(30,42,58,0.3)] hover:bg-[rgba(0,255,136,0.02)]">
                      <td className="p-2 text-gray-400">{t.date}</td>
                      <td className="p-2 font-medium text-gray-300">{t.asset}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${t.direction === 'buy' || t.direction === 'BUY' ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]' : 'bg-[rgba(255,51,102,0.1)] text-[#ff3366]'}`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-2 text-gray-300">{formattedAmount}</td>
                      <td className="p-2 text-gray-400">{t.payout ? `${t.payout}%` : t.riskPercent ? `Risk: ${t.riskPercent}` : '-'}</td>
                      <td className="p-2 text-gray-400">{t.duration || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.isWin ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]' : 'bg-[rgba(255,51,102,0.1)] text-[#ff3366]'}`}>
                          {t.isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className="p-2 text-right font-bold" style={{ color: pnlNum >= 0 ? '#00ff88' : '#ff3366' }}>
                        {formattedPnl}
                      </td>
                      <td className="p-2 text-gray-400">{t.strategy || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-600 py-8 text-sm">No trades yet. Start by adding your first trade.</div>
        )}
      </motion.div>
    </div>
  );
}