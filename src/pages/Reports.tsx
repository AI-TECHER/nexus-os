import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trade, AppSettings } from '../types';
import {
  getTradeStats, getStrategyPerformance, getEmotionStats,
  calculateDisciplineScore, calculateEmotionalScore, getDailyPnL, exportTradesCSV
} from '../store';
import { FileText, Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface ReportsProps {
  trades: Trade[];
  settings: AppSettings;
}

export default function Reports({ trades, settings }: ReportsProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const filteredTrades = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (reportType) {
      case 'daily':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        from = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'monthly':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        from = customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 86400000);
        to = customTo ? new Date(customTo + 'T23:59:59') : to;
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return trades.filter(t => {
      const d = new Date(t.date);
      return d >= from && d <= to;
    });
  }, [trades, reportType, customFrom, customTo]);

  const stats = getTradeStats(filteredTrades);
  const allStats = getTradeStats(trades);
  const strategies = getStrategyPerformance(filteredTrades);
  const emotions = getEmotionStats(filteredTrades);
  const discipline = calculateDisciplineScore(filteredTrades, settings);
  const emotional = calculateEmotionalScore(filteredTrades);
  const dailyPnL = getDailyPnL(filteredTrades);

  const handleExportCSV = () => {
    const csv = exportTradesCSV(filteredTrades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportText = () => {
    const report = `
NEXUS T.R.O.S. — Trading Report
Generated: ${new Date().toLocaleString()}
Period: ${reportType.toUpperCase()}
${'='.repeat(50)}

PERFORMANCE SUMMARY
-------------------
Total Trades: ${stats.totalTrades}
Wins: ${stats.wins} | Losses: ${stats.losses}
Win Rate: ${stats.winRate}%
Total P/L: $${stats.totalPnL}
Average Win: $${stats.avgWin}
Average Loss: $${stats.avgLoss}
Best Trade: $${stats.bestTrade}
Worst Trade: $${stats.worstTrade}
Profit Factor: ${stats.profitFactor}
Expectancy: $${stats.expectancy}/trade
Max Drawdown: $${stats.maxDrawdown}
Sharpe Ratio: ${stats.sharpeRatio}
Avg R:R: ${stats.avgRR}
Current Streak: ${stats.currentStreak}

DISCIPLINE & PSYCHOLOGY
-----------------------
Discipline Score: ${discipline}%
Emotional Score: ${emotional}%

STRATEGY PERFORMANCE
--------------------
${strategies.map(s => `${s.strategy}: ${s.trades} trades, ${s.winRate}% win, $${s.pnl}`).join('\n')}

EMOTION ANALYSIS
----------------
${emotions.map(e => `${e.emotion}: ${e.count} trades, ${e.winRate}% win, avg $${e.avgPnl}`).join('\n')}

DAILY P/L
---------
${dailyPnL.map(d => `${d.date}: $${d.pnl} (${d.trades} trades)`).join('\n')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_report_${reportType}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Report Controls */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-[#00d4ff]" />
            <h2 className="text-lg font-bold text-[#00d4ff]">Reports</h2>
          </div>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly', 'custom'] as const).map(t => (
              <button key={t} onClick={() => setReportType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${reportType === t ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.3)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                {t}
              </button>
            ))}
          </div>
          {reportType === 'custom' && (
            <div className="flex gap-2">
              <input type="date" className="cyber-input max-w-[140px]" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span className="text-gray-500 self-center">to</span>
              <input type="date" className="cyber-input max-w-[140px]" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}
          <div className="flex-1" />
          <button onClick={handleExportCSV} className="cyber-button flex items-center gap-2"><Download size={14} /> CSV</button>
          <button onClick={handleExportText} className="cyber-button flex items-center gap-2"><Download size={14} /> Report</button>
        </div>
      </motion.div>

      {/* Report Content */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total P/L', value: `$${stats.totalPnL}`, color: stats.totalPnL >= 0 ? '#00ff88' : '#ff3366' },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? '#00ff88' : '#ff3366' },
          { label: 'Trades', value: stats.totalTrades, color: '#00d4ff' },
          { label: 'Profit Factor', value: stats.profitFactor, color: stats.profitFactor >= 1 ? '#00ff88' : '#ff3366' },
          { label: 'Avg Win', value: `$${stats.avgWin}`, color: '#00ff88' },
          { label: 'Avg Loss', value: `$${stats.avgLoss}`, color: '#ff3366' },
          { label: 'Discipline', value: `${discipline}%`, color: discipline >= 70 ? '#00ff88' : '#ffdd00' },
          { label: 'Emotional', value: `${emotional}%`, color: emotional >= 60 ? '#00d4ff' : '#ff3366' },
        ].map(m => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 text-center">
            <div className="text-[9px] text-gray-500 uppercase">{m.label}</div>
            <div className="text-lg font-bold mt-1 stat-value" style={{ color: m.color as string }}>{m.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Strategy Performance */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-[#a855f7]" /> Strategy Breakdown
          </h3>
          {strategies.length > 0 ? (
            <div className="space-y-2">
              {strategies.map(s => (
                <div key={s.strategy} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] flex items-center justify-between">
                  <span className="text-sm text-gray-300">{s.strategy}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-500">{s.trades}t</span>
                    <span className="text-[10px]" style={{ color: s.winRate >= 50 ? '#00ff88' : '#ff3366' }}>{s.winRate}%</span>
                    <span className="text-sm font-bold" style={{ color: s.pnl >= 0 ? '#00ff88' : '#ff3366' }}>${s.pnl}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-gray-600 text-sm text-center py-4">No strategy data for this period</div>}
        </motion.div>

        {/* Daily Breakdown */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-[#00d4ff]" /> Daily Breakdown
          </h3>
          {dailyPnL.length > 0 ? (
            <div className="space-y-1 max-h-[250px] overflow-y-auto">
              {dailyPnL.map(d => (
                <div key={d.date} className="p-2 rounded flex items-center justify-between hover:bg-[rgba(30,42,58,0.3)]">
                  <span className="text-xs text-gray-400">{d.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-500">{d.trades} trades</span>
                    <span className="text-sm font-bold" style={{ color: d.pnl >= 0 ? '#00ff88' : '#ff3366' }}>
                      {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-gray-600 text-sm text-center py-4">No data for this period</div>}
        </motion.div>
      </div>

      {/* Comparison with Overall */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-[#00ff88]" /> Period vs Overall Comparison
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Win Rate', period: `${stats.winRate}%`, overall: `${allStats.winRate}%` },
            { label: 'Profit Factor', period: `${stats.profitFactor}`, overall: `${allStats.profitFactor}` },
            { label: 'Avg R:R', period: `${stats.avgRR}`, overall: `${allStats.avgRR}` },
            { label: 'Expectancy', period: `$${stats.expectancy}`, overall: `$${allStats.expectancy}` },
          ].map(c => (
            <div key={c.label} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] text-center">
              <div className="text-[9px] text-gray-500 uppercase">{c.label}</div>
              <div className="text-sm font-bold text-[#00d4ff] mt-1">{c.period}</div>
              <div className="text-[10px] text-gray-500">Overall: {c.overall}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Emotion Report */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Emotion Report</h3>
        {emotions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {emotions.sort((a, b) => b.count - a.count).map(e => (
              <div key={e.emotion} className="p-3 rounded-lg bg-[rgba(30,42,58,0.3)] text-center">
                <div className="text-sm capitalize text-gray-300">{e.emotion}</div>
                <div className="text-lg font-bold mt-1" style={{ color: e.avgPnl >= 0 ? '#00ff88' : '#ff3366' }}>${e.avgPnl.toFixed(0)}</div>
                <div className="text-[10px] text-gray-500">{e.count} trades · {e.winRate}% win</div>
              </div>
            ))}
          </div>
        ) : <div className="text-gray-600 text-sm text-center py-4">No emotion data</div>}
      </motion.div>
    </div>
  );
}
