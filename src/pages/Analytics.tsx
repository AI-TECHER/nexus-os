import { motion } from 'framer-motion';
import { Trade, AppSettings } from '../types';
import { getTradeStats, getStrategyPerformance, getEmotionStats, calculateDisciplineScore, calculateEmotionalScore, getDailyPnL } from '../store';
import { BarChart3, TrendingUp, Target, Award, Brain, Activity, Zap, Shield } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

interface AnalyticsProps {
  trades: Trade[];
  settings: AppSettings;
}

// Helper function to format currency with negative sign BEFORE the currency symbol
// Now accepts currency symbol as parameter
const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Analytics({ trades, settings }: AnalyticsProps) {
  const stats = getTradeStats(trades);
  const stratPerf = getStrategyPerformance(trades);
  const emotionStats = getEmotionStats(trades);
  const discipline = calculateDisciplineScore(trades, settings);
  const emotional = calculateEmotionalScore(trades);
  const dailyPnL = getDailyPnL(trades);

  // Get currency symbol from settings
  const CS = settings.currencySymbol || '$';

  // Consistency analysis
  const profitableDays = dailyPnL.filter(d => d.pnl > 0).length;
  void dailyPnL.filter(d => d.pnl < 0).length;
  const consistencyRate = dailyPnL.length > 0 ? Math.round((profitableDays / dailyPnL.length) * 100) : 0;

  // Mistake analysis
  const mistakeMap = new Map<string, { count: number; totalLoss: number }>();
  for (const t of trades) {
    if (t.mistakeCategory && t.mistakeCategory !== 'None') {
      const existing = mistakeMap.get(t.mistakeCategory) || { count: 0, totalLoss: 0 };
      existing.count++;
      if (t.profitLoss < 0) existing.totalLoss += Math.abs(t.profitLoss);
      mistakeMap.set(t.mistakeCategory, existing);
    }
  }
  const mistakeData = [...mistakeMap.entries()].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.totalLoss - a.totalLoss);

  // Direction analysis
  const buyTrades = trades.filter(t => t.direction === 'buy');
  const sellTrades = trades.filter(t => t.direction === 'sell');
  const directionData = [
    { name: 'Buy', trades: buyTrades.length, winRate: buyTrades.length > 0 ? Math.round((buyTrades.filter(t => t.isWin).length / buyTrades.length) * 100) : 0, pnl: buyTrades.reduce((s, t) => s + t.profitLoss, 0) },
    { name: 'Sell', trades: sellTrades.length, winRate: sellTrades.length > 0 ? Math.round((sellTrades.filter(t => t.isWin).length / sellTrades.length) * 100) : 0, pnl: sellTrades.reduce((s, t) => s + t.profitLoss, 0) },
  ];

  // Radar data for psychology
  const radarData = [
    { subject: 'Discipline', A: discipline },
    { subject: 'Emotional Stability', A: emotional },
    { subject: 'Consistency', A: consistencyRate },
    { subject: 'Win Rate', A: stats.winRate },
    { subject: 'Risk Mgmt', A: Math.min(100, stats.avgRR * 33) },
    { subject: 'Profit Factor', A: Math.min(100, stats.profitFactor * 25) },
  ];

  // Market condition performance
  const condMap = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = condMap.get(t.marketCondition) || [];
    arr.push(t);
    condMap.set(t.marketCondition, arr);
  }
  const condData = [...condMap.entries()].map(([cond, ct]) => ({
    name: cond,
    trades: ct.length,
    winRate: Math.round((ct.filter(t => t.isWin).length / ct.length) * 100),
    pnl: Math.round(ct.reduce((s, t) => s + t.profitLoss, 0) * 100) / 100,
  }));

  const COLORS = ['#00ff88', '#00d4ff', '#a855f7', '#ffdd00', '#ff3366', '#ff8800'];

  const DetailCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">{icon} {title}</h3>
      {children}
    </motion.div>
  );

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BarChart3 size={48} className="text-gray-700 mx-auto mb-4" />
          <div className="text-gray-500 text-lg">No trade data</div>
          <div className="text-gray-600 text-sm mt-2">Enter trades to see analytics</div>
        </div>
      </div>
    );
  }

  // Format all currency values using the currency symbol from settings
  const formattedTotalPnl = formatCurrency(stats.totalPnL, CS);
  const formattedAvgWin = formatCurrency(stats.avgWin, CS);
  const formattedAvgLoss = formatCurrency(stats.avgLoss, CS);
  const formattedBestTrade = formatCurrency(stats.bestTrade, CS);
  const formattedWorstTrade = formatCurrency(stats.worstTrade, CS);
  const formattedMaxDrawdown = formatCurrency(stats.maxDrawdown, CS);
  const formattedExpectancy = formatCurrency(stats.expectancy, CS);

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total P/L', value: formattedTotalPnl, color: stats.totalPnL >= 0 ? '#00ff88' : '#ff3366', icon: <TrendingUp size={14} /> },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: '#00d4ff', icon: <Target size={14} /> },
          { label: 'Profit Factor', value: `${stats.profitFactor}`, color: '#a855f7', icon: <Zap size={14} /> },
          { label: 'Avg Win', value: formattedAvgWin, color: '#00ff88', icon: <TrendingUp size={14} /> },
          { label: 'Avg Loss', value: formattedAvgLoss, color: '#ff3366', icon: <Activity size={14} /> },
          { label: 'Best Trade', value: formattedBestTrade, color: '#ffdd00', icon: <Award size={14} /> },
          { label: 'Worst Trade', value: formattedWorstTrade, color: '#ff3366', icon: <Activity size={14} /> },
          { label: 'Max DD', value: formattedMaxDrawdown, color: '#ff3366', icon: <Shield size={14} /> },
          { label: 'Expectancy', value: formattedExpectancy, color: stats.expectancy >= 0 ? '#00ff88' : '#ff3366', icon: <Brain size={14} /> },
          { label: 'Sharpe', value: `${stats.sharpeRatio}`, color: '#00d4ff', icon: <BarChart3 size={14} /> },
          { label: 'Consistency', value: `${consistencyRate}%`, color: '#a855f7', icon: <Target size={14} /> },
          { label: 'Streak', value: `${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}`, color: stats.currentStreak >= 0 ? '#00ff88' : '#ff3366', icon: <Zap size={14} /> },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[9px] text-gray-500 uppercase">{m.label}</span>
            </div>
            <div className="text-lg font-bold stat-value" style={{ color: m.color }}>{m.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance Radar */}
        <DetailCard title="Performance Radar" icon={<Brain size={14} className="text-[#a855f7]" />}>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(30,42,58,0.7)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8899aa', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 9 }} />
              <Radar name="Score" dataKey="A" stroke="#00ff88" fill="#00ff88" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </DetailCard>

        {/* Strategy Performance Bar */}
        <DetailCard title="Strategy Performance" icon={<Award size={14} className="text-[#ffdd00]" />}>
          {stratPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stratPerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
                <XAxis type="number" tick={{ fill: '#4a5568', fontSize: 10 }} />
                <YAxis type="category" dataKey="strategy" tick={{ fill: '#8899aa', fontSize: 10 }} width={100} />
                <Tooltip 
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => formatCurrency(value, CS)}
                />
                <Bar dataKey="pnl" name="P/L" radius={[0, 4, 4, 0]}>
                  {stratPerf.map((entry, idx) => (
                    <Cell key={idx} fill={entry.pnl >= 0 ? '#00ff88' : '#ff3366'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[250px] flex items-center justify-center text-gray-600 text-sm">No data</div>}
        </DetailCard>

        {/* Emotion Impact */}
        <DetailCard title="Emotion Impact on Trading" icon={<Brain size={14} className="text-[#00d4ff]" />}>
          {emotionStats.length > 0 ? (
            <div className="space-y-2">
              {emotionStats.sort((a, b) => b.count - a.count).map((e, i) => {
                const formattedAvgPnl = formatCurrency(e.avgPnl, CS);
                return (
                  <div key={e.emotion} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 capitalize">{e.emotion}</span>
                    <div className="flex-1 progress-bar">
                      <div className="progress-fill" style={{
                        width: `${(e.count / trades.length) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-8">{e.count}</span>
                    <span className="text-[10px] w-12 text-right" style={{ color: e.winRate >= 50 ? '#00ff88' : '#ff3366' }}>{e.winRate}%</span>
                    <span className="text-[10px] w-16 text-right font-bold" style={{ color: e.avgPnl >= 0 ? '#00ff88' : '#ff3366' }}>{formattedAvgPnl}</span>
                  </div>
                );
              })}
            </div>
          ) : <div className="h-32 flex items-center justify-center text-gray-600 text-sm">No data</div>}
        </DetailCard>

        {/* Mistakes Analysis */}
        <DetailCard title="Mistake Cost Analysis" icon={<Activity size={14} className="text-[#ff3366]" />}>
          {mistakeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mistakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
                <XAxis dataKey="name" tick={{ fill: '#8899aa', fontSize: 9 }} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => formatCurrency(value, CS)}
                />
                <Bar dataKey="totalLoss" name="Total Loss" fill="#ff3366" opacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-600 text-sm">No mistakes logged — keep it up!</div>
          )}
        </DetailCard>

        {/* Direction Performance */}
        <DetailCard title="Direction Performance" icon={<TrendingUp size={14} className="text-[#00ff88]" />}>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {directionData.map(d => {
              const formattedPnl = formatCurrency(d.pnl, CS);
              return (
                <div key={d.name} className="text-center p-4 rounded-lg bg-[rgba(30,42,58,0.3)]">
                  <div className={`text-2xl font-bold ${d.name === 'Buy' ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>{d.name}</div>
                  <div className="text-xs text-gray-500 mt-2">{d.trades} trades</div>
                  <div className="text-sm font-bold mt-1" style={{ color: d.winRate >= 50 ? '#00ff88' : '#ff3366' }}>{d.winRate}% win</div>
                  <div className="text-sm font-bold mt-1" style={{ color: d.pnl >= 0 ? '#00ff88' : '#ff3366' }}>{formattedPnl}</div>
                </div>
              );
            })}
          </div>
        </DetailCard>

        {/* Market Condition */}
        <DetailCard title="Market Condition Analysis" icon={<BarChart3 size={14} className="text-[#ffdd00]" />}>
          {condData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={condData} dataKey="trades" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {condData.map((_entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.8} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => {
                    if (name === 'pnl') return formatCurrency(value, CS);
                    return value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[250px] flex items-center justify-center text-gray-600 text-sm">No data</div>}
        </DetailCard>
      </div>
    </div>
  );
}