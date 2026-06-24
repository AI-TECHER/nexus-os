// src/pages/RiskManagement.tsx
import { motion } from 'framer-motion';
import { Trade, AppSettings } from '../types';
import { getTradeStats, getDailyPnL } from '../store';
import { Shield, AlertTriangle, TrendingDown, Activity, Target, Zap } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface RiskManagementProps {
  trades: Trade[];
  settings: AppSettings;
}

// Helper function to format currency with negative sign BEFORE the currency symbol
const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function RiskManagement({ trades, settings }: RiskManagementProps) {
  const stats = getTradeStats(trades);
  const dailyPnL = getDailyPnL(trades);

  // Drawdown chart
  let peak = 0;
  const drawdownData = dailyPnL.map(d => {
    if (d.cumPnl > peak) peak = d.cumPnl;
    const dd = peak > 0 ? ((peak - d.cumPnl) / peak) * 100 : 0;
    return { date: d.date, drawdown: -Math.round(dd * 100) / 100, cumPnl: d.cumPnl };
  });

  // Risk per trade distribution
  const riskBuckets = [
    { name: '0-1%', count: trades.filter(t => t.riskPercent <= 1).length },
    { name: '1-2%', count: trades.filter(t => t.riskPercent > 1 && t.riskPercent <= 2).length },
    { name: '2-3%', count: trades.filter(t => t.riskPercent > 2 && t.riskPercent <= 3).length },
    { name: '3-5%', count: trades.filter(t => t.riskPercent > 3 && t.riskPercent <= 5).length },
    { name: '5%+', count: trades.filter(t => t.riskPercent > 5).length },
  ];

  // Daily risk exposure
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  const todayRisk = todayTrades.reduce((s, t) => s + t.riskPercent, 0);
  const todayLosses = todayTrades.filter(t => !t.isWin).length;
  const accountHealth = settings.accountBalance > 0
    ? Math.max(0, Math.round(((settings.accountBalance + stats.totalPnL) / settings.accountBalance) * 100))
    : 100;

  // Format values for display
  const CS = settings.currencySymbol || '$';
  const formattedBalance = formatCurrency(settings.accountBalance, CS);
  const formattedEquity = formatCurrency(settings.accountBalance + stats.totalPnL, CS);
  const formattedMaxDrawdown = formatCurrency(stats.maxDrawdown, CS);
  const formattedAccountHealth = `${accountHealth}%`;
  const formattedTodayRisk = `${todayRisk.toFixed(1)}%`;
  const formattedTodayLosses = `${todayLosses}/${settings.dailyLossLimit}`;
  const formattedMaxRisk = `${settings.maxRiskPerTrade}%`;
  const formattedAvgRR = `${stats.avgRR}`;

  // Risk metrics
  const riskMetrics = [
    { label: 'Account Balance', value: formattedBalance, color: '#00d4ff', icon: <Zap size={16} /> },
    { label: 'Current Equity', value: formattedEquity, color: stats.totalPnL >= 0 ? '#00ff88' : '#ff3366', icon: <Activity size={16} /> },
    { label: 'Account Health', value: formattedAccountHealth, color: accountHealth >= 90 ? '#00ff88' : accountHealth >= 70 ? '#ffdd00' : '#ff3366', icon: <Shield size={16} /> },
    { label: 'Max Drawdown', value: formattedMaxDrawdown, color: '#ff3366', icon: <TrendingDown size={16} /> },
    { label: 'Today Risk', value: formattedTodayRisk, color: todayRisk > settings.maxRiskPerTrade * 3 ? '#ff3366' : '#ffdd00', icon: <AlertTriangle size={16} /> },
    { label: 'Today Losses', value: formattedTodayLosses, color: todayLosses >= settings.dailyLossLimit ? '#ff3366' : '#00ff88', icon: <Target size={16} /> },
    { label: 'Max Risk/Trade', value: formattedMaxRisk, color: '#00d4ff', icon: <Shield size={16} /> },
    { label: 'Avg R:R', value: formattedAvgRR, color: stats.avgRR >= 1.5 ? '#00ff88' : '#ffdd00', icon: <Target size={16} /> },
  ];

  // Risk warnings
  const riskWarnings: string[] = [];
  if (todayRisk > settings.maxRiskPerTrade * 3) riskWarnings.push('⚠️ Total daily risk exposure is very high.');
  if (todayLosses >= settings.dailyLossLimit) riskWarnings.push('🔴 Daily loss limit reached. Stop trading.');
  if (accountHealth < 80) riskWarnings.push('⚠️ Account health is below 80%. Reduce position sizes.');
  if (stats.maxDrawdown > settings.accountBalance * 0.15) riskWarnings.push('🔴 Drawdown exceeds 15% of starting balance.');
  if (stats.avgRR < 1) riskWarnings.push('⚠️ Average R:R below 1:1. Improve your targets.');
  const noSL = trades.slice(0, 10).filter(t => t.stopLoss === 0).length;
  if (noSL > 3) riskWarnings.push(`⚠️ ${noSL}/10 recent trades have no stop loss.`);

  return (
    <div className="space-y-4">
      {/* Risk Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {riskMetrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4 text-center">
            <span style={{ color: m.color }}>{m.icon}</span>
            <div className="text-xl font-bold mt-2 stat-value" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[9px] text-gray-500 uppercase mt-1">{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Risk Warnings */}
      {riskWarnings.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {riskWarnings.map((w, i) => (
            <div key={i} className="warning-banner text-sm text-gray-300">{w}</div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Drawdown Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingDown size={14} className="text-[#ff3366]" /> Drawdown History
          </h3>
          {drawdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
                <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#ff3366" fill="url(#ddGrad)" strokeWidth={2} name="Drawdown %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-600 text-sm">No data</div>
          )}
        </motion.div>

        {/* Risk Distribution */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield size={14} className="text-[#00d4ff]" /> Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,58,0.5)" />
              <XAxis dataKey="name" tick={{ fill: '#8899aa', fontSize: 10 }} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ background: '#0d1117', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]}>
                {riskBuckets.map((_, i) => (
                  <Cell key={i} fill={i <= 1 ? '#00ff88' : i === 2 ? '#ffdd00' : '#ff3366'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Capital Protection Rules */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield size={14} className="text-[#00ff88]" /> Capital Protection Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { rule: 'Max Risk Per Trade', value: `${settings.maxRiskPerTrade}%`, status: true },
            { rule: 'Daily Trade Limit', value: `${settings.dailyTradeLimit} trades`, status: todayTrades.length < settings.dailyTradeLimit },
            { rule: 'Daily Loss Limit', value: `${settings.dailyLossLimit} losses`, status: todayLosses < settings.dailyLossLimit },
            { rule: 'Always Use Stop Loss', value: noSL === 0 ? 'Compliant' : `${noSL} violations`, status: noSL === 0 },
            { rule: 'Max Drawdown Threshold', value: `${settings.drawdownThreshold}%`, status: accountHealth >= (100 - settings.drawdownThreshold) },
            { rule: 'Minimum R:R Ratio', value: '1:1.5', status: stats.avgRR >= 1.5 },
          ].map(item => (
            <div key={item.rule} className={`p-3 rounded-lg flex items-center justify-between ${item.status ? 'bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.1)]' : 'bg-[rgba(255,51,102,0.05)] border border-[rgba(255,51,102,0.1)]'}`}>
              <div>
                <div className="text-xs font-medium text-gray-300">{item.rule}</div>
                <div className="text-[10px] text-gray-500">{item.value}</div>
              </div>
              <div className={`text-xs font-bold ${item.status ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {item.status ? '✓ OK' : '✗ ALERT'}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}